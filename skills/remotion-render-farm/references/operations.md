# Operations: machines, files, failures

## Where things are

| What | Where |
| --- | --- |
| Runtime: `farm.ts` (CLI, API, coordinator), `worker.ts`, `build-page.ts`, `page/`, Vite, `VERSION` | `~/.local/share/bb-farm/` on every machine; the source is `$SKILL/scripts/runtime/` |
| Chrome for Testing (machines without a usable Chrome) | `~/.local/share/bb-farm/browsers/` |
| Token (every request carries it; never print it) | `~/.config/bb-farm/token`, mode 600, the same on every machine |
| The machines | `~/.config/bb-farm/workers.json` on the coordinator: `[{ "name", "url", "windows", "ssh"? }]` |
| Worker data: builds, each project's public files, job results | `~/.cache/bb-farm/{builds,projects,out}` |
| Chrome profiles of running jobs | `~/.cache/bb-farm/chrome`; a snap Chrome uses `~/snap/<name>/common/bb-farm-chrome` (snaps can't write in hidden folders) |
| A project's farm config | `<project>/farm.json` |
| A project's built page | `<project>/.farm/` (gitignored) |
| Videos and caches | `<project>/out/farm/`: `<Comp>@<size>p.mp4`, plus `cache/` with each size's chunks, the sound, the scan and the probe |

## Services (systemd --user, lingering)

| Service | Machines | Ports |
| --- | --- | --- |
| `bb-farm-worker` | every machine | control `FARM_BIND:7801` (127.0.0.1 here, the Tailscale address elsewhere); pages `127.0.0.1:7802` |
| `bb-farm-api` | the coordinator (this PC) | `7800` on 127.0.0.1 and the Tailscale address |

Each build's page is served at `http://b-<build>.localhost:7802/`. Every build is its own origin, which is a secure
context (WebCodecs work), and a project's absolute paths work as they do in Remotion.

Logs: `journalctl --user -u bb-farm-worker -n 50` (on a remote machine, run it over ssh).

## Adding a machine

Requirements:
- a GPU;
- Linux with systemd;
- bun (`curl -fsSL https://bun.sh/install | bash`);
- SSH key access from this PC;
- reachable over Tailscale or the LAN.

Then:

```bash
farm machine add <name> <user@host> --windows 3     # --chrome /path to use an existing Chrome 148+; --bind <ip>
farm health
```

It does the following:
1. Copies the runtime and the token.
2. Installs Chrome for Testing 155 unless a Chrome is given.
3. Turns Chrome's sandbox off only if Chrome reports "No usable sandbox". AppArmor causes that on Ubuntu 23.10+ with
   Chrome for Testing. Chrome only ever opens the worker's own pages.
4. Writes and starts the service, and enables lingering.
5. Adds the machine to `workers.json`.

The next render uses the machine. Its first render of a project ships that project's `public/` folder once (the film:
260 MB, about 20 s over Tailscale); after that only changed files are sent.

- `farm machine remove <name>`: takes a machine out of the list (its service keeps running).
- `$SKILL/scripts/farm update`: after this skill changes, reinstalls the runtime here and on every machine, and
  restarts them. A machine on another version is skipped by renders until then.

## Failures and fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `skipping <machine>: runtime X, this is Y` | The machine runs another runtime | `$SKILL/scripts/farm update` |
| `skipping <machine>: …connect…` | Service down or machine off | `ssh <host> systemctl --user restart bb-farm-worker`; check `farm health` |
| `chrome exited (21)` | A snap Chrome couldn't create its profile | Profiles go to `~/snap/<name>/common/` (automatic); set `FARM_PROFILES` if Chrome lives elsewhere |
| Chrome aborts: "No usable sandbox" | AppArmor blocks Chrome for Testing's sandbox | `FARM_NO_SANDBOX=1` in the unit (`farm machine add` sets it) |
| Every job takes 25 s more over SSH | Chrome waiting for the keyring | `--password-store=basic` (already in the flags) |
| `Chrome capture (HTML-in-canvas) is not available` | Chrome older than 148, or started without the flags | Use the worker's Chrome; `farm machine add --chrome …` with a newer one |
| `no composition X; the Root has …` | Wrong id or wrong Root | `farm comps <project>`; `farm init <project> --root file#Export` |
| The page build fails | The project's Vite config, imports, or a Root with hooks | Read the error; the entry is `<project>/.farm/page/entry.tsx`; `farm doctor <project>` |
| `remotion: 4.0.399 → upgrade…` | Remotion is too old for the browser renderer's capture mode | Upgrade every `@remotion/*` package and `remotion` to the same version ≥ 4.0.539 (ask first: it changes CLI renders too) |
| `frame not ready after 30 s: <label>` | A `delayRender()` never continued (an image that doesn't load, a missing file) | Fix the asset or the component |
| `joined N frames, expected M` | A chunk came back short | Re-run with `--full` for that composition; report if it repeats |
| A video doesn't show a change you made | The page wasn't rebuilt: the file isn't under `watch` | Add the folder to `farm.json` `"watch"` (default: `src`, `public`, lockfiles, Vite and TS configs) |
| A render waits: `another render is running` | One render at a time per coordinator | Wait; a lock left by a dead process is cleared by itself |

## Disk

- **Workers:** they prune by themselves, at start and every hour. Builds go when unused for 3 days (the newest 10
  stay), job files after 6 hours, Chrome profiles left by killed jobs on the next prune.
- **A project's cache:** it is the size of one video per size, plus WAV chunks when the composition's own sound is
  used. Delete `<project>/out/farm/cache/<Comp>@<size>p/` to drop one.
