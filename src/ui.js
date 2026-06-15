// ui.js — the imperative shell. Classic script: extends the global `Slider` namespace
// (core.js + url.js must load first). Browser-only; never loaded by the test runner.
//
// Everything here has side effects: it builds and mutates DOM, reads window.location, writes
// history, touches the clipboard. Each effectful procedure carries an @effects line. Pure
// logic lives in core.js / url.js and is never reached from the other direction.
//
// User text (labels, title, instructions) is always written via .value / .textContent,
// never innerHTML, so a hostile label in a shared link cannot inject markup.

(function (root) {
  "use strict";

  var Slider = (root.Slider = root.Slider || {});

  /**
   * Build the <li> for one row. No event wiring here — main.js delegates events on #rows.
   * @effects creates DOM nodes
   * @param {{id:string,label:string,value:number}} row @returns {HTMLLIElement}
   */
  function renderRow(row) {
    var li = document.createElement("li");
    li.className = "task-row";
    li.dataset.id = row.id;

    var label = document.createElement("input");
    label.className = "row-label";
    label.type = "text";
    label.placeholder = "Name this aspect …";
    label.autocomplete = "off";
    label.value = row.label;
    label.setAttribute("aria-label", "Task name");

    // The number (shown only when "Numbered") is filled by a CSS counter, so it stays
    // correct as rows are added/removed without per-row bookkeeping here.
    var num = document.createElement("span");
    num.className = "row-num";
    num.setAttribute("aria-hidden", "true");

    var head = document.createElement("div");
    head.className = "row-head";
    head.append(num, label);

    var human = document.createElement("span");
    human.className = "row-human";
    human.setAttribute("aria-hidden", "true");
    human.textContent = Slider.humanLabel(row.value);

    var slider = document.createElement("div");
    slider.className = "slider";
    slider.style.setProperty("--val", String(row.value));

    var range = document.createElement("input");
    range.className = "row-slider";
    range.type = "range";
    range.min = "0";
    range.max = "100";
    range.step = "1";
    range.value = String(row.value);
    applySliderAria(range, row.label, row.value);

    var dot = document.createElement("span");
    dot.className = "print-dot";
    dot.setAttribute("aria-hidden", "true");
    slider.append(range, dot);

    var ai = document.createElement("span");
    ai.className = "row-ai";
    ai.setAttribute("aria-hidden", "true");
    ai.textContent = Slider.aiLabel(row.value);

    var remove = document.createElement("button");
    remove.className = "row-remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove task");

    li.append(head, human, slider, ai, remove);
    return li;
  }

  /**
   * Keep the slider's accessible name + value text in sync with the label and value, so a
   * screen reader announces e.g. "Generating ideas, Human to AI … 27% human, 73% AI (Mostly AI)".
   * @effects mutates the range element's attributes
   */
  function applySliderAria(range, label, value) {
    var name = label && label.trim() ? label.trim() : "Unnamed task";
    range.setAttribute("aria-label", name + ", Human to AI");
    range.setAttribute(
      "aria-valuetext",
      Slider.humanLabel(value) +
        ", " +
        Slider.aiLabel(value) +
        " (" +
        Slider.bandFromValue(value) +
        ")",
    );
  }

  /**
   * Full render: title, instructions, and every row. Used on initial load and reset only.
   * @effects replaces #rows contents and sets header field values
   */
  function renderApp(state) {
    document.getElementById("title").value = state.title;
    document.getElementById("instructions").value = state.instructions;
    document.getElementById("name").value = state.name;
    var list = document.getElementById("rows");
    list.classList.toggle("ordered", !!state.ordered);
    list.replaceChildren.apply(list, state.rows.map(renderRow));
  }

  /**
   * Show a non-blocking notice (fail-soft messages, clipboard fallback). Pass '' to hide.
   * @effects mutates #notice
   */
  function showNotice(message) {
    var el = document.getElementById("notice");
    el.textContent = message;
    el.hidden = !message;
  }

  // rAF-coalesced URL writer + current view mode. The mutable module-level handles are the
  // one place this file keeps state — sanctioned because we're throttling a browser API and
  // tracking the URL flag, not modelling domain data.
  var rafHandle = 0;
  var pendingState = null;
  var currentMode = "edit"; // 'edit' | 'readonly' | 'submit'

  /**
   * Project the current state into the URL via replaceState, at most once per animation
   * frame so dragging a slider doesn't thrash. Preserves ?submit so a responder's edits stay
   * in submission mode; never pushes history.
   * @effects writes window.history.replaceState
   */
  function syncUrl(state) {
    pendingState = state;
    if (rafHandle) return;
    rafHandle = requestAnimationFrame(function () {
      rafHandle = 0;
      var params = new URLSearchParams();
      params.set("d", Slider.encodeState(pendingState));
      if (currentMode === "submit") params.set("submit", "1");
      history.replaceState(null, "", "?" + params.toString());
    });
  }

  /**
   * Build an absolute shareable URL straight from state (not from location), avoiding a race
   * on a fresh visit where syncUrl's rAF hasn't yet written `?d=…`. opts.flag adds a mode
   * flag: 'readonly' (locked assignment) or 'submit' (response).
   * @effects reads window.location (origin + pathname only)
   */
  function buildUrl(state, opts) {
    var params = new URLSearchParams();
    params.set("d", Slider.encodeState(state));
    var flag = opts && opts.flag;
    if (flag) params.set(flag, "1");
    return window.location.origin + window.location.pathname + "?" + params.toString();
  }

  /** The current URL re-flagged for a mode (drops the others). @effects reads window.location */
  function modeUrl(flag) {
    var url = new URL(window.location.href);
    url.searchParams.delete("readonly");
    url.searchParams.delete("submit");
    if (flag) url.searchParams.set(flag, "1");
    return url.href;
  }

  /**
   * Read-only shared view: swap the masthead for the saved title/description, lock everything,
   * reveal the banner, and point its links at an editable copy and a submission. Control
   * visibility is CSS-driven (body.is-readonly).
   * @effects mutates many DOM nodes
   */
  function applyReadonly() {
    currentMode = "readonly";
    document.body.classList.add("is-readonly");
    lockInputs("#title, #instructions, .row-label, .row-slider");
    hideFieldIfEmpty("title");
    hideFieldIfEmpty("instructions");
    sizeInstructions();
    document.getElementById("banner").hidden = false;
    document.getElementById("editcopy").href = modeUrl(null);
    document.getElementById("submitlink").href = modeUrl("submit");
  }

  /**
   * Submission view: the teacher's title/description/labels are locked, but the responder can
   * move the sliders and fill in their name. Control + name visibility is CSS-driven
   * (body.is-submit).
   * @effects mutates many DOM nodes
   */
  function applySubmit() {
    currentMode = "submit";
    document.body.classList.add("is-submit");
    lockInputs("#title, #instructions, .row-label"); // NOT .row-slider — those stay editable
    hideFieldIfEmpty("title");
    hideFieldIfEmpty("instructions");
    sizeInstructions();
  }

  /** @effects disables matching inputs and marks them aria-readonly */
  function lockInputs(selector) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i += 1) {
      els[i].setAttribute("disabled", "");
      els[i].setAttribute("aria-readonly", "true");
    }
  }

  /** @effects grows the instructions textarea to fit its content (so it reads as a block) */
  function sizeInstructions() {
    var el = document.getElementById("instructions");
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  /** @effects mutates the field wrapper's hidden state */
  function hideFieldIfEmpty(id) {
    var el = document.getElementById(id);
    if (!el.value.trim()) {
      var field = el.closest(".field");
      if (field) field.hidden = true;
    }
  }

  /**
   * Copy a link to the clipboard with a universal fallback. The buttons just COPY — no native
   * share sheet (it was intrusive on desktop and surprising). The Clipboard API works in secure
   * contexts (https / localhost), incl. on mobile; in insecure contexts (file:// or http LAN —
   * how a phone reaches a dev machine) it's unavailable, so we show a selectable field to copy
   * by hand. That manual fallback is what keeps sharing working on mobile.
   * @effects writes navigator.clipboard; mutates the button or #notice
   */
  function copyLink(url, button) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () {
          flashCopied(button);
        },
        function () {
          showCopyField(url);
        },
      );
    } else {
      showCopyField(url);
    }
  }

  /**
   * Last-resort manual copy: a read-only, pre-selected field in the notice region. Works in
   * every context (file://, http LAN, old browsers) — the user taps it and copies.
   * @effects mutates #notice
   */
  function showCopyField(url) {
    var notice = document.getElementById("notice");
    notice.textContent = "";
    var label = document.createElement("span");
    label.textContent = "Copy this link: ";
    var input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.value = url;
    input.className = "copy-field";
    input.setAttribute("aria-label", "Shareable link");
    notice.append(label, input);
    notice.hidden = false;
    input.focus();
    input.select();
    try {
      input.setSelectionRange(0, url.length);
    } catch (e) {
      /* some inputs reject setSelectionRange; selection above is enough */
    }
  }

  /** @effects mutates the button label/disabled state for ~1.2s */
  function flashCopied(button) {
    var original = button.textContent;
    button.textContent = "Copied ✓";
    button.disabled = true;
    setTimeout(function () {
      button.textContent = original;
      button.disabled = false;
    }, 1200);
  }

  /**
   * Download the whole model as a PNG. The image is built as a pure native-SVG string
   * (buildSvg, in svg.js) — no foreignObject — so drawing it to a canvas does NOT taint it
   * and toBlob() succeeds. Rendered at 2x for a crisp result.
   * @effects creates an object URL, a canvas, and a temporary download link
   */
  function downloadImage(state) {
    var svg = Slider.buildSvg(state);
    var svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    var img = new Image();
    img.onload = function () {
      var scale = 2;
      var canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      var ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob(function (png) {
        var href = URL.createObjectURL(png);
        var a = document.createElement("a");
        a.href = href;
        a.download = (state.title ? slugify(state.title) : "human-ai-slider") + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(href);
        }, 1000);
      }, "image/png");
    };
    img.onerror = function () {
      URL.revokeObjectURL(svgUrl);
      showNotice("Couldn't generate the image.");
    };
    img.src = svgUrl;
  }

  function slugify(text) {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "human-ai-slider"
    );
  }

  Slider.renderRow = renderRow;
  Slider.applySliderAria = applySliderAria;
  Slider.renderApp = renderApp;
  Slider.showNotice = showNotice;
  Slider.syncUrl = syncUrl;
  Slider.buildUrl = buildUrl;
  Slider.applyReadonly = applyReadonly;
  Slider.applySubmit = applySubmit;
  Slider.downloadImage = downloadImage;
  Slider.copyLink = copyLink;
})(typeof globalThis !== "undefined" ? globalThis : this);
