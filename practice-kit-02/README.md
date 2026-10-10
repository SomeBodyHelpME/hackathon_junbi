# 점심 메뉴 주문 취합 모의 개발 키트 (kit-02)

## 파일 구성
```
practice-kit-02/
├── README.md               # 이 문서 (진행 순서 + 프롬프트)
├── CLAUDE.md               # Claude Code 작업 규칙
├── issues.md               # Issue 초안 REQ-00 ~ REQ-03
├── docs/prd.md             # 요구사항, AC, API 계약
└── features/order-*.feature  # BDD 시나리오 3개 (AC-01 ~ AC-13)
```

## 진행 방식
- 정답지(PRD·Issue·BDD)는 AI 초안 → 사람 검토·확정. 확정 후 `.feature`는 수정 금지.
- 아래 프롬프트를 단계별로 붙여넣고, 단계마다 테스트 확인 → 커밋.

---

## 프롬프트 1 — 환경 구축 (REQ-00)
```
CLAUDE.md, docs/prd.md, issues.md의 REQ-00을 읽어.
../practice-kit-01에서 공통부만 이 폴더로 가져와 REQ-00 완료 조건을 만족시켜.
- 예약 도메인(코드, 테스트, 마이그레이션, feature)은 가져오지 마.
- smoke.feature: "상은"으로 로그인하면 "상은"과 메뉴 3개(김치찌개, 된장찌개, 제육볶음)가 표시된다.
- 마지막에 실행 순서를 알려줘.
```

## 프롬프트 2 — Step 정의 먼저
```
features/order-*.feature 3개 파일의 모든 Step Definition을 구현해.
- 공통 Step은 common.steps.ts, 주문 Step은 order.steps.ts.
- 사전 조건 Step("~해 두었다", "들어와 있다")은 API로 데이터를 만들어.
- 아직 기능은 구현하지 마. pnpm test:bdd 실패 이유가 "Step 미정의"가 아니라 "기능 없음"인지 보여줘.
```

## 프롬프트 3 — REQ-01 구현
```
issues.md의 REQ-01을 구현해.
1. @REQ-01 BDD를 읽고 pnpm test:bdd --grep @REQ-01로 실패를 먼저 확인해.
2. Frontend → Backend → DB Vertical Slice로 구현해. .feature는 절대 수정하지 마.
3. 입력 검증 단위 테스트와, 동시 주문 2건 중 1건만 성공하는 통합 테스트를 추가해.
4. 통과할 때까지 수정하고 결과를 요약해.
```

## 프롬프트 4 — REQ-02 구현
프롬프트 3에서 `REQ-01` → `REQ-02`로 바꾸고 아래를 추가:
```
금액은 서버가 DB 가격으로 계산하고, 클라이언트가 보낸 가격은 무시됨을 단위 테스트로 보여줘.
마감 요청과 주문 요청이 동시에 들어오면 어떻게 처리할지 정하고 이유를 설명해.
```

## 프롬프트 5 — REQ-03 구현
프롬프트 3에서 `REQ-01` → `REQ-03`으로 바꾸고 아래를 추가:
```
권한·상태 검사는 백엔드에서 해. 구현 후 docs/security-compliance.md를 만들어
적용한 보안 항목과 각각을 검증한 테스트를 표로 정리해.
```

## 프롬프트 6 — 최종 검증
```
전체 검증을 해줘.
1. pnpm lint, typecheck, test:unit, test:int, test:bdd 전체를 실행하고 결과를 표로 정리해.
2. docs/e2e-test.md를 만들어: REQ | BDD 시나리오 | AC | 결과 | 실행 시각 | commit SHA
3. README.md에 실행 방법과 증거 인덱스(REQ → BDD → Issue → 테스트 → 결과)를 정리해.
실행하지 않은 항목은 PASS로 쓰지 마.
```

---

## 사람이 직접 리뷰할 체크포인트
- [ ] `.feature` 파일이 확정 이후 바뀌지 않았는가?
- [ ] 1인 1주문이 **DB 제약**으로 보장되는가?
- [ ] 금액이 **서버에서** DB 가격으로 계산되는가?
- [ ] 마감·취소의 403/409 검사가 **API 핸들러**에 있는가?
- [ ] `/api/test/reset`이 운영 환경에서 등록되지 않는가?
- [ ] 테스트가 `waitForTimeout` 같은 고정 대기에 의존하지 않는가?

## 회고 메모
| 항목 | 메모 |
|---|---|
| 정답지 검토에서 고친 점 | |
| 각 단계 실제 소요 시간 | |
| 막힌 지점 | |
| AI가 규칙을 어긴 사례 | |
| 당일 전략에 반영할 점 | |
