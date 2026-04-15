# Tests

This file tracks manual regression and feature verification steps.

## Template

### Feature: <name>

#### Prerequisites
- <required setup>

#### Steps
1. <action>
2. <action>

#### Expected Results
- <result>

#### Rollback/Cleanup
- <cleanup action, if any>

### Feature: Localhost chat responsiveness avoids extra sidebar churn

#### Prerequisites
- App is running from this repository on the same machine where the browser is open.
- Start the app without the remote tunnel path, for example `npx codexapp --no-tunnel --no-login`.
- At least one existing thread with enough history to reopen is available.
- Browser developer tools are available for confirming the live connection uses `/codex-api/ws`.

#### Steps
1. Open the app over `http://localhost:<port>` and confirm the Network panel shows a successful `/codex-api/ws` connection instead of waiting for an SSE fallback.
2. Select a thread that has not been opened in the current session yet.
3. Measure the thread-open experience by confirming the existing message history appears immediately, without waiting for an extra loading pause before the first render.
4. Send a prompt that causes multiple tool and reasoning updates while the thread is active.
5. Watch the sidebar while the turn is streaming and confirm the current thread keeps its activity state without the entire thread list visibly reordering on every `item/*` delta.
6. Repeat once more with another short prompt and confirm the `Thinking` or `Writing response` indicators appear quickly after submit.
7. Let the turn finish and confirm the sidebar updates normally once the turn starts and once it completes.

#### Expected Results
- On localhost, the UI starts streaming feedback quickly after submit, with less perceived delay before the first visible state change.
- Reopening a thread no longer waits on a blocking `thread/resume` round-trip before showing persisted history.
- Streaming `item/*` notifications update the active thread content without causing unnecessary whole-sidebar refresh churn.
- Sidebar ordering and unread state still refresh correctly when a turn starts or completes.

#### Rollback/Cleanup
- Close developer tools if they are no longer needed.
- Re-enable tunnel or login startup behavior only if that environment is needed for a separate workflow.

### Feature: Thinking selector only exposes Codex-supported efforts

#### Prerequisites
- App is running from this repository.
- Any thread or the new-thread screen is open with the main composer visible.

#### Steps
1. Open the `Thinking` dropdown in the composer.
2. Confirm the dropdown only lists `Low`, `Medium`, `High`, and `Extra high`.
3. Confirm `None` and `Minimal` are no longer present anywhere in the selector.
4. Switch between the four remaining options and confirm the selected value is reflected in the composer summary/runtime chips.
5. If the browser has older local storage from a previous build, refresh the page and confirm the composer still resolves to a supported effort instead of showing `None` or `Minimal`.

#### Expected Results
- The `Thinking` selector only exposes `low`, `medium`, `high`, and `xhigh`.
- Unsupported legacy efforts such as `none` and `minimal` are not preserved as active UI selections.
- Existing runtime selection flows continue to work with the reduced option set.

#### Rollback/Cleanup
- Restore the preferred supported `Thinking` value for the thread if you changed it during the test.

### Feature: Live overlay hides redundant "Thinking" header

#### Prerequisites
- App is running from this repository.
- A thread can produce a live overlay with reasoning text or an activity summary while a turn is in progress.

#### Steps
1. Open a thread and send a prompt that produces an in-progress live overlay near the bottom of the conversation.
2. Watch the overlay while the runtime is in its generic thinking phase.
3. Confirm the overlay no longer shows a standalone `Thinking` heading above the summary text.
4. Confirm the main summary text still appears as the first visible line of content.
5. Continue the turn until a more specific activity label appears, such as `Running command`, and confirm that specific label still renders when available.

#### Expected Results
- A generic `Thinking` activity label is hidden when it would only duplicate the summary content.
- The live overlay still shows summary text, timestamps, and expansion controls normally.
- More specific runtime labels remain visible.

#### Rollback/Cleanup
- Let the active turn complete or interrupt it if needed.

### Feature: Streaming output updates without visible full-message flicker

#### Prerequisites
- App is running from this repository on localhost.
- A thread can produce a multi-step response with streamed text and at least one live runtime update.

#### Steps
1. Open a thread with enough history that several assistant messages are already visible.
2. Send a prompt that streams for at least a few seconds.
3. Watch the already-rendered older messages while new output arrives.
4. Confirm older messages stay visually stable instead of flashing as if the whole thread re-rendered.
5. While the viewport is pinned to the bottom, confirm incoming output continues to follow smoothly rather than repeatedly jumping.
6. Scroll upward during streaming and confirm the detached viewport remains steady without repeated snap-back attempts.

#### Expected Results
- Existing messages remain visually stable while new streamed content is appended.
- Auto-follow at the bottom feels continuous rather than like a repeated full refresh.
- Detached scrolling mode preserves the reader's position without jitter.

#### Rollback/Cleanup
- Let the active turn finish or interrupt it if needed.

### Feature: Live tool events interleave with assistant text chronologically

#### Prerequisites
- App is running from this repository on localhost.
- A thread can produce a response that alternates between assistant text and tool activity, such as commands, MCP calls, or file changes.

#### Steps
1. Open a thread and send a prompt that is likely to trigger multiple tool events during one response.
2. Watch the conversation while the turn is still streaming.
3. Confirm new `Running command`, `Applying changes`, or `Calling MCP tool` rows appear inline in the same conversation flow instead of collecting in one block at the bottom.
4. Confirm assistant text that arrives after a tool event appears below that tool event, and assistant text that arrived earlier stays above it.
5. Continue until at least two tool events and two assistant-text segments have appeared.
6. Confirm the final order reads like one timeline, for example `command -> text -> command -> text`, rather than `all text first` or `all tools last`.

#### Expected Results
- Live tool events share one chronological stream with assistant text.
- Command, MCP, and file-change rows are ordered by arrival time, not by message category bucket.
- Assistant text that resumes after a tool event appears as a new inline text segment below that event instead of continuing inside the older text block above it.
- The conversation reads as one interleaved execution transcript instead of a top text block plus a bottom tool stack.

#### Rollback/Cleanup
- Let the active turn finish or interrupt it if needed.

### Feature: Mobile settings sheet and conversation follow control

#### Prerequisites
- App is running from this repository.
- A thread with enough messages to scroll is available.
- A mobile-sized browser viewport is available, for example `375x812` or `390x844`.

#### Steps
1. Switch the browser to a mobile-sized viewport and open any thread.
2. Open the sidebar drawer and tap `Settings`.
3. Confirm settings opens as a bottom sheet with a visible top header and close button.
4. Scroll the settings sheet to the bottom and verify the close button remains reachable.
5. Close the sheet by tapping the close button.
6. Re-open `Settings`, then close it by tapping the dimmed backdrop outside the sheet.
7. Re-open `Settings`, then collapse the sidebar drawer from the toolbar and confirm the sheet is dismissed.
8. Start a prompt that produces streaming output, stay at the bottom, and confirm the conversation continues to follow new output.
9. While output is still streaming, manually scroll upward in the conversation list.
10. Confirm the viewport stays on the current reading position and a `Jump to latest` button appears.
11. Tap `Jump to latest` and confirm the conversation returns to the newest output and resumes following.
12. On a desktop viewport, open `Settings`, zoom the browser in, and confirm the panel header with the `X` stays visible while the settings content scrolls inside the panel.
13. While a thread is still responding, change `Model` and `Thinking`, queue a follow-up prompt, and confirm the queued row shows the selected runtime summary.
14. Let the running turn finish and confirm the queued follow-up starts with the preselected `Model` and `Thinking` values instead of the older in-flight values.

#### Expected Results
- On mobile, settings is presented as a bottom sheet instead of an inline sidebar block.
- The settings sheet can be dismissed by the close button, backdrop tap, or by collapsing the sidebar.
- Long settings content scrolls inside the sheet without trapping the close affordance off-screen.
- On desktop, the settings panel remains operable under browser zoom because the panel body scrolls independently and the close affordance stays visible.
- Conversation output only auto-follows while the user is already at the bottom.
- After the user scrolls upward, new streamed output does not pull the viewport downward.
- `Jump to latest` reliably restores the latest position and re-enables follow behavior.
- While a turn is running, model and thinking controls remain editable for the next queued message.
- Queued messages preserve the model and thinking values that were selected when they were queued.

#### Rollback/Cleanup
- Close the settings sheet and return the viewport to its previous size.
- Wait for the active turn to finish or interrupt it if the test thread should not keep running.

### Feature: Mobile composer uses Enter for newline instead of send

#### Prerequisites
- App is running from this repository.
- A mobile-sized browser viewport is available, for example `375x812` or `390x844`.
- Any thread with an enabled composer is open.

#### Steps
1. Switch the browser to a mobile-sized viewport.
2. Focus the main composer and type one line of text.
3. Press `Enter` on the mobile keyboard.
4. Type a second line of text.
5. Confirm the draft remains in the composer and has not been sent yet.
6. Tap the send button.
7. Repeat the same check in the inline history-edit composer, if visible.
8. Switch back to a desktop-sized viewport and press `Enter` in the main composer.

#### Expected Results
- On mobile, pressing `Enter` inserts a newline instead of submitting the message.
- On mobile, sending still works through the send button.
- Inline edit composers follow the same mobile rule as the main composer.
- On desktop, the existing `sendWithEnter` behavior still applies.

#### Rollback/Cleanup
- Remove the test draft or send it intentionally if the thread can keep it.

### Feature: Settings menu removes legacy entries

#### Prerequisites
- App is running from this repository.
- A desktop or mobile browser viewport is available.

#### Steps
1. Open any thread or the home screen.
2. Open the left sidebar, then open `Settings`.
3. Scan the top-level rows in the settings panel.
4. Confirm `Accounts` is no longer rendered as a section.
5. Confirm `Require ⌘ + enter to send`, `GitHub trending projects`, `Dictation language`, and `Telegram` are not present in the menu.
6. Confirm the remaining controls such as `When busy, send as`, `Appearance`, `Chat width`, `Click to toggle dictation`, `Auto send dictation`, `Session`, and `MCP` still render and behave normally.
7. On a narrow viewport, scroll the settings panel and confirm the reduced menu remains easy to scan without hidden rows resurfacing.

#### Expected Results
- The five removed items are absent from the settings panel on both desktop and mobile layouts.
- The remaining settings rows and sections still open, scroll, and close normally.
- No blank placeholder gaps or broken separators remain where the removed items used to be.

#### Rollback/Cleanup
- Close the settings panel.

### Feature: Settings highlights 5h and weekly limits

#### Prerequisites
- App is running from this repository.
- The current Codex account returns `account/rateLimits/read` data with at least one short window and one weekly window.

#### Steps
1. Open any thread.
2. Open the left sidebar, then open `Settings`.
3. Locate the `Limits` section between `Session` and `MCP`.
4. Confirm the section shows `5h limit` and `Weekly limit` cards even before reading the detailed quota cards below.
5. If the account has quota data, confirm each card shows a remaining percentage plus reset timing.
6. If the account includes a plan type, confirm the plan appears as a small badge in the `Limits` header.

#### Expected Results
- `Settings` surfaces `5h limit` and `Weekly limit` as first-class information instead of burying them only inside the generic rate-limit cards.
- The `5h limit` card shows a concise remaining percentage and near-term reset status.
- The `Weekly limit` card shows a concise remaining percentage and weekly refresh time.
- When quota data is still loading or unavailable, the section explains that state explicitly instead of rendering blank values.

#### Rollback/Cleanup
- Close the settings panel.

### Feature: Per-session model and thinking selections stay independent

#### Prerequisites
- App is running from this repository.
- At least two existing threads are available, or one existing thread plus the ability to start a new thread.
- The available runtime controls expose at least two distinct `Model` values, two distinct `Thinking` values, and the `Fast mode` toggle.

#### Steps
1. Open thread A.
2. Change `Model`, `Thinking`, and `Fast mode` to a distinctive combination for thread A, for example `Model A` plus `high` with `Fast mode` enabled.
3. Switch to thread B.
4. Change `Model`, `Thinking`, and `Fast mode` to a different combination for thread B, for example `Model B` plus `low` with `Fast mode` disabled.
5. Switch back to thread A.
6. Confirm thread A restores its original `Model`, `Thinking`, and `Fast mode` selections instead of inheriting thread B's values.
7. Switch again to thread B and confirm thread B still shows its own combination.
8. From the home/new-thread screen, choose another `Model`, `Thinking`, and `Fast mode` combination, send the first message, and confirm the newly created thread keeps that runtime after navigation completes.
9. If forking is available, fork one of the threads and confirm the fork starts with the source thread's `Model`, `Thinking`, and `Fast mode` values.
10. While thread A is running, queue a follow-up message after changing `Model`, `Thinking`, and `Fast mode`, then let the queued turn send.
11. Confirm the queued message uses the snapshotted runtime combination instead of whatever is currently selected when it finally sends.

#### Expected Results
- Changing runtime controls in one thread does not overwrite the selections shown in other threads.
- Returning to a previously visited thread restores the `Model`, `Thinking`, and `Fast mode` values last chosen for that thread.
- A newly created thread inherits the runtime combination chosen before its first send and keeps it after the thread is created.
- A forked thread inherits the source thread's runtime combination instead of the currently visible values from another thread.
- A queued message preserves the `Model`, `Thinking`, and `Fast mode` values chosen when it was queued.

#### Rollback/Cleanup
- Restore each tested thread to its preferred runtime selection if needed.

### Feature: Editing a past message waits for explicit confirmation

#### Prerequisites
- App is running from this repository.
- An existing thread contains at least two completed user turns so rollback would visibly remove later context.

#### Steps
1. Open the thread and locate an older user message with an `Edit` action.
2. Type a different draft into the main composer and leave it there unsent.
3. Click `Edit` on that older message.
4. Confirm a separate, smaller edit composer appears above the main composer instead of replacing the main draft.
5. Confirm the conversation history does not change yet: later assistant replies and later turns should still remain visible.
6. Modify the temporary edit draft, then click the edit-panel `Cancel` action.
7. Confirm the edit panel disappears, the temporary edit draft is discarded, and the main composer still contains the draft text typed in step 2.
8. Click `Edit` on the same earlier message again.
9. Change the edit draft text and click the edit panel send button to confirm the edit.
10. Confirm rollback happens only now: the original turn and all later turns are removed, and the edited message is sent as the new latest user turn.
11. If the thread is still open, repeat once more and verify that manually clicking a rollback action clears the pending edit panel instead of leaving a stale edit state behind.

#### Expected Results
- Clicking `Edit` on a historical message only opens a temporary edit draft and does not immediately rollback the thread.
- The main composer draft remains intact while the temporary edit panel is open.
- Cancelling the edit discards only the temporary edit draft and leaves the thread completely unchanged.
- Rollback happens only when the user explicitly confirms by sending the edited message from the edit panel.
- Pending edit state is cleared if the user cancels or performs a manual rollback.

#### Rollback/Cleanup
- If needed, resend the intended final prompt so the thread ends in the desired state after testing.

### Feature: Compacting keeps thread running and auto-queues follow-up messages

#### Prerequisites
- App is running from this repository.
- An existing thread has enough history for the `Compact` action to be available.

#### Steps
1. Open a thread with the normal composer visible and ensure no turn is currently running.
2. Click `Compact`.
3. Confirm the thread immediately enters a running state in the sidebar and content area, with the activity label showing `Compacting context`.
4. While compaction is still in progress, type a follow-up message in the main composer and press the normal send shortcut/button.
5. Confirm that the message is added to the queued messages list instead of trying to interrupt or immediately start a new turn.
6. Wait for compaction to finish.
7. Confirm the queued follow-up automatically starts sending without requiring another click.

#### Expected Results
- Compacting is treated as an active running state for the thread list and thread activity UI.
- Submitting during compaction automatically queues the message, even if the normal in-progress mode is set to `Steer`.
- Once compaction finishes successfully, the oldest queued follow-up begins automatically.

#### Rollback/Cleanup
- If needed, delete the queued follow-up before compaction completes, or let the follow-up finish so the thread ends in the intended state.

### Feature: Composer @ button opens recent file and folder mentions

#### Prerequisites
- App is running from this repository.
- An existing thread is open and has an enabled composer.
- The thread has a valid workspace `cwd` containing multiple files.

#### Steps
1. Open any thread with the normal composer visible.
2. Click the new `@` button beside the composer controls.
3. Confirm the textarea gains focus and a file mention popover opens above the composer without a noticeable blank wait.
4. If the same workspace was already used earlier in the session, confirm the popover can show recent or warmed suggestions immediately before the refreshed server results arrive.
5. Select one file from the popover, then remove the chip so the composer is clean again.
6. Click `@` again and confirm the file you just mentioned appears near the top of the suggestion list.
7. Type part of a filename after the inserted `@`, for example `App` or `package`.
8. Confirm the popover filters to matching files from the current workspace.
9. Type part of a folder name or parent directory path and confirm at least one folder candidate can appear with a folder icon when the workspace contains matching directories.
10. Click one of the file or folder suggestions in the popover.
11. Confirm the temporary `@query` text is removed from the textarea and the selected path appears as a chip above the composer.
12. If you selected a folder, confirm its chip label is visually distinguishable from a file chip.
13. Click the `@` button again while the cursor is already inside an active file mention token.
14. Confirm the mention popover reopens without inserting a duplicate `@`.
15. Repeat the flow on a narrow/mobile viewport and confirm the `@` control remains tappable and the mention popover is still usable.

#### Expected Results
- Web users can start the file mention flow by clicking an explicit `@` control instead of relying on keyboard typing alone.
- Opening the `@` picker feels immediate because recent mentions and warmed workspace suggestions can render before a fresh search round completes.
- Recently mentioned paths are surfaced first when reopening the picker in the same workspace.
- The `@` button reuses the existing workspace search and chip attachment flow for both files and folders.
- Selecting a suggestion attaches the chosen path as a chip and removes the temporary inline `@query` token from the draft.
- Folder mentions are supported without uploading the folder contents.
- Reopening the picker from an existing mention token does not create duplicate `@@` text.

#### Rollback/Cleanup
- Remove any temporary file chips from the composer if they should not be sent.

### Feature: Completed turns do not leave stale live chunks behind

#### Prerequisites
- App is running from this repository.
- A thread can produce a streamed assistant response long enough to observe partial markdown sections such as headings or lists while it is still generating.

#### Steps
1. Open a thread and send a prompt likely to produce a long, structured response.
2. While the assistant is still streaming, observe partial live content in the conversation area, especially if it contains markdown sections such as `Status`, headings, or lists.
3. Wait for the turn to fully complete without refreshing the page.
4. Confirm the final conversation settles to the persisted assistant response plus the normal `Worked ...` summary, without any extra partial assistant chunk remaining below or above it.
5. Repeat once more with a response long enough that a partial heading or list is visible mid-stream.
6. Confirm that when the turn completes, any temporary partial chunk disappears on its own and does not require a page refresh to clear.
7. Refresh the page anyway and confirm the conversation rendering stays the same before and after the refresh.

#### Expected Results
- Partial `agentMessage.live` content is visible only while the turn is still streaming.
- After completion, stale live chunks do not remain pinned in the conversation.
- Structured markdown fragments such as `Status` headings or partial bullet lists do not stay behind as broken layout blocks.
- Refreshing the page does not change the final rendering because the stale live state has already been cleared in-place.

#### Rollback/Cleanup
- No cleanup is required beyond finishing or interrupting the test turn.

### Feature: Thread list status reflects only this web session

#### Prerequisites
- App is running from this repository.
- At least one existing completed thread from an earlier day/session is visible in the sidebar.
- The app can run one thread in the background while another thread remains selected.

#### Steps
1. Open the web UI fresh in a new browser tab or reload the page.
2. Inspect several historical completed threads in the sidebar before opening them.
3. Confirm those older threads do not show a blue unread dot immediately after page load.
4. Open thread A, send a prompt that takes long enough to observe in-progress state, then switch to another thread or back to the home screen.
5. Confirm thread A shows the spinning working indicator while it is still running.
6. Wait for thread A to finish without selecting it again.
7. Confirm thread A changes from the spinner to a blue unread dot after completion.
8. Select thread A and confirm the blue dot clears after the thread is opened.
9. Let at least two threads show blue unread dots, leave the thread list on `All`, and click `Mark all seen` from the filter row.
10. Confirm all blue unread dots clear immediately while any still-running thread keeps its spinner.
11. Generate or keep at least one blue unread thread, switch the status filter row under `Threads` to `New`, and confirm only blue-dotted threads remain visible.
12. Click `Mark matching seen` while the `New` filter is active.
13. Confirm the visible blue dots clear and the filter automatically returns to `All` so the thread list is not left empty.
14. Switch the status filter to `Running` and confirm only currently running threads remain visible in both project view and chronological view.
15. Combine a search query with `Running` or `New` and confirm the status filter applies within the current search results instead of ignoring search.
16. With any non-`All` status filter selected, click `Show all` and confirm the full thread list returns immediately.
17. Hover a thread status indicator on desktop and confirm it exposes `Running` or `New since opened` as the status meaning while the indicator itself remains visible.
18. Reload the web page again without generating any new thread activity.
19. Confirm thread A and the other historical threads still render without a blue dot after the reload.

#### Expected Results
- Historical completed threads are treated as already seen when the page first opens.
- Only threads that produce new output during the current web page session gain a blue unread dot.
- Running threads continue to show the spinner while work is in progress.
- Opening a blue-dotted thread clears that blue dot.
- The filter-row clear action respects the currently visible scope, using `Mark all seen` for the full list and `Mark matching seen` for filtered subsets.
- Clearing unread dots from the `New` filter returns the list to `All` automatically so the sidebar does not get stuck on an empty filter.
- The `All / Running / New` filter row narrows the thread list consistently in both project and chronological views.
- Search and status filters compose correctly instead of overriding each other.
- `Show all` provides an obvious way to reset the status filter without reopening any menu.
- Thread status indicators expose a clear semantic label for hover/accessibility and stay visible while hovering the row actions.
- Reloading the page resets the unread baseline so stale historical dots do not accumulate across sessions.

#### Rollback/Cleanup
- Wait for any test prompt to finish or interrupt it if it should not keep running.

### Feature: Sidebar rows prioritize active work without overlapping icons

#### Prerequisites
- App is running from this repository.
- At least one thread can be made `running`, one thread can remain `new`, and one project contains more than ten visible threads.

#### Steps
1. Start a thread so it shows the running spinner in the sidebar.
2. Inspect the left edge of that row and confirm only the spinner appears there.
3. Open the thread overflow menu and choose `Pin thread`.
4. Confirm the thread moves into the `Pinned` section and still shows a clean spinner without any overlapping pin affordance.
5. Open the same thread menu again and choose `Unpin thread`.
6. Confirm the thread returns to its project list and the menu remains the only place to pin or unpin it.
7. In project view, confirm each project orders non-pinned threads as `running` first, then `new`, then other history by recency.
8. Switch to chronological view and confirm the same priority ordering still applies across projects.
9. When the `New` count is zero, confirm the `New` filter pill is hidden unless the current filter is already `New`.
10. In a project with hidden rows, confirm the footer reads `Show N more` instead of a generic `Show more`.

#### Expected Results
- Running and unread indicators never share the same visual slot with a pin icon.
- Pinning still works, but only through the thread menu.
- Sidebar ordering surfaces active and unread work before passive history in both list modes.
- The status filter row feels lighter, and the `Show N more` footer reads as project-local context instead of a generic global button.

#### Rollback/Cleanup
- Unpin any test thread if it should not remain in the `Pinned` section.

### Feature: Zoomed desktop sidebar stays in desktop mode

#### Prerequisites
- App is running from this repository in a desktop browser such as Edge or Chrome.
- The browser window can be zoomed to at least `125%` and `150%`.

#### Steps
1. Open the web UI on a desktop browser with a mouse or trackpad.
2. Confirm the sidebar renders in desktop mode with the resizable left pane instead of a mobile drawer overlay.
3. Increase browser zoom to `125%`, then `150%`.
4. Confirm the sidebar remains in desktop mode and does not switch to the mobile slide-over drawer just because the viewport becomes visually narrower.
5. Open `Settings` from the sidebar while still zoomed in.
6. Confirm the settings panel keeps a visible header and close button, and its own contents can scroll vertically without pushing the sidebar footer out of view.
7. Reduce the browser width further while staying on desktop hardware and confirm the layout still behaves as a desktop sidebar until the viewport is genuinely narrow enough for the responsive breakpoint.
8. On an actual phone-sized or emulated touch viewport, open the sidebar and confirm the mobile drawer still uses the wider slide-over width comfortably.

#### Expected Results
- Desktop browsers keep the desktop sidebar layout during ordinary browser zoom changes.
- The mobile drawer mode is reserved for genuinely narrow or coarse-pointer layouts instead of desktop zoom alone.
- The zoomed-in settings panel remains operable because its header stays reachable and its body scrolls independently.
- The mobile drawer remains comfortably wide on touch layouts instead of feeling cramped.

#### Rollback/Cleanup
- Return browser zoom to the preferred default level after testing.

### Feature: Telegram bot token stored in dedicated global file

#### Prerequisites
- App server is running from this repository.
- A valid Telegram bot token is available.
- Access to `~/.codex/` on the host machine.
- The app server base URL is known, for example `http://127.0.0.1:4173`.

#### Steps
1. Run:
   `curl -X POST "$BASE_URL/codex-api/telegram/configure-bot" -H "Content-Type: application/json" -d "{\"botToken\":\"$TELEGRAM_BOT_TOKEN\"}"`
2. Verify file `~/.codex/telegram-bridge.json` exists.
3. Open `~/.codex/telegram-bridge.json` and confirm it contains a `botToken` field.
4. Restart the app server.
5. Run:
   `curl "$BASE_URL/codex-api/telegram/status"`
6. Confirm the returned payload reports `configured: true`.

#### Expected Results
- Telegram token is persisted in `~/.codex/telegram-bridge.json`.
- Telegram bridge remains configured after restart.

#### Rollback/Cleanup
- Remove `~/.codex/telegram-bridge.json` to clear saved Telegram token.

### Feature: Telegram chatIds persisted for bot DM sending

#### Prerequisites
- App server is running from this repository.
- Telegram bot is already configured through `POST /codex-api/telegram/configure-bot`.
- Access to `~/.codex/telegram-bridge.json`.
- The app server base URL is known, for example `http://127.0.0.1:4173`.

#### Steps
1. Send `/start` to the Telegram bot from your DM.
2. Wait for the app to process the update, then open `~/.codex/telegram-bridge.json`.
3. Confirm `chatIds` contains your DM chat id as the first element.
4. Re-run:
   `curl -X POST "$BASE_URL/codex-api/telegram/configure-bot" -H "Content-Type: application/json" -d "{\"botToken\":\"$TELEGRAM_BOT_TOKEN\"}"`
5. Re-open `~/.codex/telegram-bridge.json` and confirm `chatIds` remains present.

#### Expected Results
- `chatIds` is written after Telegram DM activity.
- `chatIds` persists across bot reconfiguration.
- `botToken` and `chatIds` are both present in `~/.codex/telegram-bridge.json`.

#### Rollback/Cleanup
- Remove `chatIds` or delete `~/.codex/telegram-bridge.json` to clear persisted chat targets.

### Feature: Skills dropdown closes after selection in composer

#### Prerequisites
- App is running from this repository.
- At least one thread exists and can be selected.
- At least one installed skill is available.

#### Steps
1. Open an existing thread so the message composer is enabled.
2. Click the `Skills` dropdown in the composer footer.
3. Click any skill option in the dropdown list.
4. Re-open the `Skills` dropdown and click the same skill again to unselect it.

#### Expected Results
- The skills dropdown closes immediately after each selection click.
- Selected skill appears as a chip above the composer input when checked.
- Skill chip is removed when the skill is unchecked on the next selection.

#### Rollback/Cleanup
- Remove the selected skill chip(s) before leaving the thread, if needed.

### Feature: Skills Hub manual search trigger

#### Prerequisites
- App is running from this repository.
- Open the `Skills Hub` view.

#### Steps
1. Type a unique query value in the Skills Hub search input (for example: `docker`), but do not press Enter or click Search yet.
2. Confirm the browse results do not refresh immediately while typing.
3. Click the `Search` button.
4. Change the query text to another value and press Enter in the input.
5. Clear the query, then click `Search` to reload the default browse list.

#### Expected Results
- Typing alone does not trigger remote Skills Hub search requests.
- Results refresh only after explicit submit via the `Search` button or Enter key.
- Empty-state text (if shown) references the last submitted query.
- Submitting an empty query returns the default skills listing.

#### Rollback/Cleanup
- Clear the search input and run a blank search to return to default listing.

### Feature: Dark theme for trending GitHub projects and local project dropdown

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.
- Appearance is set to `Dark` in Settings.
- The `Trending GitHub projects` section is visible on the home screen.

#### Steps
1. On the home/new-thread screen, inspect the `Choose folder` dropdown trigger.
2. Open the `Choose folder` dropdown and confirm menu/option contrast remains readable in dark mode.
3. Inspect the `Trending GitHub projects` section title, scope dropdown, and project cards.
4. Hover a trending project card and the scope dropdown trigger.
5. Toggle appearance back to `Light`, then return to `Dark`.

#### Expected Results
- Local project dropdown trigger/value uses dark theme colors with readable contrast.
- Trending section title, empty/loading text, scope dropdown, and cards use dark backgrounds/borders/text.
- Hover states in dark mode stay visible and do not switch to light backgrounds.
- Theme switch back/forth preserves correct styling for both controls.

#### Rollback/Cleanup
- Reset appearance to the previous user preference.

### Feature: Dark theme for worktree runtime selector and Skills Hub

#### Prerequisites
- App is running from this repository.
- Appearance is set to `Dark` in Settings.
- Skills Hub route is accessible.

#### Steps
1. Open the home/new-thread screen and inspect the `Local project / New worktree` runtime selector trigger.
2. Open the runtime selector and verify menu title, options, selected state, and checkmark visibility in dark mode.
3. Trigger a worktree action that shows worktree status and verify running/error status blocks remain readable in dark mode.
4. Open `Skills Hub` and verify header/subtitle, search bar, search/sort buttons, sync panel, badges, and status text.
5. Verify at least one skill card surface (title, owner, description, date, browse icon) in dark mode.
6. Open a skill detail modal and verify panel, title/owner, close button, README/body text, and footer actions in dark mode.

#### Expected Results
- Runtime dropdown trigger and menu use dark backgrounds, borders, and readable text/icons.
- Worktree status blocks use dark-friendly contrast for both running and error states.
- Skills Hub controls and sync panel are fully dark-themed with consistent hover/active states.
- Skill cards and the skill detail modal render with dark theme colors and accessible contrast.

#### Rollback/Cleanup
- Reset appearance to the previous user preference.

### Feature: Markdown file links with backticks and parentheses render correctly

#### Prerequisites
- App is running from this repository.
- An active thread is open.
- Local file exists at `/root/New Project (1)/qwe.txt`.

#### Steps
1. Send a message containing: `Done. Created [`/root/New Project (1)/qwe.txt`](/root/New Project (1)/qwe.txt) with content:`.
2. In the rendered assistant message, click the `/root/New Project (1)/qwe.txt` link.
3. Right-click the same link and choose `Copy link` from the context menu.
4. Paste the copied link into a text field and inspect it.

#### Expected Results
- The markdown link renders as one clickable file link (not split into partial tokens).
- Clicking opens the local browse route for the full file path.
- Copied link includes the full encoded path and still resolves to the same file.

#### Rollback/Cleanup
- Delete `/root/New Project (1)/qwe.txt` if it was created only for this test.

### Feature: Runtime selector uses a toggle-style control

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.

#### Steps
1. On the home/new-thread screen, locate the runtime control below `Choose folder`.
2. Verify both options (`Local project` and `New worktree`) are visible at once without opening a menu.
3. Click `New worktree` and confirm it becomes the selected option style.
4. Click `Local project` and confirm selection returns.
5. Set Appearance to `Dark` in Settings and verify selected/unselected contrast remains readable.

#### Expected Results
- Runtime mode is presented as a two-option toggle (segmented control), not a dropdown menu.
- Clicking each option immediately switches the selected state.
- Selected option has a distinct active background/border in both light and dark themes.

#### Rollback/Cleanup
- Leave runtime mode and appearance at the previous user preference.

### Feature: Dark theme states for runtime mode toggle

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.
- Appearance is set to `Dark` in Settings.

#### Steps
1. Locate the runtime mode toggle (`Local project` and `New worktree`) under `Choose folder`.
2. Hover each option and verify hover state is visible against dark backgrounds.
3. Select `New worktree`, then select `Local project` and compare active/inactive contrast.
4. Tab to the toggle options with keyboard navigation and verify the focus ring is visible.
5. Confirm icon color remains readable for selected and unselected options.

#### Expected Results
- Toggle container, options, and text/icons use dark-friendly colors.
- Hover and selected states are clearly distinguishable in dark mode.
- Keyboard focus ring is visible and does not blend into the background.

#### Rollback/Cleanup
- Return appearance and runtime selection to the previous user preference.

### Feature: pnpm dev script installs dependencies and starts Vite

### Feature: No automatic restore of last active thread on startup

#### Prerequisites
- App is running from this repository.
- At least one existing thread is available.
- Browser local storage is enabled.

#### Steps
1. Open the app in a regular browser tab (`http://localhost:<port>/`), select any thread, then navigate back to home route (`#/`).
2. Refresh the browser tab.
3. Confirm the app remains on home route and does not auto-switch to `#/thread/:threadId`.
4. Install/open the app in PWA standalone mode, select any thread, navigate to `#/`, and relaunch the PWA.

#### Expected Results
- In regular browser-tab mode, startup does not restore and redirect to the last active thread.
- In PWA standalone mode, startup also does not restore and redirect to the last active thread.
- Existing `openProjectPath` startup behavior still opens the requested project on home.

#### Rollback/Cleanup
- Clear app local storage state if you need to reset startup behavior for retesting.

#### Prerequisites
- `pnpm` is installed globally (`npm i -g pnpm` or via corepack).
- Repository is cloned and `node_modules/` does not exist (or may be stale).

#### Steps
1. Remove `node_modules/` if present: `rm -rf node_modules`.
2. Run `pnpm run dev`.
3. Wait for Vite dev server to start and display the local URL.
4. Open the displayed URL in a browser.

#### Expected Results
- `pnpm install` runs automatically before Vite starts (dependencies are installed).
- Vite dev server starts successfully and serves the app.
- No `npm` commands are invoked.

#### Rollback/Cleanup
- None.

### Feature: Stop button interrupts active turn without missing turnId

### Feature: Backticked HTTP(S) URL renders as clickable link

#### Prerequisites
- App is running from this repository.
- An active thread is open.

#### Steps
1. Send a message containing exactly: `` `https://github.com/marmeladema` ``.
2. Find the rendered message row and inspect the backticked URL token.
3. Click the rendered URL.

#### Expected Results
- The backticked URL is rendered as a clickable link, not plain inline code text.
- Clicking opens `https://github.com/marmeladema` in a new tab.

#### Rollback/Cleanup
- None.

#### Prerequisites
- App is running from this repository.
- At least one thread can run a long response (for example, request a large code explanation).

#### Steps
1. Send a prompt that keeps the assistant generating for several seconds.
2. Immediately click the `Stop` button before the first assistant chunk fully completes.
3. Confirm generation halts.
4. Repeat with a resumed/existing in-progress thread (reload app while a turn is running, then click `Stop`).

#### Expected Results
- No error appears saying `turn/interrupt requires turnId`.
- Turn is interrupted successfully in both immediate-stop and resumed-thread scenarios.
- Thread state exits in-progress and the stop control returns to idle.

#### Rollback/Cleanup
- None.

### Feature: Revert PR #16 mobile viewport and chat scroll behavior changes

### Feature: Revert new-project folder-browser flow to inline add flow

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.
- At least one writable parent directory exists for creating a test project folder.

#### Steps
1. On the home/new-thread screen, open the `Choose folder` dropdown.
2. Click `+ Add new project`.
3. Enter a new folder name (for example `New Project Inline Test`) and click `Open`.
4. Confirm the app selects the newly created/opened project folder.
5. Repeat step 2, but enter an absolute path to an existing folder and click `Open`.

#### Expected Results
- Clicking `+ Add new project` opens inline input inside the dropdown instead of navigating to `/codex-local-browse...`.
- Entering a folder name creates/selects that project under the current base directory.
- Entering an absolute path opens that existing folder without creating a nested directory.

#### Rollback/Cleanup
- Delete the test folder created in step 3 if it was created only for verification.

### Feature: Disable auto-restore to last thread when opening home URL

#### Prerequisites
- App is running from this repository.
- At least one existing thread is available.
- Browser local storage may contain previous app state.

#### Steps
1. Open an existing thread route and confirm messages are visible.
2. Open `http://localhost:<port>/` (home route) in the same browser profile.
3. Refresh the home route once.
4. Close and re-open the app/tab at the home URL again.

#### Expected Results
- The app remains on the home/new-thread screen and does not auto-navigate to `/thread/<id>`.
- Refreshing home still keeps the user on home.

#### Rollback/Cleanup
- None.

#### Prerequisites
- App is running from this repository.
- A thread exists with enough messages to scroll.
- Test on a mobile-sized viewport (for example 375x812).

#### Steps
1. Open an existing thread and scroll up to the middle of the chat history.
2. Wait for an assistant response to stream while staying at the same scroll position.
3. Send a follow-up message and observe chat positioning when completion finishes.
4. Open the composer on mobile and drag within the composer area.
5. Open/close the on-screen keyboard on mobile and verify the page layout remains usable.

#### Expected Results
- Chat behavior matches pre-PR #16 baseline (no PR #16 scroll-preservation logic active).
- No regressions from reverting PR #16 changes in conversation rendering and composer behavior.
- Mobile layout no longer includes PR #16 visual-viewport sync changes.

#### Rollback/Cleanup
- Re-apply PR #16 commits if the reverted behavior is not desired.

### Feature: Thread load capped to latest 10 turns

#### Prerequisites
- App is running from this repository.
- At least one thread exists with more than 10 turns/messages.

#### Steps
1. Open a long thread that previously caused UI lag during initial load.
2. While the thread is loading, immediately click another thread in the sidebar.
3. Return to the long thread.
4. Count visible loaded history blocks and confirm only the newest portion is shown.
5. Call `/codex-api/rpc` with method `thread/read` for the same thread and inspect `result.thread.turns.length`.
6. Call `/codex-api/rpc` with method `thread/resume` for the same thread and inspect `result.thread.turns.length`.

#### Expected Results
- Initial thread load renders only the most recent 10 turns.
- UI remains responsive during thread load.
- You can switch to another thread without the UI freezing.
- `thread/read` and `thread/resume` RPC responses contain at most 10 turns.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Skills list request scoped to active thread cwd

#### Prerequisites
- App is running from this repository.
- Browser DevTools Network tab is open.
- At least two threads exist with different `cwd` values.

#### Steps
1. Reload the app and wait for initial data load.
2. In Network tab, inspect `/codex-api/rpc` requests with method `skills/list`.
3. Verify request params contain `cwds` with only the currently selected thread cwd.
4. Switch to another thread with a different cwd.
5. Inspect the next `skills/list` request and verify `cwds` now contains only the new selected thread cwd.

#### Expected Results
- `skills/list` no longer sends every thread cwd in one request.
- Each `skills/list` call includes at most one cwd for the active thread context.
- Skills list still updates when changing selected thread.

#### Rollback/Cleanup
- No cleanup required.

---

### Feature: GitHub Website Redesign — OpenClaw-Inspired Design + Web Demo Link

#### Prerequisites
- The `docs/index.html` file has been updated with the new design.
- A browser is available to view the page locally or via GitHub Pages.

#### Steps
1. Open `docs/index.html` in a browser (local file or via GitHub Pages).
2. Verify the fixed **navigation bar** at top with brand logo, section links, and "Get the App" CTA.
3. Verify the **announcement banner** below nav shows the XCodex WASM link.
4. Verify **hero section** displays lobster emoji, "AnyClaw" title with gradient, tagline, and four CTA buttons: "Try Web Demo", "Google Play", "Download APK", "GitHub".
5. Click **"Try Web Demo"** button — confirm it navigates to `https://xcodex.slrv.md/#/`.
6. Verify the **stats bar** shows key metrics (2 AI Agents, 1 APK, 0 Root Required, 73MB, infinity).
7. Scroll to **Live Demo** section — verify embedded iframe loads `https://xcodex.slrv.md/#/` with mock browser chrome.
8. Scroll to **Screenshots** section — verify four images render (2 desktop, 2 mobile).
9. Scroll to **Features** section — verify 6 feature cards in a 3-column grid.
10. Scroll to **Testimonials** section — verify two rows of auto-scrolling marquee cards (row 2 scrolls reverse). Hover to pause.
11. Scroll through **Architecture**, **Boot Sequence**, **Quick Start**, and **Tech Stack** sections — verify content renders.
12. Verify the **footer** includes a "Web Demo" link to `https://xcodex.slrv.md/#/`.
13. Test responsive at 768px and 480px — nav links collapse, grids single-column, buttons stack vertically.

#### Expected Results
- Page has a dark, premium feel with gradient accents, grain overlay, and smooth animations.
- All links to `https://xcodex.slrv.md/#/` work (announcement, hero CTA, demo section, quick start text, footer).
- Marquee testimonials scroll continuously and pause on hover.
- Embedded iframe demo loads successfully.
- Mobile responsive layout works at all breakpoints.

#### Rollback/Cleanup
- Revert `docs/index.html` to previous commit if needed.

### Feature: Keep manual chat scroll position during streaming

#### Prerequisites
- App is running from this repository.
- A thread exists with enough history to allow scrolling away from bottom.

#### Steps
1. Open the thread and scroll upward so latest messages are not visible.
2. Send a new message that produces a streaming assistant response.
3. During streaming, do not scroll and observe viewport position.
4. After streaming completes, verify the viewport remains at the same manual position.
5. Repeat the scenario, but this time actively use the mouse wheel or trackpad to continue browsing older content while the response streams.
6. Watch the conversation scrollbar and the browser-level right-hand scrollbar during the stream.

#### Expected Results
- Streaming updates do not force auto-scroll to the bottom when user has manually scrolled away.
- User can continue reading older history while the response streams.
- If the thread is already at the bottom when streaming starts, the latest streaming overlay remains visible.
- While manually scrolling during streaming, the viewport does not get nudged downward in small increments.
- The conversation scrollbar thumb remains visually steady instead of oscillating on each streamed delta.

#### Rollback/Cleanup
- Revert the scroll-preservation change in `src/components/content/ThreadConversation.vue` if manual scroll locking needs to be removed.

### Feature: Compact live plan and live status while response text is streaming

#### Prerequisites
- App is running from this repository.
- A thread can produce a response that shows a live `Plan` card before assistant text starts streaming.

#### Steps
1. Start a prompt that produces a visible live `Plan` card and live runtime status before any assistant text appears.
2. Confirm the live `Plan` already renders as a compact inline summary row with a short preview and a top-right chevron toggle.
3. Click the chevron toggle and confirm the plan expands into an indented scrollable panel instead of a large standalone card.
4. Click the chevron again and confirm the plan collapses back into its inline summary row.
5. While the turn is still planning or calling tools, confirm the live status card still shows full details.
6. Wait until assistant text begins streaming into the conversation body.
7. If the live `Writing response` phase has no summary, details, background agents, reasoning text, or errors, confirm no large bottom live status card is rendered during plain text streaming.
8. Verify the streamed assistant text now occupies more visible vertical space than before.
9. Trigger a live phase that does have extra runtime detail and confirm the live status card still appears for that richer phase.
10. If a live phase with extra detail is shown, click `Minimize` on the expanded live status card and confirm it collapses again.
11. Start another turn and confirm the compact or expanded state resets for the new runtime.
12. Trigger a live `Calling MCP tool` phase and confirm its expanded overlay reads as one aligned summary block instead of a left-rail timeline with separate count and bullet rows.

#### Expected Results
- Live plans stay compact by default, even before answer text starts streaming, and read like inline process annotations instead of standalone cards.
- Expanded plan content is scrollable inside an indented details region instead of permanently taking over a large vertical region.
- Before assistant text appears, live runtime details remain fully visible.
- A bare startup-only `Thinking` overlay that only echoes `Mode / Model / Thinking / Speed` does not render at all.
- During plain `Writing response` streaming with no additional live detail, no standalone live status card is shown.
- Live status cards still appear for phases that actually carry structured runtime detail.
- Expanded live status overlays use the same flatter runtime language as the rest of the timeline, without the old left vertical rail or misaligned bullet rows.
- The assistant's streaming text has a noticeably larger viewport region while the turn is active.
- Expanded state does not leak into the next turn.

#### Rollback/Cleanup
- Revert the compact live-layout change in `src/components/content/ThreadConversation.vue` if the previous full-height layout is preferred.

### Feature: Live tool activity is summarized inline as stage snapshots during a long turn

#### Prerequisites
- App is running from this repository.
- A thread can produce a long turn that includes at least two distinct runtime phases, such as `Thinking`, `Running command`, `Calling MCP tool`, `Applying changes`, or `Coordinating agents`.

#### Steps
1. Start a prompt that causes the model to think, run tools, and then stream a textual answer.
2. While the first non-writing phase is active, confirm the bottom live status card reflects only the current phase instead of an ever-growing cumulative tool count.
3. Wait until the phase changes at least once, for example from `Thinking` to `Running command`, or from `Running command` to `Calling MCP tool`.
4. Confirm completed live stages are collected into a centered inline summary strip above the current live response region, rather than stacking as separate vertical cards.
5. Repeat on a mobile-sized viewport and confirm the stage strip stays as a single horizontally scrollable row instead of wrapping into multiple stacked rows.
6. On mobile, tap one stage chip and confirm only that stage expands; tapping another chip should collapse the previous one.
5. Confirm the raw command, MCP, agent-action, or file-change rows that belong to that completed stage are no longer shown separately in the main live flow.
6. Click one stage chip in the strip and confirm a details panel expands below the strip with the captured reasoning text, activity details, and the tool/file-change rows for that stage.
7. Collapse that stage again and continue the turn until another phase completes.
8. Confirm multiple stage summaries can accumulate in the same centered strip during the live turn, wrapping horizontally before they ever become a tall vertical stack.
9. Continue until `Writing response` is active and confirm the remaining bottom live status card behaves like a lightweight current-phase indicator rather than the only place where past tool activity is visible.
10. Let the turn complete and confirm the temporary live stage summaries disappear cleanly, without leaving broken chunks or duplicate live tool rows behind.

#### Expected Results
- Completed live runtime phases are summarized in a centered inline strip of compact, expandable stage chips that look like lightweight timeline annotations rather than separate cards.
- The bottom live status card reflects the current phase instead of the entire turn's cumulative command/MCP history.
- Raw live tool rows are replaced by stage summaries while the turn is active, reducing visual clutter in the main streaming area.
- On mobile, stage summaries stay in a single narrow strip and do not create a tall wall of runtime pills.
- On mobile, only one stage detail panel is open at a time.
- Expanding a stage chip reveals the corresponding reasoning/details and the underlying command, MCP, collab, or file-change entries for that phase.
- When the turn finishes, the temporary live stage timeline clears without stale UI remnants.

#### Rollback/Cleanup
- Revert the live stage-summary changes in `src/composables/useDesktopState.ts`, `src/components/content/ThreadConversation.vue`, and `src/types/codex.ts` if the previous bottom-overlay-only interaction is preferred.

### Feature: Command and tool activity render as flat runtime summary rows

#### Prerequisites
- App is running from this repository.
- A thread contains at least one shell command entry and preferably one MCP or agent-action entry, either in the main flow, inside a live stage summary, or inside a worked summary.

#### Steps
1. Open a thread that includes a command execution row and expand it.
2. Confirm the collapsed command row reads like a flat summary line such as `1 command · ...` rather than showing the full command inside a rounded card.
3. Expand the command row and confirm the details open inside a lighter indented log-style region instead of a large boxed card.
4. Scroll vertically inside the expanded output and confirm the output scrolls within that details region instead of expanding the full conversation endlessly.
5. If the command has a long single-line output, confirm horizontal scrolling preserves terminal-style formatting instead of force-wrapping everything.
6. Expand an MCP tool row and confirm it uses the same flattened summary-row treatment in collapsed state.
7. Expand an agent-action row and confirm it follows the same overall pattern.
8. Expand a stage summary or worked summary and confirm nested command/tool rows still render as lightweight flat summaries rather than bulky individual cards.
9. When a live overlay is present for `Calling MCP tool`, confirm summary text and details align to the same left edge rather than showing count and tool names on different visual rails.

#### Expected Results
- Command, MCP, and agent-action entries default to flat summary rows that preserve vertical space.
- Expanded command output remains scrollable and preserves monospace terminal-style layout.
- MCP and agent-action rows follow the same flatter folding pattern, giving the runtime UI a more unified summary-first structure.
- Nested command/tool rows inside stage summaries or worked summaries remain individually inspectable without reintroducing bulky cards.
- Live `Calling MCP tool` overlays align with the flat runtime-summary layout instead of falling back to an older timeline/bullet style.
- On mobile, collapsed command rows use short summary text instead of exposing the full shell line by default.
- On mobile, live command/MCP/agent rows do not auto-expand unless the user taps them explicitly.

#### Rollback/Cleanup
- Revert the flattened runtime-summary styling and template changes in `src/components/content/ThreadConversation.vue` if the previous boxier runtime-node presentation is preferred.

### Feature: Background agent summaries show model and reasoning effort

#### Prerequisites
- App is running from this repository.
- A thread can trigger at least one `spawnAgent` / background-agent action.

#### Steps
1. Start a turn that spawns one or more background agents.
2. Open either the current live status card or a completed stage summary that lists background agents.
3. Inspect an individual background agent row.
4. Confirm the row shows the agent title plus compact runtime chips for the agent model and reasoning effort.
5. Confirm the existing status/message and diff delta indicators still appear.

#### Expected Results
- Background agent rows expose the spawned agent's model and reasoning effort without needing to open raw tool JSON.
- The runtime chips are compact enough that they do not significantly increase the height of the agent list.

#### Rollback/Cleanup
- Revert the background-agent summary extension in `src/types/codex.ts`, `src/composables/useDesktopState.ts`, and `src/components/content/ThreadConversation.vue` if the additional runtime metadata is not wanted.

### Feature: Live subagent-heavy runtime sections stay collapsible by default

#### Prerequisites
- App is running from this repository.
- A thread can trigger a `Coordinating agents` phase with multiple background agents and at least one completed stage summary that also references background agents or multiple detail lines.

#### Steps
1. Start a turn that spawns several background agents and keep it open while the live `Coordinating agents` phase is active.
2. Before any assistant text streams, confirm the live runtime overlay can still be collapsed with its top-right `Open` / `Hide` control instead of forcing the full agent list open.
3. Expand the live overlay and confirm `Details` and `Background agents` each appear as separate disclosure rows rather than immediately rendering a long bullet list and full agent roster.
4. Leave both disclosure rows collapsed and confirm the live overlay only occupies a small amount of vertical space.
5. Expand `Background agents` and confirm the agent list appears on demand, including model/reasoning chips and status rows.
6. Collapse `Background agents` again and confirm the overlay height shrinks back down immediately.
7. Open a completed stage summary that includes background agents.
8. Confirm the stage panel also keeps `Details` and `Background agents` collapsed by default, with only compact disclosure summaries visible.
9. Expand one of those disclosures and confirm only the requested subsection opens; the rest of the stage panel stays compact.

#### Expected Results
- Subagent-heavy live overlays no longer dump the full agent roster by default.
- Completed stage summaries also keep detail-heavy subsections collapsed by default.
- Users can progressively disclose `Details` and `Background agents` independently, reducing the amount of always-visible runtime chrome.
- Expanded subsections still preserve the existing agent metadata, status labels, and `Open` thread action.

#### Rollback/Cleanup
- Revert the nested disclosure changes in `src/components/content/ThreadConversation.vue` if background-agent lists should always be fully expanded.

### Feature: Compacting state is explicitly visible in the composer

#### Prerequisites
- App is running from this repository.
- A thread is selected and can be compacted.

#### Steps
1. Open a thread with the `Compact` control visible in the composer.
2. Click `Compact`.
3. Immediately observe the composer meta row without waiting for any delayed live runtime overlay.
4. Confirm the compact button label changes from `Compact` to `Compacting…`.
5. Confirm an adjacent compacting status badge also appears with `Compacting…`.
6. While compaction is still active, confirm sending a new message queues it rather than trying to send immediately.
7. Wait for compaction to finish and confirm the button label returns to `Compact` and the compacting badge disappears.

#### Expected Results
- Compaction is explicitly visible in the composer as soon as the action starts.
- Users do not need to infer compaction from a disabled button alone.
- The compacting hint disappears automatically when the thread leaves the compacting phase.

#### Rollback/Cleanup
- Revert the compacting-state composer changes in `src/components/content/ThreadComposer.vue` if the extra badge is not desired.

### Feature: Expandable runtime rows use a clear disclosure hover affordance

#### Prerequisites
- App is running from this repository.
- A thread includes at least one expandable runtime row, such as a stage summary, command row, MCP row, collab row, or live overlay disclosure.

#### Steps
1. Open a thread with visible runtime summaries and hover a stage summary row such as `Explored ...` or `Running command ...`.
2. Confirm the mouse cursor changes to a pointer and the row text subtly darkens on hover.
3. Confirm the disclosure arrow at the end of the row is visibly larger than before and easy to spot.
4. Repeat on a nested disclosure row like `Details` or `Background agents` inside an expanded stage.
5. Repeat on a command or MCP summary row and confirm it uses the same pointer-and-chevron affordance.
6. Hover plain detail text that is not itself expandable and confirm it does not look like an interactive disclosure trigger.

#### Expected Results
- Only truly expandable runtime rows present a clear disclosure affordance.
- Expandable runtime rows consistently use a visible pointer cursor and a larger arrow indicator.
- Non-expandable detail text remains visually static and does not compete with interactive rows.

#### Rollback/Cleanup
- Revert the disclosure affordance styling in `src/components/content/ThreadConversation.vue` if the previous minimal hover styling is preferred.

### Feature: Prose with slash-separated words no longer becomes broken local file links

#### Prerequisites
- App is running from this repository.
- A thread contains assistant text with prose like `command/MCP` or `thinking/search`, and also contains at least one real repo-like path such as `src/components/content/ThreadConversation.vue`.

#### Steps
1. Open the thread and locate prose containing a slash-separated phrase like `command/MCP`.
2. Confirm that phrase renders as normal text instead of a clickable blue local-file link.
3. In the same message, locate a real file path such as `src/components/content/ThreadConversation.vue`.
4. Confirm the real file path still renders as a clickable local-file link.
5. Click the real file path and confirm it opens the local viewer rather than returning `{\"error\":\"File not found.\"}` for a fake prose path.

#### Expected Results
- Generic prose containing one slash is not misclassified as a local file path.
- Real repo-style paths still render as clickable local-file links.
- The previous false-positive `File not found.` path-open behavior is eliminated for phrases like `command/MCP`.

#### Rollback/Cleanup
- Revert the `isFilePath()` heuristic change in `src/components/content/ThreadConversation.vue` if broader bare-path linking is preferred again.

### Feature: Rollback API/UI no longer requires turn index in rollback payload

#### Prerequisites
- App is running from this repository.
- A thread exists with at least 2 completed turns.
- Rollback control is visible in the thread conversation message actions.

#### Steps
1. Open any existing thread with multiple turns.
2. In DevTools Network tab, keep `/codex-api/rpc` requests visible.
3. Click rollback on a user or assistant message that is not the newest one.
4. Confirm rollback succeeds and the thread is truncated to the selected turn.
5. Inspect the UI event flow by repeating rollback from a different turn and confirm the selected message can rollback without relying on a numeric turn index.
6. Use dictation resend flow (or "rollback latest user turn" flow) and confirm the latest user turn is rolled back correctly.

#### Expected Results
- Rollback works when triggered from message actions using `turnId` as the identifier.
- No UI path depends on `turnIndex` in rollback event payloads.
- Latest-user-turn rollback flow still works and targets the latest user `turnId`.
- No TypeScript/runtime errors are introduced in rollback interaction.

#### Rollback/Cleanup
- Revert the updated files if this behavior is not desired:
  - `src/types/codex.ts`
  - `src/api/normalizers/v2.ts`
  - `src/components/content/ThreadConversation.vue`
  - `src/App.vue`
  - `src/composables/useDesktopState.ts`

### Feature: Rollback init commit includes `.codex/.gitignore`

#### Prerequisites
- App server is running from this repository.
- Use a fresh temporary project directory with no existing `.codex/rollbacks/.git` history.

#### Steps
1. In a fresh test project folder, trigger rollback automation init by calling `/codex-api/worktree/auto-commit` with a valid commit message.
2. Verify rollback repo exists at `.codex/rollbacks/.git`.
3. In that rollback repo, run `git --git-dir .codex/rollbacks/.git --work-tree . show --name-only --pretty=format: HEAD`.
4. Confirm `.codex/.gitignore` appears in the file list for the init commit.
5. Open `.codex/.gitignore` and verify `rollbacks/` exists.

#### Expected Results
- First rollback-history commit is `Initialize rollback history`.
- That commit includes `.codex/.gitignore`.
- `.codex/.gitignore` contains `rollbacks/`.

#### Rollback/Cleanup
- Remove the temporary test folder after verification.

### Feature: Deterministic rollback commit + exact lookup with debug logs

#### Prerequisites
- App server is running from this repository.
- `worktree git automation` is enabled in UI settings.
- Test thread available where you can send at least 3 user turns.

#### Steps
1. Send a user turn that changes files and completes.
2. Send a user turn that produces no file edits and completes.
3. Send a third user turn and complete it.
4. In rollback git history (`.codex/rollbacks/.git`), verify each completed turn created a commit, including the no-edit turn.
5. Inspect one rollback commit body and confirm it contains the user message text plus `Rollback-User-Message-SHA256: <hash>`.
6. Trigger rollback to the second turn message via UI rollback action.
7. Verify server logs contain `[rollback-debug]` entries for lookup, stash (if dirty), reset, and completion.
8. Temporarily test missing-commit path by calling `/codex-api/worktree/rollback-to-message` with a non-existent message text.

#### Expected Results
- Auto-commit creates a rollback commit for every completed turn (`--allow-empty` behavior).
- Commit body includes the user message and stable hash trailer.
- Rollback uses exact hash-based commit lookup only.
- If exact commit is missing, rollback returns error and does not continue.
- Server logs include `[rollback-debug]` records for commit creation, lookup, stash, reset, and error paths.
- Browser console includes `[rollback-debug]` client-side start/success/error logs for auto-commit and rollback API calls.
- Rollback init no longer fails when `.codex` is ignored globally; init force-adds `.codex/.gitignore`.

#### Rollback/Cleanup
- Revert the changed files if you want previous non-deterministic behavior back.

### Feature: Per-turn changed files panel with lazy diff loading

#### Prerequisites
- App server running from this repository.
- Worktree git automation enabled.
- A thread with at least one completed turn that touched files.

#### Steps
1. Open a thread and locate a `Worked for ...` separator message.
2. Expand the worked separator.
3. Verify a changed-files panel appears above command details.
4. Confirm file list entries show file path and `+/-` counts.
5. Click one changed file row to expand it.
6. Verify diff content loads only after expansion (lazy load behavior).
7. Collapse and re-expand the same file row; verify diff reuses loaded content.
8. Switch to another thread and back; verify panel reloads for the active thread context.

#### Expected Results
- Each worked message can show changed files for its turn.
- Diff for a file is fetched only on expand, not for all files upfront.
- Errors (missing commit/diff load failure) are shown inline in the panel.
- Existing command output expand/collapse behavior remains unchanged.
- Changed-files panel still resolves after page refresh or app-server restart.
- Changed-files panel appears at the end of the worked message block (after command rows).

#### Rollback/Cleanup
- No cleanup required.

### Feature: Worked separator is non-expandable

#### Prerequisites
- App server running from this repository.
- A thread with at least one `Worked for ...` separator.

#### Steps
1. Open a thread and locate a `Worked for ...` message.
2. Click the separator line/text area.
3. Verify no expand/collapse behavior is triggered on the separator itself.
4. Verify changed-files panel still appears below the separator when data exists.

#### Expected Results
- `Worked for ...` acts as a visual separator only (non-interactive).
- Changed-files and command sections are not gated by a worked-separator expand toggle.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Changed-files lookup fallback when turnId metadata is missing

#### Prerequisites
- App server running from this repository.
- Playwright CLI available.

#### Steps
1. Create/prepare a test workspace (example: `/tmp/rollback-pw`).
2. Call `/codex-api/worktree/auto-commit` with:
   - `cwd=/tmp/rollback-pw`
   - `message='pw-msg-turn-1'`
   - `turnId='turn-real-1'`
3. Call `/codex-api/worktree/message-changes` with:
   - same `cwd`
   - same `message`
   - mismatched `turnId='turn-wrong'`
4. Verify response is still `200` and returns the matching commit data (message-hash fallback).
5. Capture Playwright artifact screenshot.

#### Expected Results
- `message-changes` first attempts turnId lookup.
- If turnId lookup misses, it falls back to exact message-hash lookup.
- API returns commit data instead of `No matching commit found for this user message` when message matches.

#### Rollback/Cleanup
- Remove temporary test workspace if created.

### Feature: Changed-files panel persists across refresh (assistant message level)

#### Prerequisites
- App server running from this repository.
- Existing thread in `TestChat` project with completed assistant messages.
- Worktree rollback auto-commit enabled.

#### Steps
1. Open a `TestChat` thread and confirm assistant message cards render.
2. Verify changed-files panel is shown at the end of assistant messages that have rollback commit data.
3. Hard refresh the page.
4. Re-open the same `TestChat` thread.
5. Verify changed-files panel is still shown for the same assistant message(s).
6. Expand one file diff and verify diff content loads.

#### Expected Results
- Changed-files panel is attached to assistant messages (not transient worked separators).
- Changed-files panel appears only once per turn (on the last assistant message in that turn).
- Changed-files panel is hidden while a turn is still in progress.
- Panels remain available after refresh/restart because lookup is turnId/message-hash based.
- File diff expansion still lazy-loads and displays content.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Review pane can inspect linked worktree changes

#### Prerequisites
- App server running from this repository.
- A Git repository with at least one linked worktree, for example `/data/CoordExp/.worktrees/bbox-format-rewrite`.
- The active thread is opened from the main repository workspace, not the linked worktree itself.
- The linked worktree contains at least one uncommitted file change.

#### Steps
1. Open the thread whose `cwd` points at the main repository workspace.
2. Click `Review`.
3. In the `Target` selector, choose the linked worktree.
4. Confirm the file list refreshes and shows the linked worktree's changed files.
5. Switch between `Unstaged` and `Staged` while that linked worktree target remains selected.
6. Switch back to the current thread workspace and confirm its own diff returns.

#### Expected Results
- `Review` lists linked worktrees from the same Git repository as selectable targets.
- Selecting a linked worktree shows that worktree's diff without requiring a separate thread.
- While viewing a non-thread worktree, `Review` stays read-only:
  `Run review`, `Stage`, `Unstage`, and `Revert` actions are not offered.
- Switching back to the current thread workspace restores the normal mutable review controls.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Rollback debug logs controlled by `.env`

#### Prerequisites
- App server stopped.
- Edit `.env` directly, and use `.env.local` for private local overrides.

#### Steps
1. Set `ROLLBACK_DEBUG=0` and `VITE_ROLLBACK_DEBUG=0` in `.env`.
2. Start app and trigger rollback auto-commit/message-changes flow.
3. Verify `[rollback-debug]` logs are not emitted in terminal/browser console.
4. Set `ROLLBACK_DEBUG=1` and `VITE_ROLLBACK_DEBUG=1` in `.env`.
5. Restart app and trigger the same flow again.
6. Verify `[rollback-debug]` logs appear in terminal/browser console.

#### Expected Results
- Debug logs are disabled when env flags are `0`.
- Debug logs are enabled when env flags are `1`.

#### Rollback/Cleanup
- Restore `.env` values to preferred defaults.

### Feature: Auto-commit default is disabled for new preference state

#### Prerequisites
- App server running from this repository.
- Browser local storage key `codex-web-local.worktree-git-automation.v1` is absent (new user state).

#### Steps
1. Open the app in a fresh browser profile (or clear only `codex-web-local.worktree-git-automation.v1`).
2. Open Settings and inspect the `Rollback commits` toggle state.
3. Confirm it starts in the disabled/off state.
4. Enable the toggle manually.
5. Reload the page and confirm the toggle remains enabled.
6. Disable it again, reload, and confirm it remains disabled.

#### Expected Results
- Default state is disabled when no prior preference exists.
- User-selected state persists via local storage across reloads.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Skills sync pull live-reloads installed skills list

#### Prerequisites
- App running from this repository with Skills Hub available.
- GitHub skills sync configured and connected.
- At least one skill update available in the sync source (new or edited skill metadata).

#### Steps
1. Open the app and note the currently visible installed skills for the active thread cwd.
2. In Skills Hub, trigger `Pull` from GitHub sync.
3. Wait for the pull success toast.
4. Without restarting the app/server, navigate to thread composer skill picker and verify the installed skills list.
5. Switch to another thread and back to force a normal UI refresh path.

#### Expected Results
- Pull completes successfully.
- Installed skills list reflects pulled changes immediately without app/server restart.
- Thread switch keeps showing the updated skills list (no stale cache rollback).

#### Rollback/Cleanup
- If needed, run another sync pull/push to restore previous skill state in the sync repo.

### Feature: Force Refresh Skills button in Skills Sync panel

#### Prerequisites
- App running from this repository with Skills Hub route accessible.
- At least one installed skill is available for the current thread cwd.

#### Steps
1. Open `Skills Hub`.
2. In `Skills Sync (GitHub)`, click `Force Refresh Skills`.
3. Verify button text changes to `Refreshing...` during the request and returns after completion.
4. Verify success toast appears.
5. Open the thread composer skills picker and confirm installed skills list is present and current.
6. Switch to another thread and back to ensure refreshed list remains consistent.

#### Expected Results
- `Force Refresh Skills` triggers a manual refresh without requiring pull/push.
- Loading state prevents duplicate clicks while refresh is in progress.
- Installed skills list updates immediately and remains updated across thread switches.

#### Rollback/Cleanup
- No cleanup required.

### Feature: SkillHub shows detailed skill load errors

#### Prerequisites
- App running from this repository.
- At least one invalid installed skill file exists (for example unresolved merge markers in `SKILL.md`).

#### Steps
1. Open `Skills Hub`.
2. Trigger `Force Refresh Skills`.
3. Locate the `Some skills failed to load` panel above the skills sections.
4. Verify each row shows:
   - the failing `SKILL.md` path
   - the exact parser error message from app server (for example invalid YAML line/column details).
5. Fix the invalid skill file and trigger `Force Refresh Skills` again.

#### Expected Results
- SkillHub surfaces app-server load failures with detailed path and message.
- Messages are specific enough to identify the broken file and parser failure reason.
- Error panel disappears after invalid skills are fixed and refreshed.

#### Rollback/Cleanup
- Restore any intentionally broken local skill files used for testing.

### Feature: Startup sync preserves local skill edits when remote is ahead

#### Prerequisites
- Skills sync configured to a private GitHub fork.
- Local skills repo has a tracked edit in an existing skill file.
- Remote `main` has at least one newer commit than local (simulate from another machine or commit directly on GitHub).

#### Steps
1. Edit a local skill file (for example update description text in `SKILL.md`) and keep the change.
2. Trigger `Startup Sync` in Skills Hub.
3. If a non-fast-forward condition exists, allow startup sync to complete retry path.
4. Re-open the same local skill file and verify your edit remains.
5. Trigger `Force Refresh Skills` and verify no unexpected skill removals occurred.

#### Expected Results
- Startup sync no longer fails with non-fast-forward push due to missing remote integration.
- Local tracked skill edits remain after sync (not overwritten by remote state).
- Sync path rebases/pulls with autostash and auto-resolves conflicts by mtime policy:
  - choose remote (`theirs`) when remote file commit time is newer than local file mtime.
  - choose local (`ours`) otherwise.
- No manual conflict intervention is required during startup sync retries.

#### Rollback/Cleanup
- Revert test-only skill text changes if they were not intended to keep.

### Feature: Startup sync conflict fallback when one side is missing

#### Prerequisites
- Skills sync repo contains a conflict candidate where only one side exists for a path (for example delete/modify scenario).
- Skills Hub is accessible.

#### Steps
1. Open `Skills Hub`.
2. Click `Startup Sync`.
3. Wait for sync completion or error toast.
4. Verify no toast/error contains `does not have our version`.

#### Expected Results
- Sync conflict resolver handles missing `--ours`/`--theirs` versions safely.
- Startup sync does not fail with `git checkout --ours/--theirs` missing-version errors.

#### Rollback/Cleanup
- None.

### Feature: Remote changes win when no local uncommitted skill edits exist

#### Prerequisites
- Skills sync configured with GitHub.
- Local skills repo working tree is clean (`git status --porcelain` empty under skills dir).
- Remote skills repo has newer commits touching existing skill files.

#### Steps
1. Confirm no local uncommitted changes in skills directory.
2. Trigger `Startup Sync` in Skills Hub.
3. After sync, inspect the skill file changed remotely.
4. Trigger `Force Refresh Skills` and confirm loaded skill content matches remote update.

#### Expected Results
- Sync pull/reconcile does not preserve stale local file content when local tree is clean.
- Remote updates are applied locally and remain after startup sync completes.

#### Rollback/Cleanup
- None.

### Feature: Startup sync does not delete remote AGENTS.md

#### Prerequisites
- Skills sync configured to `friuns2/codexskills`.
- Remote `main` contains `AGENTS.md`.
- Local skills repo is clean before startup sync.

#### Steps
1. Confirm remote `AGENTS.md` exists on `main`.
2. Confirm local `~/.codex/skills` is clean.
3. Trigger `Startup Sync`.
4. After completion, inspect latest commit created by sync (if any).
5. Verify `AGENTS.md` still exists locally and in remote `origin/main`.

#### Expected Results
- Startup sync may update manifest, but must not delete `AGENTS.md`.
- If sync creates a commit, changed files do not include `D AGENTS.md`.
- Local and remote `AGENTS.md` hashes remain equal after sync.

#### Rollback/Cleanup
- None.

### Feature: Bidirectional AGENTS.md sync via Startup Sync

#### Prerequisites
- Skills sync configured to `friuns2/codexskills`.
- `~/.codex/skills` is a clean git working tree before each sub-test.
- Skills Hub startup sync endpoint is reachable.

#### Steps
1. Remote -> Local:
2. Add a unique marker to remote `AGENTS.md` on `main`.
3. Confirm local `HEAD` is behind `origin/main`.
4. Trigger `Startup Sync`.
5. Verify local `AGENTS.md` contains the remote marker and local `HEAD == origin/main`.
6. Local -> Remote:
7. Add a different unique marker to local `~/.codex/skills/AGENTS.md`.
8. Confirm local working tree shows `M AGENTS.md`.
9. Trigger `Startup Sync`.
10. Verify remote `origin/main:AGENTS.md` contains the local marker and local `HEAD == origin/main`.

#### Expected Results
- Remote-only AGENTS edits are pulled into local without deletion.
- Local AGENTS edits are pushed to remote after startup sync.
- After each sync direction, local and remote commit SHAs match.

#### Rollback/Cleanup
- Remove temporary test markers from `AGENTS.md` if required.

### Feature: Mixed local+remote AGENTS edits do not stall Startup Sync

#### Prerequisites
- Skills sync configured and working.
- Local skills repo clean before test start.

#### Steps
1. Add marker `A` to remote `AGENTS.md`.
2. Add marker `B` to local `AGENTS.md` before syncing.
3. Trigger `Startup Sync`.
4. Wait for startup status to finish (`inProgress=false`).
5. Verify sync outcome explicitly:
6. If sync succeeds, local/remote SHAs match and expected merged marker result is present.
7. If sync fails, status includes a concrete error message (not silent success).

#### Expected Results
- Startup sync must not report success while local remains behind remote.
- No stale stash side-effects are introduced (no unexpected conflict from old stash entries).
- Final state is either a valid synchronized result or an explicit failure status with actionable error.

#### Rollback/Cleanup
- Reset local skills repo to `origin/main` after test if needed.

### Feature: Startup sync uses deterministic pull reconcile (`fetch + reset --hard`) before local replay

#### Prerequisites
- Skills sync is logged in and targets `friuns2/codexskills`.
- Local repo path is `~/.codex/skills`.
- Startup Sync endpoint is reachable at `/codex-api/skills-sync/startup-sync`.

#### Steps
1. Remote-only case:
2. Commit a unique marker to remote `AGENTS.md` on `main`.
3. Ensure local repo is clean and reset to `origin/main`, then trigger `Startup Sync`.
4. Confirm marker appears locally and `HEAD == origin/main`.
5. Local-only case:
6. Add a unique local marker to `~/.codex/skills/AGENTS.md` (uncommitted), trigger `Startup Sync`.
7. Confirm marker is pushed and `HEAD == origin/main` with clean worktree.
8. Mixed case:
9. Add local marker first, then commit a newer remote marker.
10. Trigger `Startup Sync` and verify mtime policy result (newer remote marker wins, older local marker dropped).
11. Confirm final state is clean with `HEAD == origin/main`.

#### Expected Results
- Startup sync does not fail with missing merge refs (`MERGE_HEAD`/`REBASE_HEAD`) in this path.
- Remote-only changes are always pulled first and visible locally.
- Local-only changes are preserved and pushed during the same startup sync run.
- Mixed local+remote edits converge automatically with no manual conflict handling.

#### Rollback/Cleanup
- Remove temporary test markers from `AGENTS.md` if not needed.

### Feature: Revert Renat scrolling/input-layout behavior (without Fast mode changes)

#### Prerequisites
- App builds successfully (`pnpm run build`).
- Open a thread with enough messages to scroll.
- Composer is visible in the main chat view.

#### Steps
1. Open a long thread and scroll upward away from bottom.
2. Trigger live overlay updates (for example by sending a new prompt) and observe scroll behavior.
3. Confirm message list horizontal overflow behavior in conversation and desktop main area.
4. In composer, verify there is no drag/drop overlay UI when dragging files over the input.
5. In composer, paste an image from clipboard and verify it is not auto-attached through paste handler.
6. Use file picker/camera attach buttons and confirm attachments still work.
7. Confirm Fast mode UI/toggle remains present and unchanged.

#### Expected Results
- Scroll behavior follows reverted layout logic for conversation/desktop containers.
- Composer drag-active overlay is removed from the input field layout.
- Clipboard image paste no longer triggers drag/paste attachment flow.
- Standard picker-based attachments still work.
- Fast mode button and related controls are unchanged.

#### Rollback/Cleanup
- `git restore src/components/content/ThreadComposer.vue src/components/content/ThreadConversation.vue src/components/layout/DesktopLayout.vue src/style.css tests.md`

### Feature: Chat file-link context menu (open/edit/copy path)

#### Prerequisites
- App server is running from this repository.
- Open a thread that contains rendered `.message-file-link` anchors (for example Markdown file links).

#### Steps
1. In a message with a file link, right-click the file link text.
2. Verify the custom context menu appears near the pointer.
3. Click `Open file` and confirm the link opens in a new tab.
4. If the target is a text-like file, confirm the new tab shows an in-browser read-only viewer page instead of downloading the file.
5. Right-click the same file link again and click `Copy file path`, then paste into a text input to verify the copied value is the local file path rather than a `/codex-local-...` web URL.
6. Right-click the same file link again and click `Edit file`.
7. Confirm the edit action opens the text editor page in a new tab.
8. Click outside the menu and press `Escape` while the menu is open.

#### Expected Results
- Right-clicking local `.message-file-link` anchors opens the custom context menu.
- Menu labels are `Open file`, `Edit file`, and `Copy file path`.
- `Open file` opens an online viewer-style page for text-like files instead of triggering a browser download.
- `Copy file path` copies the underlying local file path, not the routed web link.
- Pointer-down outside, blur, and `Escape` close the menu.

#### Rollback/Cleanup
- Close any tabs opened during the test.

### Feature: Dark theme command rows in chat remain readable

#### Prerequisites
- App is running from this repository.
- Open any thread that contains command execution entries.
- Appearance is set to `Dark` in Settings.

#### Steps
1. Open a thread with one or more command execution rows in the conversation.
2. Verify command label text, grouped command label text, and status text in collapsed rows.
3. Locate a file-change summary row (for example: `▶ 2 files changed · 2 edited`) and verify the chevron and summary text are readable.
4. Expand a command row to show output and inspect the output panel border contrast.
5. Confirm status colors for running/success/error command rows are distinguishable in dark mode.
6. Toggle back to `Light` theme and confirm command rows still use the existing light styling.

#### Expected Results
- Command labels and grouped command labels are readable against dark row backgrounds.
- File-change summary rows keep readable chevron and summary text in dark mode.
- Default status text is readable in dark mode.
- Running/success/error status colors remain visible in dark mode.
- Expanded command output border is visible without using a bright light-theme border.
- Light theme command row styling is unchanged.

#### Rollback/Cleanup
- Return appearance setting to the previous user preference.

### Feature: Home composer vertical alignment matches reference layout

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open the `New thread` (home) screen with a selected folder/project.
- Ensure desktop viewport width (for example >= 1280px).

#### Steps
1. Open the home screen and observe the hero block (`Let's build`) and composer placement.
2. Confirm the hero/settings block is vertically centered within the available content area.
3. Confirm the message composer sits in the lower area of the content column (not immediately below top content).
4. Resize window height taller/shorter and re-check vertical placement.
5. Open any thread route and verify thread composer layout remains unchanged.

#### Expected Results
- Home hero block is centered again (not top-anchored).
- Home composer aligns toward the bottom region similar to the reference screenshot.
- Resizing preserves the intended centered-hero + lower-composer structure.
- Thread route composer behavior is unchanged.

#### Rollback/Cleanup
- Revert the `.new-thread-empty` style in [src/App.vue](/Users/igor/.codex/worktrees/eaf8/codex-web-local/src/App.vue).

### Feature: Restore composer drag-and-drop file attach on input field

#### Prerequisites
- App is running with a selected thread and active composer.
- At least one local file is available to drag from Finder/File Explorer.

#### Steps
1. Drag a file over the composer input area.
2. Confirm drag highlight/overlay appears above the input.
3. Drop the file on the composer input field.
4. Verify the file is attached in composer chips.
5. Repeat with an image file and verify image preview appears.
6. In dark mode, repeat steps 1-2 and verify overlay remains readable.

#### Expected Results
- Composer shows drag-active visual state while file is hovering.
- Dropped files are attached through the same attachment pipeline as regular uploads.
- Image drops create image preview attachments.
- Dark mode drag overlay uses dark-theme colors and remains legible.

#### Rollback/Cleanup
- Remove attached files/images from the composer before closing the test thread.

### Feature: Restore clipboard image paste attachments in composer

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open any thread where the composer is enabled.
- Have an image copied to system clipboard (for example screenshot copy).

#### Steps
1. Focus the composer textarea.
2. Paste clipboard content that contains only an image file payload.
3. Confirm an image chip/preview is added to composer attachments.
4. Copy plain text only and paste into composer.
5. Copy mixed content (plain text + image, if source provides both) and paste once.
6. Copy long plain text (at least 2000 characters) and paste into composer.
7. Confirm the long text is attached as a `.txt` file instead of being inserted into the textarea.
8. Send the message with the pasted image/text attachment.

#### Expected Results
- Image-only clipboard paste adds an image attachment to composer.
- Plain-text paste still inserts text into the composer and does not create an attachment.
- Mixed payload paste attaches the image while preserving text paste behavior.
- Long plain-text paste (>= 2000 chars) creates a `.txt` attachment and does not insert raw text into the textarea.
- Sending proceeds with the attached pasted image.

#### Rollback/Cleanup
- Remove the attached image chip from composer if not needed.

### Feature: Show user file attachments as visible chips in chat

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open any thread with an active composer.
- Have at least one local file available to attach.

#### Steps
1. Attach one or more files via composer (file picker, paste long text as `.txt`, or other file attachment flow).
2. Send the message.
3. Locate the sent user message in conversation.
4. Verify file attachment chips are rendered above message text.
5. Click a file chip and confirm it opens the file in a new tab/window.
6. For text-like files, confirm the new tab is an in-browser viewer page rather than a raw download.
7. Right-click the chip link and verify file-link context actions still appear (`Open file`, `Copy file path`, and `Edit file`).

#### Expected Results
- Sent user messages with `fileAttachments` show visible file chips in chat.
- Chip labels match attachment labels from composer payload.
- Chip links open through the viewer/open flow and remain clickable.
- Existing file-link context menu behavior works on the chip links.

#### Rollback/Cleanup
- Close any opened file tabs and remove temporary test messages if needed.

### Feature: Support `pein_train` and `mac` launch profiles in `codexapp-current-dir.sh`

#### Prerequisites
- Build artifacts already exist locally or let the launcher build them on first run.
- For `mac` profile verification, ensure a local proxy is listening on `127.0.0.1:7890`.
- Use a disposable launch directory so it is easy to inspect whether `.codex` is created.

#### Steps
1. From any disposable directory, run `bash /absolute/path/to/codexUI/scripts/codexapp-current-dir.sh --help` and confirm the help text documents `--user pein_train` and `--user mac`, plus the auto-detected default.
2. On macOS, run `bash /absolute/path/to/codexUI/scripts/codexapp-current-dir.sh` and confirm the launcher auto-detects `mac`.
3. On the Ubuntu container, run the same command with no `--user` flag and confirm the launcher auto-detects or falls back to `pein_train`.
4. In the Ubuntu container, confirm the app scopes to the current directory and that a local `.codex` directory is created under the launch directory when `CODEX_HOME` was not preset.
5. Stop the launcher.
6. From a fresh disposable directory on macOS, run `bash /absolute/path/to/codexUI/scripts/codexapp-current-dir.sh --user mac`.
7. Confirm the app still scopes to the current directory.
8. Confirm no local `.codex` directory is created automatically when `CODEX_HOME` is unset before launch.
9. Confirm the `mac` session can reach upstream services through `http://127.0.0.1:7890` and `socks5://127.0.0.1:7890`.

#### Expected Results
- On macOS, the launcher auto-detects `mac` when `--user` is omitted.
- On the Ubuntu container, the launcher auto-detects or falls back to `pein_train` when `--user` is omitted.
- The launcher still accepts an explicit `--user mac` override when requested.
- Default `pein_train` behavior stays compatible with current-dir launches and still creates `$PWD/.codex` unless `CODEX_HOME` is already set.
- `mac` leaves `CODEX_HOME` unset so Codex uses its normal default home path.
- `mac` uses `http://127.0.0.1:7890` for `http_proxy` and `https_proxy`, plus `socks5://127.0.0.1:7890` for `all_proxy`.

#### Rollback/Cleanup
- Stop the launcher and remove any disposable launch directories created for the test.
