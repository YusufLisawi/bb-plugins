# Teams, Private Keys, S3, Tags, Shared Env, Git Integrations, Misc

## Teams (`coolify teams` / `coolify team`) — uses numeric IDs, not UUIDs

```bash
coolify teams current            # aliases: teams me
coolify teams list
coolify teams get <team_id>
coolify teams members list [team_id]
```

## Private keys (`coolify private-key` / `coolify key` / `coolify keys`)

SSH keys used to connect Coolify to servers and private git repos.

```bash
coolify private-key list
coolify private-key add <key_name> <private_key_or_file>
coolify private-key remove <uuid>
```

## S3 storage (`coolify s3`)

Backup destinations (S3-compatible object storage).

```bash
coolify s3 list
coolify s3 get <uuid>
coolify s3 create --name <name> --endpoint <url> --bucket <bucket> --region <region> --key <key> --secret <secret>
coolify s3 update <uuid> [same flags]
coolify s3 validate <uuid>          # test the connection
coolify s3 delete <uuid>
```

## Team tags (`coolify tag`)

Team-wide tags, distinct from per-resource `app/database/service tag add|list|remove`:

```bash
coolify tag list
coolify tag create --name <name>
coolify tag update <uuid> --name <new_name>
coolify tag delete <uuid>
```

## Shared environment variables (`coolify shared-env`)

Reusable env vars defined once at team/server/project/environment scope and referenced by
resources. Same CRUD shape at every scope — swap the scope keyword and its ID args:

```bash
coolify shared-env team list
coolify shared-env team create --key K --value V [--comment C] [--literal] [--multiline] [--shown-once]
coolify shared-env team update <id> --value V
coolify shared-env team delete <id>

coolify shared-env server list <server_uuid>
coolify shared-env server create <server_uuid> --key K --value V

coolify shared-env project list <project_uuid>
coolify shared-env project create <project_uuid> --key K --value V

coolify shared-env environment list <project_uuid> <environment>
coolify shared-env environment create <project_uuid> <environment> --key K --value V
```

## GitHub App integrations (`coolify github`)

```bash
coolify github list
coolify github get <app_uuid>
coolify github repos <app_uuid>                    # repos accessible to the app
coolify github branches <app_uuid> owner/repo
coolify github create --name <name> --app-id <id> --installation-id <id> \
  --client-id <id> --client-secret <secret> --html-url https://github.com \
  --private-key-uuid <uuid>
coolify github update <app_uuid> [fields to change]
coolify github delete <app_uuid> [--force]          # app must be unused by any application
```

## GitLab App integrations (`coolify gitlab`)

```bash
coolify gitlab list
coolify gitlab get <app_id_or_uuid>
coolify gitlab create --name <name> --html-url https://gitlab.com [--group-name <groups>]
coolify gitlab update <app_id_or_uuid> [fields to change]
coolify gitlab delete <app_id_or_uuid> [--force]
```

## Cloud provider tokens (`coolify cloud-token`)

Needed before provisioning servers via `server hetzner|digitalocean|vultr create` (see
[deployments-projects.md](deployments-projects.md#provisioning-servers-on-a-cloud-provider)).

```bash
coolify cloud-token list
coolify cloud-token create --name <name> --provider hetzner|digitalocean|vultr --provider-token <token>
coolify cloud-token validate <uuid>
coolify cloud-token update <uuid> --name <new_name>
coolify cloud-token delete <uuid>
```

## Cloud-init scripts (`coolify cloud-init`)

Reusable cloud-init YAML, referenceable when provisioning cloud servers via `--cloud-init`.

```bash
coolify cloud-init list
coolify cloud-init create --name <name> --script-file init.yml
coolify cloud-init get|update|delete <uuid>
```

## Notifications (`coolify notification`)

Channels: `email`, `discord`, `slack`, `telegram`, `pushover`, `webhook`.

```bash
coolify notification get <channel>
coolify notification update webhook --json '{"webhook_enabled":true}'
```

## Context management (`coolify context`)

```bash
coolify context list
coolify context add <name> <url> <token> [--default] [--force]
coolify context use <name>
coolify context set-default <name>
coolify context set-token <name> <token>
coolify context update <name> [--name <new>] [--url <new>] [--token <new>]
coolify context delete <name>
coolify context verify              # check connection + auth for the current context
coolify context version             # Coolify instance version
```

## Other

```bash
coolify config                      # path to config.json
coolify version                     # CLI version
coolify update                      # self-update the CLI
coolify completion bash|zsh|fish|powershell
```

## Alpha features (Coolify v5 only — don't use unless the user is explicitly on v5 mesh networking)

`coolify init` (WireGuard mesh bootstrap/extend/upgrade) and `coolify firewall`
(cross-host container allow rules) are ALPHA. They require `--servers`, `--ssh-key`, and touch
low-level networking on the Coolify hosts themselves — treat as high-risk, confirm with the
user before running, and prefer `coolify init plan` (dry-run) before `coolify init bootstrap`
or `coolify init extend`.
