// Simulated-shell labs: following each lab's own hints must clear it, and RHCSA mocks must not credit shortcuts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScripts, loadCerts, replay, hintCommands } from "./helpers.mjs";

const MISSIONS = loadScripts("term.js").MISSIONS;
const RH = loadCerts().rhcsa;

// Labs load in a vm sandbox, so their RegExps come from another realm: check the type without instanceof.
const isRe = (x) => Object.prototype.toString.call(x) === "[object RegExp]";
function checkShape(m) {
  assert.ok(m.id && m.title && m.brief && m.win !== undefined, `lab ${m.id} has id, title, brief, win`);
  assert.ok(m.steps.length >= 2, `lab ${m.id} has steps`);
  for (const s of m.steps) assert.ok(s.g && isRe(s.re) && s.hint, `lab ${m.id} step is complete: ${s.g}`);
  for (const c of m.cmds) assert.ok(isRe(c[0]), `lab ${m.id} command pattern is a RegExp`);
}

test("quest lab ids are unique", () => {
  assert.equal(new Set(MISSIONS.map((m) => m.id)).size, MISSIONS.length);
});

for (const m of MISSIONS) {
  test(`quest lab "${m.id}" clears by following its hints`, () => {
    checkShape(m);
    const r = replay(m, hintCommands(m));
    assert.deepEqual([...r.left], [], `steps left: ${r.left.join(" | ")}`);
  });
}

for (const m of RH.labs) {
  test(`RHCSA lab "${m.id}" clears by following its hints`, () => {
    checkShape(m);
    const r = replay(m, hintCommands(m));
    assert.deepEqual([...r.left], [], `steps left: ${r.left.join(" | ")}`);
  });
}

for (const m of RH.mocks) {
  test(`RHCSA ${m.title}: the model answers score 100 percent`, () => {
    assert.ok(m.exam && m.minutes >= 60, "exam mode with a timer");
    const r = replay(m, hintCommands(m));
    assert.deepEqual([...r.left], [], `tasks left: ${r.left.join(" | ")}`);
    assert.deepEqual([...r.unknown], [], `model answers the shell did not know: ${r.unknown.join(" | ")}`);
  });
}

test("RHCSA mock A gives no credit for non-persistent shortcuts", () => {
  const A = RH.mocks[0];
  const r = replay(A, ["firewall-cmd --add-port=82/tcp", "firewall-cmd --reload", "groupadd -g 3000 sysadmins",
    "usermod -G sysadmins natasha", "chcon -R -t httpd_sys_content_t /web", "lvextend -L +300M /dev/appvg/applv", "setenforce 0"]);
  const credited = A.steps.filter((_, i) => r.done[i]).map((s) => s.g);
  assert.deepEqual([...credited], ["Create group sysadmins with GID 3000."], "only the genuinely complete task counts");
});

test("RHCSA mocks differ from one another", () => {
  const firstTasks = RH.mocks.map((m) => m.steps.map((s) => s.g).join("\n"));
  assert.equal(new Set(firstTasks).size, RH.mocks.length);
});
