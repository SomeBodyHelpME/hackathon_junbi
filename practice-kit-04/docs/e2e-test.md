# E2E(BDD) 테스트 결과

> 이 문서는 `node scripts/e2e-report.mjs <SHA>`가 Playwright JSON 결과에서 자동 생성한다. 직접 수정하지 않는다.

- commit SHA: `ef3c98e`
- 실행 시작: 2026-10-10 22:53:23 KST · 소요 8.2s
- 집계: 통과 13 · 실패 0 · 건너뜀 0 · 불안정(flaky) 0
- 명령: `pnpm test:bdd --reporter=list,json` (DB 초기화 후 실행, workers=1)
- 원본: `docs/test-logs/bdd-results.json`, `docs/test-logs/test-bdd.log`

| REQ | BDD 시나리오 | AC | 결과 | 실행 시각 | commit SHA |
|---|---|---|---|---|---|
| REQ-00 | `smoke.feature` — 로그인한 사용자와 도서 목록이 화면에 표시된다 | - | PASS | 2026-10-10 22:53:31 KST | `ef3c98e` |
| REQ-01 | `loan-borrow.feature` — 책을 빌리면 내 대여 목록에 표시되고 남은 권수가 줄어든다 | AC-01 | PASS | 2026-10-10 22:53:26 KST | `ef3c98e` |
| REQ-01 | `loan-borrow.feature` — 남은 권수가 없는 책은 빌릴 수 없다 | AC-02 | PASS | 2026-10-10 22:53:27 KST | `ef3c98e` |
| REQ-01 | `loan-borrow.feature` — 이미 빌리고 있는 책은 다시 빌릴 수 없다 | AC-03 | PASS | 2026-10-10 22:53:28 KST | `ef3c98e` |
| REQ-01 | `loan-borrow.feature` — 대여 한도 2권을 넘겨 빌릴 수 없다 | AC-04 | PASS | 2026-10-10 22:53:28 KST | `ef3c98e` |
| REQ-02 | `loan-return.feature` — 본인 대여를 반납하면 남은 권수가 복구된다 | AC-05 | PASS | 2026-10-10 22:53:30 KST | `ef3c98e` |
| REQ-02 | `loan-return.feature` — 다른 사용자의 대여는 API로도 반납할 수 없다 | AC-06 | PASS | 2026-10-10 22:53:30 KST | `ef3c98e` |
| REQ-02 | `loan-return.feature` — 이미 반납된 대여는 다시 반납할 수 없다 | AC-07 | PASS | 2026-10-10 22:53:30 KST | `ef3c98e` |
| REQ-02 | `loan-return.feature` — 로그인하지 않으면 빌릴 수 없다 | AC-08 | PASS | 2026-10-10 22:53:31 KST | `ef3c98e` |
| REQ-03 | `loan-extend.feature` — 책을 빌리면 반납 기한이 14일 뒤로 표시된다 | AC-09 | PASS | 2026-10-10 22:53:29 KST | `ef3c98e` |
| REQ-03 | `loan-extend.feature` — 한 번 연장하면 반납 기한이 7일 늘어난다 | AC-10 | PASS | 2026-10-10 22:53:29 KST | `ef3c98e` |
| REQ-03 | `loan-extend.feature` — 연장은 한 번만 할 수 있다 | AC-11 | PASS | 2026-10-10 22:53:29 KST | `ef3c98e` |
| REQ-03 | `loan-extend.feature` — 다른 사용자의 대여는 연장할 수 없다 | AC-12 | PASS | 2026-10-10 22:53:30 KST | `ef3c98e` |
