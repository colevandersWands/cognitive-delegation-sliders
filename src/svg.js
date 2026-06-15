// svg.js — pure builder that renders an AppState as a standalone SVG string (title,
// description, responder name, and each aspect as label + human% + slider line/dot + AI%).
//
// Classic script extending `Slider` (core.js must load first, for clamp). Pure: string in,
// string out, no DOM — so it's unit-tested in svg.spec.js and require()-able in Node. The
// shell (ui.js) rasterizes the result to PNG. We use only native SVG elements (no
// <foreignObject>), so drawing it to a canvas does not taint it.

(function (root) {
	'use strict';

	var Slider = (root.Slider = root.Slider || {});

	var W = 800;
	var PAD = 40;
	var ROW_H = 48;
	var TRACK_X = 345;
	var TRACK_W = 275;
	var FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

	function esc(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function truncate(s, n) {
		s = String(s);
		return s.length > n ? s.slice(0, n - 1) + '…' : s;
	}

	// Greedy character-count wrap (no measuring context available in a pure function).
	function wrap(text, max) {
		var words = String(text).split(/\s+/);
		var lines = [];
		var line = '';
		for (var i = 0; i < words.length; i += 1) {
			var test = line ? line + ' ' + words[i] : words[i];
			if (test.length > max && line) {
				lines.push(line);
				line = words[i];
			} else {
				line = test;
			}
		}
		if (line) lines.push(line);
		return lines;
	}

	function textEl(x, y, content, style) {
		return '<text x="' + x + '" y="' + y + '" style="' + style + '">' + content + '</text>';
	}

	/**
	 * @param {object} state @returns {string} a complete, standalone SVG document
	 */
	function buildSvg(state) {
		var parts = [];
		var y = PAD + 20;

		parts.push(textEl(PAD, y, esc(state.title || 'Human–AI Slider Model'), 'font-size:30px;font-weight:700;fill:#1a1a1a'));
		y += 24;
		parts.push(textEl(PAD, y, 'Productive Struggle ↔ Cognitive Delegation', 'font-size:15px;fill:#585858'));
		y += 30;

		if (state.name) {
			parts.push(textEl(PAD, y, 'Submitted by: ' + esc(state.name), 'font-size:16px;font-weight:600;fill:#1a1a1a'));
			y += 26;
		}

		if (state.instructions) {
			wrap(state.instructions, 78).forEach(function (line) {
				parts.push(textEl(PAD, y, esc(line), 'font-size:14px;fill:#585858'));
				y += 19;
			});
			y += 8;
		}
		y += 8;

		for (var i = 0; i < state.rows.length; i += 1) {
			var row = state.rows[i];
			var cy = y + ROW_H / 2;
			var v = Slider.clamp(row.value);
			var label = (state.ordered ? i + 1 + '. ' : '') + (row.label || '');
			var dotX = TRACK_X + (v / 100) * TRACK_W;

			parts.push(textEl(PAD, cy + 5, esc(truncate(label, 32)), 'font-size:15px;fill:#1a1a1a'));
			parts.push(textEl(330, cy + 5, 100 - v + '% human', 'font-size:13px;fill:#585858;text-anchor:end'));
			parts.push('<line x1="' + TRACK_X + '" y1="' + cy + '" x2="' + (TRACK_X + TRACK_W) + '" y2="' + cy + '" stroke="#1a1a1a" stroke-width="2"/>');
			parts.push('<line x1="' + TRACK_X + '" y1="' + (cy - 6) + '" x2="' + TRACK_X + '" y2="' + (cy + 6) + '" stroke="#1a1a1a" stroke-width="1"/>');
			parts.push('<line x1="' + (TRACK_X + TRACK_W) + '" y1="' + (cy - 6) + '" x2="' + (TRACK_X + TRACK_W) + '" y2="' + (cy + 6) + '" stroke="#1a1a1a" stroke-width="1"/>');
			parts.push('<circle cx="' + dotX.toFixed(1) + '" cy="' + cy + '" r="7" fill="#1a1a1a"/>');
			parts.push(textEl(TRACK_X + TRACK_W + 15, cy + 5, v + '% AI', 'font-size:13px;fill:#585858'));
			y += ROW_H;

			// A responder's free-response note, wrapped and indented beneath the slider.
			if (row.note) {
				wrap(row.note, 96).forEach(function (line) {
					parts.push(textEl(PAD + 14, y, esc(line), 'font-size:13px;fill:#585858;font-style:italic'));
					y += 17;
				});
				y += 8;
			}
		}

		var H = Math.round(y + PAD);
		return (
			'<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + FONT + '">' +
			'<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>' +
			parts.join('') +
			'</svg>'
		);
	}

	Slider.buildSvg = buildSvg;
})(typeof globalThis !== 'undefined' ? globalThis : this);
