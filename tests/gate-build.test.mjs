// The privacy gate catches what it should, and the public build ships nothing private.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "./helpers.mjs";

/* Run the real gate against a throwaway folder (not a git repo, so it walks the files). */
function gateOn(files) {
  const dir = mkdtempSync(join(tmpdir(), "nines-gate-"));
  try {
    mkdirSync(join(dir, "scripts"));
    copyFileSync(join(ROOT, "scripts", "check-private.mjs"), join(dir, "scripts", "check-private.mjs"));
    for (const [name, body] of Object.entries(files)) { mkdirSync(join(dir, name, ".."), { recursive: true }); writeFileSync(join(dir, name), body); }
    const r = spawnSync(process.execPath, [join(dir, "scripts", "check-private.mjs")], { cwd: dir, encoding: "utf8" });
    return { code: r.status, out: r.stdout };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("the repository itself passes the gate", () => {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", "check-private.mjs")], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout);
});

test("the gate passes clean files", () => {
  assert.equal(gateOn({ "a.js": "const x = 1;\n", "notes.md": "# Notes\nuse sb_publishable_abc123 here\n" }).code, 0);
});

// The fake secrets are assembled from pieces so this file itself passes the gate.
const J = (...p) => p.join("");
for (const [what, body] of [
  ["a Supabase secret key", J('key = "sb_', "secret_", 'abcdefghijklmn12"')],
  ["a JWT (service_role key)", J("ey", "JhbGciOiJIUzI1NiJ9.", "ey", "Jyb2xlIjoic2VydmljZV9yb2xlIn0.", "abcdefghijklmnop")],
  ["a GitHub token", J("gh", "p_", "a".repeat(36))],
  ["an AWS key id", J("AK", "IA", "ABCDEFGHIJKLMNOP")],
  ["a private key", J("-----BEGIN RSA ", "PRIVATE KEY-----")],
  ["an email address", J("contact: someone", "@", "gmail.com")],
]) {
  test(`the gate blocks ${what}`, () => {
    const r = gateOn({ "leak.js": body + "\n" });
    assert.equal(r.code, 1, r.out);
  });
}

test("the gate blocks a tampered vendored file", () => {
  const good = "var lib=1;\n", sum = createHash("sha256").update(good).digest("hex");
  assert.equal(gateOn({ "quest/vendor/lib.js": good, "quest/vendor/CHECKSUMS.sha256": `${sum}  lib.js\n` }).code, 0);
  assert.equal(gateOn({ "quest/vendor/lib.js": good + "evil();\n", "quest/vendor/CHECKSUMS.sha256": `${sum}  lib.js\n` }).code, 1);
});

test("the public build is safe", () => {
  execFileSync(process.execPath, [join(ROOT, "scripts", "build.mjs")], { cwd: ROOT, stdio: "pipe" });
  const dist = join(ROOT, "dist"), html = readFileSync(join(dist, "index.html"), "utf8");
  assert.ok(!/<script[^>]+personal\.js/.test(html), "the personal pack is not loaded");
  assert.ok(!existsSync(join(dist, "packs", "personal.js")), "the personal pack is not copied");
  assert.ok(!/<script>\s*\(/.test(html), "no inline app script");
  const csp = /Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /form-action 'none'/);
  const connect = /connect-src ([^;]+)/.exec(csp)[1].trim();
  assert.match(connect, /^(https:\/\/[a-z0-9]+\.supabase\.co|'none')$/, "network calls go to the Supabase project only");
  if (existsSync(join(dist, "config.js"))) {
    const cfg = readFileSync(join(dist, "config.js"), "utf8");
    assert.match(cfg, /sb_publishable_/, "config uses the publishable key");
    assert.doesNotMatch(cfg, new RegExp(J("sb_", "secret_|service", "_role")), "no secret key in the config");
    const lib = readFileSync(join(dist, "vendor", "supabase-2.118.0.js"));
    const want = readFileSync(join(ROOT, "quest", "vendor", "CHECKSUMS.sha256"), "utf8").split(/\s+/)[0];
    assert.equal(createHash("sha256").update(lib).digest("hex"), want, "the shipped client matches its checksum");
  }
});
