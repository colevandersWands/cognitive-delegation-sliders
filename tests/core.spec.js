// core.spec.js — specifications for core.js, run by both core.test.html and run.js.
// Requires the global `Slider` (core.js) and `T` (harness.js) to be loaded first.

(function (root) {
	'use strict';

	var S = root.Slider;
	var T = root.T;

	T.group('clamp', function () {
		T.eq('passes a mid-range integer through', S.clamp(50), 50);
		T.eq('floors at the lower bound', S.clamp(-1), 0);
		T.eq('caps at the upper bound', S.clamp(101), 100);
		T.eq('keeps the inclusive lower edge', S.clamp(0), 0);
		T.eq('keeps the inclusive upper edge', S.clamp(100), 100);
		T.eq('rounds a fraction up', S.clamp(37.6), 38);
		T.eq('rounds a fraction down', S.clamp(37.4), 37);
		T.eq('collapses NaN to the lower bound', S.clamp(NaN), 0);
		T.eq('collapses a non-numeric string to the lower bound', S.clamp('abc'), 0);
		T.eq('collapses undefined to the lower bound', S.clamp(undefined), 0);
		T.eq('saturates +Infinity to the upper bound', S.clamp(Infinity), 100);
		T.eq('saturates -Infinity to the lower bound', S.clamp(-Infinity), 0);
	});

	T.group('bandFromValue', function () {
		T.eq('bottom is fully human', S.bandFromValue(0), 'Fully human');
		T.eq('middle is balanced', S.bandFromValue(50), 'Balanced');
		T.eq('top is fully AI', S.bandFromValue(100), 'Fully AI');
		T.eq('19 is the last fully-human value', S.bandFromValue(19), 'Fully human');
		T.eq('20 is the first mostly-human value', S.bandFromValue(20), 'Mostly human');
		T.eq('39 is the last mostly-human value', S.bandFromValue(39), 'Mostly human');
		T.eq('40 is the first balanced value', S.bandFromValue(40), 'Balanced');
		T.eq('59 is the last balanced value', S.bandFromValue(59), 'Balanced');
		T.eq('60 is the first mostly-AI value', S.bandFromValue(60), 'Mostly AI');
		T.eq('79 is the last mostly-AI value', S.bandFromValue(79), 'Mostly AI');
		T.eq('80 is the first fully-AI value', S.bandFromValue(80), 'Fully AI');
		T.eq('clamps a low out-of-range value', S.bandFromValue(-5), 'Fully human');
		T.eq('clamps a high out-of-range value', S.bandFromValue(150), 'Fully AI');
	});

	T.group('aiLabel (right of slider)', function () {
		T.eq('bottom is 0% AI', S.aiLabel(0), '0% AI');
		T.eq('a mid value is its percent toward AI', S.aiLabel(73), '73% AI');
		T.eq('top is 100% AI', S.aiLabel(100), '100% AI');
		T.eq('clamps before formatting', S.aiLabel(140), '100% AI');
	});

	T.group('humanLabel (left of slider)', function () {
		T.eq('bottom is the full human share', S.humanLabel(0), '100% human');
		T.eq('a mid value is the complement of AI', S.humanLabel(73), '27% human');
		T.eq('top is no human share', S.humanLabel(100), '0% human');
		T.eq('clamps before formatting', S.humanLabel(-20), '100% human');
		var v = 40;
		T.eq(
			'human + AI sum to 100',
			Number.parseInt(S.humanLabel(v), 10) + Number.parseInt(S.aiLabel(v), 10),
			100,
		);
	});

	T.group('defaultState', function () {
		T.eq('starts with exactly one row', S.defaultState().rows.length, 1);
		T.eq('starts that row at the balanced midpoint', S.defaultState().rows[0].value, S.VALUE_DEFAULT);
		T.eq('starts not read-only', S.defaultState().readonly, false);
		T.eq('starts unordered', S.defaultState().ordered, false);
		T.eq('starts with no name', S.defaultState().name, '');
		T.ok('returns a frozen object', Object.isFrozen(S.defaultState()));
	});

	T.group('nextId', function () {
		T.eq('starts at r1 for an empty list', S.nextId([]), 'r1');
		T.eq('continues past a single row', S.nextId([{ id: 'r1' }]), 'r2');
		T.eq('skips gaps so it never collides', S.nextId([{ id: 'r1' }, { id: 'r3' }]), 'r4');
	});

	T.group('addRow', function () {
		T.eq('appends one row', S.addRow(S.defaultState()).rows.length, 2);
		T.eq('gives the new row a fresh id', S.addRow(S.defaultState()).rows[1].id, 'r2');
		T.nothrow('does not mutate the frozen input', function () {
			var state = S.defaultState();
			S.addRow(state);
			if (state.rows.length !== 1) throw new Error('input mutated');
		});
	});

	T.group('removeRow', function () {
		T.eq('removes the matching row', S.removeRow(S.defaultState(), 'r1').rows.length, 0);
		T.eq('is a no-op for an unknown id', S.removeRow(S.defaultState(), 'nope').rows.length, 1);
		T.eq(
			'keeps the other rows when removing one',
			S.removeRow(S.addRow(S.defaultState()), 'r1').rows[0].id,
			'r2',
		);
	});

	T.group('updateRow', function () {
		T.eq('patches the value', S.updateRow(S.defaultState(), 'r1', { value: 80 }).rows[0].value, 80);
		T.eq('clamps a patched value', S.updateRow(S.defaultState(), 'r1', { value: 999 }).rows[0].value, 100);
		T.eq(
			'patches the label',
			S.updateRow(S.defaultState(), 'r1', { label: 'Drafting' }).rows[0].label,
			'Drafting',
		);
		var named = S.updateRow(S.defaultState(), 'r1', { label: 'Drafting' });
		T.eq(
			'leaves the label untouched when only value is patched',
			S.updateRow(named, 'r1', { value: 10 }).rows[0].label,
			'Drafting',
		);
		T.eq(
			'is a no-op for an unknown id',
			S.updateRow(S.defaultState(), 'nope', { value: 0 }).rows[0].value,
			S.VALUE_DEFAULT,
		);
	});

	T.group('validateState', function () {
		T.eq('rejects a non-object', S.validateState(42), null);
		T.eq('rejects an object with no rows array', S.validateState({ title: 'x' }), null);
		T.eq(
			'accepts a minimal well-formed object',
			S.validateState({ rows: [{ id: 'r1', label: 'A', value: 30 }] }).rows[0].label,
			'A',
		);
		T.eq(
			'clamps an out-of-range value',
			S.validateState({ rows: [{ id: 'r1', label: 'A', value: 500 }] }).rows[0].value,
			100,
		);
		T.eq('repairs a missing label to empty', S.validateState({ rows: [{ id: 'r1', value: 10 }] }).rows[0].label, '');
		T.eq('regenerates a missing id', S.validateState({ rows: [{ label: 'A', value: 10 }] }).rows[0].id, 'r1');
		T.eq('drops a non-object row', S.validateState({ rows: [null, { id: 'r1', label: 'A', value: 10 }] }).rows.length, 1);
		T.eq('defaults a missing title to empty', S.validateState({ rows: [] }).title, '');
		T.eq('keeps ordered=true', S.validateState({ rows: [], ordered: true }).ordered, true);
		T.eq('defaults ordered to false', S.validateState({ rows: [] }).ordered, false);
		T.eq('keeps a string name', S.validateState({ rows: [], name: 'Ada' }).name, 'Ada');
		T.eq('defaults a missing name to empty', S.validateState({ rows: [] }).name, '');
	});
})(typeof globalThis !== 'undefined' ? globalThis : this);
