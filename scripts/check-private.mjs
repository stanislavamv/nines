#!/usr/bin/env node
// Privacy and secret gate. Run before every commit and before any publish:
//   node scripts/check-private.mjs
// Exits 1 if a file that would be public contains a private term or something shaped like a secret.
// Private terms come from private/denylist.txt (git-ignored, one regular expression per line).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const IGNORED = [/^quest\/packs\/personal\.js$/, /^private\//, /^\.claude\//, /^dist\//, /^node_modules\//, /^\.git\//];
const TEXT = /\.(js|mjs|html|css|md|json|txt|yml|yaml|sh|sql|sha256)$|^\.gitignore$/;

function gitFiles() {
  try {
    const out = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\n").filter(Boolean);
  } catch { return null; }
}
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name), rel = relative(root, p).split(sep).join("/");
    if (IGNORED.some((r) => r.test(rel + (statSync(p).isDirectory() ? "/" : "")))) continue;
    if (statSync(p).isDirectory()) walk(p, acc); else acc.push(rel);
  }
  return acc;
}

const files = (gitFiles() ?? walk(root)).filter((f) => TEXT.test(f) && !IGNORED.some((r) => r.test(f)));
const denyPath = join(root, "private", "denylist.txt");
const deny = existsSync(denyPath)
  ? readFileSync(denyPath, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => new RegExp(l, "i"))
  : [];
const SECRETS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key id"],
  [/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, "private key"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/\bsk-[A-Za-z0-9_-]{20,}/, "API key"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
  // Supabase: the publishable key is public by design; secret keys and service_role tokens bypass row security.
  [/\bsb_secret_[A-Za-z0-9_-]{10,}/, "Supabase secret key"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "JWT (possibly a service_role key)"],
  [/[A-Za-z0-9._%+-]+@(?!example\.|anthropic\.com)[A-Za-z0-9.-]+\.[a-z]{2,}/, "email address"],
  [/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/, "phone number"],
];

let hits = 0;
// Vendored third-party files are verified by checksum instead of scanned (minified code trips the patterns).
import { createHash } from "node:crypto";
const VENDOR = "quest/vendor/";
const sums = existsSync(join(root, VENDOR, "CHECKSUMS.sha256"))
  ? Object.fromEntries(readFileSync(join(root, VENDOR, "CHECKSUMS.sha256"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => { const [h, n] = l.trim().split(/\s+/); return [n, h]; }))
  : {};
for (const f of files.filter((f) => f.startsWith(VENDOR) && f.endsWith(".js"))) {
  const name = f.slice(VENDOR.length), got = createHash("sha256").update(readFileSync(join(root, f))).digest("hex");
  if (sums[name] !== got) { hits++; console.log(`${f}  checksum ${sums[name] ? "does not match" : "missing from"} ${VENDOR}CHECKSUMS.sha256`); }
}
for (const f of files) {
  if (f === "scripts/check-private.mjs" || (f.startsWith(VENDOR) && f.endsWith(".js"))) continue;
  const lines = readFileSync(join(root, f), "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const r of deny) if (r.test(line)) { hits++; console.log(`${f}:${i + 1}  private term /${r.source}/`); }
    for (const [r, what] of SECRETS) if (r.test(line)) { hits++; console.log(`${f}:${i + 1}  looks like a ${what}`); }
  });
}
if (!deny.length) console.log("note: private/denylist.txt not found, so only generic secret patterns were checked.");
console.log(hits ? `\nFAILED: ${hits} finding(s) in ${files.length} public files. Do not commit.` : `OK: ${files.length} public files, no private terms or secrets.`);
process.exit(hits ? 1 : 0);
