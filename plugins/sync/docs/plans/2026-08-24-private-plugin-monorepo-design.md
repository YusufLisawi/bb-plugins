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

Each machine keeps one local clone of the private repository:

- Mac: `/Users/yusufisawi/Developer/bb-plugins`
- PC: `/home/yusuf/Developer/bb-plugins`

Existing path-based plugins are moved in place to their matching directory in
that clone with `bb plugin install path:<clone>/plugins/<plugin-id>`. BB
preserves their settings, secrets, schedules, and database when moving a path
source, unlike an uninstall/reinstall migration.

The Plugin Sync button is a local Git refresh on the server where it is
pressed. It runs `git pull --ff-only` inside that machine's clone, discovers
the installed plugins sourced from that clone, and reloads them so the new
code takes effect. It deliberately excludes reloading itself until the next
manual reload, avoiding an in-flight RPC being interrupted.

The sync command may be run manually or on the existing automatic interval.
There is no peer URL, token, Tailscale endpoint, or server-to-server request:
each BB server independently pulls from the same private GitHub repository.

## Safety

- The GitHub repository is private.
- No plugin data, BB databases, secrets, or general settings are placed in
  Git.
- Git pulls use `--ff-only`; a divergence or local edit stops without merging,
  overwriting, or deleting any files.
- No plugin data, BB databases, secrets, or general settings are synchronized
  through Git. This feature synchronizes plugin source code only.
- Each machine is moved to the local checkout and verified independently.

## Validation

- Confirm every migrated package builds and passes its existing checks before
  publishing.
- Confirm the GitHub repository is private and its collection manifest lists
  each migrated plugin.
- Confirm each machine reports a `path:` source under its local clone for
  every migrated plugin.
- Confirm the Sync button performs a clean fast-forward pull and reloads the
  matching plugins without modifying unrelated plugins.
