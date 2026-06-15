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

- **Any change to the pure core (`core.js`, `url.js`) is validated by the specs.** Change the
  behavior → add or update the matching spec in `tests/core.spec.js` / `tests/url.spec.js` →
  run it → green before moving on. Test-first when the behavior is clear; test-immediately-
  after when discovered by vibetoading — but never “change core and skip the spec.”
- **Work incrementally.** One behavior at a time, specs run at each step, not a big-bang batch
  validated at the end.
- **Two ways to run, same specs:** the in-browser pages (`tests/core.test.html`,
  `tests/url.test.html`) for a non-dev-friendly green/red report off the filesystem, and
  `node tests/run.js` for the CI gate. They must agree.
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

- `core.js`, `url.js` — pure. No DOM, no `location`, no `history`, no clipboard. Deterministic
  in, deterministic out; return values are deep-frozen. The domain model lives here, and every
  spec points at it.
- `ui.js`, `main.js` — the shell. Deliberately effectful. Every side-effecting procedure
  carries an **`@effects`** line (`@effects writes history.replaceState`, `@effects mutates
  #rows`, …). The shell calls into the core; the core never calls back.

**The URL is the single source of truth.** State encodes into `?d=…` (version inside the
payload), written with `history.replaceState` (coalesced to one write per animation frame so a
drag doesn’t thrash). `decodeState` is *fail-soft* and never throws — a missing, truncated,
garbled, or future-versioned link falls back to a fresh model, with a non-blocking notice for
the failures that aren’t just “a normal first visit.”

**Read-only is a soft lock.** A `?readonly` flag (presence-only) renders a locked view: the
generic app heading is swapped for the saved **title + description**, inputs are disabled, the
editing controls hide, and an “Open an editable copy” link (new tab) points at the same `?d=…`
without `readonly`. It’s never stripped, so the URL always fully determines the view; removing
the flag reverts to editing. The lock encodes *shared intent*, not enforcement — the on-page
copy says so.

## Verified vs vibetoaded — stated honestly

**Covered by the specs (pure core), run in-browser and in Node:** clamping/rounding; the
human/AI percentage readouts and the band boundaries; default state; row add/remove/update
immutability; URL encode∘decode round-trip identity (ids, order, values, URL-hostile labels,
multi-line text); fail-soft decode (missing / malformed / invalid-shape / future-version);
read-only presence semantics.

**Verified in a real browser engine (the shell), not unit-tested:** rendering of fresh /
shared / read-only / malformed-link states; the dual readouts; the read-only header swap and
its new-tab “edit a copy” link; the fail-soft notice; the mobile and desktop layouts; and
print. Exercised against headless Chrome (`--dump-dom`, `--screenshot`, `--print-to-pdf`).

**Left to a human interactive pass:** live slider dragging updating the URL, clipboard copy
(needs a user gesture and a secure context), and keyboard operation (native to the range
input). They ride the code paths the headless checks confirmed.

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
