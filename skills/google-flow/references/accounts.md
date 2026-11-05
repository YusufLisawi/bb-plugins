# Four Google accounts: google1 … google4

The owner has four Google AI Pro accounts. Each one lives in its own persistent browser profile, has its own Flow project,
cookie copy, credits and guard counters, and is addressed with `--account google1 … google4` on `flow.py` and
`aistudio_tts.py`. `--account auto` (the default for `video` and `image`; `speak` is the AI Studio fallback) picks one by the
pool rule below; every result says which (`"account": "google2"`).

```bash
F="python3 <skill-dir>/scripts/flow.py"
$F accounts                       # sign-in state, email Google shows, credits, today's usage, cool-down (opens each Flow home once)
$F accounts --cached              # the same from the saved facts, no browser
$F login --account google3        # the OWNER signs in on a live view (see "Signing in"); one account at a time
$F new-project --save --account google3      # each account needs its own Flow project (a project belongs to one account)
$F video --account auto --start shot.png -p "…"      # the signed-in account with the most room today
$F keepalive --quiet              # daily: still signed in? refresh the cookie copy; exit 2 + JSON when one signed out
```

## Where things are

| What | Where |
|---|---|
| Per-account config / state / cookie copy | `~/.config/google-flow/accounts/<name>/{config.json,state.json,cookies.json,aistudio_state.json}` (cookies 0600) |
| Guard counters and cool-downs | `~/.config/google-flow/guard.json` (v2: `accounts.<name>`; the old single-account file moved to google1 with its rest) |
| Browser server | dedicated PinchTab on `127.0.0.1:9877`, config `~/.local/share/pinchtab/google/config.json` (own token, mode 600), log `server.log` next to it |
| Browser profiles (persistent) | `~/snap/chromium/common/pinchtab-profiles/prof_*` (profile names google1 … google4; `GET /profiles` maps name → folder) |
| Headed mode | `flow.py setup --account google2 --mode headed` (Chrome on a virtual screen, Xvfb `:99`, started on demand); default is headless |

`accounts.py` starts the server, Xvfb and each account's browser **on demand** (a reboot just means the first command starts
them; the profile folders keep every login). It never stops or restarts the server.

**Why not `~/.local/share/pinchtab/profiles`:** this machine's Chromium is a snap. A snap browser cannot write to any hidden
folder under `$HOME` ("Failed to create SingletonLock: Permission denied"), and its `/tmp` is a private one that dies at reboot
(that is why the old `/tmp/codex-pinchtab-profiles/default` could neither survive a reboot nor be copied). `~/snap/chromium/common`
is the persistent place a snap may use; `accounts.profiles_dir()` falls back to `~/.local/share/pinchtab/profiles` when
Chromium is not a snap.

**Never stop or restart a PinchTab server while another one runs.** Its shutdown kills every PinchTab-launched Chrome on the
machine, whichever server owns it (one test stop of the Google server wiped all open tabs of the shared 9867 server). Stop one
account's browser with `accounts.stop_instance(name)` / `POST /profiles/<id>/stop` (safe); leave the servers alone. Restarting
the shared server for any reason will also kill the Google browsers; the next command starts them again and the logins survive.

## Browser choice: why PinchTab stays

PinchTab covers the whole list: named profiles on disk that keep cookies and storage, one separate Chrome per running profile
(own port and API, so four accounts never share cookies, tabs or windows), a headless / headed switch per start (headed on Xvfb
worked), several instances at once, a cookie API (`GET/POST /cookies`, used for the private cookie copy), `evaluate`, trusted
CDP clicks and screenshots (used by `flow_page.js` and the sign-in live view), a token-protected local API, and it has been stable
through weeks of daily use. The costs are the two traps above (snap profile folders, global shutdown kill), both handled by a
dedicated server and the never-stop rule. Playwright / Patchright persistent contexts or raw CDP would need `flow.py`'s whole
client and `flow_page.js` bridge rewritten for no new capability; stealth drivers (nodriver, undetected-chromedriver) address
detection, not persistence, and headed-on-Xvfb already gives a less bot-like browser when it is wanted.

## Signing in (the owner does it, never the agent)

`flow.py login --account google2 [--port 8792]` starts that account's browser on Google's sign-in page and serves a live view
(`127.0.0.1:PORT/<secret>/`; default port 8790 + the account number). In BB: run it in the background, `bb connect expose PORT`,
and give the owner `https://…/<secret>/`. The owner types the email, password and any 2-step prompt on the live view; nothing
typed is logged or printed, and nobody else types or sees a password. The command ends when the tab reaches Flow signed in, then
stores the email Google shows, the credits and a private cookie copy (`accounts/<name>/cookies.json`). One account at a time
(the live view drives one browser). Then `new-project --save --account NAME` creates its Flow project.

Cookie replay still works as before: `setup --account NAME --cookies export.json`, and a signed-out browser re-applies its own
saved copy by itself. Replay from an OLD copy does not always survive the move to a new browser profile: google1's migrated
cookies were rejected and it needed a real sign-in. **Changing the account password ends the browser's session** (Google then
asks "verify it's you"; the saved copy is useless): sign in again on a fresh `login` link. If Flow's landing page shows after
the password, click "Create with Google Flow" in the live view; the page reports "signed in" by itself. Check any account later
with `flow.py accounts --only NAME` (add `--force` for one in a cool-down: it is a read-only visit of the Flow home).

## Safety guard across accounts (google_guard.py)

- **One global lock** for every Google job on every account, and one **global human pause** (20–60 s since the last
  generation ended, whichever account it was): using another account does not make the next job come sooner.
- **Per-account** daily counters (60 images / 12 videos / 80 speech clips per account per local day, `config.json` →
  `guard.cap`) and **per-account cool-downs**: a warning ("unusual activity", quota, rate limit, refusal…) pauses only the
  account that saw it, for `cooldown_min` (120). The other accounts keep working.
- **`auto` = the pool** (images and videos; `google_guard.pick_account`):
  - **Batches:** 16 image jobs stay on one account, then the next signed-in account takes over (google1 → google2 → google4 → …,
    circular); videos: 8 jobs per account. A job is one `image` / `video` command (`--count 4` is still one job). Images and
    videos have separate positions (`guard.json` → `pool.image` / `pool.video`: `{day, account, used}`); `used` counts jobs that
    ended on that account.
  - **Daily start:** the first job of each day (per kind) starts on the day's account: the signed-in accounts in order, one step
    further each day from `guard.pool_anchor` (2026-11-01 = google1, 11-02 = google2, then around again).
  - **Last resort:** `guard.last_resort` (default `["google3"]` = yusufisawi@gmail.com, the owner's main account) is never the
    day's starting account and sits at the end of the rotation: the pool uses it only when every other account is signed out,
    cooling down, over its cap or out of credits, and moves back to a regular account as soon as one can take the job.
  - **Skips:** an account that is signed out (last known state), in a cool-down, over its daily cap, without a Flow project or
    out of credits is skipped and the batch moves on (a fresh batch starts on the next eligible account; if only one account
    is left its batches simply restart). If none qualifies the error lists why for each.
  - `flow.py accounts` prints `pool.image` / `pool.video`: `next` (where the next job goes), `used_in_batch`, `left_in_batch`.
  - Settings: `config.json` → `guard.batch` (`{"image": 16, "video": 8}`), `guard.pool_anchor`. Explicit `--account` jobs bypass
    the pool (they only count toward the batch when they run on the pool's current account).
  - Speech and music do **not** use the pool: they go through the Gemini API. The AI Studio speech fallback takes the signed-in
    account with the most room today (ties: least recently used).
  - Flow characters, uploaded plates and generated tiles are **per project**, so every account's project needs the same
    characters / plates before the rotation can be relied on for a series. Follow-up commands (`list`, `download`, `status`)
  without `--account` use the account that generated last, because a tile lives in one account's project. `--project URL`
  without `--account` also means "the last account": a project URL belongs to one account.
- No generation happens in `accounts`, `keepalive`, `status`, `login`. Accounts in a cool-down are **not visited** by
  `accounts` / `keepalive` (add `--force` to `accounts` to look anyway).

## Keep-alive

`flow.py keepalive [--quiet]` visits each signed-in account's Flow home once (one at a time, through the global lock), checks it
is still signed in (re-applying the saved cookies if not), refreshes the private cookie copy (Google rotates `SIDTS`/`SIDCC`),
records email and credits, and stops the browsers it started. Output `{"ok", "checked": […], "signed_out": […], "skipped": {…}}`;
**exit code 2** when an account that was signed in is now signed out; `--quiet` prints nothing when all is well. Schedule it once
a day, e.g. cron `17 9 * * * python3 <skill-dir>/scripts/flow.py keepalive --quiet` (cron mails the output when it fails) or a BB
automation that runs the same command and notifies on a non-zero exit.
