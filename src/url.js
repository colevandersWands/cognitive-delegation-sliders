// url.js — pure codec between AppState and the shareable URL.
//
// Classic script: extends the global `Slider` namespace (core.js must load first). Also
// require()-able in Node for the CI gate. Side-effect-free — takes/returns plain values and
// a URLSearchParams; the shell (ui.js) is what reads location and writes history.
//
// On-wire payload uses short keys to keep links compact and human-inspectable:
//   { v: schemaVersion, t: title, n: instructions, r: [ { i: id, l: label, x: value } ] }
//
// The schema version travels INSIDE `d` (payload.v), so the URL is just `?d=…` plus the
// optional presence flag `?readonly`. One source of truth for the version.

(function (root) {
	'use strict';

	var Slider = (root.Slider = root.Slider || {});

	/**
	 * Serialize state into the `d` param VALUE (a JSON string). `readonly` is dropped — the
	 * lock lives in the URL flag, never in the shared data. The caller assigns the result via
	 * URLSearchParams, which handles percent-encoding (so no double-encoding).
	 * @param {object} state @returns {string}
	 */
	function encodeState(state) {
		var payload = {
			v: Slider.SCHEMA_VERSION,
			t: state.title,
			n: state.instructions,
			o: state.ordered ? 1 : 0,
			nm: state.name,
			r: state.rows.map(function (row) {
				return { i: row.id, l: row.label, x: row.value, c: row.note };
			}),
		};
		return JSON.stringify(payload);
	}

	/**
	 * Fail-soft decode. NEVER throws. Every failure resolves to defaultState() plus a reason
	 * the shell can surface as a non-blocking notice (missing `d` is the normal fresh visit).
	 * @param {URLSearchParams} params
	 * @returns {{state:object, ok:boolean, reason?:string}}
	 */
	function decodeState(params) {
		var raw = params.get('d');
		if (raw == null || raw === '') {
			return { state: Slider.defaultState(), ok: false, reason: 'missing' };
		}

		var parsed;
		try {
			parsed = JSON.parse(raw);
		} catch (e) {
			return { state: Slider.defaultState(), ok: false, reason: 'malformed' };
		}
		if (!parsed || typeof parsed !== 'object') {
			return { state: Slider.defaultState(), ok: false, reason: 'malformed' };
		}

		var version = Number.parseInt(parsed.v, 10);
		if (Number.isFinite(version) && version > Slider.SCHEMA_VERSION) {
			return { state: Slider.defaultState(), ok: false, reason: 'unsupported-version' };
		}
		// Older versions would be migrated here once SCHEMA_VERSION > 1.

		var valid = Slider.validateState({
			title: parsed.t,
			instructions: parsed.n,
			ordered: parsed.o === 1 || parsed.o === true,
			name: parsed.nm,
			rows: Array.isArray(parsed.r)
				? parsed.r.map(function (row) {
						return { id: row && row.i, label: row && row.l, value: row && row.x, note: row && row.c };
					})
				: undefined,
		});
		if (!valid) {
			return { state: Slider.defaultState(), ok: false, reason: 'invalid-shape' };
		}

		return { state: valid, ok: true };
	}

	/**
	 * Which view to render, from presence-only URL flags:
	 *   ?readonly -> 'readonly' (frozen assignment),
	 *   ?submit   -> 'submit'   (responder fills sliders + name; structure locked),
	 *   neither   -> 'edit'.
	 * `readonly` wins if both are somehow present.
	 * @param {URLSearchParams} params @returns {'edit'|'readonly'|'submit'}
	 */
	function detectMode(params) {
		if (params.has('readonly')) return 'readonly';
		if (params.has('submit')) return 'submit';
		return 'edit';
	}

	Slider.encodeState = encodeState;
	Slider.decodeState = decodeState;
	Slider.detectMode = detectMode;
})(typeof globalThis !== 'undefined' ? globalThis : this);
