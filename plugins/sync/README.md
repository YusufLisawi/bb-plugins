# BB Plugin Sync

Safely compare and synchronize BB plugin setup between two independently
running BB servers.

The plugin is deliberately conflict-first. It applies a plugin installation,
enabled-state, or non-secret setting change only after it has a previous
baseline showing that exactly one server changed it. Differences present at
the first comparison are shown as conflicts rather than silently overwritten.

## Install and pair

Install this plugin on both BB servers. For a local checkout:

```sh
bb plugin install /absolute/path/to/bb-plugin-sync --yes
```

On each server, choose **Reveal local token** in the plugin Settings page (or
run `bb sync token`) and copy that token into the other server's **Peer sync
token** setting. Set the other server's public BB Connect URL as **Peer BB
URL**. For this setup those URLs are:

- Mac: `https://yusuf-mac.getbb.app`
- PC: `https://yusuf.getbb.app`

The token is a secret plugin setting and is never rendered in the plugin UI.
Pairing only works over the authenticated BB plugin route.

## Use

```sh
bb sync status       # local pairing status
bb sync plan         # compare servers; writes nothing
bb sync now          # apply only unambiguous changes
bb sync token        # print this server's one-time pairing token
```

The Settings → Plugins → Plugin Sync page has the same status, preview, and
sync-now controls. Set Automatic sync to check every 15, 60, or 240 minutes.

## What the first version syncs

- Managed Git, npm, and builtin plugins that are missing on the other server.
- A one-sided compatible update to a managed plugin, when both servers still
  use the same source. This works for both **Sync now** and Automatic sync.
- Enabled/disabled state.
- Non-secret plugin settings.

It intentionally does not uninstall existing plugins, replace an existing
different source, transfer path-based plugin folders, downgrade a plugin, or
transfer secret values. Those cases remain visible as conflicts or
confirmation-required items. This prevents a sync run from destroying a local
plugin setup or silently copying credentials.

## Development

```sh
npm run typecheck
npm test
npm run build
```

The design and staged follow-on work are in
`docs/plans/2026-08-23-bb-plugin-sync-design.md`.

A BB plugin.

## UI components

`components/ui/` is vendored source you own (the shadcn model): edit the
files freely — they never update out from under you. Add more from the BB
component registry (the full shadcn set, version-matched to your BB install
via the pinned ref in `components.json`):

```
npx shadcn add @bb/dialog @bb/select
```

Run `npm install` once before `bb plugin build` — the vendored components'
npm deps bundle into your dist. React, and BB-shimmed packages like the
radix portal primitives and `sonner` (`import { toast } from "sonner"`
reaches BB's own toaster), are provided by the BB app at runtime and never
bundled. Ship `dist/` (npm tarball or committed for git installs) so
people installing your plugin never need npm.

## Manifest

`package.json` is the plugin manifest. Notable fields:

- `bb.server` — backend entry (required); optional `bb.app` for a frontend.
- `bb.name` and `bb.description` — required human-facing identity.
- `bb.branding` — required; declare `icon` as a BB icon name or a
  plugin-relative compact SVG, or declare `logo.light` (with optional
  `logo.dark`). Logo assets must be relative `.svg`, `.png`, or
  `.webp` files.
- `engines.bb` — supported bb app version range.
- `engines.bbPluginSdk` — the lowest plugin SDK you need (scaffold:
  `>=0.4.8`). BB reads this as a floor, not a ceiling: a later
  SDK in the same major still loads your plugin.
- `dependencies` — every package your source imports that BB does not provide.
  `bb plugin build` inlines them into `dist/`, and git installs resolve this
  list alone, so a build-required package here rather than in
  `devDependencies` is what keeps your plugin installable. `devDependencies`
  is for types and tooling only (BB shims React, the portal primitives, and
  `@get-bb/plugin-sdk` at runtime — never bundle them).

Run `bb plugin build` before publishing git/npm installs. It writes
`dist/server.js` + `server.meta.json` (and, with `bb.app`, `app.js` /
`app.css` / `app.meta.json`). Each `*.meta.json` stamps SDK major/version,
`artifactFormatVersion`, `pluginId`, `pluginVersion`, and
`builtWith` so managed installs can verify the artifacts.

## Install

From this directory (`bb plugin new` already ran the install; a fresh clone
needs it):

```
npm install
bb plugin install .
```

After editing sources, reload:

```
bb plugin reload sync
```

## Configure

```
bb plugin config sync
bb plugin config sync set greeting hi
```

## Types & API reference

The plugin API ships as the npm package `@get-bb/plugin-sdk`, pinned to an
exact version in `devDependencies` (`0.4.8` — the SDK of the BB
that scaffolded this plugin). After `npm install`, the full surface is on disk
at:

```
node_modules/@get-bb/plugin-sdk/bundled-types/bb-plugin-sdk.d.ts      # backend
node_modules/@get-bb/plugin-sdk/bundled-types/bb-plugin-sdk-app.d.ts  # frontend
```

Your editor and `tsc` resolve `@get-bb/plugin-sdk` there through ordinary node
resolution — no path mapping. These are readable declarations: open them for an
exact signature.

The SDK surface grows with every BB release, so the pin has to track the BB you
actually run:

```
bb plugin types          # sync this plugin's SDK surface to the running BB
bb plugin types --check  # CI: fail when it does not match
```

Ask BB to write plugins for you: the `bb-plugin-authoring` skill documents
the whole surface with examples.

Confused by the API, or need something the types don't explain? Clone the BB
repo and read the source: <https://github.com/get-bb/bb>.
