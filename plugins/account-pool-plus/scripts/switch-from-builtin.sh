#!/usr/bin/env bash
# Move this BB server from the builtin Account Pooler to Account Pooler+, or
# back with --rollback.
#
# The switch stops the builtin, copies its accounts, login secrets, machine
# tokens and quota database into Account Pooler+, and starts Account Pooler+.
# The builtin's own data is left in place, so --rollback can return to it; a
# rollback copies refreshed logins (and any account added since) back first.
#
# Requests a thread has in flight during the switch fail once; each thread
# routes through Account Pooler+ from its next turn.
#
# After a switch, a free count_tokens request is sent through Account Pooler+
# (set BB_URL if bb is not at http://127.0.0.1:38886). If it does not return
# 200, the script rolls back to the builtin.
#
# Usage: switch-from-builtin.sh [--rollback] [--delay <seconds>]
set -euo pipefail

BUILTIN=account-pool
PLUS=account-pool-plus
DATA_DIR="${BB_DATA_DIR:-$HOME/.bb}"
BB_URL="${BB_URL:-http://127.0.0.1:38886}"
BB_DB="$DATA_DIR/bb.db"
mode=switch
delay=0
while [ $# -gt 0 ]; do
  case "$1" in
    --rollback) mode=rollback ;;
    --delay) delay="$2"; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
need() { command -v "$1" >/dev/null || { echo "missing $1" >&2; exit 1; }; }
need bb
need sqlite3
need curl
need python3

copy_kv() { # from-plugin to-plugin [extra WHERE clause]
  sqlite3 "$BB_DB" <<SQL
.timeout 10000
INSERT OR REPLACE INTO plugin_kv (plugin_id, key, value, updated_at)
  SELECT '$2', key, value, updated_at FROM plugin_kv
  WHERE plugin_id = '$1' ${3:-};
SQL
}

wait_state() { # plugin-id state
  for _ in $(seq 1 30); do
    if bb plugin list 2>/dev/null | grep -Eq "^$1@[^ ]*  ($2)"; then return 0; fi
    sleep 1
  done
  log "warning: $1 did not report '$2' within 30s"
}

probe() { # one free request through the Account Pooler+ hub
  local token_file token status
  token_file=$(ls "$DATA_DIR/plugins/$PLUS/secrets/accounts"/hub-token-*.json 2>/dev/null | head -1)
  [ -n "$token_file" ] || { log "no machine token to test with"; return 1; }
  token=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["value"])' "$token_file")
  for _ in 1 2 3 4 5; do
    status=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
      "$BB_URL/api/v1/plugins/$PLUS/http/v1/messages/count_tokens" \
      -H "authorization: Bearer $token" -H "content-type: application/json" \
      -H "anthropic-version: 2023-06-01" \
      -d '{"model":"claude-haiku-5-5","messages":[{"role":"user","content":"ping"}]}' || true)
    log "test request: HTTP $status"
    [ "$status" = 200 ] && return 0
    sleep 3
  done
  return 1
}

[ "$delay" -gt 0 ] && { log "waiting ${delay}s before the $mode"; sleep "$delay"; }

src="$DATA_DIR/plugins/$BUILTIN"
dst="$DATA_DIR/plugins/$PLUS"

if [ "$mode" = switch ]; then
  [ -d "$src/secrets/accounts" ] || { echo "no builtin pool data at $src" >&2; exit 1; }
  log "stopping $PLUS and $BUILTIN"
  bb plugin disable "$PLUS" >/dev/null
  bb plugin disable "$BUILTIN" >/dev/null
  wait_state "$BUILTIN" disabled
  backup="$DATA_DIR/plugins/$PLUS.before-switch-$(date -u +%Y%m%dT%H%M%SZ)"
  log "keeping the previous $PLUS data in $backup"
  mkdir -p "$backup"
  [ -d "$dst" ] && cp -a "$dst/." "$backup/"
  mkdir -p "$dst/secrets"
  rm -rf "$dst/secrets/accounts" "$dst"/data.db "$dst"/data.db-wal "$dst"/data.db-shm
  cp -a "$src/secrets/accounts" "$dst/secrets/accounts"
  sqlite3 "$src/data.db" ".timeout 10000" ".backup '$dst/data.db'"
  # Accounts, routing switches, bypasses and config. Groups and thread limits
  # already stored by Account Pooler+ are kept.
  copy_kv "$BUILTIN" "$PLUS" "AND key NOT LIKE 'retry-route:%'"
  log "starting $PLUS"
  bb plugin enable "$PLUS" >/dev/null
  wait_state "$PLUS" "running|needs-configuration"
  if ! probe; then
    log "Account Pooler+ did not answer a test request; rolling back"
    exec "$0" --rollback
  fi
else
  [ -d "$dst/secrets/accounts" ] || { echo "no $PLUS data at $dst" >&2; exit 1; }
  log "stopping $PLUS"
  bb plugin disable "$PLUS" >/dev/null
  wait_state "$PLUS" disabled
  log "copying refreshed logins and the account list back to $BUILTIN"
  cp -a "$dst/secrets/accounts/." "$src/secrets/accounts/"
  copy_kv "$PLUS" "$BUILTIN" "AND key = 'accounts:v1'"
  log "starting $BUILTIN"
  bb plugin enable "$BUILTIN" >/dev/null
  wait_state "$BUILTIN" "running|needs-configuration"
fi

log "done; current pool:"
bb pool account list || true
