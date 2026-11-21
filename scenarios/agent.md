## Open, follow, number findings, send one back to Main
In the pi pane (Main), type /agent --help and press enter: a guide mentioning "/agent send main" appears.
Type /agent alone and press enter: it lists saved agents and a usage line.
Type /agent --name reviewer Check every Main reply for factual errors and answer with a numbered list, and press enter: Main shows a line beginning "Opened agent" and no assistant reply appears in Main.
View the new pane: it runs pi, shows its job, its last line reads "reviewer · watching Main", and it has no assistant reply and no tool calls.
In Main, type What is the capital of Australia? Answer in one sentence. and press enter: Main answers.
View the agent pane: it shows "Main's prompt:" with that question and "Main's reply:" with Main's answer.
In the agent pane, type Reply with a numbered list of exactly two items: first, that Main's answer is short; second, that Main named no source. and press enter: the pane shows a numbered list with "1." and "2.".
In the agent pane, type /agent send main #2 and press enter: it says "Sent #2 to Main".
In the agent pane, type /agent send main and press enter: a picker lists #1 and #2; press enter: it says "Sent #1 to Main".
View Main: its last line says "2 agent notes" and lines beginning "from reviewer ·" appear above the input.
In Main, type Say OK but do not press enter: the last line still says "2 agent notes" and the typed text is unchanged.
Press enter in Main: the submitted prompt shows "Notes from supporting agents" with "reviewer #2" and "reviewer #1", and the note count disappears.

## Saved agent and typing hints
In Main, type Use bash to create agents/terse/agent.md containing a "# terse" title, a line "Ignore this line.", a "## Job" heading with the line "Flag any Main reply longer than 50 words.", and a "## Notes" heading with "not part of job". Then reply DONE. and press enter: Main replies DONE.
Type /agent te without pressing enter: a hint "terse" labelled "saved agent" appears. Clear the input with ctrl+u.
Type /agent terse and press enter: Main shows a line beginning "Opened agent".
View the new pane: it shows "Job: Flag any Main reply longer than 50 words.", its last line reads "terse · watching Main", and it does not show "Ignore this line" or "not part of job".

## Agent opened before Main has any messages
In Main, type /agent --name reviewer Check Main's replies for errors and press enter: Main shows a line beginning "Opened agent".
View the new pane and wait 20 seconds: its last line reads "reviewer · watching Main", and it shows no assistant reply and no bash, read or ls tool calls.
View Main, type Reply with one word: hello and press enter: Main replies.
View the agent pane and wait for it to finish: it shows "Main's reply:" and then a reply of its own about that exchange.

## Agent starts with Main's earlier conversation
In Main, type Remember this: my project is called Zephyr and it is written in Rust. Reply OK. and press enter: Main replies.
Type /agent --name ctx Check that Main's replies are consistent with what the user said earlier and press enter: Main shows a line beginning "Opened agent".
View the new pane: its last line reads "ctx · watching Main".
View Main, type In one sentence, what is my project called and what language is it in? and press enter: Main answers with Zephyr and Rust.
View the agent pane and wait for it to finish: its own reply mentions Zephyr or Rust, which only the earlier conversation said.

## The whole sentence is the job
In Main, type /agent monitor the main threads responses for accuracy and press enter: Main shows a line beginning "Opened agent "agent-1"".
View the new pane: it shows "Job: monitor the main threads responses for accuracy".
View Main, type What is 17 times 23? Answer with the number only. and press enter: Main answers.
View the agent pane and wait for it to finish: it reacts to "Main's reply:" by judging whether the answer is accurate, and it does not ask the user what to do.
In Main, type /agent helloworld and press enter: Main shows a line containing "no saved agent" and no new pane opens.

## Agent checks a factual Main answer without asking the user
In Main, type /agent watch the responses for accuracy and press enter: Main shows a line beginning "Opened agent".
View Main, type Use bash to list the files in this folder and tell me which file defines the /agent command. and press enter: Main answers.
View the agent pane and wait for it to finish: the agent judges whether Main's answer is accurate, and it does not ask the user what to do or whether to verify.

## The agent pane's keys and Main's commands
In Main, type /agent --name helper watch Main and number your remarks and press enter: Main shows a line beginning "Opened agent".
In Main, type /agent status and press enter: Main lists "helper" with its model.
In Main, type /agent send helper Reply with a numbered list of two fruit names. and press enter: Main shows "Sent to helper".
View the agent pane and wait for it to finish: it shows a numbered list with "1." and "2.".
In the agent pane, press up with the input empty: a picker titled "Send which item to Main?" appears; press escape.
In Main, type /agent stop helper and press enter: Main shows "Stopped helper" and its last line no longer contains "Agents: helper".
