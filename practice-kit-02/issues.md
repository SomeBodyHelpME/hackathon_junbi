# GitHub Issue 초안 (모의 개발용, kit-02)

> 체크박스만 채우고 닫지 말 것. 테스트 로그·commit SHA를 코멘트로 남긴 뒤 Close as completed.

---

## [REQ-00] 개발 환경 및 공통부 (kit-01 재사용)

**목적**
- practice-kit-01의 공통부를 가져와 점심 주문 도메인용 기반을 만든다.

**완료 조건**
- [ ] kit-01에서 공통부만 복사 (예약 도메인 코드·테스트·마이그레이션 제외)
- [ ] 시드 교체: 사용자 3명(상은·관응·병욱), 메뉴 3개(PRD 3장)
- [ ] 새 DB 스키마 + 마이그레이션 (`users`, `menus`, `rounds`, `orders`)
- [ ] `POST /api/test/reset`이 모집·주문을 초기화 (NODE_ENV=test 전용)
- [ ] smoke 시나리오: "상은"으로 로그인하면 "상은"과 메뉴 3개가 표시된다
- [ ] `pnpm lint`, `typecheck`, `test:unit`, `test:bdd --grep @smoke` 통과

---

## [REQ-01] 모집 개설 및 주문

**BDD**: `features/order-create.feature` — `@REQ-01` (AC-01 ~ AC-04)

**완료 조건**
- [ ] 모집 개설 시나리오 PASS (AC-01)
- [ ] 주문·새로고침 시나리오 PASS (AC-02)
- [ ] 수량 범위 시나리오 PASS (AC-03, Scenario Outline 2건)
- [ ] 1인 1주문 시나리오 PASS (AC-04)
- [ ] 백엔드에서도 동일한 검증 (Zod 스키마 공유)
- [ ] 1인 1주문을 **DB 제약**으로 보장, 동시 주문 2건 중 1건만 성공하는 통합 테스트
- [ ] 테스트 실행 결과 기록

---

## [REQ-02] 마감 및 취합

**BDD**: `features/order-close.feature` — `@REQ-02` (AC-05 ~ AC-08)

**완료 조건**
- [ ] 마감 시나리오 PASS (AC-05)
- [ ] 마감 후 주문 409 PASS (AC-06)
- [ ] 취합표 PASS (AC-07). 금액은 서버가 DB 가격으로 계산 (단위 테스트로 클라이언트 가격 무시 확인)
- [ ] 비개설자 마감 403 PASS (AC-08)
- [ ] 마감과 주문이 동시에 들어올 때의 처리 방법과 근거를 PR에 기록
- [ ] 테스트 실행 결과 기록

---

## [REQ-03] 주문 취소 (보안)

**BDD**: `features/order-cancel.feature` — `@REQ-03` (AC-09 ~ AC-13)

**완료 조건**
- [ ] 본인 취소 PASS (AC-09)
- [ ] 타인 주문 취소 버튼 미노출 PASS (AC-10)
- [ ] 타인 주문 API 취소 403 PASS (AC-11)
- [ ] 마감 후 취소 409 PASS (AC-12)
- [ ] 비로그인 401 PASS (AC-13)
- [ ] 권한·상태 검사가 **백엔드**에서 수행됨을 코드 리뷰로 확인
- [ ] `docs/security-compliance.md`에 적용 항목·검증 결과 기록
- [ ] 테스트 실행 결과 기록
