# GitHub Issue 초안 (모의 개발용)

> 실제 대회에서는 주최 측 Issue 양식을 사용한다. 아래는 연습용 형식.
> 체크박스만 채우고 닫지 말 것. 테스트 로그·commit SHA를 코멘트로 남긴 뒤 Close as completed.

---

## [REQ-00] 개발 환경 및 공통부 (솔로 연습용)

**목적**
- FE/BE/DB가 실행되고, BDD 테스트가 실제 DB까지 거쳐 동작하는 기반을 만든다.

**담당자**: 상은 (원래 병욱 담당)

**완료 조건**
- [ ] `pnpm install && docker compose up -d && pnpm dev`로 FE(3000)/BE(4000) 기동
- [ ] Drizzle 마이그레이션 + 시드(사용자 2명, 회의실 3개) 적용
- [ ] 가짜 로그인 (`POST /api/auth/fake-login`) + 세션 쿠키
- [ ] 공통 에러 응답 형식 적용
- [ ] `POST /api/test/reset` (NODE_ENV=test 전용)
- [ ] playwright-bdd 설정, `pnpm test:bdd`로 실행. Before hook에서 reset 호출
- [ ] 공통 Step(`"X"으로 로그인한다`, `페이지를 새로고침해도 ...`)을 `features/steps/common.steps.ts`에 정의
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` 통과

---

## [REQ-01] 예약 생성 및 조회

**목적**
- 사용자가 회의실을 예약하고 "내 예약" 목록에서 조회할 수 있다.

**담당자**: 상은

**BDD**: `features/reservation-create.feature` — `@REQ-01` (AC-01 ~ AC-04)

**완료 조건**
- [ ] 정상 예약 시나리오 PASS (AC-01, AC-02)
- [ ] 입력 검증 시나리오 PASS (AC-03, AC-04)
- [ ] 백엔드에서도 동일한 검증 수행 (Zod 스키마 공유)
- [ ] DB 저장 및 새로고침 후 재조회 확인
- [ ] 코드 리뷰 (사람이 직접)
- [ ] 테스트 실행 결과 기록 (실행 시각, commit SHA, 로그 경로)

---

## [REQ-02] 중복 예약 차단

**목적**
- 같은 회의실의 시간이 겹치는 예약을 막는다.

**담당자**: 상은

**BDD**: `features/reservation-conflict.feature` — `@REQ-02` (AC-05 ~ AC-07)

**완료 조건**
- [ ] 겹침 차단 시나리오 PASS (AC-05)
- [ ] 경계 허용·다른 회의실 시나리오 PASS (AC-06, AC-07)
- [ ] 겹침 판정 로직 단위 테스트 (`start < otherEnd && end > otherStart`)
- [ ] 동시 요청 시에도 중복이 생기지 않도록 처리 (트랜잭션 또는 DB 제약). 방법과 근거를 PR에 기록
- [ ] 409 응답 + 에러 코드 `RESERVATION_CONFLICT`
- [ ] 테스트 실행 결과 기록

---

## [REQ-03] 예약 취소 (보안)

**목적**
- 본인 예약만 취소할 수 있도록 한다.

**담당자**: 상은

**BDD**: `features/reservation-cancel.feature` — `@REQ-03` (AC-08 ~ AC-11)

**완료 조건**
- [ ] 본인 취소 시나리오 PASS (AC-08)
- [ ] 타인 예약 취소 버튼 미노출 PASS (AC-09)
- [ ] 타인 예약 API 취소 403 PASS (AC-10)
- [ ] 비로그인 401 PASS (AC-11)
- [ ] 권한 검사가 **백엔드**에서 수행됨을 코드 리뷰로 확인
- [ ] `docs/security-compliance.md`에 적용 항목·검증 결과 기록
- [ ] 테스트 실행 결과 기록
