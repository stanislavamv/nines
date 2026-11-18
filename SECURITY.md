# Security and privacy

## What is private, and where it lives

| Kind | Where | Public? |
|---|---|---|
| Generic lessons, quizzes, cards, terminal labs | `quest/data.js`, `quest/cards.js`, `quest/term.js` | Yes |
| Public facts about one employer and posting | `quest/packs/company.*.js` | Yes. No names of people, no dates |
| Your stories, resume lines, interviewer and interview details | `quest/packs/personal.js` | **No. Git-ignored** |
| Terms that must never be published | `private/denylist.txt` | **No. Git-ignored** |
| Answers you type, progress, imported drill packs | Your browser's local storage | Never leaves the browser, unless you turn on sync |
| Synced progress (optional) | `data/users/<your id>/progress` in the Claude artifact's store | **No.** Private to you; not even the page owner can read it |

## The gate

```bash
node scripts/check-private.mjs
```

It scans every file git would track for the terms in `private/denylist.txt` and for things shaped like secrets (keys, tokens, email addresses, phone numbers). It exits non-zero on any finding. `scripts/build.mjs` runs it first and refuses to build if it fails.

## Design choices

- **No server, no accounts, no network calls.** The app is static files. Nothing you type is sent anywhere.
- **No package dependencies and no install step.** There is no `node_modules` to compromise.
- **One third-party script** (three.js r128 from cdnjs), pinned to an exact version with a Subresource Integrity hash, so a tampered file will not run. The map falls back to a plain list without it.
- **The Code Lab runs your own code in your own browser.** The Bash side is a small interpreter written for this project (`quest/shell.js`): it works on an in-memory file map and has no access to the network or your disk. The Python side is Brython 3.12.5 from cdnjs, loaded only when you run a Python exercise, pinned with integrity hashes. It needs `'unsafe-eval'` in the Content-Security-Policy, which is the one deliberate weakening in the standalone build. Only run code you wrote or understand.
- **Imported drill packs are untrusted.** They are size-limited, reduced to plain strings, and always rendered as text, never as HTML.
- **Pack notes are trusted HTML** because you write them yourself in files you control. Do not paste HTML from other people into a pack.
- **The standalone build** (`dist/`) ships a Content-Security-Policy that blocks inline scripts, all network connections, framing and form posts. Styles still allow `'unsafe-inline'`, which is a known trade-off.

## Accounts and sync

- **No passwords, ever.** Identity comes from the platform the page runs in (Claude sign-in). The app never sees, asks for or stores a password, name or email. It keys data on an opaque id the platform issues.
- **Private by path.** Progress is written to `data/users/<id>/progress`, a subtree the platform keeps private to each person, including from the artifact's owner. The page declares no rule that opens it.
- **Least privilege.** The page asks only for `user` (to learn the opaque id, no profile or email scope), `db` (the private store) and `downloads` (data export).
- **Untrusted input.** Anything loaded from the store or from an imported file goes through `sanitizeState`: known keys only, type checks, length and count caps, and no `__proto__`, `constructor` or `prototype` keys. Text is always rendered through `esc()`.
- **No data loss on conflict.** Copies from two devices are merged (best scores, union of completions, most-reviewed flashcards), and a newer "reset progress" wins. The merge converges, so devices stop writing once they agree. Unit tests cover the sanitizer and the merge.
- **User control.** The Account page offers sync on or off, export of everything as JSON, import (merge only), and deletion of the synced copy.
- **Offline first.** The browser copy is always the source of truth for display. If the store is slow, refused or unavailable, the app keeps working locally and says so.
- **The standalone build** in `dist/` has no account platform, so it never syncs. Its CSP still blocks all network connections.
- **On the public site (GitHub Pages)** the same sync runs against Supabase:
  - Sign-in with Google, GitHub or a one-time email link (PKCE flow). No passwords. The page shows only the providers the project has turned on.
  - `supabase/001_progress.sql`: one row per user, row-level security so each person reads and writes only their own row, nothing for visitors who are not signed in. Verified: an anonymous read and write both return 401.
  - `supabase/002_delete_account.sql`: `delete_my_account()` deletes only the caller, using the id from the verified session.
  - `nines.config.json` holds the project URL and the **publishable** key, which are public by design. The build refuses any other kind of key, and the gate blocks `sb_secret_` keys and JWTs anywhere in the repo.
  - The Supabase client is vendored in `quest/vendor/`, version-pinned, with its registry integrity verified at download and a SHA-256 the gate checks on every run. The CSP allows network calls to the Supabase project only.
  - The sign-in session is kept in the browser's local storage, so the CSP and text-only rendering are what protect it from script injection.
  - GitHub Actions are pinned to full commit SHAs, run with read-only repository access, and the build runs the gate before deploying.
- **Moving the claude.ai version to a public site** means using that Supabase setup. Keep these rules: an identity provider for sign-in (passkeys, or Google or GitHub OAuth) rather than home-made passwords, row-level security keyed on the user id, the same sanitizer on every read, HTTPS only, and export and delete for every user.

## Checklist before the first push to a public repository

1. Run `node scripts/check-private.mjs` and get `OK`.
2. Start the repository fresh with `git init` in this folder. Do not import older history that may contain private files.
3. Confirm `git status` does not list `quest/packs/personal.js` or anything under `private/`.
4. Install the pre-commit hook: copy `scripts/pre-commit` to `.git/hooks/pre-commit`.
5. On GitHub, turn on secret scanning and push protection, and protect the main branch.
6. Publish from `dist/` (built by `node scripts/build.mjs`), not from `quest/`.
7. Keep a backup of `quest/packs/personal.js` somewhere private. It is not in git, so git will not save it for you.

## If something private is pushed by mistake

Removing it in a later commit is not enough, because it stays in history. Rewrite history (`git filter-repo`), force-push, and treat anything that was exposed as public from then on.
