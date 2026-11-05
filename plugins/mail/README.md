# Mail

An AI-sorted email client for BB. It reads Inbox, Sent and Archive over IMAP
and sends through SMTP, so it works with Gmail, iCloud, Fastmail, Yahoo and
most custom domains (with an app password where the provider requires one).

- **Several mailboxes.** Add as many as you like; switch between them, or see
  all inboxes together, at the top of the sidebar. Replies go out from the
  mailbox that received the mail.
- **Splits, not folders.** Conversations are sorted into Needs you, Waiting
  (you wrote last, no reply yet), Other (newsletters, receipts,
  notifications), Later, Archive and your own splits. While Mail is open, the
  split list replaces the threads in BB's sidebar (with Sidebar Plus;
  otherwise the page shows its own list).
- **Splits built by your agent.** "New split" opens BB's composer: describe
  what you want, pick the agent and model, and it reads your mail, previews
  and saves the split with `bb mail split` (filters, scope, sort, grouping,
  unread-only, per-mailbox). "Edit rules" covers quick manual changes.
- **Knowledge.** One click (or a weekly schedule) runs a learning pipeline over
  your sent and received mail: your writing style per language, a profile of
  each person (who they are to you, company, role, tú/usted, how you greet and
  sign off), your projects with facts and a timeline, and the attachments of
  important mail. Everything is editable on the Knowledge page; edits are
  locked so the next run keeps them. Signatures, legal footers and quotes are
  trimmed before anything reaches the AI.
- **AI that writes like you.** Space in an empty reply asks your AI; ⌘J
  rewrites. Drafts use your style, the recipients' profiles, matching
  projects, your notes and the thread's attachments, shown as chips you can
  remove or add to. To/Cc suggest who is usually on these emails.
- **Attachments.** Open or download any file; ✨ Read extracts PDFs, Word,
  Excel, PowerPoint, text and calendar invites locally and summarizes them (images
  go to the model as images) with a small, cheap model. Secrets are never copied.
- **A model per job.** Sorting, writing, learning and reading attachments each
  have their own model and reasoning effort in Settings → AI.
- **Phone alerts.** Important new mail is posted to a pinned "Mail" thread;
  its agent writes one line on who wants what and BB pushes it to the mobile
  app like any finished thread. Ask that thread to reply for you.
- **AI sorting with your own tools.** Codex or Claude, through their CLI
  logins on this machine, with a model you choose. Rules and senders you set
  always win; "Move to…" overrides the AI until the conversation changes.
- **Clean conversations.** A thread opens as a tab in BB's right panel with
  quoted history and signatures folded away (English and Spanish reply styles
  and more), older messages collapsed, and the original HTML one click away.
- **Fast triage.** One quiet line per conversation; `j`/`k` move, `Enter`
  opens, `E` done (moves to the server's Archive), `H` later, `C` compose,
  `/` search.
- **Never miss mail.** One IMAP connection idles on the Inbox, with a check
  every minute as a backup. New mail plays a chime, raises a desktop
  notification and updates the unread badge on the sidebar icon, tab title
  and favicon in every open BB window.
- Agents read mail with `bb mail list` and `bb mail read <id>`.

The password is a secret plugin setting on the BB server and never reaches
the browser. Mail is cached in the plugin's SQLite database (the newest 150
messages per folder on first sync, then everything new).

```sh
npm install
bb plugin build
bb plugin install .
```
