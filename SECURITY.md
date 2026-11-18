# Security and privacy

## Reporting a vulnerability

Please report security issues privately through GitHub: on the repository, open **Security → Report a vulnerability**. Do not open a public issue. Expect a reply within a week.

## What is private, and where it lives

| Kind | Where | Public? |
|---|---|---|
| Lessons, quizzes, cards, labs, cert packs, glossary | `quest/` | Yes |
| Your stories, resume lines, interviewer and interview details | `quest/packs/personal.js` | **No. Git-ignored** |
| Company packs, terms that must never be published | `private/` | **No. Git-ignored** |
| Supabase project URL and publishable key | `nines.config.json` | Yes, by design (see below) |
| Progress, notes, typed stories, imported drill packs | Your browser's local storage | Stays in the browser unless you sign in and sync |
| Synced progress on the public site | One row in the Supabase `progress` table | **No.** Readable and writable only by your account |
| Your sign-in identity on the public site | Supabase Auth (email address, provider id) | **No.** Held by the sign-in service, not by this app's tables |
| Synced progress on the claude.ai version | `data/users/<your id>/progress` in the artifact's store | **No.** Private to you, including from the page owner |

## The gate

```bash
node scripts/check-private.mjs
```

It scans every file git would track for the terms in `private/denylist.txt` and for things shaped like secrets: cloud keys, private keys, GitHub and Slack tokens, Supabase secret keys, JWTs (such as a `service_role` key), email addresses and phone numbers. Vendored files are verified by SHA-256 instead. It exits non-zero on any finding. The pre-commit hook and `scripts/build.mjs` both run it, so a commit or a deploy with a finding fails.

## Design choices

- **Static site, no server of our own.** The only backend is Supabase, and only for optional accounts.
- **No package dependencies and no install step.** There is no `node_modules` to compromise.
- **Third-party code is pinned.**
  - three.js r128 and Brython 3.12.5 load from cdnjs with Subresource Integrity hashes, so a tampered file will not run. Brython loads only when you run a Python exercise.
  - The Supabase client (`quest/vendor/supabase-2.118.0.js`) is vendored: its npm registry integrity was verified when it was downloaded, and the gate checks its SHA-256 on every run.
  - Fonts come from Google Fonts. Like the cdnjs scripts, that request shows your IP address to the provider; no other data is sent.
- **Content-Security-Policy on the public build:** scripts only from this site and cdnjs; network calls only to the Supabase project; no `<base>` changes; no form posts.
  - `'unsafe-eval'` is allowed because Brython compiles Python to JavaScript at run time. That is the main deliberate weakening.
  - Styles allow `'unsafe-inline'`, a known trade-off.
  - GitHub Pages cannot send response headers, so clickjacking protection (`frame-ancestors`) is not available. Destructive actions such as deleting an account need two separate clicks.
- **The Code Lab runs your own code in your own browser.** The Bash side is a small interpreter written for this project (`quest/shell.js`) that works on an in-memory file map with no access to the network or your disk. Only run code you wrote or understand.
- **Untrusted input is never rendered as HTML.** Imported drill packs, imported progress files, synced progress and anything you type are size-limited, reduced to known fields and plain strings, and rendered as text.
- **Pack notes are trusted HTML** because you write them yourself in files you control. Do not paste HTML from other people into a pack.

## Accounts and sync

Accounts are optional, and the app never handles a password.

**Shared rules for both versions:**

- **Untrusted input.** Anything loaded from a store or an imported file goes through `sanitizeState`: known keys only, type checks, length and count caps, and no `__proto__`, `constructor` or `prototype` keys.
- **No data loss on conflict.** Copies from two devices are merged (best scores, union of completions, most-reviewed flashcards), and a newer "reset progress" wins. The merge converges, so devices stop writing once they agree.
- **Offline first.** The browser copy drives the page. If sync is slow, refused or unavailable, the app keeps working locally and says so.
- **User control.** Sync on or off, export everything as JSON, import (merge only), delete the synced copy.

**Public site (GitHub Pages, Supabase):**

- **Sign-in** with Google, GitHub or a one-time email link, using the PKCE flow. The page shows only the providers the project has turned on.
- **Row-level security** (`supabase/001_progress.sql`): each signed-in user reads and writes only their own row; visitors who are not signed in have no access to the table at all. Verified from outside: an anonymous read and write both return 401.
- **Account deletion** (`supabase/002_delete_account.sql`): `delete_my_account()` deletes only the caller, using the id from the verified session, and the progress row goes with it.
- **Public configuration.** `nines.config.json` holds the project URL and the **publishable** key. These are public by design: the key only allows what row-level security allows. The build refuses any other kind of key. The secret and `service_role` keys must never be in this repo, in the page, or in chat.
- **Sessions** are kept in the browser's local storage, so the CSP and text-only rendering are what protect them from script injection. "Sign out everywhere" revokes every session.
- **Data held by Supabase:** your email address and sign-in provider id (in Supabase Auth), and one progress row keyed on a random user id. Nothing else.
- **Deploys:** GitHub Actions are pinned to full commit SHAs, check out the code without keeping credentials, run with read-only repository access, and run the gate before building.

**claude.ai version:**

- Identity comes from Claude sign-in. The page asks only for `user` (an opaque id, no profile or email), `db` (a private per-user store) and `downloads` (export).
- Progress is written to `data/users/<id>/progress`, which the platform keeps private to each person, including from the artifact's owner.

## Repository protections

- Secret scanning, push protection and Dependabot alerts are on.
- CodeQL code scanning runs on every push.
- The test suite (`tests/`) runs on every pull request and before every deploy. It includes the gate's own tests: planted secrets and a tampered vendor file must fail it, and the public build must ship nothing private.
- The `main` branch blocks deletion and force pushes, and requires linear history.
- Commits use a GitHub no-reply address, not a personal email.

## Before every push

1. The pre-commit hook passes (or run `node scripts/check-private.mjs` and get `OK`).
2. `git status` does not list `quest/packs/personal.js` or anything under `private/`.
3. If you changed the vendored client, update `quest/vendor/CHECKSUMS.sha256` from a copy whose registry integrity you verified.
4. Keep a backup of `quest/packs/personal.js` and `private/` somewhere private. They are not in git, so git will not save them for you.

## If something private is pushed by mistake

Removing it in a later commit is not enough, because it stays in history. Rotate anything secret first. Then set the `main` ruleset to **Disabled**, rewrite history with `git filter-repo`, force-push, re-enable the ruleset, and treat anything that was exposed as public from then on.
