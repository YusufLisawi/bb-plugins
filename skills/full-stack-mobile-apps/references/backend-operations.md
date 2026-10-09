# API, admin, hosting, and operations

## Hono API

`services/api/src/index.ts` migrates/seeds and mounts `/health`, public `/v1`, and protected `/admin`. `routes/public.ts` maps SQLite snake_case rows to camelCase JSON. `routes/admin.ts` uses Zod `safeParse` for request bodies and prepared statements for database operations. `middleware/admin.ts` checks a long bearer token with `timingSafeEqual`; it refuses to run without a configured token. `lib/import.ts` normalizes/deduplicates batch content and wraps writes in a SQLite transaction. `db/client.ts` enables WAL and foreign keys and creates tables plus soft migrations.

For new entities, define stable IDs, response shape, pagination, validation, and error codes before the mobile screen. Keep writes behind explicit authentication; validate path/query/body values; use parameterized SQL; use transactions for multi-row mutations. Do not expose raw SQL errors or stack traces in public responses. Preserve backward compatibility for mobile releases in the wild. Seed only deterministic development/default content and avoid overwriting edits on restarts. Use migrations with ordering and rollback/backups as schema complexity grows.

The admin console is a static browser client. It detects its nginx `/api/` proxy and sends bearer-authenticated API requests. It edits packs/questions, previews/imports bulk content, sets a minimum app version, and sends push broadcasts. The lightweight shape is useful for one trusted operator. For multiple operators, audit trails, sensitive data, or high-risk commands, add real admin identity, authorization roles, CSRF/session design, and an action history. Do not treat a browser-stored shared token as a robust multi-user admin system.

## SQLite fit and care

SQLite plus `better-sqlite3` is simple for one host with low/moderate writes and a persistent local volume. WAL and foreign keys are explicit. Keep the DB on a persistent volume, take SQLite-consistent backups (SQLite backup API or a controlled checkpoint/copy procedure), and practice restoration. Do not back up only `app.db` while active WAL files contain uncheckpointed writes. Move to a managed relational database when multiple app instances need shared writes, write contention becomes material, or strong managed backup/replication is required.

## Deployment shape

Root `docker-compose.yml` builds API plus nginx web/admin images, mounts a named SQLite volume, passes server-only `ADMIN_TOKEN`, and exposes each surface on a host port for Coolify routing. `deploy/nginx-web.conf` proxies `/api/`; `deploy/nginx-admin.conf.template` proxies `/api/` and forwards Authorization. The API Dockerfile builds TypeScript in a build stage and installs production dependencies in a runtime stage. `scripts/smoke-test.sh` checks health, legal pages, public content, auth rejection, and admin CRUD.

For a new app, use `templates/env.example` as an inventory, set real secrets in hosting/EAS secret management, define app-specific domains and port routing, add container health checks, and test that unauthenticated admin routes stay closed. Prefer network isolation for the API/admin where possible; a proxy alone is not access control. Preserve the persistent DB volume during redeploys. Exclude `.env`, private keys, native credentials, DB snapshots, and build artifacts from version control. `EXPO_PUBLIC_*` values are public in client bundles.

The source smoke script performs create/delete against the configured API and assumes a fixed pack count, so it is unsafe as a general production probe. Split read-only production health checks from write tests against an ephemeral test DB. Keep product-specific counts out of the reusable gate.

## Push, updates, and content operations

Public `/v1/push/register` stores Expo tokens; admin `/push/broadcast` sends them via Expo Push Service. The source has token deduplication but no user identity, preference model, rate limit, token receipt cleanup, or scheduled delivery. Add those for scaled or personalized notifications. Keep broadcast privileged and confirm irreversible sends.

The API's `app_config` stores a `minAppVersion` floor. Mobile compares it with its binary version and sends old builds to the store; Expo EAS Update handles compatible JS updates. Use an update channel per environment and a runtime version policy matched to native changes. Check Expo's current [runtime-version guidance](https://docs.expo.dev/eas-update/runtime-versions/) before choosing `appVersion` or `fingerprint`. An `appVersion` policy needs a version bump whenever native code changes. Test download/reload on release builds and recover gracefully offline.

The content workflow includes local/remote import scripts, dry-run, dedupe, and transaction-wrapped replace. Keep import schema documented, make destructive modes explicit, preview counts before apply, and preserve editorial IDs where clients cache them.

## Improve before reuse

- Scope CORS to needed browser origins; validate/limit request sizes and rate-limit public write endpoints such as push registration.
- Add structured request/error logging and a top-level error handler. Do not log admin tokens or push tokens.
- Add a real migration ledger as tables evolve; `CREATE TABLE IF NOT EXISTS` plus one-off `ALTER TABLE` checks will become brittle.
- Add admin authorization appropriate to the number of operators and sensitivity of actions.
- Add backup/restore checks and monitor disk space, WAL growth, server errors, and failed push tickets.
- Keep read-only health probes separate from tests that mutate live content.

Official references: [Hono validation](https://hono.dev/docs/guides/validation), [SQLite WAL](https://www.sqlite.org/wal.html). Confirm library APIs for the chosen versions.
