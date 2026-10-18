# Applications (`coolify app` / `coolify apps` / `coolify application`)

## Lifecycle

```bash
coolify app list
coolify app get <uuid>
coolify app start <uuid> [--force] [--instant-deploy]   # alias: app deploy
coolify app stop <uuid>
coolify app restart <uuid>
coolify app delete <uuid> [--force]
coolify app move <uuid> --environment-uuid <uuid>
coolify app clone <uuid> [--destination <uuid>] [--name <name>] [--clone-volumes]
```

## Logs & deployments

```bash
coolify app logs <uuid> [--follow] [-n <lines>] [--show-timestamps] [--service <compose-service>]
coolify app deployments list <app-uuid>
coolify app deployments logs <app-uuid> [deployment-uuid] [--follow] [--debuglogs] [-n <lines>]
```
`app logs` defaults to 100 lines; `deployments logs` defaults to 0 (all). `--service` selects
one container in a multi-service (docker-compose) app.

## Rollback

```bash
coolify app rollback images <uuid>            # list candidate images
coolify app rollback run <uuid> --commit <sha>
```

## Environment variables

```bash
coolify app env list <app_uuid> [--all] [--preview]
coolify app env get <app_uuid> <env_uuid_or_key>
coolify app env create <app_uuid> --key K --value V [--build-time] [--runtime] [--preview] [--is-literal] [--comment C]
coolify app env update <app_uuid> <env_uuid_or_key> --value V [--key NEW_KEY] [...]
coolify app env delete <app_uuid> <env_uuid> [--force]
coolify app env sync <app_uuid> --file .env.production [--build-time] [--runtime] [--preview] [--is-literal]
```
`build-time` and `runtime` default `true`. `sync` never deletes vars missing from the file —
only `env delete` removes one.

## Storage (volumes & config files)

```bash
coolify app storage list <app_uuid>
coolify app storage create <app_uuid> --type persistent --mount-path /data --name my-volume
coolify app storage create <app_uuid> --type file --mount-path /app/config.yml --content "key: value"
coolify app storage update <app_uuid> --uuid <storage_uuid> --type persistent|file [...]
coolify app storage delete <app_uuid> <storage_uuid>
```
Backup schedule sub-commands: `run-storage-backup`, `storage run-backup`,
`storage set-backup`, `storage delete-backup` — see [backups.md](backups.md).

## Previews (PR deployments)

```bash
coolify app previews delete <app_uuid> <pr_id> [--force]
```

## Destinations, tags, scheduled tasks

```bash
coolify app destinations list <uuid>
coolify app destinations add <uuid> --destination <destination_uuid>
coolify app destinations remove <uuid> <destination_uuid>

coolify app tag list <application-uuid>
coolify app tag add <application-uuid> <name>
coolify app tag remove <application-uuid> <tag-uuid>

coolify app execute-task <uuid> <task_uuid>
```

## Creating applications

Four sources, each with its own subcommand. All require `--project-uuid`, `--server-uuid`,
`--build-pack` (nixpacks|static|dockerfile|dockercompose), and `--ports-exposes`.

```bash
# Public git repo
coolify app create public --project-uuid <uuid> --server-uuid <uuid> \
  --git-repository https://github.com/user/repo --git-branch main \
  --build-pack nixpacks --ports-exposes 3000

# Private repo via GitHub App
coolify app create github --project-uuid <uuid> --server-uuid <uuid> \
  --github-app-uuid <uuid> --git-repository owner/repo --git-branch main \
  --build-pack nixpacks --ports-exposes 3000

# Private repo via SSH deploy key
coolify app create deploy-key --project-uuid <uuid> --server-uuid <uuid> \
  --private-key-uuid <uuid> --git-repository git@github.com:owner/repo.git --git-branch main \
  --build-pack dockerfile --ports-exposes 3000

# Custom Dockerfile (no git repo)
coolify app create dockerfile --project-uuid <uuid> --server-uuid <uuid> \
  --dockerfile "FROM node:18\nCOPY . .\nRUN npm install\nCMD [\"node\", \"index.js\"]" \
  --ports-exposes 3000

# Pre-built image from a registry
coolify app create dockerimage --project-uuid <uuid> --server-uuid <uuid> \
  --docker-registry-image-name nginx --docker-registry-image-tag latest --ports-exposes 80
```

Useful optional flags common to all: `--domains`, `--instant-deploy`, `--health-check-enabled`
`--health-check-path`, `--limits-cpus`, `--limits-memory`, `--is-preview-deployments-enabled`,
`--tag` (repeatable). Docker-compose apps use `--compose-domain <service>=<url>[,<url>]`
instead of `--domains`.

## Updating an existing app

```bash
coolify app update <uuid> --name <name> --domains <domains> --health-check-enabled [...]
```
Same flag surface as `create`, minus source-defining flags (git repo, project/server) which
are immutable after creation.
