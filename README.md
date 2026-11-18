# Nines

As in 99.99%. An interview-prep platform for SRE, DevOps and platform engineering roles. Static files, no server, no accounts.

## Sections

- **Quest** (Packet Quest): nine hops from first ticket to the interview. Each has a lesson with runnable diagrams, a quiz, timed speak-aloud cards, and most have terminal labs.
- **Remember**: five-minute rounds of tap exercises (match, pick, spell, fill the gap, put in order) with spaced repetition over a glossary and the interview answers.
- **Drills**: every card by topic, timed or cover-the-column, plus drill packs you import from JSON.
- **Code Lab**: 22 Bash and 18 Python exercises that really execute in the browser, judged by hidden tests, for timed coding screens.
- **Stories**: your incident stories and a behavioural question bank.
- **Cheat sheet**: one line per topic.

## Run it locally

```bash
python -m http.server 8765 --directory quest
```

Then open `http://localhost:8765`.

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: the privacy gate, the public-safe build into `dist/`, and a deploy to GitHub Pages. Accounts on the public site use Supabase (see `supabase/` and SECURITY.md). Without `nines.config.json` the build has no accounts and progress stays in the browser.

## Layout

```
quest/
  index.html          the app: styles, engine, 3D map, diagrams
  data.js             core levels: lessons and quizzes
  cards.js            core speak-aloud cards
  term.js             terminal labs (simulated shell, scripted output)
  shell.js            MiniSh: a small shell that really executes (pipes, awk, sed, grep, loops)
  lab.js              Code Lab exercises; expected outputs generated from real bash and Python
  terms.js            glossary for Remember mode
  night.js            the night-sky banner drawing
  packs/
    company.*.js      public facts about one employer and posting
    personal.js       PRIVATE: your stories and interview details (git-ignored)
    personal.example.js
  certs/              cert packs: A+ Core 1 and 2, RHCSA (notes, questions, PBQs, labs, mock exams)
  vendor/             Supabase client, pinned and checksummed
supabase/             SQL for the progress table, row-level security and account deletion
nines.config.json     public Supabase project URL and publishable key
scripts/
  check-private.mjs   privacy and secret gate
  build.mjs           public-safe standalone build into dist/
private/              git-ignored
```

## Packs

Core content is generic. A company pack adds notes, cards and questions for one employer. The personal pack adds your stories, your own example for a card, resume lines to firm up, and the next interview's details. To prepare for another company, add `packs/company.<name>.js` and point the script tag in `index.html` at it.

## Privacy

Read [SECURITY.md](SECURITY.md) before publishing anything. Run `node scripts/check-private.mjs` before every commit.

## Limits

The terminal is simulated: it accepts the commands each lab expects, not arbitrary shell. Progress is stored in one browser.
