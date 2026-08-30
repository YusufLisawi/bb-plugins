---
name: bb-sync-workflow
description: Manage this user's repository-backed BB skills and plugins across machines. Use whenever adding, importing, editing, removing, publishing, or troubleshooting a custom BB skill or plugin, or when the user asks whether pushing is enough to sync BB installations.
---

# BB skills and plugins sync

This installation uses the private `YusufLisawi/bb-plugins` Git repository as
the source of truth for custom BB plugins and user skills. The BB Plugin Sync
plugin pulls that repository and reconciles both collections.

## Know the two collections

- A custom plugin belongs at `plugins/<plugin-id>/` and must be listed in the
  repository's `.bb/plugins.json` collection manifest.
- A portable user skill belongs at `skills/<skill-name>/SKILL.md`. Keep its
  supporting scripts, references, and assets inside that directory. The
  directory name must match the skill's frontmatter `name`.
- Do not put symlinks in `skills/`; sync rejects them. Copy the complete skill
  directory, including any support files.
- The repository is the canonical copy. An installed copy under the BB data
  directory is a managed deployment, not the place to make the permanent
  change.

## When adding or importing a skill

1. Create or import the complete directory under `skills/<name>/` in the
   repository. Installing a skill with `npx skills add` alone only installs it
   into a local agent skill root; it does not publish it to this repository.
2. Check the frontmatter and directory name, and make sure `SKILL.md` is
   directly inside the directory.
3. Review the diff, then commit and push the skill to `origin main` when the
   user has authorized publishing.
4. Run `bb sync now --json` on the current BB server to install it immediately.
   Otherwise the Sync service picks it up on its configured interval (normally
   15 minutes).

For an imported skill, copy the whole source directory into the repository;
do not copy only `SKILL.md` if the skill ships `scripts/`, `references/`, or
`assets/`. Preserve real files and remove machine-specific symlinks.

## When changing or removing content

- Edit the repository copy, commit, and push. Then use `bb sync now --json` for
  immediate local reconciliation.
- Sync preserves an installed skill that has been locally edited and reports
  it as skipped. Move the intended change into the repository before trying
  again.
- A deleted repository skill is removed from a machine only when its installed
  copy still matches the last repository-managed version; local edits are
  preserved for safety.
- For a plugin, update its source and `.bb/plugins.json`, run its typecheck,
  tests, and build, then commit and push. Sync installs or updates collection
  plugins and reloads them after a successful pull.

## Verify sync

Start with the current BB context, then inspect the sync plugin:

```bash
bb status
bb sync status --json
bb plugin config sync --json
bb plugin list --json
```

Use the manual pull when a new commit should arrive now:

```bash
bb sync now --json
bb skill list --json
```

The result should show a successful run, no failures, and the skill in the
installed skill list. On another BB server, configure the Sync plugin once with
that machine's local checkout of the same repository:

```bash
bb plugin config sync set repoPath /absolute/path/to/bb-plugins
bb plugin config sync set autoSyncMinutes 15
bb plugin reload sync
```

After that, `git push origin main` is enough to publish a committed repository
skill or plugin; every server with Sync enabled and pointed at its own clone
will pull it on the next interval. Use `bb sync now --json` when immediate
delivery is needed. A push made from a random local skill directory, without
putting the content under this repository's `skills/` or `plugins/` collection,
does not publish it to the other BB servers.

## Keep changes safe

- Pulling is fast-forward-only and refuses to overwrite uncommitted source
  changes in the repository checkout.
- Inspect `git status` before staging and do not include unrelated generated
  plugin artifacts in a skills/plugins commit.
- Never expose credentials from the private repository or put secrets in a
  skill. If a plugin needs a credential, use BB's secure secret flow.
