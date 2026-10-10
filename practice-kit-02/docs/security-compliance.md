# 보안 적용 현황 (kit-02 REQ-03)

- 실행 시각: 2026-10-10 21:00 KST
- 기준 커밋: `acbd926` + REQ-03 미커밋 변경 (이 문서와 함께 커밋)
- 결과: `pnpm lint` 통과 · `pnpm typecheck` 통과 · `pnpm test:unit` 48 passed · `pnpm test:int` 16 passed · `pnpm test:bdd` 15 passed
- PASS는 위 실행에서 실제로 통과한 테스트만 표시한다.

## 1. 인증 — "누구인가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| A1 | 세션 쿠키 서명 | `uid` 쿠키를 `COOKIE_SECRET`으로 서명, 위조 시 비로그인 처리 | `apps/api/src/common/auth.ts` | unit `app.test.ts` "서명이 맞지 않는 쿠키는 401" · int `cancel.int.test.ts` "위조 쿠키는 401, 없는 주문은 404" | PASS |
| A2 | 쿠키 속성 | `HttpOnly`, `SameSite=Lax` | `apps/api/src/modules/auth/routes.ts` | kit-01에서 수동 확인 (코드 동일) | 수동 확인 |
| A3 | 비로그인 차단 | 모집·주문·마감·취소 API 전부 `requireUser` → 401 | `apps/api/src/modules/order/routes.ts` | BDD **AC-13** · unit `routes.test.ts` "비로그인은 401" (모집 목록/개설/상세/주문/마감/취소) | PASS |

## 2. 인가 — "그 일을 해도 되는가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| Z1 | **타인 주문 취소 금지** | 주문자 ≠ 요청자이면 403. 모집 개설자도 타인 주문은 취소 불가 | `order/repository.ts` `cancelOrder`, `order/routes.ts` `app.delete` | BDD **AC-11** · int "타인 주문은 403 FORBIDDEN, 주문 유지 — 모집 개설자라도 마찬가지" | PASS |
| Z2 | **마감은 개설자만** | 개설자 ≠ 요청자이면 403, 상태 유지 | `order/routes.ts` `/close` | BDD **AC-08** · int "개설자가 아니면 403, 상태는 모집 중 유지" | PASS |
| Z3 | 상태 기반 제한 | 마감된 모집에는 주문(409)·취소(409) 불가 | `order/repository.ts` `insertOrder`, `cancelOrder` | BDD **AC-06**, **AC-12** · int "개설자는 마감할 수 있고, 이후 주문은 409", "마감된 모집의 본인 주문은 409" | PASS |
| Z4 | 마감·주문/취소 경쟁 방지 | 주문·취소 트랜잭션이 모집 행을 `FOR SHARE`로 잠근 뒤 상태 확인 → 마감 이후 주문 불가 | `order/repository.ts` | int "마감 트랜잭션이 진행 중이면 주문은 기다렸다가 409를 받는다" | PASS |
| Z5 | 주문자 = 로그인 사용자 | body의 userId를 받지 않고 세션 userId로 저장 | `order/routes.ts` | 코드 리뷰 (`CreateOrderRequest`에 userId 없음) | 코드 리뷰 |
| Z6 | 버튼 숨김 (UX) | 본인 주문·모집 중일 때만 취소 버튼, 개설자·모집 중일 때만 마감 버튼. **보안 통제가 아님** | `apps/web/src/features/order/RoundDetailPage.tsx` | BDD **AC-10**, **AC-08**(버튼 없음) | PASS |

**검증 실험 (Z1):** API의 본인 검사를 일시 제거하자 AC-10(버튼 없음)은 PASS, AC-11은 `Expected: 403 / Received: 204`로 FAIL. 원복함.
**검증 실험 (Z4):** `FOR SHARE` 잠금을 일시 제거하자 경쟁 테스트가 `expected 201 to be 409`로 FAIL (마감 뒤 주문 저장됨). 원복함.

## 3. 입력 검증 · 데이터 무결성

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| V1 | 공유 스키마로 백엔드 검증 | 모집(날짜·제목), 주문(메뉴·수량 1~5·요청사항 50자) | `packages/contracts/src/index.ts`, `order/routes.ts` | BDD **AC-03** (0개, 6개) · unit `order.test.ts` · unit `routes.test.ts` "수량 0/6/1.5 → 400" | PASS |
| V2 | **금액 서버 계산** | 가격·금액 필드는 스키마가 제거, 금액 = DB 가격 × 수량, 취합은 DB 집계 | `CreateOrderRequest`, `order/repository.ts` `summarize` | unit "가격·금액 필드를 보내도 결과에 남지 않는다" · int "클라이언트가 가격·금액을 보내도 무시하고 DB 가격을 쓴다" · BDD **AC-07** | PASS |
| V3 | **1인 1주문 DB 제약** | `orders (round_id, user_id)` 유니크 인덱스 → 409 `ORDER_DUPLICATE` | `apps/api/drizzle/0001_*.sql` | BDD **AC-04** · int "같은 사용자가 동시에 10번 주문해도 1건만 생성된다" | PASS |
| V4 | id 형식 검증 | UUID가 아니면 DB 조회 없이 404 | `order/routes.ts` `IdParams` | unit "모집 id가 UUID가 아니면 404", "주문 id가 UUID가 아니면 DB 조회 없이 404" | PASS |
| V5 | SQL 인젝션 방지 | Drizzle 파라미터 바인딩만 사용 | `order/repository.ts` | 코드 리뷰 | 코드 리뷰 |

## 4. 기타

| # | 항목 | 적용 내용 | 검증 테스트 | 결과 |
|---|---|---|---|---|
| E1 | 테스트 초기화 API 비노출 | `/api/test/reset`은 `NODE_ENV=test`에서만 등록 | unit "NODE_ENV=test가 아니면 라우트가 없다" | PASS |
| E2 | CORS 출처 제한 | 웹 출처만 허용, DELETE preflight 허용 | unit "웹 출처의 DELETE preflight를 허용한다", "다른 출처는 허용하지 않는다" | PASS |
| E3 | 내부 정보 비노출 | 500은 일반 메시지만 응답 | 코드 리뷰 (`common/errors.ts`) | 코드 리뷰 |

## 5. 알려진 한계
가짜 로그인, 개발용 쿠키 서명 키 기본값, `Secure` 미적용, 세션 만료 없음, CSRF 토큰 없음, rate limit 없음 — kit-01과 동일. 운영 전 실제 인증·HTTPS·`COOKIE_SECRET` 필수화 필요.
