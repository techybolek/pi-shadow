## The shadow says so when Main quits
In Main, type /shadow watch Main for mistakes and number your remarks and press enter: Main shows a line containing "Opened shadow".
In Main, type Reply with one word: hi and press enter: Main answers.
View the shadow pane and wait for it to finish: the shadow has replied.
View Main, type /quit and press enter: pi exits and a shell prompt appears.
Wait 6 seconds, then view the shadow pane: its last line reads "shadow-1 · Main ended" and a line on screen contains "Main exited".
In the shadow pane, type /shadow send main #1 and press enter: the pane shows "Main ended. Note not sent."

## /new in Main disconnects the shadow
In Main, type /shadow watch Main for mistakes and number your remarks and press enter: Main shows a line containing "Opened shadow".
In Main, type Reply with one word: hi and press enter: Main answers.
View the shadow pane and wait for it to finish: the shadow has replied.
View Main, type /new and press enter: Main shows an empty new conversation.
Wait 6 seconds, then view the shadow pane: its last line reads "shadow-1 · Main ended".

## /reload in Main keeps the shadow connected
In Main, type /shadow watch Main for mistakes and number your remarks and press enter: Main shows a line containing "Opened shadow".
View Main, type /reload and press enter: Main reloads.
Wait 6 seconds, then view the shadow pane: a status line on screen still reads "shadow-1 · watching Main" and none reads "Main ended".
In Main, type Reply with one word: hi and press enter: Main answers.
View the shadow pane and wait for it to finish: it shows "Main's reply:" and a reply of its own.
