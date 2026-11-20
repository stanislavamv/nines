#!/usr/bin/env node
// Builds a standalone, public-safe copy into dist/ for static hosting (GitHub Pages).
//   node scripts/build.mjs
// - runs the privacy gate first and refuses to build if it fails
// - leaves out packs/personal.js
// - moves the inline app script into app.js so the Content-Security-Policy needs no 'unsafe-inline' for scripts
// - if nines.config.json exists, adds Supabase sign-in: the vendored, checksummed client library, a config.js
//   with the PUBLIC project URL and publishable key, and a CSP that allows network calls to that one host only
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "quest"), out = join(root, "dist");
execFileSync(process.execPath, [join(root, "scripts", "check-private.mjs")], { stdio: "inherit" });

const cfgPath = join(root, "nines.config.json");
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : null;
if (cfg) {
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.supabaseUrl || "")) throw new Error("nines.config.json: supabaseUrl must be https://<project>.supabase.co");
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.supabaseKey || "")) throw new Error("nines.config.json: supabaseKey must be a publishable key (sb_publishable_...). Never use a secret key.");
}
const VENDOR = "supabase-2.118.0.js";

let page = readFileSync(join(src, "index.html"), "utf8");
const m = page.match(/<script>\n(\(function\(\)\{[\s\S]*\}\)\(\);)\n<\/script>\s*$/);
if (!m) throw new Error("could not find the inline app script");
const before = cfg ? `<script src="vendor/${VENDOR}"></script>\n<script src="config.js"></script>\n` : "";
page = page.replace(m[0], before + '<script src="app.js"></script>\n').replace(/<script src="packs\/personal\.js"><\/script>\n?/, "");
const csp = [
  // 'unsafe-eval' is required by the in-browser Python engine (Brython compiles Python to JavaScript at run time).
  "default-src 'none'", "script-src 'self' 'unsafe-eval' https://cdnjs.cloudflare.com", "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com", "img-src 'self' data:", "connect-src " + (cfg ? cfg.supabaseUrl : "'none'"), "base-uri 'none'", "form-action 'none'",
].join("; ");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
</head>
<body>
${page.replace(/^<meta charset="utf-8">\n/, "")}</body>
</html>
`;
rmSync(out, { recursive: true, force: true });
for (const d of ["packs", "certs", "vendor"]) mkdirSync(join(out, d), { recursive: true });
writeFileSync(join(out, "index.html"), html);
writeFileSync(join(out, "app.js"), m[1] + "\n");
for (const f of ["data.js", "cards.js", "term.js", "shell.js", "lab.js", "night.js", "terms.js"]) copyFileSync(join(src, f), join(out, f));
for (const f of readdirSync(join(src, "certs")).filter((f) => f.endsWith(".js"))) copyFileSync(join(src, "certs", f), join(out, "certs", f));
copyFileSync(join(src, "packs", "personal.example.js"), join(out, "packs", "personal.example.js"));
for (const f of ["privacy.html", "privacy.js"]) copyFileSync(join(src, f), join(out, f));
if (cfg) {
  for (const f of [VENDOR, "supabase-LICENSE.txt"]) copyFileSync(join(src, "vendor", f), join(out, "vendor", f));
  writeFileSync(join(out, "config.js"), "/* Public configuration. The publishable key only allows what row-level security allows. */\nwindow.NINES_CONFIG = " +
    JSON.stringify({ supabaseUrl: cfg.supabaseUrl, supabaseKey: cfg.supabaseKey }) + ";\n");
}
writeFileSync(join(out, ".nojekyll"), "");
console.log("Built dist/ (public-safe, no personal pack)" + (cfg ? ", with Supabase sign-in." : "."));
