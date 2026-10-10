# 사내 도서 대여 서비스 (practice-kit-04)

사내 서가의 책을 빌리고, 반납하고, 반납 기한을 한 번 연장하는 서비스 (요구사항: `docs/prd.md`, 작업 단위: `issues.md`).

- 기술 스택: kit-01과 동일 (pnpm workspace · Next.js 3000 · Fastify 4000 · PostgreSQL + Drizzle · Zod · playwright-bdd · Vitest)
- 최종 검증: commit `ef3c98e`, 2026-10-10 22:53 KST, **모든 항목 PASS**

## 실행 방법

```bash
corepack enable                          # PC당 1회 (Docker Desktop 실행 필요)
pnpm install
pnpm exec playwright install chromium    # 새 PC에서만
docker compose up -d --wait
pnpm db:migrate && pnpm db:seed
pnpm dev                                 # http://localhost:3000 (대여 화면: /books)

# 검증 (pnpm dev는 끈 상태에서)
pnpm lint && pnpm typecheck && pnpm test:unit
pnpm test:int                            # 실제 DB 필요, 대여 기록을 지우고 재고를 되돌림
pnpm test:bdd

# 결과 문서 재생성
PLAYWRIGHT_JSON_OUTPUT_NAME=docs/test-logs/bdd-results.json pnpm test:bdd --reporter=list,json
node scripts/e2e-report.mjs $(git rev-parse --short HEAD)

docker compose down                      # 다른 키트로 넘어가기 전 (포트 3000/4000/5432 해제)
```

`Timed out waiting ... webServer` → DB 꺼짐(`docker compose ps`) · `reset 실패` → `pnpm dev` 종료 후 재실행 · 반납 기한 BDD는 서울 자정 직전 실행을 피할 것

## 최종 검증 결과

commit `ef3c98e` · 2026-10-10 22:53:13 ~ 22:53:31 KST · DB 볼륨 삭제 후 마이그레이션·시드부터 실행 · 로그 `docs/test-logs/`

| 명령 | 결과 | 로그 |
|---|---|---|
| `pnpm lint` | PASS | `docs/test-logs/lint.log` |
| `pnpm typecheck` | PASS | `docs/test-logs/typecheck.log` |
| `pnpm test:unit` | PASS — 31 passed / 0 failed (contracts 7, api 24) | `docs/test-logs/test-unit.log` |
| `pnpm test:int` | PASS — 22 passed / 0 failed | `docs/test-logs/test-int.log` |
| `pnpm test:bdd` | PASS — 13 passed / 0 failed / 0 skipped / 0 flaky | `docs/test-logs/test-bdd.log`, `docs/e2e-test.md` |

## 증거 인덱스 (REQ → BDD → Issue → 테스트 → 결과)

| REQ | BDD (시나리오 / AC) | Issue | 단위·통합 테스트 | 결과 |
|---|---|---|---|---|
| REQ-00 환경·공통부 | `features/smoke.feature` (1) | `issues.md` [REQ-00] | `apps/api/src/app.test.ts` · `packages/contracts/src/index.test.ts` | BDD 1/1 PASS · unit PASS |
| REQ-01 도서 대여 | `features/loan-borrow.feature` (4) / AC-01~04 | `issues.md` [REQ-01] | `apps/api/src/modules/loan/routes.test.ts` · `borrow.int.test.ts` (마지막 1권 10명 동시 → 1명, 한 사람 3권 동시 → 2권, 같은 책 동시 5번 → 1건, CHECK·부분 유니크) | BDD 4/4 PASS · unit PASS · int PASS |
| REQ-02 반납(보안) | `features/loan-return.feature` (4) / AC-05~08 | `issues.md` [REQ-02] | `routes.test.ts` (반납 401·404) · `return.int.test.ts` (본인 204·재고 복구, 타인 403, 409, 동시 5번 → 재고 1회 복구) | BDD 4/4 PASS · unit PASS · int PASS |
| REQ-03 반납 기한·연장 | `features/loan-extend.feature` (4) / AC-09~12 | `issues.md` [REQ-03] | `due.test.ts` (서울 자정·연도·윤년 경계) · `extend.int.test.ts` (+7일, 재연장 409, 타인 403, 동시 5번 → 1회) · `docs/security-compliance.md` | BDD 4/4 PASS · unit PASS · int PASS |

### 설계 결정 기록

| 결정 | 이유 | 위치 |
|---|---|---|
| 재고 = `available_copies` 조건부 UPDATE + CHECK(0~total) | 마지막 1권을 한 명만 가져가게 원자적으로 차감, 음수는 DB가 거부 | `loan/repository.ts` `borrow`, `drizzle/0000_*.sql` |
| 대여 시 사용자 행 `FOR UPDATE` | 같은 사람의 동시 대여를 줄 세워 한도 2권 보장. 잠금 제거 시 3권 대여되는 것 확인 | `borrow` |
| 같은 책 중복 대여 = 부분 유니크 인덱스 `WHERE returned_at IS NULL` | 반납 기록은 남기면서 대여 중 중복만 금지 | `drizzle/0001_*.sql` |
| 반납·연장 = 대여 행 `FOR UPDATE` 후 404 → 403 → 409 | 동시 반납에도 재고 1회 복구, 동시 연장 1회 반영. 본인 검사 제거 시 AC-06 FAIL 확인 | `lockOwnedActiveLoan` |
| 반납 기한은 서버가 서울 날짜로 계산 | 클라이언트 날짜 조작 방지, 시간대 경계 일관성 | `loan/due.ts` |

### 리뷰 체크포인트 근거

| 체크포인트 | 근거 |
|---|---|
| `.feature` 확정 이후 미변경 | `git diff 56eb4d5 -- practice-kit-04/features/loan-*.feature` 0줄 |
| 재고·한도 동시성 | int "남은 1권을 10명이 동시에…", "한 사람이 3권을 동시에…" |
| 같은 책 중복 대여 DB 제약 | `loans_active_user_book_unique` · int 테스트 |
| 반납·연장의 403/409가 API에 있음 | `loan/routes.ts` → `lockOwnedActiveLoan` |
| 반납 기한 서버 계산 | `loan/due.ts` · `BorrowRequest`에 날짜 필드 없음 |
| `/api/test/reset` 운영 미등록 | unit "NODE_ENV=test가 아니면 라우트가 없다" |
| 고정 대기 미사용 | `grep -rn waitForTimeout features/` 0건 |
| Step 코드 수정 이력 | 프롬프트 2 커밋 `1087d89` 이후 변경 0 |

---

# 사내 도서 대여 모의 개발 키트 (kit-04)

## 파일 구성
```
practice-kit-04/
├── README.md               # 이 문서 (진행 순서 + 프롬프트)
├── CLAUDE.md               # Claude Code 작업 규칙
├── issues.md               # Issue 초안 REQ-00 ~ REQ-03
├── docs/prd.md             # 요구사항, AC, API 계약
└── features/loan-*.feature   # BDD 시나리오 3개 (AC-01 ~ AC-12)
```

## 진행 방식
- 정답지(PRD·Issue·BDD)는 AI 초안 → 사람 검토·확정. 확정 후 `.feature`는 수정 금지.
- 아래 프롬프트를 단계별로 붙여넣고, 단계마다 테스트 확인 → 커밋.

---

## 프롬프트 1 — 환경 구축 (REQ-00)
```
CLAUDE.md, docs/prd.md, issues.md의 REQ-00을 읽어.
../practice-kit-03에서 공통부만 이 폴더로 가져와 REQ-00 완료 조건을 만족시켜.
- 투표 도메인(코드, 테스트, 마이그레이션, feature)은 가져오지 마.
- smoke.feature: "상은"으로 로그인하면 "상은"과 도서 3종(클린 코드, 리팩터링, 도메인 주도 설계)이 표시된다.
- 마지막에 실행 순서를 알려줘.
```

## 프롬프트 2 — Step 정의 먼저
```
features/loan-*.feature 3개 파일의 모든 Step Definition을 구현해.
- 공통 Step은 common.steps.ts, 대여 Step은 loan.steps.ts.
- 사전 조건 Step("~해 두었다", "들어와 있다")은 API로 데이터를 만들어.
- 아직 기능은 구현하지 마. pnpm test:bdd 실패 이유가 "Step 미정의"가 아니라 "기능 없음"인지 보여줘.
```

## 프롬프트 3 — REQ-01 구현
```
issues.md의 REQ-01을 구현해.
1. @REQ-01 BDD를 읽고 pnpm test:bdd --grep @REQ-01로 실패를 먼저 확인해.
2. Frontend → Backend → DB Vertical Slice로 구현해. .feature는 절대 수정하지 마.
3. 남은 1권을 10명이 동시에 빌려도 1명만 성공하고, 한 사용자가 동시에 여러 권을 빌려도 한도를 넘지 않음을 통합 테스트로 보여줘.
   선택한 방법(행 잠금 / 조건부 UPDATE / DB 제약 등)과 이유를 설명해.
4. 통과할 때까지 수정하고 결과를 요약해.
```

## 프롬프트 4 — REQ-02 구현
프롬프트 3에서 `REQ-01` → `REQ-02`로 바꾸고 아래를 추가:
```
권한 검사는 백엔드에서 해. 같은 대여를 동시에 두 번 반납해도 재고가 한 번만 복구됨을 통합 테스트로 보여줘.
```

## 프롬프트 5 — REQ-03 구현
프롬프트 3에서 `REQ-01` → `REQ-03`으로 바꾸고 아래를 추가:
```
반납 기한 계산(Asia/Seoul 날짜 경계 포함) 단위 테스트를 추가해. 구현 후 docs/security-compliance.md를 만들어
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
- [ ] 재고가 동시 대여에도 음수가 되지 않는가? 한도 2권이 동시 요청에도 지켜지는가?
- [ ] 같은 책 중복 대여가 **DB 제약**으로도 막히는가?
- [ ] 반납·연장의 403/409 검사가 **API 핸들러**에 있는가?
- [ ] 반납 기한을 **서버**가 계산하는가?
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
