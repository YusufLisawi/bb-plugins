# Databases (`coolify database` / `coolify databases` / `coolify db`)

Supported types for `coolify database create <type>`: `postgresql`, `mysql`, `mariadb`,
`mongodb`, `redis`, `keydb`, `clickhouse`, `dragonfly`.

## Lifecycle

```bash
coolify database list
coolify database get <uuid>
coolify database start <uuid>
coolify database stop <uuid>
coolify database restart <uuid>
coolify database update <uuid> --name <name> --limits-cpus <cpus> --limits-memory <mem> [...]
coolify database delete <uuid> [--delete-configurations] [--delete-connected-networks] [--delete-volumes] [--docker-cleanup]
coolify database move <uuid> --environment-uuid <uuid>
coolify database clone <uuid> [--destination <uuid>] [--name <name>] [--clone-volumes]
```
`database delete`'s cleanup flags all default `true` — pass `--delete-volumes=false` to keep
data when deleting the resource record.

## Creating

Requires `--project-uuid` and `--server-uuid`; credential/name flags are type-specific:

```bash
coolify database create postgresql --project-uuid <uuid> --server-uuid <uuid> \
  --postgres-db mydb --postgres-user admin --postgres-password <pw> --instant-deploy

coolify database create mysql --project-uuid <uuid> --server-uuid <uuid> \
  --mysql-database mydb --mysql-user admin --mysql-password <pw> --mysql-root-password <pw>

coolify database create redis --project-uuid <uuid> --server-uuid <uuid> --redis-password <pw>

coolify database create mongodb --project-uuid <uuid> --server-uuid <uuid> \
  --mongo-database mydb --mongo-root-username admin --mongo-root-password <pw>
```
Other type-specific flags: `--mariadb-database/-user/-password/-root-password`,
`--keydb-password`, `--dragonfly-password`, `--clickhouse-admin-user/-password`.
Common flags: `--is-public` + `--public-port` to expose externally, `--image` to override the
Docker image, `--limits-cpus`/`--limits-memory`.

## Logs

```bash
coolify database logs <uuid> [-n <lines>] [--show-timestamps]
```

## Environment variables

Same shape as app env vars but no `--preview`/`--build-time` split (database vars are runtime
only), plus `--is-shown-once`:

```bash
coolify database env list <database_uuid>
coolify database env create <database_uuid> --key K --value V
coolify database env update <database_uuid> <env_uuid_or_key> --value V
coolify database env delete <database_uuid> <env_uuid> [--force]
coolify database env sync <database_uuid> --file .env [--is-literal]
```

## Storage

Same pattern as app storage — see [apps.md](apps.md#storage-volumes--config-files):

```bash
coolify database storage list <db_uuid>
coolify database storage create <db_uuid> --type persistent --mount-path /data --name vol
coolify database storage update <db_uuid> --uuid <storage_uuid> --type persistent [...]
coolify database storage delete <db_uuid> <storage_uuid>
```

## Tags

```bash
coolify database tag list <database-uuid>
coolify database tag add <database-uuid> <name>
coolify database tag remove <database-uuid> <tag-uuid>
```

Backup schedules for database storage volumes: see [backups.md](backups.md).
