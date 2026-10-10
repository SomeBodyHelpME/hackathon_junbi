# GitHub Issue 초안 (모의 개발용, kit-04)

> 체크박스만 채우고 닫지 말 것. 테스트 로그·commit SHA를 코멘트로 남긴 뒤 Close as completed.

---

## [REQ-00] 개발 환경 및 공통부 (kit-03 재사용)

**완료 조건**
- [ ] kit-03에서 공통부만 복사 (투표 도메인 코드·테스트·마이그레이션·feature 제외)
- [ ] 시드: 사용자 3명, 도서 3종(보유 권수 포함). `GET /api/books` 도서 목록
- [ ] 새 DB 스키마 + 마이그레이션 (`users`, `books`, `loans`)
- [ ] `POST /api/test/reset`이 대여 기록을 초기화 (NODE_ENV=test 전용)
- [ ] smoke 시나리오: "상은"으로 로그인하면 "상은"과 도서 3종이 표시된다
- [ ] `pnpm lint`, `typecheck`, `test:unit`, `test:bdd --grep @smoke` 통과

---

## [REQ-01] 도서 대여

**BDD**: `features/loan-borrow.feature` — `@REQ-01` (AC-01 ~ AC-04)

**완료 조건**
- [ ] 대여·남은 권수·새로고침 PASS (AC-01)
- [ ] 재고 0 표시 PASS (AC-02)
- [ ] 중복 대여 PASS (AC-03), 한도 2권 PASS (AC-04)
- [ ] **남은 1권을 10명이 동시에 빌려도 1명만 성공** (통합 테스트)
- [ ] **한 사용자가 동시에 여러 책을 빌려도 한도 2권을 넘지 않음** (통합 테스트)
- [ ] 같은 책 중복 대여를 DB 제약으로도 막음
- [ ] 동시성 처리 방법과 근거를 PR에 기록

---

## [REQ-02] 반납 (보안)

**BDD**: `features/loan-return.feature` — `@REQ-02` (AC-05 ~ AC-08)

**완료 조건**
- [ ] 본인 반납·재고 복구 PASS (AC-05)
- [ ] 타인 반납 403 PASS (AC-06), 중복 반납 409 PASS (AC-07), 비로그인 401 PASS (AC-08)
- [ ] 같은 대여를 동시에 두 번 반납해도 재고가 한 번만 복구됨 (통합 테스트)
- [ ] 권한 검사가 **백엔드**에서 수행됨을 코드 리뷰로 확인

---

## [REQ-03] 반납 기한 및 연장

**BDD**: `features/loan-extend.feature` — `@REQ-03` (AC-09 ~ AC-12)

**완료 조건**
- [ ] 반납 기한 14일 PASS (AC-09)
- [ ] 1회 연장 +7일 PASS (AC-10), 재연장 409 PASS (AC-11), 타인 연장 403 PASS (AC-12)
- [ ] 반납 기한 계산(Asia/Seoul 날짜 경계 포함) 단위 테스트
- [ ] `docs/security-compliance.md`에 적용 항목·검증 결과 기록
