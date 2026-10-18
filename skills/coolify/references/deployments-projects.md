# Deployments, Projects, Environments, Destinations, Servers

## Deployments (`coolify deploy`)

Trigger by name, UUID, or fan out to many resources at once. `--force` bypasses build cache;
`--instant-deploy` skips the queue; `--pull-request-id` targets a preview deployment.

```bash
coolify deploy name <resource_name> [--force] [--instant-deploy] [--pull-request-id <n>] [--docker-tag <tag>]
coolify deploy uuid <uuid> [--force] [--instant-deploy]
coolify deploy batch app1,app2,worker [--force]

coolify deploy list                    # all currently running deployments
coolify deploy get <uuid>
coolify deploy cancel <uuid> [--force]
```
`deploy name`/`deploy batch` are the only commands in the whole CLI that accept a resource
*name* instead of a UUID.

## Projects (`coolify project` / `coolify projects`)

```bash
coolify project list
coolify project get <uuid>
coolify project create --name <name> [--description <desc>]
coolify project update-environment <project_uuid> <environment> --name <name> --description <desc>
```
Projects group resources (apps/databases/services) and contain named environments
(e.g. `production`, `staging`) — most `create` commands take `--environment-name` or
`--environment-uuid` to place the resource in one.

## Destinations (`coolify destination`)

A destination is a Docker network target on a server (standalone or swarm) — resources deploy
into a destination.

```bash
coolify destination list [--server <server_uuid>]
coolify destination get <uuid>
coolify destination create --server <server_uuid> --network <docker_network_name> [--name <name>] [--type standalone|swarm]
coolify destination update <uuid> --name <name>
coolify destination delete <uuid>     # only if unused
```
Also reachable per-server: `coolify server destinations list <server_uuid>` /
`coolify server destinations create <server_uuid> --network <name>`.

## Servers (`coolify server` / `coolify servers`)

```bash
coolify server list
coolify server get <uuid> [--resources]     # --resources includes attached apps/databases
coolify server add <name> <ip> <private_key_uuid> [-p 22] [-u root] [--validate]
coolify server remove <uuid>
coolify server validate <uuid> [--install]  # --install installs missing prerequisites/Docker
coolify server domains <uuid>
```

### Proxy

```bash
coolify server proxy get <server_uuid>
coolify server proxy update <server_uuid> --proxy-type TRAEFIK [--redirect-enabled] [--redirect-url <url>]
coolify server proxy restart <server_uuid>
coolify server proxy set-config <server_uuid> --configuration-file traefik.yml
```

### Docker cleanup

```bash
coolify server docker-cleanup get <server_uuid>
coolify server docker-cleanup update <server_uuid> --frequency "0 3 * * *" --threshold 80
coolify server docker-cleanup run <server_uuid>
coolify server docker-cleanup executions <server_uuid>
```

### Cloudflare tunnel / Sentinel / log drains

```bash
coolify server cloudflare-tunnel get|enable|disable <server_uuid>
coolify server sentinel get <server_uuid>
coolify server sentinel update <server_uuid> --json '{"is_sentinel_enabled":true}'
coolify server log-drains get <server_uuid>
coolify server log-drains update <server_uuid> --json '{"log_drain_enabled":true}'
```

### Provisioning servers on a cloud provider

Requires a `coolify cloud-token` first (see [misc.md](misc.md#cloud-tokens)). Each provider has
`create` plus lookup commands for its regions/images/sizes/plans/ssh-keys:

```bash
coolify server hetzner create --cloud-token <uuid> --private-key <uuid> --name <name> \
  --location nbg1 --server-type cx22 --image <id> --validate
coolify server hetzner locations <cloud_token_uuid>
coolify server hetzner server-types <cloud_token_uuid>

coolify server digitalocean create --cloud-token <uuid> --private-key <uuid> \
  --region nyc1 --size s-1vcpu-1gb --image <slug>
coolify server digitalocean regions|sizes|images|ssh-keys <cloud_token_uuid>

coolify server vultr create --cloud-token <uuid> --private-key <uuid> \
  --region ewr --plan vc2-1c-1gb --os-id <id>
coolify server vultr regions|plans|os|ssh-keys <cloud_token_uuid>
```

## Resources (cross-cutting)

```bash
coolify resource list    # every app/database/service across all projects, one list
```
