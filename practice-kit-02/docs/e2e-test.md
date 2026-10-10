# E2E(BDD) 테스트 결과

> 이 문서는 `node scripts/e2e-report.mjs <SHA>`가 Playwright JSON 결과에서 자동 생성한다. 직접 수정하지 않는다.

- commit SHA: `9f6ebc0`
- 실행 시작: 2026-10-10 21:01:31 KST · 소요 11.3s
- 집계: 통과 15 · 실패 0 · 건너뜀 0 · 불안정(flaky) 0
- 명령: `pnpm test:bdd --reporter=list,json` (DB 초기화 후 실행, workers=1)
- 원본: `docs/test-logs/bdd-results.json`, `docs/test-logs/test-bdd.log`

| REQ | BDD 시나리오 | AC | 결과 | 실행 시각 | commit SHA |
|---|---|---|---|---|---|
| REQ-00 | `smoke.feature` — 로그인한 사용자와 메뉴 목록이 화면에 표시된다 | - | PASS | 2026-10-10 21:01:42 KST | `9f6ebc0` |
| REQ-01 | `order-create.feature` — 점심 주문 모집을 열 수 있다 | AC-01 | PASS | 2026-10-10 21:01:39 KST | `9f6ebc0` |
| REQ-01 | `order-create.feature` — 메뉴를 주문하고 새로고침 후에도 조회할 수 있다 | AC-02 | PASS | 2026-10-10 21:01:39 KST | `9f6ebc0` |
| REQ-01 | `order-create.feature` — 수량은 1개 이상 5개 이하만 주문할 수 있다 (Example #1) | AC-03 | PASS | 2026-10-10 21:01:40 KST | `9f6ebc0` |
| REQ-01 | `order-create.feature` — 수량은 1개 이상 5개 이하만 주문할 수 있다 (Example #2) | AC-03 | PASS | 2026-10-10 21:01:41 KST | `9f6ebc0` |
| REQ-01 | `order-create.feature` — 같은 모집에 두 번 주문할 수 없다 | AC-04 | PASS | 2026-10-10 21:01:41 KST | `9f6ebc0` |
| REQ-02 | `order-close.feature` — 개설자는 모집을 마감할 수 있다 | AC-05 | PASS | 2026-10-10 21:01:37 KST | `9f6ebc0` |
| REQ-02 | `order-close.feature` — 마감된 모집에는 API로도 주문할 수 없다 | AC-06 | PASS | 2026-10-10 21:01:38 KST | `9f6ebc0` |
| REQ-02 | `order-close.feature` — 메뉴별 수량과 금액이 취합된다 | AC-07 | PASS | 2026-10-10 21:01:38 KST | `9f6ebc0` |
| REQ-02 | `order-close.feature` — 개설자가 아니면 모집을 마감할 수 없다 | AC-08 | PASS | 2026-10-10 21:01:38 KST | `9f6ebc0` |
| REQ-03 | `order-cancel.feature` — 본인 주문을 취소할 수 있다 | AC-09 | PASS | 2026-10-10 21:01:34 KST | `9f6ebc0` |
| REQ-03 | `order-cancel.feature` — 다른 사용자의 주문에는 취소 버튼이 없다 | AC-10 | PASS | 2026-10-10 21:01:36 KST | `9f6ebc0` |
| REQ-03 | `order-cancel.feature` — 다른 사용자의 주문을 API로 직접 취소할 수 없다 | AC-11 | PASS | 2026-10-10 21:01:36 KST | `9f6ebc0` |
| REQ-03 | `order-cancel.feature` — 마감된 모집의 주문은 취소할 수 없다 | AC-12 | PASS | 2026-10-10 21:01:37 KST | `9f6ebc0` |
| REQ-03 | `order-cancel.feature` — 로그인하지 않으면 주문할 수 없다 | AC-13 | PASS | 2026-10-10 21:01:37 KST | `9f6ebc0` |
