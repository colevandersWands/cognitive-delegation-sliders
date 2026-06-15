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

    li.append(label, human, slider, ai, remove);
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
    var list = document.getElementById("rows");
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

  // rAF-coalesced URL writer. The mutable module-level handles are the one place this file
  // keeps state — sanctioned because we're throttling a browser API, not modelling data.
  var rafHandle = 0;
  var pendingState = null;

  /**
   * Project the current state into the URL via replaceState, at most once per animation
   * frame so dragging a slider doesn't thrash. Never pushes history; never writes readonly.
   * @effects writes window.history.replaceState
   */
  function syncUrl(state) {
    pendingState = state;
    if (rafHandle) return;
    rafHandle = requestAnimationFrame(function () {
      rafHandle = 0;
      var params = new URLSearchParams();
      params.set("d", Slider.encodeState(pendingState));
      history.replaceState(null, "", "?" + params.toString());
    });
  }

  /**
   * Build an absolute shareable URL straight from state (not from location), avoiding a
   * race on a fresh visit where syncUrl's rAF hasn't yet written `?d=…`. Pass
   * { readonly: true } for a locked assignment link.
   * @effects reads window.location (origin + pathname only)
   */
  function buildUrl(state, opts) {
    var params = new URLSearchParams();
    params.set("d", Slider.encodeState(state));
    if (opts && opts.readonly) params.set("readonly", "1");
    return (
      window.location.origin +
      window.location.pathname +
      "?" +
      params.toString()
    );
  }

  /**
   * The same URL with the readonly flag removed — an editable copy of a shared view.
   * @effects reads window.location
   */
  function editCopyUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete("readonly");
    return url.href;
  }

  /**
   * Lock the page into the read-only shared view: swap the masthead heading for the saved
   * title/description, disable inputs, hide editing controls, reveal the banner, and point
   * "Open an editable copy" (a new tab) at the same URL minus readonly.
   * @effects mutates many DOM nodes
   */
  function applyReadonly() {
    document.body.classList.add("is-readonly");

    var inputs = document.querySelectorAll(
      "#title, #instructions, .row-label, .row-slider",
    );
    for (var i = 0; i < inputs.length; i += 1) {
      inputs[i].setAttribute("disabled", "");
      inputs[i].setAttribute("aria-readonly", "true");
    }
    var hide = document.querySelectorAll(
      ".row-remove, #add, #reset, #copy, #share",
    );
    for (var j = 0; j < hide.length; j += 1) {
      hide[j].hidden = true;
    }

    // Hide empty title/instructions so we don't render placeholder text as a heading.
    hideFieldIfEmpty("title");
    hideFieldIfEmpty("instructions");

    // Size the instructions textarea to its content so a longer description isn't clipped.
    var instructions = document.getElementById("instructions");
    instructions.style.height = "auto";
    instructions.style.height = instructions.scrollHeight + "px";

    document.getElementById("banner").hidden = false;
    document.getElementById("editcopy").href = editCopyUrl();
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
   * Copy text to the clipboard, flashing the button on success. On failure (insecure
   * context, file://, or no Clipboard API) fall back to showing the link for manual copy.
   * @effects writes navigator.clipboard; mutates the button and possibly #notice
   */
  function copyToClipboard(text, button) {
    var done = function () {
      flashCopied(button);
    };
    var fallback = function () {
      showNotice("Copy this link: " + text);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
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

  Slider.renderRow = renderRow;
  Slider.applySliderAria = applySliderAria;
  Slider.renderApp = renderApp;
  Slider.showNotice = showNotice;
  Slider.syncUrl = syncUrl;
  Slider.buildUrl = buildUrl;
  Slider.applyReadonly = applyReadonly;
  Slider.copyToClipboard = copyToClipboard;
})(typeof globalThis !== "undefined" ? globalThis : this);
