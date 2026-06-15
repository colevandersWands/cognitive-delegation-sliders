// core.js — pure state + model logic for the Human–AI Slider Model.
//
// Plain classic script (no ES modules) so index.html opens straight off the filesystem —
// double-click it, no server, no build. Everything attaches to a single global `Slider`
// namespace. This file is also require()-able in Node (for the CI test gate): the IIFE
// targets globalThis, so `require('./core.js')` runs it and populates globalThis.Slider.
//
// Everything here is deterministic: no DOM, no URL, no side effects. This is the
// "functional core", covered by the shared spec in tests/spec.js. The effectful shell
// (ui.js, main.js) calls into these functions but never the reverse.
//
//   AppState = { schemaVersion, title, instructions, rows: Row[], readonly }
//   Row      = { id, label, value }   // value is an integer 0..100 (0 = Human, 100 = AI)

(function (root) {
	'use strict';

	var Slider = (root.Slider = root.Slider || {});

	var SCHEMA_VERSION = 2;
	var VALUE_MIN = 0;
	var VALUE_MAX = 100;
	var VALUE_DEFAULT = 50;

	// Five plain-language bands across the track (inclusive upper bounds), walked top-down.
	var BANDS = [
		{ max: 19, label: 'Fully human' },
		{ max: 39, label: 'Mostly human' },
		{ max: 59, label: 'Balanced' },
		{ max: 79, label: 'Mostly AI' },
		{ max: VALUE_MAX, label: 'Fully AI' },
	];

	/**
	 * Coerce to an integer within [lo, hi]. Non-numeric -> lo; ±Infinity saturate; round.
	 * @param {unknown} n @param {number} [lo] @param {number} [hi] @returns {number}
	 */
	function clamp(n, lo, hi) {
		if (lo === undefined) lo = VALUE_MIN;
		if (hi === undefined) hi = VALUE_MAX;
		var num = Number(n);
		if (Number.isNaN(num)) return lo;
		if (num <= lo) return lo;
		if (num >= hi) return hi;
		return Math.round(num);
	}

	/**
	 * Plain-language band for a value (screen-reader text, not the visible readout).
	 * @param {unknown} value @returns {string}
	 */
	function bandFromValue(value) {
		var v = clamp(value);
		for (var i = 0; i < BANDS.length; i += 1) {
			if (v <= BANDS[i].max) return BANDS[i].label;
		}
		return BANDS[BANDS.length - 1].label;
	}

	/**
	 * AI share, shown to the RIGHT of each slider: 73 -> "73% AI". The value is already
	 * 0..100, so it IS the percent delegated to AI. Clamps first.
	 * @param {unknown} value @returns {string}
	 */
	function aiLabel(value) {
		return clamp(value) + '% AI';
	}

	/**
	 * Complementary human share, shown to the LEFT of each slider: 73 -> "27% human".
	 * @param {unknown} value @returns {string}
	 */
	function humanLabel(value) {
		return 100 - clamp(value) + '% human';
	}

	/**
	 * The starting state for a fresh visit: empty title/instructions and one blank row.
	 * @returns {object} a deep-frozen AppState
	 */
	function defaultState() {
		return deepFreeze({
			schemaVersion: SCHEMA_VERSION,
			title: '',
			instructions: '',
			rows: [{ id: 'r1', label: '', value: VALUE_DEFAULT, note: '' }],
			ordered: false, // numbered (process steps) vs unordered (independent aspects)
			name: '', // the responder's name, filled in submission mode
			readonly: false,
		});
	}

	/**
	 * Next opaque row id as "r<n>", one past the highest existing suffix (collision-safe
	 * after removals/reorders).
	 * @param {ReadonlyArray<{id: string}>} rows @returns {string}
	 */
	function nextId(rows) {
		var max = 0;
		for (var i = 0; i < rows.length; i += 1) {
			var n = Number.parseInt(String(rows[i].id).replace(/^r/, ''), 10);
			if (Number.isFinite(n) && n > max) max = n;
		}
		return 'r' + (max + 1);
	}

	/**
	 * Append a fresh blank row. Returns a new frozen state; the input is untouched.
	 * @param {object} state @returns {object}
	 */
	function addRow(state) {
		var row = { id: nextId(state.rows), label: '', value: VALUE_DEFAULT, note: '' };
		return deepFreeze(merge(state, { rows: state.rows.concat([row]) }));
	}

	/**
	 * Remove the row with `id` (no-op if absent). Returns a new frozen state.
	 * @param {object} state @param {string} id @returns {object}
	 */
	function removeRow(state, id) {
		var rows = state.rows.filter(function (row) {
			return row.id !== id;
		});
		return deepFreeze(merge(state, { rows: rows }));
	}

	/**
	 * Patch one row's label and/or value (value clamped). No-op if `id` is absent.
	 * @param {object} state @param {string} id @param {{label?:string,value?:unknown}} [patch]
	 * @returns {object}
	 */
	function updateRow(state, id, patch) {
		if (!patch) patch = {};
		var rows = state.rows.map(function (row) {
			if (row.id !== id) return row;
			var next = { id: row.id, label: row.label, value: row.value, note: row.note };
			if (typeof patch.label === 'string') next.label = patch.label;
			if ('value' in patch) next.value = clamp(patch.value);
			if (typeof patch.note === 'string') next.note = patch.note;
			return next;
		});
		return deepFreeze(merge(state, { rows: rows }));
	}

	/**
	 * Coerce an untrusted parsed object into a valid AppState, or null if unsalvageable
	 * (no rows array). Field errors are repaired, not thrown.
	 * @param {unknown} parsed @returns {object|null}
	 */
	function validateState(parsed) {
		if (!parsed || typeof parsed !== 'object') return null;
		if (!Array.isArray(parsed.rows)) return null;

		var rows = parsed.rows
			.filter(function (row) {
				return row && typeof row === 'object';
			})
			.map(function (row, i) {
				return {
					id: typeof row.id === 'string' && row.id ? row.id : 'r' + (i + 1),
					label: typeof row.label === 'string' ? row.label : '',
					value: clamp(row.value),
					note: typeof row.note === 'string' ? row.note : '',
				};
			});

		return deepFreeze({
			schemaVersion: SCHEMA_VERSION,
			title: typeof parsed.title === 'string' ? parsed.title : '',
			instructions: typeof parsed.instructions === 'string' ? parsed.instructions : '',
			rows: rows,
			ordered: parsed.ordered === true,
			name: typeof parsed.name === 'string' ? parsed.name : '',
			readonly: false,
		});
	}

	// --- private helpers ---

	/** Shallow-merge `extra` over a copy of `state` (object-threading without spread). */
	function merge(state, extra) {
		var out = {};
		for (var k in state) {
			if (Object.prototype.hasOwnProperty.call(state, k)) out[k] = state[k];
		}
		for (var j in extra) {
			if (Object.prototype.hasOwnProperty.call(extra, j)) out[j] = extra[j];
		}
		return out;
	}

	/** Recursively freeze so core return values can't be mutated by the shell. */
	function deepFreeze(obj) {
		if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
			Object.keys(obj).forEach(function (key) {
				deepFreeze(obj[key]);
			});
			Object.freeze(obj);
		}
		return obj;
	}

	// --- publish ---
	Slider.SCHEMA_VERSION = SCHEMA_VERSION;
	Slider.VALUE_MIN = VALUE_MIN;
	Slider.VALUE_MAX = VALUE_MAX;
	Slider.VALUE_DEFAULT = VALUE_DEFAULT;
	Slider.clamp = clamp;
	Slider.bandFromValue = bandFromValue;
	Slider.aiLabel = aiLabel;
	Slider.humanLabel = humanLabel;
	Slider.defaultState = defaultState;
	Slider.nextId = nextId;
	Slider.addRow = addRow;
	Slider.removeRow = removeRow;
	Slider.updateRow = updateRow;
	Slider.validateState = validateState;
})(typeof globalThis !== 'undefined' ? globalThis : this);
