# BB plugins

Private source repository for BB plugins maintained by Yusuf.

Each directory in `plugins/` is an independent BB plugin. This checkout is the
shared source of truth for the Mac and PC.

```sh
bb plugin install git:https://github.com/YusufLisawi/bb-plugins.git@main --plugin sync
```

The Plugin Sync extension pulls this repository with `git pull --ff-only` and
reloads linked plugins on the local machine. It checks automatically every 15
minutes by default, and the **Pull updates now** button runs the same safe
operation immediately. Local edits outside generated `dist/` output block the
pull rather than being overwritten.

For independently Git-managed plugins that have not been linked to this
checkout, BB's normal update command remains available:

```sh
bb plugin update --all
```

Builtin and third-party plugins are intentionally not mirrored here.
