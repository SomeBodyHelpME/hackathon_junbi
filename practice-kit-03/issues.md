# GitHub Issue 초안 (모의 개발용, kit-03)

> 체크박스만 채우고 닫지 말 것. 테스트 로그·commit SHA를 코멘트로 남긴 뒤 Close as completed.

---

## [REQ-00] 개발 환경 및 공통부 (kit-02 재사용)

**완료 조건**
- [ ] kit-02에서 공통부만 복사 (주문 도메인 코드·테스트·마이그레이션·feature 제외)
- [ ] 시드: 사용자 3명. `GET /api/users` 팀원 목록
- [ ] 새 DB 스키마 + 마이그레이션 (`users`, `polls`, `candidates`, `responses`/선택 테이블)
- [ ] `POST /api/test/reset`이 투표·응답을 초기화 (NODE_ENV=test 전용)
- [ ] smoke 시나리오: "상은"으로 로그인하면 "상은"과 팀원 3명이 표시된다
- [ ] `pnpm lint`, `typecheck`, `test:unit`, `test:bdd --grep @smoke` 통과

---

## [REQ-01] 투표 생성

**BDD**: `features/poll-create.feature` — `@REQ-01` (AC-01 ~ AC-03)

**완료 조건**
- [ ] 생성 시나리오 PASS (AC-01)
- [ ] 후보 개수·중복 검증 시나리오 PASS (AC-02, AC-03)
- [ ] 백엔드에서도 동일한 검증 (Zod 스키마 공유) + 후보 중복은 DB 제약으로도 보장
- [ ] 테스트 실행 결과 기록

---

## [REQ-02] 응답 및 집계

**BDD**: `features/poll-respond.feature` — `@REQ-02` (AC-04 ~ AC-07)

**완료 조건**
- [ ] 응답·집계·새로고침 PASS (AC-04)
- [ ] 재응답 대체 PASS (AC-05)
- [ ] 최다 득표(동률 포함) PASS (AC-06)
- [ ] 빈 응답 거부 PASS (AC-07)
- [ ] 같은 사용자의 동시 응답에도 응답이 하나만 남는 통합 테스트
- [ ] 응답의 후보 id가 그 투표의 후보인지 서버 검증 (단위/통합 테스트)
- [ ] 테스트 실행 결과 기록

---

## [REQ-03] 일정 확정 (보안)

**BDD**: `features/poll-confirm.feature` — `@REQ-03` (AC-08 ~ AC-12)

**완료 조건**
- [ ] 개설자 확정 PASS (AC-08)
- [ ] 비개설자 확정 403 PASS (AC-09)
- [ ] 확정 후 응답 409 PASS (AC-10)
- [ ] 다른 투표 후보로 확정 400 PASS (AC-11)
- [ ] 비로그인 401 PASS (AC-12)
- [ ] 확정과 응답이 동시에 들어와도 확정 이후 응답이 저장되지 않음 (통합 테스트)
- [ ] `docs/security-compliance.md`에 적용 항목·검증 결과 기록
- [ ] 테스트 실행 결과 기록
