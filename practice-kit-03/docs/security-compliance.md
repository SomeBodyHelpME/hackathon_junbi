# 보안 적용 현황 (kit-03 REQ-03)

- 실행 시각: 2026-10-10 22:08 KST
- 기준 커밋: `e9a3084` + REQ-03 미커밋 변경 (이 문서와 함께 커밋)
- 결과: `pnpm lint` 통과 · `pnpm typecheck` 통과 · `pnpm test:unit` 42 passed · `pnpm test:int` 15 passed · `pnpm test:bdd` 13 passed
- PASS는 위 실행에서 실제로 통과한 테스트만 표시한다.

## 1. 인증 — "누구인가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| A1 | 세션 쿠키 서명 | `uid` 쿠키를 `COOKIE_SECRET`으로 서명, 위조 시 비로그인 처리 | `apps/api/src/common/auth.ts` | unit `app.test.ts` "서명이 맞지 않는 쿠키는 401" | PASS |
| A2 | 쿠키 속성 | `HttpOnly`, `SameSite=Lax` | `apps/api/src/modules/auth/routes.ts` | kit-01에서 수동 확인 (코드 동일) | 수동 확인 |
| A3 | 비로그인 차단 | 투표 목록·생성·상세·응답·확정 API 전부 `requireUser` → 401 | `apps/api/src/modules/poll/routes.ts` | BDD **AC-12** · unit `routes.test.ts` "비로그인은 401" (목록/생성/상세/응답/확정) | PASS |

## 2. 인가 — "그 일을 해도 되는가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| Z1 | **확정은 개설자만** | 개설자 ≠ 요청자이면 403, 상태 유지 | `poll/routes.ts` `/confirm` | BDD **AC-09** · int "개설자가 아니면 403 FORBIDDEN, 투표 중 유지" | PASS |
| Z2 | **다른 투표의 후보 참조 차단** | 확정·응답의 후보 id가 그 투표의 후보인지 서버가 확인 → 400 `INVALID_CANDIDATE` | `poll/repository.ts` `confirmPoll`, `saveResponse` | BDD **AC-11** · int "다른 투표의 후보로 확정하면 400", "다른 투표의 후보 id가 섞이면 400" | PASS |
| Z3 | Z2의 DB 최종 방어선 | 복합 FK `(poll_id, candidate_id) → candidates(poll_id, id)` (응답 선택, 확정 후보 모두) | `drizzle/0000_*.sql` (`response_choices`), `drizzle/0001_confirm_same_poll.sql` | int "DB도 다른 투표의 후보를 선택으로 저장하지 못하게 막는다", "DB도 다른 투표의 후보로 확정되는 것을 막는다" | PASS |
| Z4 | 상태 기반 제한 | 확정된 투표에는 응답·재확정 불가 → 409 `POLL_CONFIRMED` | `saveResponse`, `confirmPoll` | BDD **AC-10** · int "확정된 투표에 응답하면 409 POLL_CONFIRMED (AC-10), 다시 확정해도 409" | PASS |
| Z5 | 확정·응답 경쟁 방지 | 응답 트랜잭션이 투표 행을 `FOR SHARE`로 잠근 뒤 상태 확인 → 확정 이후 응답 저장 불가 | `saveResponse` | int "확정 트랜잭션이 진행 중이면 응답은 기다렸다가 409를 받는다" | PASS |
| Z6 | 응답자 = 로그인 사용자 | body의 userId를 받지 않고 세션 userId로 저장 → 타인 응답 대리 제출 불가 | `poll/routes.ts` | 코드 리뷰 (`RespondRequest`에 userId 없음) | 코드 리뷰 |
| Z7 | 버튼 숨김 (UX) | 개설자·투표 중일 때만 확정 버튼, 투표 중일 때만 응답 양식. **보안 통제가 아님** | `apps/web/src/features/poll/PollDetailPage.tsx` | BDD **AC-09**(버튼 없음), **AC-08**(양식 사라짐) | PASS |

**검증 실험 (Z1):** API의 개설자 검사를 일시 제거하자 AC-09 BDD가 `Expected: 403 / Received: 204`로 FAIL. 원복함.

## 3. 입력 검증 · 데이터 무결성

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| V1 | 공유 스키마로 백엔드 검증 | 제목 1~50자, 후보 2~5개·30분 단위·중복 금지, 응답 1개 이상·UUID | `packages/contracts/src/index.ts`, `poll/routes.ts` | BDD **AC-02**, **AC-03**, **AC-07** · unit `poll.test.ts` · unit `routes.test.ts` "POST /api/polls 입력 검증", "빈 응답은 400" | PASS |
| V2 | 후보 중복 DB 제약 | `candidates (poll_id, starts_at)` 유니크 | `drizzle/0000_*.sql` | int "DB도 같은 투표 안의 후보 시간 중복을 막는다" | PASS |
| V3 | 1인 1응답 + 대체 | `responses (poll_id, user_id)` PK, `ON CONFLICT DO UPDATE`로 행 잠금 후 선택 교체 | `saveResponse` | BDD **AC-05** · int "같은 사용자가 서로 다른 응답을 동시에 10번 보내도 응답 하나만 남고, 선택이 합쳐지지 않는다" | PASS |
| V4 | 상태·확정 후보 정합성 | `CHECK ((status='confirmed') = (confirmed_candidate_id IS NOT NULL))` | `drizzle/0001_confirm_same_poll.sql` | int "DB는 상태와 확정 후보가 어긋나는 것을 막는다" | PASS |
| V5 | id 형식 검증 | UUID가 아니면 DB 조회 없이 404 / 후보 id 형식 오류 400 | `poll/routes.ts` | unit "투표 id가 UUID가 아니면 404", "후보 id 형식이 틀리면 400" | PASS |
| V6 | SQL 인젝션 방지 | Drizzle 파라미터 바인딩만 사용 | `poll/repository.ts` | 코드 리뷰 | 코드 리뷰 |

**검증 실험 (V3):** upsert를 `ON CONFLICT DO NOTHING`(행 잠금 없음)으로 바꾸자 동시 10건 테스트가 3회 모두 FAIL (일부 요청 오류). 원복함.

## 4. 기타

| # | 항목 | 적용 내용 | 검증 테스트 | 결과 |
|---|---|---|---|---|
| E1 | 테스트 초기화 API 비노출 | `/api/test/reset`은 `NODE_ENV=test`에서만 등록 | unit "NODE_ENV=test가 아니면 라우트가 없다" | PASS |
| E2 | CORS | 웹 출처만 허용, PUT·DELETE preflight 허용 | unit "웹 출처의 DELETE preflight를 허용한다", "다른 출처는 허용하지 않는다" | PASS |
| E3 | 내부 정보 비노출 | 500은 일반 메시지만 응답 | 코드 리뷰 (`common/errors.ts`) | 코드 리뷰 |

## 5. 알려진 한계
가짜 로그인, 개발용 쿠키 서명 키 기본값, `Secure` 미적용, 세션 만료 없음, CSRF 토큰 없음, rate limit 없음 — kit-01과 동일. 운영 전 실제 인증·HTTPS·`COOKIE_SECRET` 필수화 필요.
