# E2E(BDD) 테스트 결과

> 이 문서는 `node scripts/e2e-report.mjs <SHA>`가 Playwright JSON 결과에서 자동 생성한다. 직접 수정하지 않는다.

- commit SHA: `9f1460f`
- 실행 시작: 2026-10-10 22:09:31 KST · 소요 9.8s
- 집계: 통과 13 · 실패 0 · 건너뜀 0 · 불안정(flaky) 0
- 명령: `pnpm test:bdd --reporter=list,json` (DB 초기화 후 실행, workers=1)
- 원본: `docs/test-logs/bdd-results.json`, `docs/test-logs/test-bdd.log`

| REQ | BDD 시나리오 | AC | 결과 | 실행 시각 | commit SHA |
|---|---|---|---|---|---|
| REQ-00 | `smoke.feature` — 로그인한 사용자와 팀원 목록이 화면에 표시된다 | - | PASS | 2026-10-10 22:09:41 KST | `9f1460f` |
| REQ-01 | `poll-create.feature` — 후보 시간을 넣어 투표를 만들 수 있다 | AC-01 | PASS | 2026-10-10 22:09:37 KST | `9f1460f` |
| REQ-01 | `poll-create.feature` — 후보가 2개 미만이면 투표를 만들 수 없다 | AC-02 | PASS | 2026-10-10 22:09:37 KST | `9f1460f` |
| REQ-01 | `poll-create.feature` — 후보 시간이 중복되면 투표를 만들 수 없다 | AC-03 | PASS | 2026-10-10 22:09:38 KST | `9f1460f` |
| REQ-02 | `poll-respond.feature` — 가능한 시간을 골라 응답하면 집계에 반영된다 | AC-04 | PASS | 2026-10-10 22:09:38 KST | `9f1460f` |
| REQ-02 | `poll-respond.feature` — 다시 응답하면 이전 응답이 바뀐다 | AC-05 | PASS | 2026-10-10 22:09:39 KST | `9f1460f` |
| REQ-02 | `poll-respond.feature` — 가능 인원이 가장 많은 후보가 표시된다 | AC-06 | PASS | 2026-10-10 22:09:40 KST | `9f1460f` |
| REQ-02 | `poll-respond.feature` — 아무 후보도 고르지 않으면 응답할 수 없다 | AC-07 | PASS | 2026-10-10 22:09:40 KST | `9f1460f` |
| REQ-03 | `poll-confirm.feature` — 개설자는 후보 하나로 일정을 확정할 수 있다 | AC-08 | PASS | 2026-10-10 22:09:35 KST | `9f1460f` |
| REQ-03 | `poll-confirm.feature` — 개설자가 아니면 확정할 수 없다 | AC-09 | PASS | 2026-10-10 22:09:36 KST | `9f1460f` |
| REQ-03 | `poll-confirm.feature` — 확정된 투표에는 응답할 수 없다 | AC-10 | PASS | 2026-10-10 22:09:36 KST | `9f1460f` |
| REQ-03 | `poll-confirm.feature` — 다른 투표의 후보로는 확정할 수 없다 | AC-11 | PASS | 2026-10-10 22:09:36 KST | `9f1460f` |
| REQ-03 | `poll-confirm.feature` — 로그인하지 않으면 응답할 수 없다 | AC-12 | PASS | 2026-10-10 22:09:37 KST | `9f1460f` |
