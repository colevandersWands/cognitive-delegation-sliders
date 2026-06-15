// svg.spec.js — specifications for svg.js (buildSvg), run by both svg.test.html and run.js.
// Requires the global `Slider` (core.js + svg.js) and `T` (harness.js) loaded first.

(function (root) {
	'use strict';

	var S = root.Slider;
	var T = root.T;

	function svgOf(over) {
		var base = { title: '', instructions: '', ordered: false, name: '', rows: [{ id: 'r1', label: 'Drafting', value: 30 }] };
		for (var k in over) {
			if (Object.prototype.hasOwnProperty.call(over, k)) base[k] = over[k];
		}
		return S.buildSvg(base);
	}

	T.group('buildSvg', function () {
		T.ok('returns an <svg> root', svgOf({}).indexOf('<svg') === 0);
		T.ok('declares the SVG namespace', svgOf({}).indexOf('xmlns="http://www.w3.org/2000/svg"') !== -1);
		T.ok('declares explicit width/height (for rasterizing)', /width="\d+" height="\d+"/.test(svgOf({})));
		T.ok('falls back to a default title when empty', svgOf({}).indexOf('Human–AI Slider Model') !== -1);
		T.ok('includes the title when present', svgOf({ title: 'Essay 2' }).indexOf('Essay 2') !== -1);
		T.ok('includes the responder name when present', svgOf({ name: 'Ada' }).indexOf('Submitted by: Ada') !== -1);
		T.ok('omits the name line when absent', svgOf({}).indexOf('Submitted by') === -1);
		T.ok('renders the AI percentage', svgOf({ rows: [{ id: 'r1', label: 'x', value: 30 }] }).indexOf('30% AI') !== -1);
		T.ok('renders the complementary human percentage', svgOf({ rows: [{ id: 'r1', label: 'x', value: 30 }] }).indexOf('70% human') !== -1);
		T.ok('draws one dot per row', (svgOf({ rows: [{ id: 'r1', label: 'a', value: 10 }, { id: 'r2', label: 'b', value: 90 }] }).match(/<circle/g) || []).length === 2);
		T.ok('escapes XML-special characters in the title', svgOf({ title: 'a & b' }).indexOf('a &amp; b') !== -1);
		T.ok('numbers aspects when ordered', svgOf({ ordered: true, rows: [{ id: 'r1', label: 'Step', value: 0 }] }).indexOf('1. Step') !== -1);
		T.ok('does not number aspects when unordered', svgOf({ ordered: false, rows: [{ id: 'r1', label: 'Step', value: 0 }] }).indexOf('1. Step') === -1);
	});
})(typeof globalThis !== 'undefined' ? globalThis : this);
