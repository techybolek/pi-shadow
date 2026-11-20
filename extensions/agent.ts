// /agent: open a supporting pi agent in a herdr pane beside Main. It follows Main's conversation
// (prompts + finished replies), records numbered findings, and sends one back to Main only on request.
//
// Files (per Main session):  $TMPDIR/pi-agent-<uid>/<mainSessionId>/
//   feed.jsonl                 Main's prompts and finished replies, appended by Main only
//   queue.jsonl                findings sent to Main, waiting for Main's next prompt
//   agents/<name>/job.md       the job the agent was opened with
//   agents/<name>/findings.jsonl  numbered findings recorded by that agent
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync,
  unwatchFile, watchFile, writeFileSync, openSync, readSync, closeSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import { SessionManager, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_MODEL = "anthropic/claude-haiku-5-5";
const ROOT = join(tmpdir(), `pi-agent-${userInfo().uid}`);
const NAME_RE = /^[a-z][a-z0-9_-]{0,31}$/;
const RESERVED = new Set(["send"]);

// Set by the parent through `herdr pane split --env` only in a supporting agent's pane.
const CHILD_DIR = process.env.PI_AGENT_MAIN_DIR;
const CHILD_NAME = process.env.PI_AGENT_NAME;
const MAIN_SESSION = process.env.PI_AGENT_MAIN_SESSION; // Main's session file: the only history the agent may read
const isChild = !!(CHILD_DIR && CHILD_NAME);
const childJob = () => readFileSync(join(CHILD_DIR!, "agents", CHILD_NAME!, "job.md"), "utf8").trim();

type Finding = { n: number; text: string };
type Queued = { from: string; n: number; text: string };

const readJsonl = <T>(f: string): T[] =>
  existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const textOf = (c: any): string =>
  typeof c === "string" ? c : (c ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
const savedAgents = (cwd: string): string[] => {
  const d = join(cwd, "agents");
  return existsSync(d) ? readdirSync(d).filter((n) => existsSync(join(d, n, "agent.md"))).sort() : [];
};
// Only the text under "## Job", up to the next heading of level 1 or 2.
const savedJob = (cwd: string, name: string): string | undefined => {
  const f = join(cwd, "agents", name, "agent.md");
  if (!existsSync(f)) return undefined;
  const lines = readFileSync(f, "utf8").split("\n");
  const start = lines.findIndex((l) => /^##\s+Job\s*$/i.test(l));
  if (start < 0) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,2}\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
};

const ROLE = (name: string, job: string) => [
  `You are "${name}", a supporting agent that monitors the user's main pi conversation ("Main") from now on.`,
  "Main's conversation reaches you ONLY as messages labelled [Main prompt] and [Main reply]; they arrive by themselves as Main",
  "works. Each [Main reply] is your cue to apply your standing job to that latest exchange. Never look for Main's conversation",
  "anywhere else (files, the repository, /tmp, session folders) and never ask the user to paste it. You cannot talk to Main;",
  "the user reads your findings and decides which ones to send there.",
  "Record each finding with the agent_finding tool: one finding per call, self-contained and short. Do not repeat earlier",
  "findings. If an exchange gives you nothing new, reply in one line. Never ask the user what to do: if the job is vague,",
  "read it in the most useful way for Main's latest exchange. The user may also message you directly; answer them.",
  "Main's earlier conversation (before you opened) is NOT in your context. When a Main message refers to something you",
  "do not know, call main_history once (search a keyword, or get the last messages). If it has nothing, carry on without it;",
  "do not search anywhere else.",
  "",
  "Your standing job:",
  job,
].join("\n");

const HELP = `/agent: a supporting pi agent in a herdr pane beside this one (Main).

Open
  /agent <job>                    open a new agent; everything you type is its job (named agent-1, agent-2, ...)
  /agent <saved>                  one word: the saved agent agents/<saved>/agent.md (only its "## Job" text is used)
  /agent --name <n> <job>         choose the agent's name
  /agent --model <m> <job>        choose the model (default ${DEFAULT_MODEL}); any pi --model pattern
  /agent --pick <job>             choose the model from a picker of your logged-in models
  /agent                          list saved agents, open agents and usage
  /agent --help                   this guide

Opening runs in the command handler: it adds no turn and no message to Main.

What the agent sees
  The job is its standing instructions; opening it runs nothing. From then on it gets each prompt you submit
  in Main and each finished Main reply, as text, from this Main session only (never earlier messages, its own
  or another agent's conversation). Each Main reply starts its turn; a prompt is only added.
  You can also type to it directly in its pane.
  It knows Main's session file and reads earlier history only when needed, with its main_history tool.

Findings (in the agent's pane)
  The agent records findings with its agent_finding tool; each gets a number: #1, #2, ...
  Nothing is sent to Main automatically.
  /agent send main #2             queue finding #2 for Main
  /agent send main                pick a finding with the arrow keys

Delivery to Main
  Sent findings wait in a queue file; Main's footer shows how many. They are attached to the next prompt
  you submit in Main (pi's "input" hook). Main's running reply and your unsent typing are not touched.

Examples
  /agent monitor the main thread's replies for accuracy
  /agent --name tests --model sonnet suggest a test for each change Main makes
  /agent docs                     (uses agents/docs/agent.md)
  /agent send main #1

Needs pi inside a herdr pane (HERDR_ENV=1). State: ${ROOT}/<session id>/ (deleted when Main quits)`;

export default function (pi: ExtensionAPI) {
  let models: string[] = [];
  let cwd = process.cwd();
  let mainDir: string | undefined; // this session's dir as a Main
  let watchedQueue: string | undefined;
  let watchedFeed: string | undefined;

  const herdr = async (...a: string[]) => {
    const r = await pi.exec("herdr", a);
    if (r.code !== 0) throw new Error(`herdr ${a.slice(0, 2).join(" ")}: ${(r.stderr || r.stdout).trim()}`);
    return JSON.parse(r.stdout).result;
  };
  const hasAgents = () => !!mainDir && existsSync(join(mainDir, "agents"));
  const feed = (kind: "prompt" | "reply", text: string) => {
    if (!hasAgents() || !text.trim()) return;
    appendFileSync(join(mainDir!, "feed.jsonl"), JSON.stringify({ kind, text }) + "\n");
  };
  const showQueue = (ctx: any) => {
    const n = mainDir ? readJsonl<Queued>(join(mainDir, "queue.jsonl")).length : 0;
    ctx.ui.setStatus("agent", n ? `agent: ${n} finding${n > 1 ? "s" : ""} waiting (attached to your next prompt)` : undefined);
  };

  pi.on("session_start", async (event, ctx) => {
    cwd = ctx.cwd;
    models = ctx.modelRegistry.getAvailable().map((m: any) => `${m.provider}/${m.id}`);
    mainDir = join(ROOT, ctx.sessionManager.getSessionId());

    // As Main: watch the queue so the footer shows how many sent findings wait.
    watchedQueue = join(mainDir, "queue.jsonl");
    showQueue(ctx);
    watchFile(watchedQueue, { interval: 1000 }, () => showQueue(ctx));

    if (!isChild) return;
    // As a supporting agent: start on the job, then follow Main's feed from now on.
    // The job is standing instructions, not a prompt: nothing runs until Main's first finished reply.
    ctx.ui.setWidget("agent-job", [
      `Watching Main from now on. Job: ${childJob().replace(/\s+/g, " ")}`,
      `Main session: ${MAIN_SESSION || "(not saved)"} — readable with main_history`,
    ]);
    watchedFeed = join(CHILD_DIR!, "feed.jsonl");
    let offset = existsSync(watchedFeed) ? statSync(watchedFeed).size : 0;
    let partial = "";
    watchFile(watchedFeed, { interval: 500 }, (cur) => {
      if (cur.size <= offset) return;
      const fd = openSync(watchedFeed!, "r");
      const buf = Buffer.alloc(cur.size - offset);
      readSync(fd, buf, 0, buf.length, offset);
      closeSync(fd);
      offset = cur.size;
      const lines = (partial + buf.toString("utf8")).split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines.filter(Boolean)) {
        const { kind, text } = JSON.parse(line);
        pi.sendMessage(
          { customType: "agent-main-feed", content: `[Main ${kind}]\n${text}`, display: true },
          { triggerTurn: kind === "reply", deliverAs: "followUp" },
        );
      }
    });
  });

  pi.on("session_shutdown", async (event) => {
    if (watchedQueue) unwatchFile(watchedQueue);
    if (watchedFeed) unwatchFile(watchedFeed);
    // Main leaves no conversation copy behind once it quits or leaves this session.
    if (event.reason !== "reload" && hasAgents()) rmSync(mainDir!, { recursive: true, force: true });
  });

  // ---- Main side: feed prompts and finished replies; attach queued findings to the next prompt.
  pi.on("input", async (event, ctx) => {
    feed("prompt", event.text);
    if (event.source === "extension" || !mainDir) return { action: "continue" };
    const q = join(mainDir, "queue.jsonl");
    if (!existsSync(q)) return { action: "continue" };
    // Take the queue atomically: an agent appending meanwhile creates a fresh queue file.
    const taking = q + ".taking";
    renameSync(q, taking);
    const items = readJsonl<Queued>(taking);
    rmSync(taking);
    showQueue(ctx);
    if (!items.length) return { action: "continue" };
    const block = items.map((i) => `- ${i.from} #${i.n}: ${i.text}`).join("\n");
    return { action: "transform", text: `${event.text}\n\n---\nFindings sent from supporting agents:\n${block}` };
  });

  pi.on("message_end", async (event) => {
    const m: any = event.message;
    if (m.role === "assistant" && (m.stopReason === "stop" || m.stopReason === "length")) feed("reply", textOf(m.content));
  });

  // ---- Supporting-agent side: numbered findings and the role prompt.
  if (isChild) {
    const findingsFile = join(CHILD_DIR!, "agents", CHILD_NAME!, "findings.jsonl");
    pi.registerTool({
      name: "agent_finding",
      label: "Finding",
      description: "Record one finding for the user. It gets a number; the user may send it to Main.",
      promptSnippet: "Record one numbered finding for the user",
      promptGuidelines: ["Use agent_finding once per finding; never put several findings in one agent_finding call."],
      parameters: Type.Object({ text: Type.String({ description: "The finding, self-contained and short" }) }),
      executionMode: "sequential",
      async execute(_id, params) {
        const n = readJsonl<Finding>(findingsFile).length + 1;
        if (!existsSync(join(CHILD_DIR!, "agents"))) throw new Error("Main has closed its session; findings can no longer be sent.");
        appendFileSync(findingsFile, JSON.stringify({ n, text: params.text }) + "\n");
        return { content: [{ type: "text", text: `#${n}: ${params.text}` }], details: { n } };
      },
    });
    // Main's earlier conversation, on demand, read only from Main's own session file.
    pi.registerTool({
      name: "main_history",
      label: "Main history",
      description: "Read Main's conversation (user prompts and Main's replies, text only) from Main's session file.",
      promptSnippet: "Read Main's earlier conversation when you lack context",
      parameters: Type.Object({
        search: Type.Optional(Type.String({ description: "Return only messages containing this text (case-insensitive)" })),
        last: Type.Optional(Type.Number({ description: "How many of the latest matching messages to return (default 20)" })),
      }),
      async execute(_id, params) {
        const none = (why: string) => ({ content: [{ type: "text" as const, text: why }], details: {} });
        // pi writes a session file only after its first message.
        if (!MAIN_SESSION || !existsSync(MAIN_SESSION)) return none("Main has no earlier messages.");
        let msgs = SessionManager.open(MAIN_SESSION).getBranch()
          .filter((e: any) => e.type === "message" && (e.message.role === "user" || e.message.role === "assistant"))
          .map((e: any) => `[${e.message.role === "user" ? "Main prompt" : "Main reply"}] ${textOf(e.message.content).trim()}`)
          .filter((t: string) => !/^\[[^\]]+\] $/.test(t));
        if (params.search) msgs = msgs.filter((t: string) => t.toLowerCase().includes(params.search!.toLowerCase()));
        if (!msgs.length) return none(params.search ? `Nothing in Main's history mentions "${params.search}".` : "Main has no earlier messages.");
        let out = msgs.slice(-(params.last ?? 20)).join("\n\n");
        if (out.length > 20000) out = "…(older text cut)\n" + out.slice(-20000);
        return none(out);
      },
    });
    // Guard: the agent's own tools may not name the state folder (feeds of any Main live there).
    pi.on("tool_call", async (event) => {
      if (JSON.stringify(event.input).includes("pi-agent-"))
        return { block: true, reason: "Main's conversation reaches you only as [Main ...] messages; this folder is off limits." };
    });
    pi.on("before_agent_start", async (event) => {
      event.systemPromptOptions.sections["supporting-agent"] = ROLE(CHILD_NAME!, childJob());
    });
  }

  const send = async (rest: string[], ctx: any) => {
    if (!isChild) return ctx.ui.notify("/agent send works only in a supporting agent's pane.", "error");
    if (rest[0] !== "main") return ctx.ui.notify("Usage: /agent send main [#N]", "warning");
    const findings = readJsonl<Finding>(join(CHILD_DIR!, "agents", CHILD_NAME!, "findings.jsonl"));
    if (!findings.length) return ctx.ui.notify("No findings yet.", "warning");
    let f: Finding | undefined;
    if (rest[1]) {
      const n = Number(rest[1].replace(/^#/, ""));
      f = findings.find((x) => x.n === n);
      if (!f) return ctx.ui.notify(`No finding ${rest[1]}. Have #1..#${findings.length}.`, "error");
    } else {
      const labels = findings.map((x) => `#${x.n} ${x.text.replace(/\s+/g, " ").slice(0, 100)}`).reverse();
      const pick = await ctx.ui.select("Send which finding to Main?", labels);
      if (!pick) return;
      f = findings.find((x) => x.n === Number(pick.slice(1, pick.indexOf(" "))));
    }
    const q = join(CHILD_DIR!, "queue.jsonl");
    if (!existsSync(CHILD_DIR!)) return ctx.ui.notify("Main has closed its session; nothing to send to.", "error");
    appendFileSync(q, JSON.stringify({ from: CHILD_NAME, n: f!.n, text: f!.text } satisfies Queued) + "\n");
    const waiting = readJsonl<Queued>(q).length;
    ctx.ui.notify(`Queued #${f!.n} for Main (${waiting} waiting). It is attached to the next prompt you submit there.`, "info");
  };

  const list = (ctx: any) => {
    const saved = savedAgents(ctx.cwd);
    const open = hasAgents() ? readdirSync(join(mainDir!, "agents")) : [];
    ctx.ui.notify([
      `Saved agents (${join(ctx.cwd, "agents")}/<name>/agent.md): ${saved.join(", ") || "none"}`,
      `Opened from this session: ${open.join(", ") || "none"}`,
      "",
      "Usage: /agent [--name <n>] [--model <m> | --pick] <job or saved agent>    /agent send main [#N]    /agent --help",
    ].join("\n"), "info");
  };

  const open = async (args: string[], ctx: any) => {
    let model = DEFAULT_MODEL;
    let pick = false;
    let name = "";
    while (args[0]?.startsWith("--")) {
      const a = args.shift()!;
      if (a === "--pick") pick = true;
      else if (a === "--model") model = args.shift() ?? "";
      else if (a.startsWith("--model=")) model = a.slice(8);
      else if (a === "--name") name = args.shift() ?? "";
      else if (a.startsWith("--name=")) name = a.slice(7);
      else return ctx.ui.notify(`/agent: unknown option ${a}. See /agent --help.`, "warning");
    }
    const fail = (m: string) => ctx.ui.notify(`/agent refused: ${m}`, "error");
    if (!model) return fail("--model needs a value");
    // Everything after the options is the job; one word alone means a saved agent.
    let job = args.join(" ").trim();
    if (!job) return fail("give a job, e.g. /agent check Main's replies for accuracy. See /agent --help.");
    if (args.length === 1) {
      const saved = savedJob(ctx.cwd, args[0]);
      if (saved === undefined)
        return fail(`no saved agent agents/${args[0]}/agent.md. A job needs more than one word, e.g. /agent check Main's replies for accuracy`);
      if (!saved) return fail(`agents/${args[0]}/agent.md has no text under "## Job"`);
      job = saved;
      name ||= args[0];
    }
    if (name && (!NAME_RE.test(name) || RESERVED.has(name)))
      return fail(`"${name}" is not a valid name (a-z, 0-9, _ or -, start with a letter; not "send")`);
    if (!name) {
      // herdr agent names must be unique among live agents.
      const r = await pi.exec("herdr", ["agent", "list"]);
      const taken = new Set<string>(r.code === 0 ? (JSON.parse(r.stdout).result.agents ?? []).map((a: any) => a.name).filter(Boolean) : []);
      let i = 1;
      while (taken.has(`agent-${i}`) || (mainDir && existsSync(join(mainDir, "agents", `agent-${i}`)))) i++;
      name = `agent-${i}`;
    }
    const pane = process.env.HERDR_PANE_ID;
    if (process.env.HERDR_ENV !== "1" || !pane) return fail("not running inside a herdr pane");
    if (pick) {
      const choice = await ctx.ui.select("Model for the agent", models);
      if (!choice) return;
      model = choice;
    }

    const dir = mainDir!;
    const agentDir = join(dir, "agents", name);
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "job.md"), job);

    // When /agent was loaded with `pi -e`, the agent's pi needs the same extension.
    const src = pi.getCommands().find((c) => c.source === "extension" && /^agent(:\d+)?$/.test(c.name))?.sourceInfo;
    const ext = src?.scope === "temporary" ? ["-e", src.path] : [];

    // First agent goes right of Main; later ones stack under the previous agent's pane.
    const lastFile = join(dir, "last-pane");
    const last = existsSync(lastFile) ? readFileSync(lastFile, "utf8").trim() : "";
    const live = last ? await pi.exec("herdr", ["pane", "get", last]) : undefined;
    const [target, direction] = live?.code === 0 ? [last, "down"] : [pane, "right"];
    let np: string | undefined;
    try {
      np = (await herdr("pane", "split", target, "--direction", direction, "--cwd", ctx.cwd, "--no-focus",
        "--env", `PI_AGENT_MAIN_DIR=${dir}`, "--env", `PI_AGENT_NAME=${name}`,
        "--env", `PI_AGENT_MAIN_SESSION=${ctx.sessionManager.getSessionFile() ?? ""}`)).pane.pane_id as string;
      await herdr("agent", "start", name, "--kind", "pi", "--pane", np, "--timeout", "60000",
        "--", ...ext, "--model", model, "--name", `agent:${name}`);
      writeFileSync(lastFile, np);
      ctx.ui.notify(`Opened agent "${name}" (${model}) in pane ${np}.`, "info");
    } catch (e: any) {
      if (np) await pi.exec("herdr", ["pane", "close", np]);
      fail(e.message);
    }
  };

  pi.registerCommand("agent", {
    description: "Open a supporting agent beside Main in herdr; /agent send main #N sends a finding back",
    getArgumentCompletions: (prefix: string) => {
      const words = prefix.trimStart().split(/\s+/);
      const cur = words.pop() ?? "";
      const before = words.join(" ");
      const lead = before ? before + " " : "";
      const item = (v: string, d?: string) => ({ value: lead + v, label: v, description: d });
      let opts: { value: string; label: string; description?: string }[] = [];
      if (words.at(-1) === "--model") opts = models.map((m) => item(m));
      else if (words[0] === "send" && words.length === 1) opts = [item("main", "send a finding to Main")];
      else if (words[0] === "send" && words.length === 2 && isChild)
        opts = readJsonl<Finding>(join(CHILD_DIR!, "agents", CHILD_NAME!, "findings.jsonl"))
          .map((f) => item(`#${f.n}`, f.text.slice(0, 60)));
      else if (!words.length || words.every((w, i) => w.startsWith("--") || words[i - 1] === "--model" || words[i - 1] === "--name")) {
        if (!words.length) opts.push(item("--help", "full guide"));
        if (!words.length && isChild) opts.push(item("send", "send a finding to Main: send main #N"));
        opts.push(item("--name", "name the agent (default agent-N)"), item("--model", `model (default ${DEFAULT_MODEL})`), item("--pick", "choose the model from a list"));
        opts.push(...savedAgents(cwd).map((n) => item(n, "saved agent")));
      }
      const hits = opts.filter((o) => o.label.startsWith(cur) && o.label !== cur);
      return hits.length ? hits : null;
    },
    // Command handlers never start a turn; ui.notify prints in this pane only.
    handler: async (raw, ctx) => {
      const args = raw.trim().split(/\s+/).filter(Boolean);
      if (!args.length) return list(ctx);
      if (args[0] === "--help" || args[0] === "-h") return ctx.ui.notify(HELP, "info");
      if (args[0] === "send") return send(args.slice(1), ctx);
      return open(args, ctx);
    },
  });
}
