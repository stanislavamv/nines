// Code Lab: every reference solution passes its own hidden tests, and no starter passes by accident.
// Bash runs in MiniSh (the in-browser shell). Python runs in real python3 when it is installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { loadScripts, QUEST } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const MiniSh = require(join(QUEST, "shell.js"));
const LAB = loadScripts("lab.js").LAB;
// Same normalisation as labNorm in index.html: trim each line, squeeze spaces, ignore trailing blank lines.
const norm = (x) => String(x).replace(/\r/g, "").split("\n").map((l) => l.trim().replace(/[ \t]+/g, " ")).join("\n").replace(/\n+$/, "");

test("exercise ids are unique", () => {
  const ids = [...LAB.bash, ...LAB.py].map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const e of LAB.bash) {
  test(`bash "${e.id}": reference solution passes every test`, () => {
    for (const [i, t] of e.tests.entries()) {
      const r = MiniSh.run(e.sol, LAB.fixtures[t.fx], t.stdin, t.args);
      assert.equal(norm(r.out), norm(t.out), `test ${i + 1}${r.err ? " (stderr: " + r.err.trim() + ")" : ""}`);
    }
  });
  if (e.starter) test(`bash "${e.id}": the starter does not pass`, () => {
    const pass = e.tests.every((t) => norm(MiniSh.run(e.starter, LAB.fixtures[t.fx], t.stdin, t.args).out) === norm(t.out));
    assert.equal(pass, false);
  });
}

test("an endless Bash loop stops on the step limit instead of hanging", () => {
  const t0 = Date.now(), r = MiniSh.run("while true; do :; done", {}, "", []);
  assert.ok(Date.now() - t0 < 10000, "returns quickly");
  assert.notEqual(r.code, 0);
});

const py = ["python3", "python"].find((p) => spawnSync(p, ["-c", "import sys; assert sys.version_info >= (3, 8)"]).status === 0);
for (const e of LAB.py) {
  test(`python "${e.id}": reference solution passes every test`, { skip: py ? false : "python3 not installed" }, () => {
    for (const [i, t] of e.tests.entries()) {
      const r = spawnSync(py, ["-I", "-c", e.sol], { input: t.stdin, encoding: "utf8" });
      assert.equal(norm(r.stdout), norm(t.out), `test ${i + 1}${r.stderr ? " (stderr: " + r.stderr.trim() + ")" : ""}`);
      assert.equal(r.status, t.code || 0, `test ${i + 1} exit code`);
    }
  });
}
