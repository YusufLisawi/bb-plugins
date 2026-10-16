---
name: account-pool-plus
description: "Configure or diagnose Account Pooler+ accounts, authentication, quota routing, failover, account groups and per-thread account limits through bb pool."
---

# Account Pooler

Use `bb pool` for this plugin's accounts and routes. Inspect current state with
`bb pool status --json` and `bb pool account list --json` before changing routing.
Use `bb pool --help` for available commands.

For account login/import, secret handling, quota refresh, routing settings,
ordering, or failover, read
[references/accounts-and-routing.md](references/accounts-and-routing.md).

Use stdin or supported login/import flows for credentials; never put secret values
in command arguments or chat. Confirm the resulting account and routing state.
Do not enable the plugin or change accounts unless the requested task calls for it.

Pooled rate-limit failures can be retried by Provider Retry using the pool’s
earliest usable account, even if the provider omits structured quota events.
Inspect `bb provider-retry explain <thread-id> --json` for the last decision
and `bb provider-retry status <thread-id> --json` for pending retries.

## Groups and per-thread accounts (Account Pooler+)

`bb pool group list`, `bb pool group save <name> <account-id...>` and
`bb pool group delete <name-or-id>` manage named account groups.
`bb pool thread [thread-id]` shows which accounts a thread may use;
`--group <name-or-id>` limits it to a group, `--account <id,id>` to specific
accounts, and `--all` removes the limit. The current thread is the default.
A limited thread never falls back to accounts outside its selection; a
provider with no account in the selection keeps using the whole pool.

