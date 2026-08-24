# BB Plugin Sync design

## Goal

Provide a safe, bidirectional way to keep the BB plugin setup on two
independent BB servers aligned. The initial target is Yusuf's MacBook Pro and
`yusuf-pc`, but the protocol must not hard-code either host.

## User decisions

- Sync is bidirectional.
- A conflict is never overwritten automatically: it is presented for review.
- Sync includes plugin sources, install state, enabled/disabled state,
  non-secret settings, plugin data, and secrets.
- A secret transfer always requires an explicit confirmation. Values are never
  shown in the UI, logs, or CLI output.
- Users can run a manual sync and optionally enable periodic sync.
- A managed plugin update made on either server should be applied to the other
  during both manual and periodic sync when it is unambiguous.

## Approach

Install the same `bb-plugin-sync` package on each BB server. Each instance
keeps a local SQLite ledger and exposes a token-protected peer endpoint. A
peer URL and the other instance's token are stored as plugin settings; the
token is a secret setting.

The plugin exchanges a compact snapshot instead of copying `~/.bb` or a live
SQLite database. A snapshot describes each installed plugin by stable ID,
source intent and resolved revision, version, enabled state, declared
non-secret settings, content checksum for local/path sources, and a revision
stamp maintained by this plugin. The receiver computes a plan before making
any change.

For Git, npm, builtin, and catalog plugins, sync replays the recorded source
intent through BB's normal plugin installation API. For a path plugin, the
origin packages its source (excluding generated dependencies and build output)
into a bounded transfer, the receiver writes it into a plugin-managed
directory, then rebuilds/installs it locally. This preserves source while
allowing platform-specific dependencies to be rebuilt on the receiving host.

## Conflict policy

Each tracked field has an origin server ID, monotonically increasing revision,
timestamp, and checksum. The ledger stores the last common field state for
each peer.

- If only one side changed since the last common revision, copy that change.
- If both sides made the same effective change, record it as synchronized.
- If both sides changed differently, create a pending conflict and apply
  neither side.
- If both servers use the same managed tracking source and only one resolved
  revision advanced since the last common state, apply BB's ordinary update on
  the other server. Re-read both snapshots afterward and retain the result
  only when source, resolved revision, and version now match.
- A source change, path-based source, downgrade, unavailable update, or
  unequal post-update result remains a conflict; no reinstall, removal, or
  overwrite is attempted.
- Settings are compared per key so unrelated setting changes can sync without
  conflict.
- Secret names and hashes are compared, never their values. Sending a secret
  creates a pending confirmation on the destination before it is written.
- Plugin data is opt-in per plugin in the first release. Its archive is
  checksummed and uses the same conflict policy; databases are exported only
  through plugin-specific supported handlers, never copied live.

## Pairing and transport

The user installs the plugin on both BB servers, then pairs them from the
plugin settings page or CLI. Pairing saves the peer's BB Connect URL and a
token for the peer's `sync` HTTP route. The endpoint uses BB's plugin-token
authentication. HTTPS is supplied by BB Connect.

The transport supports:

1. `GET /identity` — validate the peer and protocol version.
2. `GET /snapshot` — return the peer's redacted state snapshot.
3. `POST /plan` — return conflicts and a proposed action list without writes.
4. `POST /apply` — apply approved, non-conflicting actions.
5. `POST /transfer/*` — bounded source/data transfer with checksums.

The client retries transient failures with backoff. If either server is
offline, no local change is discarded; the next manual or scheduled sync
recomputes the plan from current snapshots.

## User experience

The plugin adds a Settings section and `bb sync` command.

- Settings shows pair status, last successful sync, the peer URL, automatic
  interval, and pending secret confirmations.
- `bb sync status` reports peers, synchronization age, pending conflicts, and
  pending secret transfers.
- `bb sync plan` fetches a peer snapshot and prints the proposed changes.
- `bb sync now` applies only unambiguous non-secret changes by default.
- A configured automatic interval applies those same guarded updates.
- `bb sync conflicts` lists conflicts; `bb sync resolve <id> keep-local|take-peer`
  records an explicit choice.
- `bb sync secrets` lists secret names awaiting approval and asks the user to
  approve or reject transfer in the Settings UI.

No action silently uninstalls a plugin. A removal is represented as a pending
conflict until explicit support for confirmed removals is added.

## Security and limits

- Peer credentials are stored only in BB secret settings.
- Secret values never enter logs, snapshots, CLI output, conflict labels, or
  realtime events.
- All peer requests use the BB-issued plugin token over HTTPS.
- Incoming sources and data are size limited, checksummed, and written through
  BB's host-aware file API with compare-and-swap checks.
- The plugin does not copy the BB server database, user instruction files, or
  arbitrary host directories.

## Initial implementation boundaries

The first working version implements pairing, peer identity/snapshot routes,
read-only planning, an inspectable local ledger, CLI status/plan, and a small
Settings UI. Applying Git/npm/builtin installs and status/settings changes
comes next. Path-source and per-plugin data transfers remain disabled until
their bounded transfer tests pass. Secret transfer is represented in plans but
requires a Settings confirmation before any value is sent or written.

## Validation

- Unit-test snapshot comparison, field-level conflict detection, and plan
  generation with the BB plugin test harness.
- Test HTTP route authentication and invalid/malformed peer snapshots.
- Run two local plugin instances against the Mac and PC BB servers.
- Verify no change is made by `status` or `plan`.
- Verify a one-sided managed-plugin update generates an update action and that
  divergent revisions, source changes, path plugins, and downgrades stay
  conflicts.
- Verify divergent changes create a conflict rather than overwrite either side.
- Verify secret names may appear in a confirmation request but values never
  appear in logs or response bodies.
