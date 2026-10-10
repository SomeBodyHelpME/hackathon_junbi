# 보안 적용 현황 (kit-04)

- 실행 시각: 2026-10-10 22:52 KST
- 기준 커밋: `9fb7a88` + REQ-03 미커밋 변경 (이 문서와 함께 커밋)
- 결과: `pnpm lint` 통과 · `pnpm typecheck` 통과 · `pnpm test:unit` 31 passed · `pnpm test:int` 22 passed · `pnpm test:bdd` 13 passed
- PASS는 위 실행에서 실제로 통과한 테스트만 표시한다.

## 1. 인증 — "누구인가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| A1 | 세션 쿠키 서명 | `uid` 쿠키를 `COOKIE_SECRET`으로 서명, 위조 시 비로그인 처리 | `apps/api/src/common/auth.ts` | unit `app.test.ts` "서명이 맞지 않는 쿠키는 401" · int `return.int.test.ts` "위조 쿠키는 401, 없는 대여는 404" | PASS |
| A2 | 쿠키 속성 | `HttpOnly`, `SameSite=Lax` | `apps/api/src/modules/auth/routes.ts` | kit-01에서 수동 확인 (코드 동일) | 수동 확인 |
| A3 | 비로그인 차단 | 대여·내 대여·반납·연장 API `requireUser` → 401. 도서 목록은 공개(PRD 결정) | `apps/api/src/modules/loan/routes.ts` | BDD **AC-08** · unit `routes.test.ts` "비로그인은 401" (대여/내 대여/반납/연장) | PASS |

## 2. 인가 — "그 일을 해도 되는가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| Z1 | **타인 대여 반납 금지** | 대여자 ≠ 요청자이면 403, 대여·재고 유지 | `loan/repository.ts` `lockOwnedActiveLoan`, `returnLoan` | BDD **AC-06** · int "타인 대여는 403 FORBIDDEN, 대여·재고 유지" | PASS |
| Z2 | **타인 대여 연장 금지** | 같은 검사 → 403, 기한 유지 | `extendLoan` | BDD **AC-12** · int "타인 대여 연장은 403, 기한 그대로" | PASS |
| Z3 | 상태 기반 제한 | 이미 반납 409 `ALREADY_RETURNED`, 이미 연장 409 `ALREADY_EXTENDED`, 반납된 대여 연장 409 | `lockOwnedActiveLoan`, `extendLoan` | BDD **AC-07**, **AC-11** · int "이미 반납된 대여는 409", "두 번째 연장은 409", "반납된 대여는 연장할 수 없다" | PASS |
| Z4 | 대여자 = 로그인 사용자 | body의 userId를 받지 않고 세션 userId로 저장 | `loan/routes.ts` | 코드 리뷰 (`BorrowRequest`에 userId 없음) | 코드 리뷰 |
| Z5 | 버튼 노출 (UX) | 반납·연장 버튼은 "내 대여"(본인 대여)에만, 재고 0이면 대여 버튼 없음. **보안 통제가 아님** | `apps/web/src/features/loan/BooksPage.tsx` | BDD **AC-02**, **AC-10**(연장 버튼 사라짐) | PASS |

**검증 실험 (Z1):** 본인 검사를 일시 제거하자 AC-06 BDD가 `Expected: 403 / Received: 204`로 FAIL. 원복함.

## 3. 데이터 무결성 · 동시성

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| D1 | **마지막 1권 동시 대여** | 조건부 UPDATE `available_copies - 1 WHERE available_copies > 0` | `loan/repository.ts` `borrow` | int "남은 1권을 10명이 동시에 빌려도 1명만 성공하고 재고는 0" | PASS |
| D2 | 재고 범위 DB 제약 | `CHECK (available_copies BETWEEN 0 AND total_copies)` | `drizzle/0000_*.sql` | int "재고는 0 미만이 될 수 없다 (CHECK)" | PASS |
| D3 | **대여 한도 2권 동시성** | 사용자 행 `FOR UPDATE`로 같은 사람의 대여를 줄 세운 뒤 대여 중 권수 확인 | `borrow` | BDD **AC-04** · int "한 사람이 3권을 동시에 빌려도 한도 2권을 넘지 않는다" | PASS |
| D4 | 같은 책 중복 대여 | 앱 검사 + 부분 유니크 인덱스 `(user_id, book_id) WHERE returned_at IS NULL` | `borrow`, `drizzle/0001_*.sql` | BDD **AC-03** · int "같은 사람이 같은 책을 동시에 5번 빌려도 1건만 생성된다", "같은 사람이 같은 책을 대여 중으로 두 번 가질 수 없다" | PASS |
| D5 | 중복 반납·연장 방지 | 대여 행 `FOR UPDATE` 후 상태 확인 → 재고 복구·연장은 1회만 | `returnLoan`, `extendLoan` | int "같은 대여를 동시에 5번 반납해도…재고는 한 번만 복구된다", "동시에 5번 연장해도 1번만 반영된다" | PASS |
| D6 | **반납 기한 서버 계산** | 대여일 = 서버 시각의 서울 날짜, 기한 +14일, 연장 +7일. 요청의 날짜 값은 받지 않음 | `loan/due.ts`, `borrow`, `extendLoan` | BDD **AC-09**, **AC-10** · unit `due.test.ts` (서울 자정·연도·윤년 경계) · int "대여하면 기한은 서버의 오늘(서울) + 14일" | PASS |
| D7 | 입력 검증 | bookId 필수, 대여 id UUID가 아니면 DB 조회 없이 404 | `loan/routes.ts` | unit "bookId가 없으면 400", "대여 id가 UUID가 아니면 DB 조회 없이 404" | PASS |

**검증 실험 (D3):** 사용자 행 잠금을 일시 제거하자 동시 3권 테스트가 3회 모두 FAIL (3권 대여됨). 원복함.

## 4. 기타

| # | 항목 | 적용 내용 | 검증 테스트 | 결과 |
|---|---|---|---|---|
| E1 | 테스트 초기화 API 비노출 | `/api/test/reset`은 `NODE_ENV=test`에서만 등록 | unit "NODE_ENV=test가 아니면 라우트가 없다" | PASS |
| E2 | CORS | 웹 출처만 허용 | unit "웹 출처의 preflight를 허용한다", "다른 출처는 허용하지 않는다" | PASS |
| E3 | 내부 정보 비노출 | 500은 일반 메시지만 응답 | 코드 리뷰 (`common/errors.ts`) | 코드 리뷰 |

## 5. 알려진 한계
가짜 로그인, 개발용 쿠키 서명 키 기본값, `Secure` 미적용, 세션 만료 없음, CSRF 토큰 없음, rate limit 없음 — kit-01과 동일.
반납 기한 BDD는 실제 오늘 날짜로 기대값을 계산하므로 서울 자정 직전에 실행하면 흔들릴 수 있다 (PRD 검토 시 수용한 위험).
