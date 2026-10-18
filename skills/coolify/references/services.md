# Services (`coolify service` / `coolify services` / `coolify svc`)

One-click services (e.g. Plausible, Umami, n8n) are a bundle of sub-resources — applications
and databases — under one service UUID.

## Lifecycle

```bash
coolify service list
coolify service get <uuid>
coolify service start <uuid>       # deploy all containers
coolify service stop <uuid>        # stop all containers
coolify service restart <uuid>     # restart all containers
coolify service delete <uuid> [--force] [--delete-volumes] [--delete-configurations] [--delete-connected-networks]
coolify service move <uuid> --environment-uuid <uuid>
coolify service clone <uuid> [--destination <uuid>] [--name <name>] [--clone-volumes]
```

## Creating

```bash
coolify service create --list-types                # discover available service types
coolify service create <type> --project-uuid <uuid> --server-uuid <uuid> --instant-deploy
coolify service create <type> --project-uuid <uuid> --server-uuid <uuid> \
  --docker-compose "$(cat custom-compose.yml)"      # advanced: custom compose override
```

## Logs

Service logs require the sub-service name (look it up via `application list` / `database
list` below):

```bash
coolify service logs <uuid> --sub-service-name <name> [-n <lines>] [--show-timestamps]
```

## Sub-resources

Services contain child applications and databases, each independently controllable:

```bash
coolify service application list <service-uuid>
coolify service application get <service-uuid> <application-uuid>
coolify service application start <service-uuid> <application-uuid> [--force] [--latest]
coolify service application stop <service-uuid> <application-uuid>
coolify service application restart <service-uuid> <application-uuid>
coolify service application logs <service-uuid> <application-uuid> [-n <lines>]
coolify service application update <service-uuid> <application-uuid> --human-name <name> [...]

coolify service database list <service-uuid>
coolify service database get <service-uuid> <database-uuid>
coolify service database start <service-uuid> <database-uuid> [--force] [--latest]
coolify service database stop <service-uuid> <database-uuid>
coolify service database restart <service-uuid> <database-uuid>
coolify service database logs <service-uuid> <database-uuid> [-n <lines>]
coolify service database update <service-uuid> <database-uuid> --public --public-port <port> [...]
```

## Environment variables (service-level, shared across sub-resources)

```bash
coolify service env list <service_uuid>
coolify service env create <service_uuid> --key K --value V [--build-time] [--runtime]
coolify service env update <service_uuid> <env_uuid_or_key> --value V
coolify service env delete <service_uuid> <env_uuid> [--force]
coolify service env sync <service_uuid> --file .env
```

## Storage (needs `--resource-uuid` of the sub-resource)

```bash
coolify service storage list <service_uuid>
coolify service storage create <service_uuid> --resource-uuid <sub_resource_uuid> \
  --type persistent --mount-path /data --name vol
coolify service storage delete <service_uuid> <storage_uuid>
```

## Tags & scheduled tasks

```bash
coolify service tag list <service-uuid>
coolify service tag add <service-uuid> <name>
coolify service execute-task <uuid> <task_uuid>
```

Backup schedules for service storage volumes: see [backups.md](backups.md).
