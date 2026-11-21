## Shadow watches a long Main task while it runs
In Main, type /shadow watch Main for mistakes: flag any step whose command failed but is reported as success and press enter: Main shows a line beginning "Opened shadow".
View the new pane: its last line reads "shadow-1 · watching Main".
View Main: its last line contains "Shadows: shadow-1".
In Main, type Make exactly 5 separate bash tool calls, one per message, each running: sleep 6; echo step N (N from 1 to 5), except the third, which must run: sleep 6; ls /nonexistent_dir_x; echo step 3. After the fifth, reply: all steps succeeded. and press enter: Main starts working.
Wait 20 seconds, then view Main: a working indicator is still visible and Main has not given its final answer.
View the shadow pane: it has already reacted to Main's progress, showing text about the commands Main ran (such as sleep or step), even though Main has not finished.
Wait until Main finishes, then view the shadow pane: it shows a numbered item that mentions the failed ls or "nonexistent".
