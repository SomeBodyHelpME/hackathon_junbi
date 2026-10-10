# 보안 적용 현황 (REQ-03)

- 실행 시각: 2026-10-10 20:17 KST
- 기준 커밋: `463b44f` + REQ-03 미커밋 변경 (이 문서와 함께 커밋)
- 실행 명령과 결과: `pnpm lint` 통과 · `pnpm typecheck` 통과 · `pnpm test:unit` 54 passed · `pnpm test:int` 19 passed · `pnpm test:bdd` 11 passed
- 결과 열의 PASS는 위 실행에서 실제로 통과한 테스트만 표시한다.

## 1. 인증 (Authentication) — "누구인가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| A1 | 세션 쿠키 서명 | `uid` 쿠키를 `COOKIE_SECRET`으로 서명. 서명이 맞지 않으면 비로그인으로 처리 | `apps/api/src/app.ts` (`@fastify/cookie` secret), `apps/api/src/common/auth.ts` `getSessionUserId` | unit `app.test.ts` "서명이 맞지 않는 쿠키는 401" · int `cancel.int.test.ts` "위조 쿠키로 타인 행세를 하면 401" | PASS |
| A2 | 쿠키 탈취 완화 | `HttpOnly`(JS에서 읽기 불가), `SameSite=Lax`(타 사이트 POST·DELETE에 쿠키 미전송), `Path=/` | `apps/api/src/modules/auth/routes.ts` `setCookie` | 수동: 3단계 curl `Set-Cookie` 헤더 확인, 4단계 브라우저 쿠키 속성 확인 | 수동 확인 |
| A3 | 비로그인 요청 차단 | 로그인이 필요한 모든 라우트에 `preHandler: requireUser` → 401 `UNAUTHORIZED` | `apps/api/src/common/auth.ts` `requireUser`, `apps/api/src/modules/reservation/routes.ts` | BDD **AC-11** · unit "비로그인은 401 (검증보다 먼저)" · unit DELETE "비로그인은 401" · unit GET "비로그인은 401" | PASS |
| A4 | 인증 → 검증 순서 | 비로그인 사용자에게는 입력 검증 결과(400)도 알려 주지 않음 | `requireUser`가 preHandler라 핸들러보다 먼저 실행 | unit "비로그인은 401 (검증보다 먼저)" (빈 제목 + 쿠키 없음 → 401) | PASS |
| A5 | 존재하지 않는 사용자 로그인 거부 | fake-login은 DB에 있는 사용자만 허용 | `apps/api/src/modules/auth/routes.ts` | 수동: 3단계 curl (u-nobody → 400 `INVALID_USER`) | 수동 확인 |

## 2. 인가 (Authorization) — "그 일을 해도 되는가"

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| Z1 | **타인 예약 취소 금지 (IDOR 방어)** | API 핸들러에서 예약 소유자 ≠ 요청자이면 403 `FORBIDDEN` | `apps/api/src/modules/reservation/routes.ts` `app.delete(...)` | BDD **AC-10** · int "타인 예약은 403 FORBIDDEN, 예약은 유지된다" | PASS |
| Z2 | 확인~삭제 사이 경쟁 방지 | 삭제 SQL에 `id AND user_id` 조건 → 확인 후 상태가 바뀌어도 타인 예약은 삭제되지 않음 | `apps/api/src/modules/reservation/repository.ts` `deleteOwned` | int "본인 예약은 204로 삭제되고…" (본인만 삭제됨) | PASS |
| Z3 | 본인 예약 취소 | 소유자는 204로 삭제, 재조회 시 없음 | 같은 핸들러 | BDD **AC-08** · int "본인 예약은 204로 삭제되고 같은 시간에 다시 예약할 수 있다" | PASS |
| Z4 | 화면 버튼 숨김 (UX) | 예약 현황에서 `userId === 로그인 사용자`일 때만 취소 버튼 렌더링. **보안 통제가 아니라 UX** | `apps/web/src/features/reservation/RoomSchedule.tsx` | BDD **AC-09** | PASS |
| Z5 | 예약 생성자 = 로그인 사용자 | 요청 body의 userId를 받지 않고 세션의 userId로 저장 → 타인 명의 예약 불가 | `apps/api/src/modules/reservation/routes.ts` `insertReservation({ userId: req.userId })` | 코드 리뷰 (contracts `CreateReservationRequest`에 userId 필드 없음) | 코드 리뷰 |

**검증 실험 (Z1):** API의 소유자 검사를 일시적으로 제거하자 AC-09(버튼 숨김)는 그대로 PASS였지만, AC-10은 `Expected: 403 / Received: 204`로 FAIL, int 테스트도 FAIL. 화면이 정상으로 보여도 백엔드 검사가 없으면 타인 예약이 삭제된다는 것을 확인했고, 코드는 원복했다.

## 3. 입력 검증 (Input Validation)

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| V1 | 공유 스키마로 백엔드 검증 | FE/BE가 같은 Zod 스키마 사용. **백엔드는 항상 검증**, 프론트는 UX 보조 | `packages/contracts/src/index.ts` `CreateReservationRequest`, `apps/api/src/modules/reservation/routes.ts` `parse(...)` | unit `routes.test.ts` "입력 검증" 7건 + "body가 없으면 400" · unit `reservation.test.ts` 14건 | PASS |
| V2 | 제목 필수 / 길이 제한 | 공백 제거 후 1~100자 | 같은 스키마 | BDD **AC-03** · unit "빈 제목", "공백 제목", "100자 초과는 거부" | PASS |
| V3 | 종료 > 시작, 30분 단위, ISO 8601+시간대 | 스키마 refine | 같은 스키마 | BDD **AC-04** · unit "종료 < 시작", "종료 = 시작", "30분 단위 아님", "시각 형식 오류" | PASS |
| V4 | 경로·쿼리 파라미터 검증 | 예약 id는 UUID 형식만 허용(아니면 DB 조회 없이 404), 날짜는 `YYYY-MM-DD` | `routes.ts` `IdParams`, contracts `ReservationListQuery` | unit "id가 UUID 형식이 아니면 DB 조회 없이 404", "날짜 형식이 틀리면 400" | PASS |
| V5 | DB 최후 방어선 | `CHECK (end_at > start_at)`, 겹침 금지 exclusion constraint, 외래키 | `apps/api/drizzle/0000_*.sql`, `0001_no_overlap.sql` | int "앱 검증을 거치지 않아도 DB가 종료 <= 시작을 거부한다", int 겹침 사례 11건, 동시 요청 10건 | PASS |
| V6 | SQL 인젝션 방지 | 모든 쿼리를 Drizzle 파라미터 바인딩으로 작성 (문자열 결합 SQL 없음) | `apps/api/src/modules/**/repository.ts` | 코드 리뷰 | 코드 리뷰 |

**검증 실험 (V1):** REQ-01에서 백엔드 검증을 일시적으로 제거하자 BDD AC-03/04는 PASS(프론트가 먼저 막음)였지만 API 단위 테스트 8건이 FAIL. 백엔드 검증은 BDD가 아니라 단위 테스트가 지킨다.

## 4. 기타

| # | 항목 | 적용 내용 | 적용 위치 | 검증 테스트 | 결과 |
|---|---|---|---|---|---|
| E1 | 테스트용 초기화 API 비노출 | `/api/test/reset`은 `NODE_ENV=test`일 때만 **라우트 자체를 등록** | `apps/api/src/app.ts` | unit "NODE_ENV=test가 아니면 라우트가 없다" / "…이면 라우트가 등록된다" | PASS |
| E2 | 내부 정보 비노출 | 500 오류는 `INTERNAL_ERROR` + 일반 메시지만 응답, 상세는 서버 로그에만 | `apps/api/src/common/errors.ts` | 코드 리뷰 | 코드 리뷰 |
| E3 | CORS 출처 제한 | 허용 출처를 웹(`WEB_ORIGIN`)으로 고정, credentials 허용, 메서드 GET/HEAD/POST/DELETE | `apps/api/src/app.ts` | unit "웹 출처의 DELETE preflight를 허용한다", "다른 출처는 허용하지 않는다" | PASS |

> CORS는 **브라우저**가 지키는 정책이다. curl·스크립트는 CORS를 무시하므로 권한 통제 수단이 아니다. 실제로 AC-10(API 직접 호출)은 CORS 설정과 무관하게 실행된다. 권한 통제는 Z1(서버 코드)이 담당한다.

## 5. 알려진 한계 (연습 범위 밖, 운영 전 필요)

| 항목 | 현재 | 운영 시 필요한 조치 |
|---|---|---|
| 로그인 | 비밀번호 없는 가짜 로그인 | SSO/OAuth 등 실제 인증 |
| 쿠키 서명 키 | 미설정 시 개발용 기본값 사용 | `COOKIE_SECRET` 환경변수 필수화, 기본값 제거 |
| 쿠키 `Secure` | 미적용 (http://localhost) | HTTPS + `Secure` 속성 |
| 세션 만료·폐기 | 만료 없음, 서버 측 세션 저장소 없음 | 만료 시간, 로그아웃 시 서버 측 무효화 |
| CSRF | `SameSite=Lax`에만 의존 | CSRF 토큰 또는 커스텀 헤더 검사 |
| 요청 제한 | 없음 | rate limit (`@fastify/rate-limit`) |
| 감사 로그 | 없음 | 예약 생성·취소 이력 기록 |
