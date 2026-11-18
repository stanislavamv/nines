// Content integrity: every quiz, card, term and cert pack is well formed and every answer key points at a real option.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScripts, loadCerts } from "./helpers.mjs";

const W = loadScripts("data.js", "cards.js", "terms.js");

test("nine levels, each with a lesson and a quiz whose options are distinct", () => {
  assert.equal(W.LEVELS.length, 9);
  W.LEVELS.forEach((L, i) => {
    assert.equal(L.n, i, `level ${i} numbered`);
    assert.ok(L.name && L.intro, `level ${i} has a name and intro`);
    assert.ok(L.quiz.length >= 5, `level ${i} has a quiz`);
    for (const q of L.quiz) {
      assert.ok(q.q && q.e, `level ${i} question has text and explanation: ${q.q}`);
      assert.ok(q.o.length >= 3, `level ${i} question has options: ${q.q}`);
      assert.equal(new Set(q.o).size, q.o.length, `level ${i} options are distinct: ${q.q}`);
    }
  });
});

test("speak-aloud cards point at real levels and have answers", () => {
  const seen = new Set();
  for (const c of W.CARDS) {
    assert.ok(Number.isInteger(c[0]) && c[0] >= 0 && c[0] <= 8, `card level: ${c[1]}`);
    assert.ok(c[1] && c[2], `card has a question and first sentence: ${c[1]}`);
    assert.ok(!seen.has(c[1]), `card question is unique: ${c[1]}`);
    seen.add(c[1]);
  }
});

test("glossary terms are unique and short enough for a tile", () => {
  const seen = new Set();
  for (const [lv, term, mean] of W.TERMS) {
    assert.ok(lv >= 1 && lv <= 7, `term level: ${term}`);
    assert.ok(term && mean, `term has text: ${term}`);
    assert.ok(mean.length <= 80, `meaning fits a tile: ${term}`);
    assert.ok(!seen.has(term), `term is unique: ${term}`);
    seen.add(term);
  }
});

const CERTS = loadCerts();

for (const [id, C] of Object.entries(CERTS)) {
  test(`${id}: domains, questions and terms are well formed`, () => {
    assert.equal(C.id, id);
    assert.equal(C.domains.reduce((a, d) => a + d.weight, 0), 100, "domain weights add up to 100");
    const qs = new Set(), terms = new Set();
    for (const d of C.domains) {
      assert.ok(d.name && d.notes, `domain ${d.name} has notes`);
      for (const q of d.qs) {
        assert.equal(q.length, 6, `question has 6 fields: ${q[0]}`);
        assert.equal(new Set(q.slice(1, 5)).size, 4, `four distinct answers: ${q[0]}`);
        assert.ok(q[5], `explanation present: ${q[0]}`);
        assert.ok(!qs.has(q[0]), `question is unique: ${q[0]}`);
        qs.add(q[0]);
      }
      for (const [t, m] of d.terms) {
        assert.ok(t && m, `term has text in ${d.name}`);
        assert.ok(!terms.has(t), `term is unique in ${id}: ${t}`);
        terms.add(t);
      }
    }
  });

  test(`${id}: every PBQ answer key matches its options or pattern`, () => {
    const ids = new Set();
    for (const p of C.pbqs || []) {
      assert.ok(!ids.has(p.id), `PBQ id unique: ${p.id}`);
      ids.add(p.id);
      assert.ok(p.d >= 0 && p.d < C.domains.length, `PBQ domain: ${p.id}`);
      if (p.type === "order") {
        assert.ok(p.items.length >= 3 && new Set(p.items).size === p.items.length, `order items distinct: ${p.id}`);
        continue;
      }
      for (const r of p.rows.map((r) => (Array.isArray(r) ? { l: r[0], a: r[1], o: r[2] } : r))) {
        if (r.re) {
          const re = new RegExp(r.re, "i");
          // `show` is what the learner sees as the answer; when it describes a range, `example` is one concrete answer.
          const model = r.example || r.show;
          assert.ok(model, `pattern row has a model answer: ${p.id} / ${r.l}`);
          assert.ok(re.test(model), `model answer matches its pattern: ${p.id} / ${r.l}`);
          continue;
        }
        const opts = r.o || p.opts;
        for (const a of [].concat(r.a)) assert.ok(opts.includes(a), `answer "${a}" is one of the options: ${p.id} / ${r.l}`);
      }
    }
  });
}

test("the static-IP PBQ accepts addresses outside the DHCP range and rejects ones inside it", () => {
  const row = CERTS.aplus1.pbqs.find((p) => p.id === "a1-ip").rows[0], re = new RegExp(row.re);
  for (const ok of ["192.168.10.2", "192.168.10.99", "192.168.10.201", "192.168.10.254"]) assert.ok(re.test(ok), ok);
  for (const bad of ["192.168.10.1", "192.168.10.100", "192.168.10.150", "192.168.10.200", "192.168.10.255", "192.168.11.5"]) assert.ok(!re.test(bad), bad);
});

test("RHCSA command drills reject the classic non-persistent or wrong forms", () => {
  const rows = Object.fromEntries(CERTS.rhcsa.pbqs.flatMap((p) => p.rows.map((r) => [r.l, new RegExp(r.re, "i")])));
  const find = (part) => Object.entries(rows).find(([l]) => l.includes(part))[1];
  assert.ok(!find("Add existing user harry to wheel").test("usermod -G wheel harry"), "usermod -G without -a is rejected");
  assert.ok(!find("Open port 82/tcp permanently").test("firewall-cmd --add-port=82/tcp"), "firewall rule without --permanent is rejected");
  assert.ok(!find("Grow /dev/datavg/datalv").test("lvextend -L +300M /dev/datavg/datalv"), "lvextend without -r is rejected");
});
