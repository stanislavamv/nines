# Nines

As in 99.99%. An interview-prep platform for SRE, DevOps and platform engineering roles: lessons, labs, spaced repetition, coding practice and certification prep in one static site. Accounts are optional; without one, everything works and stays in your browser.

## Sections

- **Quest** (Packet Quest): nine hops from first ticket to the interview. Each has a lesson with runnable diagrams and a quiz; most also have a Remember deck, timed speak-aloud cards and simulated terminal labs.
- **Remember**: five-minute rounds of tap exercises (match, pick, spell, fill the gap, put in order) with spaced repetition over a glossary and the interview answers.
- **Drills**: every card by topic, timed or cover-the-column, plus drill packs you import from JSON.
- **Code Lab**: 22 Bash and 18 Python exercises that really execute in the browser, judged by hidden tests, for timed coding screens.
- **Certs**: CompTIA A+ Core 1 and Core 2, and Red Hat RHCSA (EX200, RHEL 10). Domain notes, Remember decks, practice questions, performance-based tasks, terminal labs and timed mock exams.
- **Stories**: your incident stories and a behavioural question bank.
- **Cheat sheet**: one line per topic.
- **Account**: optional sign-in that syncs progress across devices, plus export, import and delete.

## Run it locally

Without accounts, straight from the source:

```bash
python -m http.server 8765 --directory quest
```

With accounts, as the public site runs it:

```bash
node scripts/build.mjs
python -m http.server 8765 --directory dist
```

Then open `http://localhost:8765`. No install step and no dependencies: Node.js is only used for the build and the privacy gate.

## Tests

```bash
node --test "tests/*.test.mjs"
```

About 120 tests, no dependencies, under 10 seconds:

- **Content:** every quiz, card, term and cert pack is well formed; every PBQ answer key points at a real option or matches its pattern; command drills reject non-persistent shortcuts.
- **Labs:** every quest lab, RHCSA lab and mock exam clears by following its own hints, and the mocks give no credit for shortcuts.
- **Code Lab:** every reference solution passes its hidden tests in the in-browser shell (Bash) and in real Python, and no starter passes by accident.
- **Account sync:** the sanitizer rejects hostile input and the merge never loses progress.
- **Gate and build:** the privacy gate blocks planted secrets and tampered vendor files, and the public build ships nothing private.

The Python tests need `python3`; without it they are skipped. CI runs the suite on every pull request and before every deploy.

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: the tests, the privacy gate, the public-safe build into `dist/`, and a deploy to GitHub Pages. A failing test stops the deploy. Accounts on the public site use Supabase: see `supabase/` and [SECURITY.md](SECURITY.md). Without `nines.config.json` the build has no accounts and progress stays in the browser.

## Layout

```
quest/
  index.html          the app: styles, engine, 3D map, diagrams, accounts
  data.js             core levels: lessons and quizzes
  cards.js            core speak-aloud cards
  term.js             terminal labs (simulated shell, scripted output)
  shell.js            MiniSh: a small shell that really executes (pipes, awk, sed, grep, loops)
  lab.js              Code Lab exercises; expected outputs generated from real bash and Python
  terms.js            glossary for Remember mode
  night.js            the night-sky banner drawing
  certs/              cert packs: A+ Core 1 and 2, RHCSA
  packs/
    personal.js       PRIVATE: your stories and interview details (git-ignored)
    personal.example.js
  vendor/             Supabase client, pinned and checksummed, with its license
supabase/             SQL for the progress table, row-level security and account deletion
nines.config.json     public Supabase project URL and publishable key
scripts/
  check-private.mjs   privacy and secret gate
  build.mjs           public-safe build into dist/
  pre-commit          git hook that runs the gate
tests/                automated tests (node --test), no dependencies
design/               visual design explorations, not part of the app
.github/workflows/    tests on pull requests; tests, build and deploy on main
private/              git-ignored: denylist, company packs, anything personal
```

## Packs

Core content is generic. Two optional overlays add to it:

- **A personal pack** (`quest/packs/personal.js`, git-ignored): your stories, your own example for a card, resume lines to firm up, and the next interview's details. Copy `personal.example.js` to start one.
- **A company pack** (`window.PACK_COMPANY`): notes, cards and questions for one employer. Keep it in `private/` and add a `<script>` tag for it in your local `index.html` only, so the public repo does not reveal where you are applying.

Anyone using the site can also type their own stories and interview details on the Stories page and the map sidebar; those live in their browser or their account, never in the repo.

## Privacy

Read [SECURITY.md](SECURITY.md) before publishing anything. The pre-commit hook runs `node scripts/check-private.mjs` on every commit; install it with `cp scripts/pre-commit .git/hooks/pre-commit`.

## License

- **Code** (app, scripts, tests, workflows, SQL): [MIT](LICENSE).
- **Learning content** (lessons, quizzes, cards, glossary, labs, Code Lab exercises, cert packs): [CC BY-NC-SA 4.0](LICENSE-CONTENT.md). Free to share and adapt with credit, not for sale.
- **Third-party code** keeps its own license: the vendored Supabase client is MIT (`quest/vendor/supabase-LICENSE.txt`). three.js (MIT) and Brython (BSD-3-Clause) load from cdnjs and are not redistributed here.

## Trademarks

CompTIA, A+, Network+ and Security+ are trademarks of CompTIA, Inc. Red Hat and RHCSA are trademarks of Red Hat, Inc. Cisco and CCNA are trademarks of Cisco Systems, Inc. Nines is an independent study project. It is not affiliated with, endorsed by or sponsored by any of them, and its questions are not real exam items.

## Limits

- The terminal labs and mock exams are simulated: they accept the commands each task expects, not arbitrary shell. Practise on a real VM too.
- Without an account, progress lives in one browser.
- Practice questions are original study material, not real exam items.
