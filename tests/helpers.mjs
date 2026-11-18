// Shared test helpers. No dependencies: Node's built-in test runner, vm and fs only.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const QUEST = join(ROOT, "quest");

/* Run the app's plain browser scripts in a sandbox with a fake `window`, and return that window. */
export function loadScripts(...files) {
  const window = {};
  const ctx = vm.createContext({ window, console });
  for (const f of files) vm.runInContext(readFileSync(join(QUEST, f), "utf8"), ctx, { filename: f });
  return window;
}

/* Every cert pack, base files first so the "-more" files can extend them. */
export function loadCerts() {
  const files = readdirSync(join(QUEST, "certs")).filter((f) => f.endsWith(".js"))
    .sort((a, b) => (a.includes("-more") ? 1 : 0) - (b.includes("-more") ? 1 : 0) || a.localeCompare(b));
  return loadScripts(...files.map((f) => "certs/" + f)).CERTS;
}

/* Pull named functions out of the inline app script in index.html, without running the app. */
export function appFunctions(from, to, names) {
  const html = readFileSync(join(QUEST, "index.html"), "utf8");
  const a = html.indexOf(from), b = html.indexOf(to);
  if (a < 0 || b < 0 || b < a) throw new Error(`markers not found: ${from} .. ${to}`);
  return new Function(html.slice(a, b) + `;return {${names.join(",")}};`)();
}

/* Type commands into a simulated-shell lab exactly the way the app does (see runMission in index.html). */
export function replay(m, commands) {
  const st = JSON.parse(JSON.stringify(m.st || {})), done = m.steps.map(() => false), unknown = [];
  for (const raw of commands) {
    const c = raw.trim().replace(/\s+/g, " ").replace(/^sudo (-i )?(?!-)/, "").replace(/^ip netns exec \w+ /, "").replace(/^ip -n \w+ /, "ip ");
    let hit = null, mt = null;
    for (const k of m.cmds) { mt = k[0].exec(c); if (mt) { hit = k; break; } }
    if (hit) { const o = typeof hit[1] === "function" ? hit[1](st, mt, c) : hit[1]; if (/command not found/.test(o)) unknown.push(c); if (hit[2]) hit[2](st, mt, c); }
    else unknown.push(c);
    m.steps.forEach((s, i) => { if (!done[i] && s.re.test(c) && (!s.when || s.when(st))) done[i] = true; });
  }
  return { done, unknown, left: m.steps.filter((_, i) => !done[i]).map((s) => s.g) };
}

/* The commands a learner would type by following each step's hint, plus "answer <word>" for verdict steps. */
export function hintCommands(m) {
  const cmds = [];
  for (const s of m.steps) {
    // A step can name its exact command in `solve` when its hint is prose ("Same curl as step 1").
    if (s.solve) { cmds.push(s.solve); continue; }
    // Verdict steps look like /^answer (forward|router)/ or /^answer php-?fpm/: answer with the first accepted word.
    const answer = /\^answer \(?([\w?-]+)/.exec(s.re.source);
    if (answer) { cmds.push("answer " + answer[1].replace(/\?/g, "")); continue; }
    s.hint.split(/\s+then\s+|;\s+|, then | \(or .*$|, or sed.*$/).map((x) => x.trim()).filter((x) => x && !/^\(/.test(x)).forEach((x) => cmds.push(x));
  }
  return cmds;
}
