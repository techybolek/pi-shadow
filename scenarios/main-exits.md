## The agent says so when Main quits
In Main, type /agent watch Main for mistakes and number your remarks and press enter: Main shows a line containing "Opened agent".
In Main, type Reply with one word: hi and press enter: Main answers.
View the agent pane and wait for it to finish: the agent has replied.
View Main, type /quit and press enter: pi exits and a shell prompt appears.
Wait 6 seconds, then view the agent pane: its last line reads "agent-1 · Main ended" and a line on screen contains "Main exited".
In the agent pane, type /agent send main #1 and press enter: the pane shows "Main ended".

## /new in Main disconnects the agent
In Main, type /agent watch Main for mistakes and number your remarks and press enter: Main shows a line containing "Opened agent".
In Main, type Reply with one word: hi and press enter: Main answers.
View the agent pane and wait for it to finish: the agent has replied.
View Main, type /new and press enter: Main shows an empty new conversation.
Wait 6 seconds, then view the agent pane: its last line reads "agent-1 · Main ended".

## /reload in Main keeps the agent connected
In Main, type /agent watch Main for mistakes and number your remarks and press enter: Main shows a line containing "Opened agent".
View Main, type /reload and press enter: Main reloads.
Wait 6 seconds, then view the agent pane: its last line still reads "agent-1 · watching Main".
In Main, type Reply with one word: hi and press enter: Main answers.
View the agent pane and wait for it to finish: it shows "Main's reply:" and a reply of its own.
