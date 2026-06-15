// main.js — bootstrap and event wiring (the rest of the imperative shell). Classic script,
// loaded last; runs immediately because it sits at the end of <body> with the DOM parsed.
//
// Holds the single mutable `state` working-copy. On load the URL is the source of truth;
// `state` is its in-memory projection while editing, and syncUrl() keeps the URL current.

(function (Slider) {
	'use strict';

	var NOTICES = {
		malformed: 'Couldn’t read that shared link — showing a fresh model instead.',
		'invalid-shape': 'That shared link looked incomplete — showing a fresh model instead.',
		'unsupported-version': 'That link was made with a newer version — showing a fresh model instead.',
	};

	var params = new URLSearchParams(window.location.search);
	var decoded = Slider.decodeState(params);
	var state = decoded.state;

	if (!decoded.ok && decoded.reason !== 'missing') {
		Slider.showNotice(NOTICES[decoded.reason] || 'Showing a fresh model.');
	}

	Slider.renderApp(state);

	// Print works in both modes; wire it before branching.
	document.getElementById('print').addEventListener('click', function () {
		window.print();
	});

	if (Slider.detectReadonly(params)) {
		Slider.applyReadonly();
	} else {
		// Sync the loaded (possibly default) state so "Copy link" always reflects what's shown.
		Slider.syncUrl(state);
		wireEditing();
	}

	function wireEditing() {
		var rows = document.getElementById('rows');

		rows.addEventListener('input', function (event) {
			var li = event.target.closest('.task-row');
			if (!li) return;
			var id = li.dataset.id;

			if (event.target.classList.contains('row-slider')) {
				var value = Number(event.target.value);
				state = Slider.updateRow(state, id, { value: value });
				li.querySelector('.slider').style.setProperty('--val', String(value));
				li.querySelector('.row-human').textContent = Slider.humanLabel(value);
				li.querySelector('.row-ai').textContent = Slider.aiLabel(value);
				Slider.applySliderAria(event.target, labelOf(id), value);
				Slider.syncUrl(state);
			} else if (event.target.classList.contains('row-label')) {
				var label = event.target.value;
				state = Slider.updateRow(state, id, { label: label });
				Slider.applySliderAria(li.querySelector('.row-slider'), label, valueOf(id));
				Slider.syncUrl(state);
			}
		});

		rows.addEventListener('click', function (event) {
			if (!event.target.classList.contains('row-remove')) return;
			var li = event.target.closest('.task-row');
			state = Slider.removeRow(state, li.dataset.id);
			li.remove();
			Slider.syncUrl(state);
		});

		document.getElementById('title').addEventListener('input', function (event) {
			state = setField(state, 'title', event.target.value);
			Slider.syncUrl(state);
		});

		document.getElementById('instructions').addEventListener('input', function (event) {
			state = setField(state, 'instructions', event.target.value);
			Slider.syncUrl(state);
		});

		document.getElementById('add').addEventListener('click', function () {
			state = Slider.addRow(state);
			var fresh = state.rows[state.rows.length - 1];
			var el = Slider.renderRow(fresh);
			document.getElementById('rows').append(el);
			el.querySelector('.row-label').focus();
			Slider.syncUrl(state);
		});

		document.getElementById('reset').addEventListener('click', function () {
			state = Slider.defaultState();
			Slider.renderApp(state);
			Slider.showNotice('');
			Slider.syncUrl(state);
		});

		document.getElementById('copy').addEventListener('click', function (event) {
			Slider.copyToClipboard(Slider.buildUrl(state), event.currentTarget);
		});

		document.getElementById('share').addEventListener('click', function (event) {
			Slider.copyToClipboard(Slider.buildUrl(state, { readonly: true }), event.currentTarget);
		});
	}

	// Shallow copy with one field replaced (shell working-copy; the pure core stays frozen).
	function setField(current, key, value) {
		var next = {};
		for (var k in current) {
			if (Object.prototype.hasOwnProperty.call(current, k)) next[k] = current[k];
		}
		next[key] = value;
		return next;
	}

	function find(id) {
		return state.rows.filter(function (r) {
			return r.id === id;
		})[0];
	}
	function labelOf(id) {
		var row = find(id);
		return row ? row.label : '';
	}
	function valueOf(id) {
		var row = find(id);
		return row ? row.value : 0;
	}
})(window.Slider);
