// run.js — Node runner for the CI gate. Loads the classic-script sources (they populate
// globalThis.Slider as a side effect) plus the shared specs, then exits non-zero on any
// failure. The SAME specs run in the browser via core.test.html / url.test.html.
//
//   node tests/run.js

'use strict';

require('../src/core.js');
require('../src/url.js');
require('./harness.js');
require('./core.spec.js');
require('./url.spec.js');

var failures = globalThis.T.report('all specs');
process.exit(failures ? 1 : 0);
