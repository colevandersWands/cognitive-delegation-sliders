# AGENTS.md — governance for this tool

This is a small artifact, so this is a small governance file. Its job is to make the build
*legible*: the stance it was built in, how it’s structured, the test discipline, what is
verified and how, and where it departs from the parent curriculum’s conventions and why.

## Stance: deliberate Vibetoading

Built in **Vibetoad mode** — development grounded in user-visible behavior, iterating on
outcomes (does the slider move, does the link restore, does it print, does it read on a
phone) rather than on a fully specified notional machine up front. A *choice*, declared
before the work, not a corner cut under pressure.

Vibetoading and Frogramming are a spectrum. The register here is mixed on purpose:

- The **pure core** (state model, URL codec) is Frogrammed — small, deterministic, pinned by
  specs written against its contract.
- The **shell** (DOM, URL, clipboard, print, layout) is Vibetoaded — built and verified by
  exercising it in a browser, because that is where its behavior actually lives.

A repo that demonstrates *governed* vibetoading is itself the point: the governance is what
separates it from “I pasted something that worked.”

## Test discipline (non-negotiable)

The tests exist to be used — that is the whole reason they’re here.

- **Any change to the pure core (`core.js`, `url.js`, `svg.js`) is validated by the specs.**
  Change the behavior → add or update the matching spec in `tests/core.spec.js` /
  `tests/url.spec.js` / `tests/svg.spec.js` → run it → green before moving on. Test-first when
  the behavior is clear; test-immediately-after when discovered by vibetoading — but never
  “change core and skip the spec.”
- **Work incrementally.** One behavior at a time, specs run at each step, not a big-bang batch
  validated at the end.
- **Two ways to run, same specs:** the in-browser pages (`tests/core.test.html`,
  `tests/url.test.html`, `tests/svg.test.html`) for a non-dev-friendly green/red report off the
  filesystem, and `node tests/run.js` for the CI gate. They must agree.
- The shell isn’t unit-tested (no jsdom dependency, by choice); it’s browser-verified — so the
  spec coverage on the core is what keeps the foundation honest. Don’t let it rot.

## Architecture of record

**Accessibility to non-devs is the priority**, and it drove two structural choices:

- **Classic scripts, no ES modules.** Every file is a plain `<script>` attaching to one global
  `Slider` namespace, loaded in dependency order. ES modules don’t load over `file://`; classic
  scripts do — so `index.html` (and the test pages) open by double-clicking, no server, no
  build, no install. The same files are `require()`-able in Node (the IIFE targets globalThis)
  for the CI gate.
- **Mobile-first.** The CSS base targets a phone; a single `min-width` block enhances to the
  wide layout. The slider is a native `<input type=range>` with a touch-sized target.

**Functional core + imperative shell.**

- `core.js`, `url.js`, `svg.js` — pure. No DOM, no `location`, no `history`, no clipboard.
  Deterministic in, deterministic out; core return values are deep-frozen. The domain model
  lives here, and every spec points at it. `svg.js` builds the downloadable image as a string.
- `ui.js`, `main.js` — the shell. Deliberately effectful. Every side-effecting procedure
  carries an **`@effects`** line (`@effects writes history.replaceState`, `@effects mutates
  #rows`, …). The shell calls into the core; the core never calls back.

**The URL is the single source of truth.** State encodes into `?d=…` (version inside the
payload), written with `history.replaceState` (coalesced to one write per animation frame so a
drag doesn’t thrash). `decodeState` is *fail-soft* and never throws — a missing, truncated,
garbled, or future-versioned link falls back to a fresh model, with a non-blocking notice for
the failures that aren’t just “a normal first visit.”

**Three views, chosen by presence-only URL flags (`detectMode`):**

- **edit** (no flag) — full authoring.
- **readonly** (`?readonly`) — a frozen assignment: the generic app heading is swapped for the
  saved **title + description**, everything is disabled, and the banner links to **Open an
  editable copy** and **Submit a response** (new tabs).
- **submit** (`?submit`) — a response: title/description/aspect-labels are locked, but the
  sliders and a **name** field stay editable. `syncUrl` preserves `?submit` so the responder’s
  edits don’t silently drop back to edit mode on refresh.

Flags are never stripped, so the URL always fully determines the view. The lock encodes
*shared intent*, not enforcement — the on-page copy says so. Control + name-field visibility is
CSS-driven (`body.is-readonly` / `body.is-submit`); the JS just adds the class, disables the
right inputs, and sets the banner links.

**Sharing degrades gracefully** (mobile-critical): the Web Share API (native sheet) when
available → the Clipboard API → a selectable manual “copy this link” field. Clipboard/Share are
disabled by browsers in **insecure contexts** (`file://` or plain-`http://` LAN — how a phone
reaches a dev machine), which is why the manual fallback exists and why the deployed **https**
site is the real mobile target.

**Download-as-image** is a pure native-SVG string (`svg.js`, no `<foreignObject>`) rasterized on
a canvas to PNG — so it never taints the canvas, needs no library, and works offline.

**State (`schemaVersion: 2`)** adds `ordered` (numbered vs unordered aspects, via a CSS counter)
and `name` (the responder’s, filled in submission mode) to the v1 shape; old links decode
forward (missing fields default).

## Verified vs vibetoaded — stated honestly

**Covered by the specs (pure core), run in-browser and in Node:** clamping/rounding; the
human/AI percentage readouts and band boundaries; default state; row add/remove/update
immutability; URL encode∘decode round-trip identity (incl. `ordered` + `name`, URL-hostile
labels, multi-line text); fail-soft decode; `detectMode` (edit/readonly/submit); and `buildSvg`
(root, namespace, title/name, percentages, one dot per row, XML escaping, numbering).

**Verified in real browser engines (the shell), not unit-tested:** the three modes and their
control/visibility swaps; ordered numbering; the read-only banner’s edit + submit links;
submission mode (name + sliders editable, structure locked, `?submit` persisted); the
share/copy fallbacks; download → SVG→PNG with no canvas taint; fail-soft notice; mobile +
desktop layouts; print. Exercised against headless **Chrome** (mobile emulation via
puppeteer-core: tap, touch-drag, screenshots) and real **WebKit** (playwright-core, iPhone
device) driving the system browsers.

> **Lesson — test real mobile, not a wide screenshot.** A mobile regression (share/copy) once
> slipped through because headless `--screenshot`/`--window-size` floors the layout viewport at
> ~500px, masking true phone-width behavior, and Chrome’s clipboard works on `file://` where a
> phone’s WebKit-over-LAN does not. For anything touch- or context-sensitive, drive an actual
> device width + touch (puppeteer-core) and a real WebKit engine (playwright-core) — they live
> in `/tmp/mobtest/` as dev-only tools, never project dependencies.

**Left to a human interactive pass:** clipboard copy on a genuinely insecure phone origin, and
the native share sheet UX. They ride the code paths the emulation confirmed.

## Conventions followed, and relaxed

The parent curriculum’s conventions (`…/0-curricula/AGENTS.md` + `DEV.md`) are written for a
TypeScript, vitest-tested, React-and-pure-data package. This is a no-build, no-framework,
no-dependency static tool, so some rules transfer and some don’t.

**Followed:** one-concept files; named `function` declarations; no `this`, no classes;
verb-first naming and `is/has` predicates; immutable, deep-frozen core return values;
guard-first readability; comments that explain *why*; end-state docs (README = what it *is*,
this file = the *process*).

**Relaxed, each on purpose:**

- **No TypeScript.** Plain JS with JSDoc types. Intent kept (a domain model pinned at the
  boundary); the `.ts`/`tsc` mechanism dropped to stay buildless.
- **Classic scripts + one global namespace**, not ES-module one-default-export-per-file.
  *Why:* so the tool and its tests open straight off the filesystem for non-devs.
- **Zero-dep shared specs + a tiny harness**, not vitest/node:test. *Why:* the same assertions
  run in the browser (accessible) and in Node (CI), with nothing to install.
- **Version travels inside `d`**, not a separate `?v=` param. *Why:* one source of truth for
  the schema version.

No Phase-0 / Adversarial-Review / per-increment-TDD-ceremony was run on the build — that
machinery is for production modules inside the package; dropping it is the deliberate
Vibetoading declaration above, not an oversight. The **test discipline** section is the part
that is *not* relaxed.
