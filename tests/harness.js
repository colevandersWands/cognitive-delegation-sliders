// harness.js — a tiny zero-dependency test harness shared by the in-browser test pages
// (core.test.html, url.test.html) and the Node CI runner (run.js).
//
// In a browser it renders results into the page; in Node it prints them and exposes a
// failure count the runner turns into an exit code. Same assertions, both places.

(function (root) {
	'use strict';

	var groups = [];
	var current = null;
	var passes = 0;
	var fails = 0;

	function group(name, fn) {
		current = { name: name, items: [] };
		groups.push(current);
		fn();
		current = null;
	}

	function record(name, ok, detail) {
		if (ok) passes += 1;
		else fails += 1;
		if (!current) {
			current = { name: '(ungrouped)', items: [] };
			groups.push(current);
		}
		current.items.push({ name: name, ok: ok, detail: detail || '' });
	}

	function show(value) {
		try {
			return JSON.stringify(value);
		} catch (e) {
			return String(value);
		}
	}

	// Strict equality for primitives / strings.
	function eq(name, actual, expected) {
		var ok = actual === expected;
		record(name, ok, ok ? '' : 'expected ' + show(expected) + ', got ' + show(actual));
	}

	// Structural equality via JSON (states are built with stable key order).
	function deep(name, actual, expected) {
		var a = show(actual);
		var e = show(expected);
		record(name, a === e, a === e ? '' : 'expected ' + e + ', got ' + a);
	}

	function ok(name, cond) {
		record(name, !!cond, cond ? '' : 'expected truthy, got ' + show(cond));
	}

	// Asserts that fn() does not throw.
	function nothrow(name, fn) {
		try {
			fn();
			record(name, true, '');
		} catch (e) {
			record(name, false, 'threw ' + String(e));
		}
	}

	function lines() {
		var out = [];
		groups.forEach(function (g) {
			out.push('▸ ' + g.name);
			g.items.forEach(function (it) {
				out.push('   ' + (it.ok ? '✓' : '✗') + ' ' + it.name + (it.detail ? '  — ' + it.detail : ''));
			});
		});
		return out;
	}

	function report(title) {
		var summary = (fails ? '✗ FAIL  ' : '✓ PASS  ') + passes + ' passed, ' + fails + ' failed';
		if (typeof document !== 'undefined') {
			var h = document.createElement('p');
			h.className = 'summary ' + (fails ? 'fail' : 'pass');
			h.textContent = summary;
			var pre = document.createElement('pre');
			pre.textContent = lines().join('\n');
			document.body.appendChild(h);
			document.body.appendChild(pre);
			document.title = (fails ? '✗ ' : '✓ ') + (title || 'tests');
		} else {
			// eslint-disable-next-line no-console
			console.log(lines().join('\n') + '\n' + summary);
		}
		return fails;
	}

	root.T = {
		group: group,
		eq: eq,
		deep: deep,
		ok: ok,
		nothrow: nothrow,
		report: report,
		failureCount: function () {
			return fails;
		},
	};
})(typeof globalThis !== 'undefined' ? globalThis : this);
