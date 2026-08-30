# BB plugins

Private source repository for BB plugins maintained by Yusuf.

Each directory in `plugins/` is an independent BB plugin. The `skills/`
directory is the matching source of truth for BB user skills. This checkout is
shared by every BB server that uses the Plugin Sync extension.

```sh
bb plugin install git:https://github.com/YusufLisawi/bb-plugins.git@main --plugin sync
```

The Plugin Sync extension pulls this repository with `git pull --ff-only`,
reloads linked plugins, and copies each valid `skills/<name>/SKILL.md` folder
into that server's BB data directory (`<dataDir>/skills/<name>`). It checks
automatically every 15 minutes by default, and the **Pull updates now** button
runs the same safe operation immediately. Local edits outside generated
`dist/` output block the pull rather than being overwritten.

Skills are synchronized with conflict protection: a skill changed directly in
`<dataDir>/skills` is kept locally instead of being overwritten or removed.
Commit the intended version under `skills/<name>/` to make it the shared
version. A newly added valid skill folder becomes available to BB agents on the
next skill catalog refresh; no per-machine `npx skills add` command is needed.

For independently Git-managed plugins that have not been linked to this
checkout, BB's normal update command remains available:

```sh
bb plugin update --all
```

Builtin and third-party plugins are intentionally not mirrored here.
