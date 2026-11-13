// Engine checks that need no browser: sanitising, snapping, detent counting, the rubber band.
import assert from "node:assert/strict";
import { normalize, snap, crossings, rubber, format } from "../lib/detent.js";

const o = normalize({});
assert.equal(o.min, 0); assert.equal(o.max, 10); assert.equal(o.step, 0.1);
// bad props never throw and fall back
const bad = normalize({ min: "x", max: -5, step: 0, accent: "red; background:url(x)", cap: "<b>" });
assert.equal(bad.min, 0); assert.equal(bad.max, 10); assert.ok(bad.step > 0); assert.equal(bad.accent, "#e8590c"); assert.equal(bad.cap, "ridge");
assert.deepEqual([normalize({ min: 5, max: 5 }).min, normalize({ min: 5, max: 5 }).max], [0, 10]);
assert.equal(normalize({ min: 0, max: 100000, detentEvery: 1 }).detentEvery, 10000);
// snapping has no float dust
assert.equal(snap(7.04999, o), 7); assert.equal(snap(0.30000000004, o), 0.3); assert.equal(snap(-3, o), 0); assert.equal(snap(99, o), 10);
assert.equal(format(7, o), "7.0");
// detents: landing on 7 clicks once, leaving it the other way clicks once, wiggling at 7 never double-clicks
assert.equal(crossings(6.9, 7.0, o), 1);
assert.equal(crossings(7.0, 7.1, o), 0);
assert.equal(crossings(7.1, 7.0, o), 1);
assert.equal(crossings(7.0, 6.9, o), 0);
assert.equal(crossings(2.5, 6.5, o), 4);
assert.equal(crossings(6.5, 2.5, o), 4);
assert.equal(crossings(0, 10, o), 10);
// a drag stream 6.0 → 8.0 in 0.1 steps gives exactly two clicks, and back down two more
let n = 0, v = 6.0;
for (let i = 1; i <= 20; i++) { const nv = snap(6 + i * 0.1, o); n += crossings(v, nv, o); v = nv; }
assert.equal(n, 2);
for (let i = 19; i >= 0; i--) { const nv = snap(6 + i * 0.1, o); n += crossings(v, nv, o); v = nv; }
assert.equal(n, 4);
// stars 1–5, step 1
const st = normalize({ min: 1, max: 5, step: 1, value: 3 });
assert.equal(crossings(3, 4, st), 1); assert.equal(format(4, st), "4");
// rubber band is bounded and symmetric
assert.ok(Math.abs(rubber(5000)) <= 34); assert.equal(rubber(-40), -rubber(40)); assert.ok(rubber(10) < 10);
console.log("engine: all checks pass");
