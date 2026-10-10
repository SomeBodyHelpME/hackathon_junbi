# 팀 일정 투표 서비스 (practice-kit-03)

개설자가 후보 시간을 올리고 팀원이 가능한 시간을 고르면, 가장 많이 가능한 시간을 보여 주고 개설자가 하나로 확정하는 서비스 (요구사항: `docs/prd.md`, 작업 단위: `issues.md`).

- 기술 스택: kit-01과 동일 (pnpm workspace · Next.js 3000 · Fastify 4000 · PostgreSQL + Drizzle · Zod · playwright-bdd · Vitest)
- 최종 검증: commit `9f1460f`, 2026-10-10 22:09 KST, **모든 항목 PASS**

## 실행 방법

```bash
corepack enable                          # PC당 1회 (Docker Desktop 실행 필요)
pnpm install
pnpm exec playwright install chromium    # 새 PC에서만
docker compose up -d --wait
pnpm db:migrate && pnpm db:seed
pnpm dev                                 # http://localhost:3000

# 검증 (pnpm dev는 끈 상태에서)
pnpm lint && pnpm typecheck && pnpm test:unit
pnpm test:int                            # 실제 DB 필요, 투표 데이터를 지움
pnpm test:bdd

# 결과 문서 재생성
PLAYWRIGHT_JSON_OUTPUT_NAME=docs/test-logs/bdd-results.json pnpm test:bdd --reporter=list,json
node scripts/e2e-report.mjs $(git rev-parse --short HEAD)

docker compose down                      # 다음 키트로 넘어가기 전 (포트 3000/4000/5432 해제)
```

`Timed out waiting ... webServer` → DB 꺼짐(`docker compose ps`) · `reset 실패` → `pnpm dev` 종료 후 재실행

## 최종 검증 결과

commit `9f1460f` · 2026-10-10 22:09:21 ~ 22:09:41 KST · DB 볼륨 삭제 후 마이그레이션·시드부터 실행 · 로그 `docs/test-logs/`

| 명령 | 결과 | 로그 |
|---|---|---|
| `pnpm lint` | PASS | `docs/test-logs/lint.log` |
| `pnpm typecheck` | PASS | `docs/test-logs/typecheck.log` |
| `pnpm test:unit` | PASS — 42 passed / 0 failed (contracts 21, api 21) | `docs/test-logs/test-unit.log` |
| `pnpm test:int` | PASS — 15 passed / 0 failed | `docs/test-logs/test-int.log` |
| `pnpm test:bdd` | PASS — 13 passed / 0 failed / 0 skipped / 0 flaky | `docs/test-logs/test-bdd.log`, `docs/e2e-test.md` |

## 증거 인덱스 (REQ → BDD → Issue → 테스트 → 결과)

| REQ | BDD (시나리오 / AC) | Issue | 단위·통합 테스트 | 결과 |
|---|---|---|---|---|
| REQ-00 환경·공통부 | `features/smoke.feature` (1) | `issues.md` [REQ-00] | `apps/api/src/app.test.ts` · `packages/contracts/src/index.test.ts` | BDD 1/1 PASS · unit PASS |
| REQ-01 투표 생성 | `features/poll-create.feature` (3) / AC-01~03 | `issues.md` [REQ-01] | `packages/contracts/src/poll.test.ts` (후보 2~5개·중복·30분) · `apps/api/src/modules/poll/routes.test.ts` · `poll.int.test.ts` (DB 후보 중복 제약) | BDD 3/3 PASS · unit PASS · int PASS |
| REQ-02 응답·집계 | `features/poll-respond.feature` (4) / AC-04~07 | `issues.md` [REQ-02] | `respond.int.test.ts` (대체, 최다 득표 동률, 다른 투표 후보 400, 복합 FK, 동시 10건 → 응답 1개·선택 합쳐짐 없음) | BDD 4/4 PASS · unit PASS · int PASS |
| REQ-03 일정 확정(보안) | `features/poll-confirm.feature` (5) / AC-08~12 | `issues.md` [REQ-03] | `routes.test.ts` (확정 401·400·404) · `confirm.int.test.ts` (개설자 403, 409, 다른 투표 후보 400, DB FK·CHECK, 확정·응답 경쟁) · `docs/security-compliance.md` | BDD 5/5 PASS · unit PASS · int PASS |

### 설계 결정 기록

| 결정 | 이유 | 위치 |
|---|---|---|
| 응답 = `responses` 행 `ON CONFLICT DO UPDATE` 후 선택 교체 | 같은 사용자의 동시 제출을 행 잠금으로 줄 세워 응답 하나만 남김. 잠금 없는 `DO NOTHING`은 동시 10건에서 FAIL 확인 | `poll/repository.ts` `saveResponse` |
| "이 투표의 후보" 규칙을 앱 + DB 복합 FK 두 겹으로 | 다른 투표의 후보 id를 끼워 넣는 공격(IDOR 변형) 차단. 앱 검증이 빠져도 DB가 거부 | `saveResponse`, `confirmPoll`, `drizzle/0001_confirm_same_poll.sql` |
| 응답 시 투표 행 `FOR SHARE`, 확정은 `UPDATE … WHERE status='open'` | 확정 이후 응답 저장 방지, 재확정 409 | `poll/repository.ts` |
| 확정 403(개설자) → 409(이미 확정) → 400(후보) 순서 | 권한을 상태·입력보다 먼저. 개설자 검사 제거 시 AC-09 FAIL 확인 | `poll/routes.ts` `/confirm` |

### 리뷰 체크포인트 근거

| 체크포인트 | 근거 |
|---|---|
| `.feature` 확정 이후 미변경 | `git diff dcf8b77 -- practice-kit-03/features/poll-*.feature` 0줄 |
| 1인 1응답(upsert)·후보 중복 DB 제약 | `responses` PK, `candidates_poll_starts_unique` · int 테스트 |
| 응답·확정의 후보가 그 투표의 후보인지 서버 검사 | `saveResponse`, `confirmPoll` + 복합 FK · BDD AC-11 |
| 확정의 403/409가 API 핸들러에 있음 | `poll/routes.ts` `/confirm` |
| `/api/test/reset` 운영 미등록 | unit "NODE_ENV=test가 아니면 라우트가 없다" |
| 고정 대기 미사용 | `grep -rn waitForTimeout features/` 0건 |
| Step 코드 수정 이력 | REQ-00에서 smoke Step(팀원 순서 무관 비교) 1건, 프롬프트 2 커밋 `90c80f3` 이후 변경 0 |

---

# 팀 일정 투표 모의 개발 키트 (kit-03)

## 파일 구성
```
practice-kit-03/
├── README.md               # 이 문서 (진행 순서 + 프롬프트)
├── CLAUDE.md               # Claude Code 작업 규칙
├── issues.md               # Issue 초안 REQ-00 ~ REQ-03
├── docs/prd.md             # 요구사항, AC, API 계약
└── features/poll-*.feature   # BDD 시나리오 3개 (AC-01 ~ AC-12)
```

## 진행 방식
- 정답지(PRD·Issue·BDD)는 AI 초안 → 사람 검토·확정. 확정 후 `.feature`는 수정 금지.
- 아래 프롬프트를 단계별로 붙여넣고, 단계마다 테스트 확인 → 커밋.

---

## 프롬프트 1 — 환경 구축 (REQ-00)
```
CLAUDE.md, docs/prd.md, issues.md의 REQ-00을 읽어.
../practice-kit-02에서 공통부만 이 폴더로 가져와 REQ-00 완료 조건을 만족시켜.
- 주문 도메인(코드, 테스트, 마이그레이션, feature)은 가져오지 마.
- smoke.feature: "상은"으로 로그인하면 "상은"과 팀원 3명(상은, 관응, 병욱)이 표시된다.
- 마지막에 실행 순서를 알려줘.
```

## 프롬프트 2 — Step 정의 먼저
```
features/poll-*.feature 3개 파일의 모든 Step Definition을 구현해.
- 공통 Step은 common.steps.ts, 투표 Step은 poll.steps.ts.
- 사전 조건 Step("~해 두었다", "들어와 있다")은 API로 데이터를 만들어.
- 아직 기능은 구현하지 마. pnpm test:bdd 실패 이유가 "Step 미정의"가 아니라 "기능 없음"인지 보여줘.
```

## 프롬프트 3 — REQ-01 구현
```
issues.md의 REQ-01을 구현해.
1. @REQ-01 BDD를 읽고 pnpm test:bdd --grep @REQ-01로 실패를 먼저 확인해.
2. Frontend → Backend → DB Vertical Slice로 구현해. .feature는 절대 수정하지 마.
3. 입력 검증(후보 개수·중복) 단위 테스트를 추가하고, 후보 중복을 DB 제약으로도 막아.
4. 통과할 때까지 수정하고 결과를 요약해.
```

## 프롬프트 4 — REQ-02 구현
프롬프트 3에서 `REQ-01` → `REQ-02`로 바꾸고 아래를 추가:
```
같은 사용자가 동시에 두 번 응답해도 응답이 하나만 남도록(upsert) 처리하고 통합 테스트로 보여줘.
응답에 다른 투표의 후보 id가 섞이면 거부해.
```

## 프롬프트 5 — REQ-03 구현
프롬프트 3에서 `REQ-01` → `REQ-03`으로 바꾸고 아래를 추가:
```
확정과 응답이 동시에 들어오면 어떻게 처리할지 정하고 이유를 설명해.
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
- [ ] 1인 1응답(upsert)과 후보 중복이 **DB 제약**으로 보장되는가?
- [ ] 응답·확정의 후보 id가 **그 투표의 후보**인지 서버가 검사하는가?
- [ ] 확정의 403/409 검사가 **API 핸들러**에 있는가?
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
