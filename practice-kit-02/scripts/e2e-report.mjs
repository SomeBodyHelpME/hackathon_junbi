// Playwright JSON 결과(docs/test-logs/bdd-results.json)로 docs/e2e-test.md 표를 만든다.
// 사람이 결과를 옮겨 적지 않는다: 실행하지 않은 시나리오는 표에 PASS로 나타날 수 없다.
// 사용: node scripts/e2e-report.mjs <commit SHA>
import { readFileSync, writeFileSync } from "node:fs";

const sha = process.argv[2];
if (!sha) throw new Error("사용법: node scripts/e2e-report.mjs <commit SHA>");

const report = JSON.parse(readFileSync("docs/test-logs/bdd-results.json", "utf8"));

const fmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  dateStyle: "short",
  timeStyle: "medium",
});
const kst = (iso) => `${fmt.format(new Date(iso))} KST`;

// Scenario Outline의 예시는 "Example #N"으로만 나오므로 상위 suite(Outline 제목)를 붙인다.
function* specs(suite, parentTitle = "") {
  for (const spec of suite.specs ?? []) {
    const title = /^Example #\d+$/.test(spec.title) ? `${parentTitle} (${spec.title})` : spec.title;
    yield { file: suite.file, spec: { ...spec, title } };
  }
  for (const child of suite.suites ?? []) yield* specs(child, child.title);
}

const STATUS = { passed: "PASS", failed: "FAIL", timedOut: "FAIL", skipped: "SKIP", interrupted: "FAIL" };

const rows = [];
for (const top of report.suites) {
  for (const { file, spec } of specs(top)) {
    const req = spec.tags.find((t) => t.startsWith("REQ-")) ?? "-";
    const acs = spec.tags.filter((t) => t.startsWith("AC-")).join(", ") || "-";
    const feature = file.replace(/^features\//, "").replace(/\.spec\.js$/, "");
    const result = spec.tests[0]?.results.at(-1);
    rows.push({
      req,
      feature,
      title: spec.title,
      acs,
      status: result ? (STATUS[result.status] ?? result.status) : "NOT RUN",
      at: result ? kst(result.startTime) : "-",
      ms: result ? result.duration : 0,
    });
  }
}
rows.sort((a, b) => a.req.localeCompare(b.req) || a.acs.localeCompare(b.acs, undefined, { numeric: true }));

const s = report.stats;
const lines = [
  "# E2E(BDD) 테스트 결과",
  "",
  "> 이 문서는 `node scripts/e2e-report.mjs <SHA>`가 Playwright JSON 결과에서 자동 생성한다. 직접 수정하지 않는다.",
  "",
  `- commit SHA: \`${sha}\``,
  `- 실행 시작: ${kst(s.startTime)} · 소요 ${(s.duration / 1000).toFixed(1)}s`,
  `- 집계: 통과 ${s.expected} · 실패 ${s.unexpected} · 건너뜀 ${s.skipped} · 불안정(flaky) ${s.flaky}`,
  "- 명령: `pnpm test:bdd --reporter=list,json` (DB 초기화 후 실행, workers=1)",
  "- 원본: `docs/test-logs/bdd-results.json`, `docs/test-logs/test-bdd.log`",
  "",
  "| REQ | BDD 시나리오 | AC | 결과 | 실행 시각 | commit SHA |",
  "|---|---|---|---|---|---|",
  ...rows.map(
    (r) => `| ${r.req} | \`${r.feature}\` — ${r.title} | ${r.acs} | ${r.status} | ${r.at} | \`${sha}\` |`,
  ),
  "",
];
writeFileSync("docs/e2e-test.md", lines.join("\n"));
console.log(`docs/e2e-test.md: ${rows.length} rows, ${rows.filter((r) => r.status === "PASS").length} PASS`);
