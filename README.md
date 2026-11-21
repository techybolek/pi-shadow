# pi-shadow

`/shadow` for [pi](https://github.com/earendil-works/pi) in [herdr](https://github.com/herdrdev/herdr): open a shadow in a pane beside your conversation (Main). It starts as a copy of Main's conversation, follows Main live, answers with numbered items, and sends one to Main only when you ask. Modeled on John Lindquist's `/agent` ([herdr-pi-role](https://github.com/johnlindquist/herdr-pi-role)), ported to herdr 0.9's CLI and file-based messaging.

## Install
```sh
pi install ./pi-shadow      # or a git source
```
Then `/reload`. Needs pi inside a herdr pane (`HERDR_ENV=1`). Built against pi 1.5.2, herdr 0.9.3, Linux.

## Use
- `/shadow <job>`: everything after the options is the job; named `shadow-N` unless `--name <n>`
- `/shadow <saved>`: one word opens `shadows/<saved>/shadow.md` (text under `## Job` only)
- `--model <m>` (default `anthropic/claude-haiku-5-5`) or `--pick` for a picker
- In the shadow's pane: `↑` on an empty input picks an item (arrow keys, Enter sends it to Main), or `/shadow send main #2` (`#1,3` for two)
- In Main: `/shadow status`, `/shadow stop <name|all>`, `/shadow inbox`, `/shadow send <name|all> <message>`
- `/shadow` lists saved/open shadows; `/shadow --help` is the full guide. Argument hints show while typing.

## What the shadow sees
1. **A fork of Main's conversation so far**, as background (written by a separate session manager; Main is not modified).
2. **Then, live:** each prompt you submit in Main, Main's tool steps in batches of 3 (command and the first 200 characters of its output) while it works, and each finished reply. Never another shadow's conversation.
3. Its last line reads `<name> · watching Main`; Main's last line reads `Shadows: <name>`.

## How it maps to pi/herdr
| Need | Built with |
|---|---|
| No turn in Main | `pi.registerCommand`: commands skip the `input` event and start no turn; output via `ui.notify` |
| Pane beside Main | `herdr pane split --no-focus --env …` + `herdr agent start <name> --kind pi --session <fork>` |
| Follow Main | Main's `input` and `message_end` hooks append to a per-session `feed.jsonl`; the shadow tails it and sends each item as a custom message that starts its turn |
| Items | the shadow's reply is a verdict plus a numbered list; `#N` and ↑ pick from the latest reply that has items |
| Send without interrupting | `notes.jsonl`; Main's `input` hook attaches notes to your next submitted prompt; `from <name> · …` lines and `N shadow notes` show in Main without touching the input or the running reply |

State lives in `$TMPDIR/pi-shadow-<uid>/<main session id>/` and is deleted when Main quits.

## Tests
`scenarios/shadow.md` and `scenarios/long-run.md` are plain-English scenarios for the lab (`lab-package`). `long-run.md` plants a failing command inside a 5-step Main task and checks the shadow reacts before Main finishes. They need herdr and a model, so there are no unit tests.

## Known limits
- Items are the latest reply that has a numbered list; a later "Nothing new" does not replace them.
- Main's tool output reaches the shadow trimmed to 200 characters per step.
- A progress batch starts one model call for the shadow each time (every 3 Main tool steps).
