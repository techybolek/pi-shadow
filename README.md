# pi-agent

`/agent` for [pi](https://github.com/earendil-works/pi) in [herdr](https://github.com/herdrdev/herdr): open a supporting pi agent in a pane beside your conversation (Main). It follows Main, records numbered findings, and sends one to Main only when you ask.

## Install
```sh
pi install ./pi-agent      # or a git source
```
Then `/reload`. Needs pi inside a herdr pane (`HERDR_ENV=1`). Built against pi 1.5.2, herdr 0.9.3.

## Use
- `/agent <job>`: everything after the options is the job; named `agent-N` unless `--name <n>`
- `/agent <saved>`: one word opens `agents/<saved>/agent.md` (text under `## Job` only)
- `--model <m>` (default `anthropic/claude-haiku-5-5`) or `--pick` for a picker
- In the agent's pane: `/agent send main #2`, or `/agent send main` to pick with the arrow keys
- `/agent` lists saved/open agents; `/agent --help` is the full guide. Argument hints show while typing.

## How it maps to pi/herdr
| Need | Built with |
|---|---|
| No turn in Main | `pi.registerCommand` handler: commands skip the `input` event and start no turn; output via `ui.notify` |
| Pane beside Main | `herdr pane split --no-focus --env …` + `herdr agent start <name> --kind pi` |
| Follow Main only | Main's `input` and `message_end` (assistant, stop) hooks append to a per-session feed file; the agent watches it and adds each line as a custom message (a reply triggers a turn) |
| Numbered findings | `agent_finding` tool, registered only in the agent's pi |
| Send without interrupting | queue file; Main's `input` hook attaches queued findings to your next submitted prompt; footer status shows the count |

State lives in `$TMPDIR/pi-agent-<uid>/<main session id>/`.
