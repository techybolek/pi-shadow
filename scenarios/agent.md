## Open, follow, number findings, send one back to Main
In the pi pane (Main), type /agent --help and press enter: a guide mentioning "/agent send main" appears.
Type /agent alone and press enter: it lists saved agents and a usage line.
Type /agent reviewer Check every Main reply for factual errors and record each one as a finding, and press enter: Main shows a line beginning "Opened agent" and no assistant reply appears in Main.
View the new pane: it runs pi, shows "Watching Main from now on" with the job, and has no assistant reply and no tool calls.
In Main, type What is the capital of Australia? Answer in one sentence. and press enter: Main answers.
View the agent pane: it shows "[Main prompt]" with that question and "[Main reply]" with Main's answer.
In the agent pane, type Record two findings now: first, that Main's answer is short; second, that Main named no source. and press enter: the pane shows "#1:" and "#2:".
In the agent pane, type /agent send main #2 and press enter: it says "Queued #2 for Main".
In the agent pane, type /agent send main and press enter: a picker lists #2 and #1; press down then enter: it says "Queued #1 for Main".
View Main: its footer says "2 findings waiting".
In Main, type Say OK but do not press enter: the footer still says "2 findings waiting" and the typed text is unchanged.
Press enter in Main: the submitted prompt shows "Findings sent from supporting agents" with "reviewer #2" and "reviewer #1", and the waiting count disappears.

## Saved agent and typing hints
In Main, type Use bash to create agents/terse/agent.md containing a "# terse" title, a line "Ignore this line.", a "## Job" heading with the line "Flag any Main reply longer than 50 words.", and a "## Notes" heading with "not part of job". Then reply DONE. and press enter: Main replies DONE.
Type /agent te without pressing enter: a hint "terse" labelled "saved agent" appears. Clear the input with ctrl+u.
Type /agent terse and press enter: Main shows a line beginning "Opened agent".
View the new pane: it shows "Watching Main from now on. Job: Flag any Main reply longer than 50 words." and does not show "Ignore this line" or "not part of job".

## Agent opened before Main has any messages
In Main, type /agent reviewer Check Main's replies for errors and press enter: Main shows a line beginning "Opened agent".
View the new pane and wait 20 seconds: it shows "Watching Main from now on", no assistant reply, no bash, read or ls tool calls, and no mention of a feed file or /tmp.
View Main, type Reply with one word: hello and press enter: Main replies.
View the agent pane and wait for it to finish: it shows "[Main reply]" and then a reply of its own about that exchange.

## Agent reads Main's earlier history only when needed
In Main, type Remember this: my project is called Zephyr and it is written in Rust. Reply OK. and press enter: Main replies.
Type /agent ctx Check that Main's replies are consistent with what the user said earlier and press enter: Main shows a line beginning "Opened agent".
View the new pane: it shows "Watching Main from now on" and a line beginning "Main session:".
View Main, type In one sentence, what is my project called and what language is it in? and press enter: Main answers with Zephyr and Rust.
View the agent pane and wait for it to finish: it shows a main_history tool call, and its own reply mentions Zephyr or Rust.
