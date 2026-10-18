---
name: coolify
description: Manage Coolify instances (cloud or self-hosted) via the `coolify` CLI — servers, projects, applications, databases, services, deployments, domains, backups, environment variables, and private keys. Use whenever the user wants to deploy, restart, stop, check logs/status of, or configure a Coolify-hosted app/database/service, manage Coolify servers or projects, or otherwise says "coolify", "deploy on coolify", "check the coolify app", "coolify logs", or similar.
---

# Coolify CLI

Command-line control of Coolify (self-hosted PaaS). All resources are addressed by **UUID**
(except teams, which use numeric IDs). Full command reference is in `references/` — this file
covers setup, conventions, and the workflows you'll use most.

## Safety — read before running anything mutating

The CLI acts directly and immediately on a live server/instance — there is no dry-run and no
undo for most of these. Treat this tool with the same caution as `rm` or a production database
console.

**Confirm with the user, every time, before running any of:**
- Any `delete` / `remove` / `cancel` command — `app delete`, `database delete`,
  `service delete`, `destination delete`, `s3 delete`, `github delete`, `gitlab delete`,
  `private-key remove`, `tag delete`, `context delete`, `server remove`, `deploy cancel`,
  `*/storage delete`, `*/backup delete`, `*/env delete`, `app previews delete`
- Anything that provisions or destroys real infrastructure and spends the user's money —
  `server hetzner|digitalocean|vultr create`, `server remove`
- `coolify init` / `coolify firewall` (ALPHA v5 mesh networking) — these touch WireGuard/firewall
  state across every server listed in `--servers` at once; a mistake here can cut off network
  access to multiple hosts simultaneously
- Anything with `--force`/`-f` that would skip an interactive confirmation prompt the CLI would
  otherwise show — never add that flag on your own initiative, only when the user has explicitly
  said to skip the prompt in this request
- Restarting/stopping a resource that looks production-facing (name/domain implies prod) when
  the user only asked to "check" or "look at" something

**Before asking for confirmation, state plainly:** which resource (name + UUID), which Coolify
context/instance (prod vs. staging — run `coolify context list` if unsure which is active),
and what the command will actually delete or affect (e.g. "this also deletes attached volumes
by default — data included"). Don't bundle a destructive step into a batch of read-only ones;
call it out on its own.

**Never fabricate a UUID, name, token, or context.** Always resolve real values via `list`/`get`
first. If a command's target is ambiguous (which app? which context?), ask rather than guessing.

**No confirmation needed** for read-only commands — `list`, `get`, `logs`, `*/env list`,
`*/storage list`, `*/backup list`, `deploy list`, `resource list`, `context verify`, etc. — run
these freely to gather information.

## Setup (do this first if not already configured)

Check existing contexts before assuming none exist:

```bash
coolify context list
```

If none exist, get a token from the user's Coolify dashboard `/security/api-tokens`, then:

```bash
# Coolify Cloud
coolify context set-token cloud <token>

# Self-hosted
coolify context add <name> <url> <token> --default
```

Verify connectivity before doing real work:

```bash
coolify context verify
```

Multiple instances (prod/staging) can coexist as separate contexts — switch with
`coolify context use <name>` or scope a single command with `coolify --context=<name> ...`.

## Output

Every command supports `--format table|json|pretty` (default `table`). **Use `--format json`
when you need to parse output programmatically** (e.g. extracting a UUID for a follow-up
command) — don't scrape table output.

Sensitive fields (tokens, passwords, IPs, emails) are redacted by default; pass
`--show-sensitive` (`-s`) only when the user explicitly needs the real value (e.g. reading a
generated DB password right after creation).

## Core workflow: find the UUID, then act

Nearly every command takes a resource UUID as its first argument. The standard pattern:

```bash
coolify app list --format json          # find the UUID
coolify app get <uuid>                  # inspect it
coolify app restart <uuid>              # act on it
```

Don't guess or fabricate a UUID — always resolve it via a `list`/`get` call first (or use
`coolify resource list` to see everything across all types at once).

## Command areas

Pick the reference file matching the task — each is a full flag-level command reference, load
only the one(s) needed:

- **[apps.md](references/apps.md)** — application CRUD, deploy/start/stop/restart, logs, env vars, storage, rollback, previews, tags
- **[databases.md](references/databases.md)** — database CRUD (postgres/mysql/mariadb/mongodb/redis/keydb/clickhouse/dragonfly), env vars, storage
- **[services.md](references/services.md)** — one-click services and their sub-resources (application/database children)
- **[deployments-projects.md](references/deployments-projects.md)** — triggering deployments, projects, environments, destinations, servers
- **[backups.md](references/backups.md)** — scheduled + on-demand backups for app/database/service storage volumes
- **[misc.md](references/misc.md)** — teams, private keys, S3 storage, tags, shared env vars, GitHub/GitLab app integrations, cloud tokens/cloud-init, notifications

## Best practices

- **Resolve names to UUIDs first.** `coolify deploy name <resource_name>` and
  `coolify deploy batch <name1,name2>` are the only commands that accept a name directly —
  everything else needs the UUID from a `list` call.
- **Deploy vs start.** `coolify app start <uuid>` and `coolify deploy uuid <uuid>` both trigger
  a deployment; `app start` is the app-scoped alias. Use `--force` to bypass the build cache,
  `--instant-deploy` to skip the queue.
- **Follow logs for live feedback**, don't poll: `coolify app logs <uuid> --follow` /
  `coolify app deployments logs <app-uuid> <deployment-uuid> --follow`.
- **`app env sync` is additive-only** — it updates existing vars and creates missing ones but
  never deletes vars absent from the file. Use `app env delete` explicitly to remove one.
- **Deletion flags default to true.** `database delete` / `service delete` default to also
  deleting configurations, volumes, and connected networks (`--delete-volumes`,
  `--delete-configurations`, `--delete-connected-networks`, `--docker-cleanup` all default
  `true`). If the user wants to keep volumes/data, pass `--delete-volumes=false` explicitly.
- **`coolify firewall` and `coolify init` are ALPHA** (Coolify v5 WireGuard mesh networking) —
  don't reach for these unless the user is explicitly working with that feature; they're
  unrelated to normal app/database/service management.
- **Creating apps**: pick the create subcommand by source — `app create public` (public git
  repo), `app create github` (GitHub App-authenticated private repo), `app create deploy-key`
  (SSH deploy key private repo), `app create dockerfile`, `app create dockerimage`. All need
  `--project-uuid` and `--server-uuid`.
