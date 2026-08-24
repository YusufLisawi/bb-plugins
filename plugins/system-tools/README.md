# System Tools

System Tools is a BB sidebar page for monitoring and safely managing the
machine running the BB server.

It currently provides:

- live CPU, RAM, storage, uptime, and host information;
- a file browser with path navigation and protected-location labels;
- move, quarantine, and explicitly confirmed permanent-delete actions;
- a deep cleanup scanner that calculates folder totals and surfaces
  reclaimable macOS/Linux/Windows cache folders, browser data, developer
  artifacts, temporary files, downloads, logs, and genuinely large files;
- a live process viewer with search, graceful stop, and force-kill actions;
- an open-port viewer showing TCP listeners, UDP endpoints, and owning process
  details where the operating system exposes them, with a guarded action to
  terminate a verified non-critical port owner.

System files, PID 1, and BB's own server processes are protected. Deep scans
prioritize known cleanup locations and show aggregate folder sizes, so a
folder containing thousands of small cache files is still visible. Process
actions require explicit confirmation, cleanup actions are review-first, and
quarantine is preferred over permanent deletion. Port actions also protect
privileged ports, common system services, BB-managed processes, and endpoints
whose owner cannot be verified.

## Install

After the first release, install directly from the public repository:

```sh
bb plugin install git:https://github.com/YusufLisawi/bb-plugin-system-tools.git@v0.1.1
```

The plugin will also be available through the BB Community marketplace once
its listing pull request is reviewed and merged.

This plugin has access to the local filesystem, process table, and listening
ports of the BB machine. Install it only from a source you trust.

## Development

```sh
npm install --include=dev
npm run typecheck
npm run build
bb plugin reload system-tools
```
