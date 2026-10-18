# Backups

Two distinct backup systems, both reached under each resource type:

1. **Database backups** — logical dumps (`pg_dump`/`mysqldump`/etc.) of an entire database
   resource, on a cron schedule. `coolify database backup ...`
2. **Storage volume backups** — filesystem-level backups of a persistent volume attached to
   an app/database/service. `coolify {app,database,service} storage set-backup ...`

## Database backups (`coolify database backup`)

```bash
coolify database backup list <database_uuid>
coolify database backup create <database_uuid> --frequency "0 2 * * *" --enabled \
  [--dump-all | --databases-to-backup db1,db2] \
  [--save-s3 --s3-storage-uuid <uuid>] \
  [--retention-amount-locally 7] [--retention-days-locally 0] [--retention-max-storage-locally 1GB] \
  [--retention-amount-s3 7] [--retention-days-s3 0] [--retention-max-storage-s3 1GB] \
  [--disable-local-backup] [--timeout 3600]
coolify database backup update <database_uuid> <backup_uuid> [same flags]
coolify database backup delete <database_uuid> <backup_uuid> [--delete-s3]

coolify database backup trigger <database_uuid> <backup_uuid>       # run now, outside schedule
coolify database backup executions <database_uuid> <backup_uuid>    # history
coolify database backup delete-execution <database_uuid> <backup_uuid> <execution_uuid> [--delete-s3]
```
`--frequency` is a standard cron expression. Retention flags are independent local vs S3 caps
(count, days, and max storage) — set whichever apply; unset ones default to unlimited/0.

## Storage volume backups (app / database / service)

Identical flag surface across all three resource types — swap the resource prefix:

```bash
coolify app storage set-backup <resource_uuid> <storage_uuid> --frequency "0 2 * * *" \
  [--enabled] [--stop-during-backup] [--save-s3 --s3-storage-uuid <uuid>] \
  [--retention-amount-locally 7] [--retention-days-locally 0] [--retention-max-storage-locally 0] \
  [--retention-amount-s3 7] [--retention-days-s3 0] [--retention-max-storage-s3 0] \
  [--disable-local-backup] [--timeout 3600]

coolify database storage set-backup <resource_uuid> <storage_uuid> --frequency "..."
coolify service storage set-backup <resource_uuid> <storage_uuid> --frequency "..."

coolify {app,database,service} storage run-backup <resource_uuid> <storage_uuid>       # now
coolify {app,database,service} storage delete-backup <resource_uuid> <storage_uuid>    # remove schedule
coolify {app,database,service} run-storage-backup <resource_uuid> <storage_uuid>       # alias, resource-level
```
`--stop-during-backup` briefly stops the container for filesystem consistency — warn the user
this causes a short outage before enabling it on a production resource.
