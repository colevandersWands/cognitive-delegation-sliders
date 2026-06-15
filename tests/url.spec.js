// url.spec.js — specifications for url.js, run by both url.test.html and run.js.
// Requires the global `Slider` (core.js + url.js) and `T` (harness.js) loaded first.

(function (root) {
	'use strict';

	var S = root.Slider;
	var T = root.T;

	// Round-trip state the way the shell does: encode -> URLSearchParams (which percent-
	// encodes) -> get -> decode. Returns the DecodeResult.
	function roundTrip(state) {
		var params = new URLSearchParams();
		params.set('d', S.encodeState(state));
		return S.decodeState(new URLSearchParams(params.toString()));
	}

	T.group('encode/decode round-trip', function () {
		T.deep('preserves the default state identically', roundTrip(S.defaultState()).state, S.defaultState());
		T.eq('reports a clean parse as ok', roundTrip(S.defaultState()).ok, true);

		var three = S.addRow(S.addRow(S.defaultState()));
		T.eq('preserves a multi-row count', roundTrip(three).state.rows.length, 3);
		T.deep(
			'preserves row ids and order',
			roundTrip(three).state.rows.map(function (r) {
				return r.id;
			}),
			['r1', 'r2', 'r3'],
		);

		T.eq('preserves an edited value', roundTrip(S.updateRow(S.defaultState(), 'r1', { value: 73 })).state.rows[0].value, 73);
		T.eq('preserves the value-0 boundary', roundTrip(S.updateRow(S.defaultState(), 'r1', { value: 0 })).state.rows[0].value, 0);
		T.eq('preserves the value-100 boundary', roundTrip(S.updateRow(S.defaultState(), 'r1', { value: 100 })).state.rows[0].value, 100);

		var tricky = S.updateRow(S.defaultState(), 'r1', { label: 'a&b=c#d "e" 🤝' });
		T.eq('preserves URL-hostile label characters', roundTrip(tricky).state.rows[0].label, 'a&b=c#d "e" 🤝');

		var multiline = S.updateRow(S.defaultState(), 'r1', { label: 'x' });
		multiline = { schemaVersion: 1, title: '', instructions: 'line one\nline two', rows: multiline.rows, readonly: false };
		T.eq('preserves a multi-line instructions field', roundTrip(multiline).state.instructions, 'line one\nline two');

		var locked = { schemaVersion: 1, title: '', instructions: '', rows: S.defaultState().rows, readonly: true };
		T.eq('drops readonly from the encoded payload', roundTrip(locked).state.readonly, false);

		var ordered = { schemaVersion: 2, title: '', instructions: '', ordered: true, name: '', rows: S.defaultState().rows };
		T.eq('preserves ordered = true', roundTrip(ordered).state.ordered, true);

		var named = { schemaVersion: 2, title: '', instructions: '', ordered: false, name: 'Ada Lovelace', rows: S.defaultState().rows };
		T.eq('preserves the responder name', roundTrip(named).state.name, 'Ada Lovelace');
	});

	T.group('decodeState fail-soft', function () {
		T.deep('returns defaults when d is missing', S.decodeState(new URLSearchParams()).state, S.defaultState());
		T.eq('reports a missing d as not ok', S.decodeState(new URLSearchParams()).ok, false);
		T.eq('flags a missing d with reason missing', S.decodeState(new URLSearchParams()).reason, 'missing');

		T.nothrow('does not throw on unparseable d', function () {
			S.decodeState(new URLSearchParams('d={not json'));
		});
		T.deep('falls back to defaults on unparseable d', S.decodeState(new URLSearchParams('d={not json')).state, S.defaultState());
		T.eq('flags unparseable d as malformed', S.decodeState(new URLSearchParams('d={not json')).reason, 'malformed');

		var future = new URLSearchParams();
		future.set('d', JSON.stringify({ v: 999, t: '', n: '', r: [] }));
		T.eq('rejects a future schema version', S.decodeState(new URLSearchParams(future.toString())).reason, 'unsupported-version');

		var arr = new URLSearchParams();
		arr.set('d', JSON.stringify([1, 2, 3]));
		T.eq('flags an array payload as invalid-shape', S.decodeState(new URLSearchParams(arr.toString())).reason, 'invalid-shape');

		T.ok('always yields a usable state from garbage', S.decodeState(new URLSearchParams('d=%FFnonsense')).state.rows.length >= 0);
	});

	T.group('detectMode', function () {
		T.eq('edit when no flags', S.detectMode(new URLSearchParams()), 'edit');
		T.eq('readonly for ?readonly', S.detectMode(new URLSearchParams('readonly')), 'readonly');
		T.eq('readonly for ?readonly=false (presence only)', S.detectMode(new URLSearchParams('readonly=false')), 'readonly');
		T.eq('submit for ?submit', S.detectMode(new URLSearchParams('submit')), 'submit');
		T.eq('readonly wins when both present', S.detectMode(new URLSearchParams('readonly&submit')), 'readonly');
	});
})(typeof globalThis !== 'undefined' ? globalThis : this);
