# Human–AI Slider Model

An interactive, single-page tool for placing tasks on a spectrum from **Productive
Struggle** (human) to **Cognitive Delegation** (AI) — then sharing the result as a link or
printing it as a rubric.

It’s a thinking tool, not a set of rules. An educator can scope an assignment by setting
where each task *should* sit and sharing a read-only link; a learner can record where their
work *actually* sat. The reasoning behind the framework lives in the **About this framework**
panel on the page itself.

> Replaces the 2-D quadrant in the `collAIboration` “Human+AI Collaboration Roles” pedagogy
> quick-read with a per-task 1-D spectrum.

## Open it

**Just open `index.html` in a browser** — double-click it. No server, no build, no install.
The whole tool is plain HTML/CSS/JS (classic scripts), so it runs straight off the
filesystem.

Each task shows the split as complementary percentages — `30% human` on the left of the
slider, `70% AI` on the right.

- **Add a task**, name it, and drag its slider toward Human or AI.
- **Copy link** — a normal, editable link that restores exactly what’s on screen.
- **Share read-only** — the same state, locked. The shared view drops the app heading and
  shows *your* title and description instead, with the sliders fixed. It offers an **Open an
  editable copy** link (opens in a new tab). The lock is a *shared intent*, not enforcement —
  see the About panel.
- **Print** — a clean, black-on-white one-page rubric.

It’s **mobile-first**: rows stack and the controls reflow on a phone; the slider has a
touch-sized target.

All state lives in the URL — no server, no account, nothing stored. Bookmark or share the
URL and you’ve saved your work. (Clipboard “copy” needs a secure context: it works when
served over `http://localhost` or `https://`; from `file://` it falls back to showing the
link to copy by hand.)

## Run a local server (optional)

Only needed if you want the clipboard buttons over a real origin. No Python required:

```sh
npm run serve     # npx serve .  → http://localhost:3000
```

## Test it

The pure logic (URL codec, validation, clamping, the human/AI readouts, row operations) has
one shared set of specs that runs **two ways**, with zero dependencies:

- **In a browser** — open `tests/core.test.html` and `tests/url.test.html`. Each renders a
  green/red report. Opens off the filesystem like everything else.
- **In Node (the CI gate)** — `npm test` (runs `node tests/run.js`), exits non-zero on any
  failure.

Same assertions, both places. The DOM/URL/clipboard shell (`ui.js`, `main.js`) is verified
in the browser — see `AGENTS.md`.

## Deploy it (GitHub Pages)

`.github/workflows/deploy.yml` runs the specs, then publishes the folder as-is. One-time
setup, since this is its own repository:

1. `git init && git add -A && git commit -m "init" && git branch -M main`
2. Create the GitHub repo and push (`gh repo create <user>/<repo> --public --source=. --push`).
3. In the repo: **Settings → Pages → Source = “GitHub Actions.”**
4. The site goes live at `https://<user>.github.io/<repo>/`.

Asset paths are all relative, so it works under the `/<repo>/` sub-path.

## How it’s built

Plain HTML/CSS/JS — no framework, no bundler, no dependencies, no ES modules. Every file is a
classic `<script>` attaching to one global `Slider` namespace, in dependency order.

```text
index.html            shell + the “About this framework” copy
styles/style.css      mobile-first layout, type, controls, read-only swap, print chrome
styles/slider.css     the hand-drawn native-range slider (the cross-browser part)
src/core.js           pure: state ops, clamp, human/AI readouts, validation
src/url.js            pure: encode/decode the URL, fail-soft
src/ui.js             shell: DOM rendering, URL sync, clipboard  (effects marked @effects)
src/main.js           shell: bootstrap + event wiring
tests/harness.js      tiny zero-dep assert harness (browser + Node)
tests/core.spec.js    shared specs for core.js
tests/url.spec.js     shared specs for url.js
tests/*.test.html     in-browser test pages
tests/run.js          Node runner for the CI gate
```

The split is deliberate: a **pure, tested core** and a clearly-marked **effectful shell**.
`AGENTS.md` documents that decision, the stance behind it, and the test discipline.

## Framework attribution

The framework — Productive Struggle ↔ Cognitive Delegation, “a thinking tool, not rules,”
Diagnostic vs Prescriptive use, “understanding is non-delegable,” and the prerequisites
caveat — is drawn from Evan Cole’s `collAIboration` quick-read and the *Welcome to
Frogramming* curriculum. The on-page copy stays faithful to those sources.

## License

MIT
