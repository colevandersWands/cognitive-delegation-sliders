# Human–AI Slider Model

An interactive, single-page tool for placing tasks on a spectrum from **Productive
Struggle** (human) to **Cognitive Delegation** (AI) — then sharing the result as a link,
printing it, or downloading it as an image.

It’s a thinking tool, not a set of rules. The reasoning behind the framework lives in the
**About this framework** panel on the page itself.

> Replaces the 2-D quadrant in the `collAIboration` “Human+AI Collaboration Roles” pedagogy
> quick-read with a per-task 1-D spectrum.
>
> Repo: <https://github.com/colevandersWands/cognitive-delegation-sliders> ·
> Live: <https://colevandersWands.github.io/cognitive-delegation-sliders/>

## Open it

**Just open `index.html` in a browser** — double-click it. No server, no build, no install.
Everything is plain HTML/CSS/JS (classic scripts), so it runs straight off the filesystem.

Each aspect shows the split as complementary percentages — `30% human` on the left of the
slider, `70% AI` on the right. It’s **mobile-first** and touch-friendly.

- **Add aspect**, name it, drag its slider toward Human or AI.
- **Numbered** toggles between an unordered list of aspects and a numbered one — so you can
  describe a *process* (1. brain dump → 100% human; 2. extract key ideas → 50/50; …).
- **Copy link / Copy read-only link / Print / Download image** (see below).

## The three views

1. **Edit** (default) — build the model: title, instructions, aspects, slider positions.
2. **Read-only** (`Copy read-only link`) — a frozen view of the assignment. The app heading is
   replaced by *your* title + description; sliders are locked. The banner offers **Open an
   editable copy** and **Submit a response →** (both open in a new tab).
3. **Submission** — reached from a read-only view (or a `?…&submit` link). The title,
   description, and aspect labels are locked, but the responder can **move the sliders** and
   fill in a **name**, then Copy link / Print / Download image to submit what they actually
   did. The link, print, and image all carry title + description + name + slider positions.

All shareable state lives in the URL; there is no server, no account, nothing stored.

## Copying links (incl. mobile)

The Copy buttons copy a link to the clipboard, with a selectable “copy this link” field as a
universal fallback (no native share sheet — it was intrusive).

> The Clipboard API only works in a **secure context** — `https://` or `http://localhost`.
> Over `file://` or a plain-`http://` LAN address (e.g. testing on a phone against your
> laptop’s IP) the browser disables it, and the tool falls back to the manual copy field. For
> the best experience, use the deployed **https** site.

## Download as image

`Download image` renders the whole model — title, description, name, and each aspect’s
slider — as a PNG. It’s built from a pure native-SVG string (`svg.js`) and rasterized on a
canvas; no third-party library, no `<foreignObject>`, so it works offline and untainted.

## Test it

One shared set of specs runs **two ways**, zero dependencies:

- **In a browser** — open `tests/core.test.html`, `tests/url.test.html`, `tests/svg.test.html`.
  Each renders a green/red report; opens off the filesystem.
- **In Node (the CI gate)** — `npm test` (`node tests/run.js`), exits non-zero on failure.

The pure core (state, URL codec, percentages, SVG builder) is fully spec’d; the DOM/URL/
clipboard/print/image shell is browser-verified (incl. real WebKit + mobile Chrome — see
`AGENTS.md`).

## Run a local server (optional)

Only needed for the clipboard buttons over a real origin (no Python required):

```sh
npm run serve     # npx serve .
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` runs the specs, then publishes the folder as-is:

1. `git init && git add -A && git commit -m "init" && git branch -M main`
2. `gh repo create colevandersWands/cognitive-delegation-sliders --public --source=. --push`
3. Repo **Settings → Pages → Source = “GitHub Actions.”**

Asset paths are relative, so it works under the `/cognitive-delegation-sliders/` sub-path.

## How it’s built

Plain HTML/CSS/JS — no framework, no bundler, no dependencies, no ES modules. Every file is
a classic `<script>` attaching to one global `Slider` namespace, in dependency order.

```text
index.html            shell + GitHub corner + the “About this framework” copy
styles/style.css      mobile-first layout, type, controls, read-only/submit swap, print
styles/slider.css     the hand-drawn native-range slider (the cross-browser part)
src/core.js           pure: state ops, clamp, human/AI readouts, validation
src/url.js            pure: encode/decode URL (fail-soft), detectMode
src/svg.js            pure: buildSvg(state) — the downloadable image
src/ui.js             shell: render, URL sync, share/clipboard, modes, image  (@effects)
src/main.js           shell: bootstrap + event wiring
tests/harness.js      tiny zero-dep assert harness (browser + Node)
tests/*.spec.js       shared specs for core / url / svg
tests/*.test.html     in-browser test pages
tests/run.js          Node runner for the CI gate
```

## Framework attribution

The framework — Productive Struggle ↔ Cognitive Delegation, “a thinking tool, not rules,”
Diagnostic vs Prescriptive use, “understanding is non-delegable,” and the prerequisites
caveat — is drawn from the `collAIboration` quick-read and the *Welcome to Frogramming*
curriculum. The GitHub corner is Tim Holman’s [github-corners](https://tholman.com/github-corners/) (MIT).

## License

MIT — see [LICENSE](./LICENSE). © 2026 Evan Cole, Joslenne Peña, Janet Tilstra.
