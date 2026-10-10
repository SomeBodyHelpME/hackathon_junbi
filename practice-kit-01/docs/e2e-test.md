# E2E(BDD) 테스트 결과

> 이 문서는 `node scripts/e2e-report.mjs <SHA>`가 Playwright JSON 결과에서 자동 생성한다. 직접 수정하지 않는다.

- commit SHA: `e8faa19`
- 실행 시작: 2026-10-10 20:23:47 KST · 소요 9.5s
- 집계: 통과 11 · 실패 0 · 건너뜀 0 · 불안정(flaky) 0
- 명령: `pnpm test:bdd --reporter=list,json` (DB 초기화 후 실행, workers=1)
- 원본: `docs/test-logs/bdd-results.json`, `docs/test-logs/test-bdd.log`

| REQ | BDD 시나리오 | AC | 결과 | 실행 시각 | commit SHA |
|---|---|---|---|---|---|
| REQ-00 | `smoke.feature` — 로그인한 사용자와 회의실 목록이 화면에 표시된다 | - | PASS | 2026-10-10 20:23:56 KST | `e8faa19` |
| REQ-01 | `reservation-create.feature` — 회의실을 예약하고 새로고침 후에도 조회할 수 있다 | AC-01, AC-02 | PASS | 2026-10-10 20:23:54 KST | `e8faa19` |
| REQ-01 | `reservation-create.feature` — 제목 없이 예약할 수 없다 | AC-03 | PASS | 2026-10-10 20:23:55 KST | `e8faa19` |
| REQ-01 | `reservation-create.feature` — 종료 시각이 시작 시각보다 빠르면 예약할 수 없다 | AC-04 | PASS | 2026-10-10 20:23:55 KST | `e8faa19` |
| REQ-02 | `reservation-conflict.feature` — 시간이 겹치는 예약은 생성할 수 없다 | AC-05 | PASS | 2026-10-10 20:23:53 KST | `e8faa19` |
| REQ-02 | `reservation-conflict.feature` — 끝나는 시각에 맞닿는 예약은 생성할 수 있다 | AC-06 | PASS | 2026-10-10 20:23:53 KST | `e8faa19` |
| REQ-02 | `reservation-conflict.feature` — 다른 회의실은 같은 시간에도 예약할 수 있다 | AC-07 | PASS | 2026-10-10 20:23:54 KST | `e8faa19` |
| REQ-03 | `reservation-cancel.feature` — 본인 예약을 취소할 수 있다 | AC-08 | PASS | 2026-10-10 20:23:50 KST | `e8faa19` |
| REQ-03 | `reservation-cancel.feature` — 다른 사용자의 예약에는 취소 버튼이 없다 | AC-09 | PASS | 2026-10-10 20:23:51 KST | `e8faa19` |
| REQ-03 | `reservation-cancel.feature` — 다른 사용자의 예약을 API로 직접 취소할 수 없다 | AC-10 | PASS | 2026-10-10 20:23:52 KST | `e8faa19` |
| REQ-03 | `reservation-cancel.feature` — 로그인하지 않으면 예약을 생성할 수 없다 | AC-11 | PASS | 2026-10-10 20:23:52 KST | `e8faa19` |
