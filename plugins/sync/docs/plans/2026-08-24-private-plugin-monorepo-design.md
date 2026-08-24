# Private BB plugin monorepo design

## Goal

Make a private GitHub repository the canonical source for BB plugins Yusuf
owns, so the Mac and PC can independently install and update the same plugin
revisions without direct server-to-server networking.

## Scope

The monorepo contains only user-owned plugin source folders. BB built-ins,
catalog plugins, and third-party Git/npm plugins remain installed from their
existing official sources and keep their normal BB update behavior.

## Repository layout

The repository root contains a `.bb/plugins.json` collection manifest. Each
plugin remains an independent package below `plugins/<plugin-id>/`, with its
own `package.json`, source, tests, and build output policy.

## Installation and updates

Each BB server installs a selected collection entry using the private Git
source and `--plugin <plugin-id>`. That makes BB record the Git branch as the
managed source rather than a machine-local `path:` directory.

When a plugin changes, Yusuf commits and pushes it once. On either server,
`bb plugin update --all` fetches and applies compatible updates through BB's
normal rollback-capable plugin updater. A scheduled update command may be
added later, but the initial migration keeps updating explicit and
inspectable.

## Safety

- The GitHub repository is private.
- No plugin data, BB databases, secrets, or general settings are placed in
  Git.
- The current direct peer-sync settings are left intact during verification;
  they can be disabled after Git-managed installs work on both machines.
- Each machine is migrated and verified independently. A failed Git activation
  leaves BB's previous managed state available through its updater rollback.

## Validation

- Confirm every migrated package builds and passes its existing checks before
  publishing.
- Confirm the GitHub repository is private and its collection manifest lists
  each migrated plugin.
- Confirm each machine reports the Git source for every migrated plugin.
- Confirm `bb plugin outdated`/`bb plugin update` recognize the managed
  source, without modifying unrelated plugins.
