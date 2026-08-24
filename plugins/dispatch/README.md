# BB Dispatch plugin

Dispatch task management inside BB. The plugin gives you a full-width,
BB-native work queue for assigned and unclaimed work, quick add, and a task
detail drawer that opens only when you select a task. Filters and advanced
creation fields stay out of the way until needed. The drawer includes task
editing, comments, subtasks, deletion, claiming, and a pre-filled BB thread
composer for starting work.

The backend talks directly to the Dispatch REST API at `/api/v1`. It does not
require the Dispatch CLI to be installed in the BB host.

## Install

Install from the private GitHub repository:

```sh
bb plugin install git:https://github.com/YusufLisawi/bb-plugin-dispatch
```

Or install a local checkout while developing:

```sh
npm install
bb plugin build
bb plugin install .
```

After source changes, rebuild and reload:

```sh
bb plugin build
bb plugin reload dispatch
```

## Connect Dispatch

Open BB settings and choose the Dispatch connection section. The plugin
supports three authentication paths:

- paste a Dispatch API key;
- import the key and base URL from `~/.dispatch/config.json` on a connected
  host;
- sign in with Dispatch email and password.

The default API URL is
`https://dispatch-kappa-lac.vercel.app/api/v1`. A custom base URL can be set
in the same settings section.

## Project mapping

When a BB project source contains `.dispatch.json`, the plugin uses its
`project` or `slug` value to map BB work to the matching Dispatch project.
Mappings can also be selected and remembered from the task and thread flows.

Starting a BB thread from a task opens BB's native thread composer with the
task context, project, environment, and prompt pre-filled. On submit, the
plugin claims the task, moves it to `in_progress`, adds a `bb://thread/<id>`
comment, and remembers the link for later.

## Development

The plugin SDK is pinned to the BB version used to scaffold this repository.
Refresh its declarations when the running BB version changes:

```sh
bb plugin types
npx tsc --noEmit
bb plugin build
```

The UI uses vendored components in `components/ui/` and the BB-shimmed
`sonner` package for toast notifications. The generated `dist/` artifacts are
committed so managed Git installs can load the plugin without a local npm
toolchain; rebuild them whenever source changes.
