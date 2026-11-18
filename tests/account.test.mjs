// Account sync: the sanitizer treats synced and imported data as hostile, and the merge never loses progress.
import { test } from "node:test";
import assert from "node:assert/strict";
import { appFunctions } from "./helpers.mjs";

const { sanitizeState: san, mergeState: merge } = appFunctions("function isObj(", "function acctQueue(", ["sanitizeState", "mergeState"]);

test("rejects anything that is not a plain object", () => {
  for (const bad of [null, undefined, [1], "x", 5, true]) assert.equal(san(bad), null);
});

test("drops bad types, unknown keys and prototype-pollution keys", () => {
  const s = san(JSON.parse('{"quiz":{"1":5,"2":"9","__proto__":{"polluted":1}},"mis":{"route":1},"evil":{"x":1},"asks":[1,"2",3,4]}'));
  assert.deepEqual(s.quiz, { 1: 5 });
  assert.equal({}.polluted, undefined);
  assert.ok(!("evil" in s));
  assert.deepEqual(s.asks, [1, 3, 4]);
});

test("caps sizes and clamps values", () => {
  const s = san({ notes: { n: "x".repeat(9000) }, srs: { a: { b: 99, d: 1, n: 2 }, z: { b: "x" } }, stories: [{ t: "y".repeat(5000) }, 7] });
  assert.equal(s.notes.n.length, 5000);
  assert.equal(s.srs.a.b, 6);
  assert.ok(!s.srs.z);
  assert.equal(s.stories.length, 1);
  assert.equal(s.stories[0].t.length, 3000);
});

const A = san({ quiz: { 1: 5, 2: 3 }, mis: { a: 1 }, srs: { k: { b: 2, d: 100, n: 3 } }, rm: { day: "2026-11-9", streak: 2, sessions: 5 },
  cert: { x: { q: { q1: 1 }, ex: [{ s: 70, d: "d1" }], pbq: { p: 0.5 }, mock: {} } } });
const B = san({ quiz: { 1: 3, 3: 8 }, mis: { b: 1 }, srs: { k: { b: 4, d: 200, n: 5 }, j: { b: 1, d: 5, n: 1 } }, rm: { day: "2026-11-17", streak: 3, sessions: 2 },
  cert: { x: { q: { q2: 0 }, ex: [{ s: 70, d: "d1" }, { s: 90, d: "d2" }], pbq: { p: 1 }, mock: {} } } });

test("merge keeps the best of both devices", () => {
  const M = merge(A, B);
  assert.deepEqual({ ...M.quiz }, { 1: 5, 2: 3, 3: 8 });
  assert.ok(M.mis.a && M.mis.b);
  assert.equal(M.srs.k.n, 5);
  assert.ok(M.srs.j);
  assert.equal(M.rm.day, "2026-11-17", "dates compare as dates, not text");
  assert.equal(M.rm.sessions, 5);
  assert.equal(M.cert.x.ex.length, 2, "exam history is deduplicated");
  assert.equal(M.cert.x.pbq.p, 1);
});

test("merge converges, so two devices stop writing once they agree", () => {
  const M = merge(A, B);
  assert.equal(JSON.stringify(merge(M, B)), JSON.stringify(M));
  assert.equal(JSON.stringify(merge(A, A)), JSON.stringify(A));
});

test("a newer reset wins over older progress from another device", () => {
  const reset = san({ quiz: {}, resetAt: 5000 }), old = san({ quiz: { 1: 9 }, resetAt: 0 });
  assert.deepEqual({ ...merge(old, reset).quiz }, {});
  assert.deepEqual({ ...merge(reset, old).quiz }, {});
});
