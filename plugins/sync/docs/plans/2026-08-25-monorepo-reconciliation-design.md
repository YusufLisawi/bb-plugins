# Monorepo reconciliation design

## Goal

Make the Sync plugin make BB on each machine match the owned plugin collection in
`.bb/plugins.json`, not merely pull files into the local checkout.

## Behavior

On every manual or automatic sync:

1. Verify the configured checkout has no source or configuration edits. Generated
   `plugins/*/dist/**` artifacts are temporarily stashed as a recoverable local
   stash so they cannot block a fast-forward pull; source edits still stop the
   sync. If the pull changes the same generated file, restore it as an ordinary
   worktree change and clear the generated-only conflict so later scheduled
   runs always start with a writable index.
2. Pull it with `git pull --ff-only`, and read the collection manifest.
3. For each collection entry, skip the Sync plugin itself because its current
   process is handling the reconciliation.
4. If the entry is missing from BB, install that entry from the private GitHub
   collection. This lets BB resolve the correct plugin directory, dependencies,
   app bundle, and server factory automatically. The first missing entry this
   fixes is Sidebar Plus on the Mac.
5. If an entry is already installed from the private collection, apply an
   available update and reload it when necessary.
6. If the same plugin id is installed from another source, leave it untouched and
   report the source conflict. Sync must not replace an existing plugin or remove
   its settings without an explicit user action.
7. Never uninstall plugins that are absent from the collection, and never change
   built-in, third-party, settings, tokens, or plugin data.

## Failure handling

Each install, update, and reload is independent. A failure is recorded in the
result and log while the remaining collection entries continue. A sync is marked
`error` if any action fails. Re-running after the cause is fixed is safe because
installed entries are detected before attempting installation again.

## Result reporting

The settings panel and `bb sync now --json` report installed, updated, reloaded,
skipped-conflict, and failed plugin ids so the user can see what BB actually
changed on that machine.
