# 회의실 예약 서비스 (practice-kit-01)

사내 회의실 예약·조회·취소 웹 서비스. BDD → AI 구현 → E2E 검증 사이클 연습용 (요구사항: `docs/prd.md`, 작업 단위: `issues.md`).

- 기술 스택: pnpm workspace · Next.js(3000) · Fastify(4000) · PostgreSQL + Drizzle · Zod(contracts) · playwright-bdd · Vitest
- 최종 검증: commit `e8faa19`, 2026-10-10 20:23 KST, **모든 항목 PASS** (아래 표)

## 실행 방법

```bash
# 0) 사전 준비 (PC당 1회): Docker Desktop 실행
corepack enable

# 1) 설치
pnpm install
pnpm exec playwright install chromium   # 새 PC에서만

# 2) DB 기동 → 테이블·시드
docker compose up -d --wait
pnpm db:migrate && pnpm db:seed

# 3) 개발 서버 (http://localhost:3000)
pnpm dev

# 4) 검증 (pnpm dev는 꺼 둔 상태에서)
pnpm lint
pnpm typecheck
pnpm test:unit     # DB 없이 실행
pnpm test:int      # 실제 DB 필요, 예약 데이터를 지움
pnpm test:bdd      # API(NODE_ENV=test)·Web 서버를 자동 기동

# 결과 문서 재생성
pnpm test:bdd --reporter=list,json   # PLAYWRIGHT_JSON_OUTPUT_NAME=docs/test-logs/bdd-results.json
node scripts/e2e-report.mjs $(git rev-parse --short HEAD)

# 정리
docker compose down      # 데이터 유지
docker compose down -v   # 데이터 삭제
```

| 문제 | 원인 · 조치 |
|---|---|
| `Timed out waiting ... from config.webServer` | DB가 꺼져 있음 → `docker compose ps` 확인 후 2) 실행 |
| Before hook `reset 실패` | `pnpm dev`(개발 모드 API)가 4000번을 점유 → 종료 후 재실행 |
| 포트 사용 중 | 다른 키트의 서버/DB가 떠 있음 → 해당 키트에서 `docker compose down` |

## 최종 검증 결과

- commit `e8faa19` · 실행 2026-10-10 20:23:36 ~ 20:23:56 KST · DB 볼륨 삭제 후 마이그레이션·시드부터 실행
- 로그: `docs/test-logs/`

| 명령 | 결과 | 로그 |
|---|---|---|
| `pnpm lint` | PASS (오류 0) | `docs/test-logs/lint.log` |
| `pnpm typecheck` | PASS (오류 0) | `docs/test-logs/typecheck.log` |
| `pnpm test:unit` | PASS — 54 passed / 0 failed (contracts 21, api 33) | `docs/test-logs/test-unit.log` |
| `pnpm test:int` | PASS — 19 passed / 0 failed | `docs/test-logs/test-int.log` |
| `pnpm test:bdd` | PASS — 11 passed / 0 failed / 0 skipped / 0 flaky | `docs/test-logs/test-bdd.log`, `docs/e2e-test.md` |

## 증거 인덱스 (REQ → BDD → Issue → 테스트 → 결과)

| REQ | BDD (시나리오 / AC) | Issue | 단위·통합 테스트 | 결과 |
|---|---|---|---|---|
| REQ-00 환경·공통부 | `features/smoke.feature` (1) | `issues.md` [REQ-00] | `apps/api/src/app.test.ts` (에러 형식, 인증, reset 등록 조건, CORS) · `packages/contracts/src/index.test.ts` | BDD 1/1 PASS · unit PASS |
| REQ-01 예약 생성·조회 | `features/reservation-create.feature` (3) / AC-01~04 | `issues.md` [REQ-01] | `packages/contracts/src/reservation.test.ts` (스키마 14) · `apps/api/src/modules/reservation/routes.test.ts` (백엔드 입력 검증) | BDD 3/3 PASS · unit PASS |
| REQ-02 중복 차단 | `features/reservation-conflict.feature` (3) / AC-05~07 | `issues.md` [REQ-02] | `apps/api/src/modules/reservation/overlap.test.ts` (겹침 11사례) · `conflict.int.test.ts` (DB 제약=공식, 동시 10건 → 1건 성공) | BDD 3/3 PASS · unit PASS · int PASS |
| REQ-03 예약 취소(보안) | `features/reservation-cancel.feature` (4) / AC-08~11 | `issues.md` [REQ-03] | `routes.test.ts` (DELETE 401·404) · `cancel.int.test.ts` (본인 204, 타인 403, 위조 쿠키 401, 날짜 경계) · `docs/security-compliance.md` | BDD 4/4 PASS · unit PASS · int PASS |

시나리오별 결과·실행 시각·SHA: `docs/e2e-test.md` · 보안 항목별 검증: `docs/security-compliance.md`

### 설계 결정 기록

| 결정 | 이유 | 위치 |
|---|---|---|
| 겹침 차단 = PostgreSQL exclusion constraint + 회의실별 advisory lock | 조회 후 저장은 동시 요청에 뚫림(실험: 10건 모두 성공). 제약만 쓰면 deadlock → 500. 잠금으로 줄 세우고 제약은 안전망 | `apps/api/drizzle/0001_no_overlap.sql`, `reservation/repository.ts` |
| 권한 검사는 API 핸들러에서 | 화면 버튼 숨김(AC-09)만으로는 IDOR 방어 불가(실험: 검사 제거 시 AC-10 FAIL) | `reservation/routes.ts` `app.delete` |
| 취소 = 행 삭제(hard delete) | 소프트 삭제 시 취소된 예약도 겹침 제약에 걸림 | `repository.ts` `deleteOwned` |
| `/api/test/reset`은 `NODE_ENV=test`에서만 등록 | 운영에서 인증 없는 전체 삭제 API 노출 방지 | `apps/api/src/app.ts` |

### 리뷰 체크포인트 근거 (아래 키트 체크리스트를 사람이 확인할 때 참고)

| 체크포인트 | 근거 |
|---|---|
| `.feature` 파일 미변경 | 키트 첫 커밋(`1c45dfe`) 이후 `git diff 1c45dfe -- 'practice-kit-01/features/reservation-*.feature'` 0줄 |
| 겹침 경계 허용 | `overlap.cases.ts` "끝에 맞닿음 (AC-06)" · BDD AC-06 PASS |
| 403 검사가 API 핸들러에 있음 | `apps/api/src/modules/reservation/routes.ts` `owner.userId !== req.userId` |
| `/api/test/reset` 운영 미등록 | `app.test.ts` "NODE_ENV=test가 아니면 라우트가 없다" PASS |
| 고정 대기 미사용 | `grep -rn waitForTimeout features/` 결과 0건 |
| Step 코드 수정 이력 | REQ-01 구현 중 2건 (alert 필터, 목록 가드 `toBeAttached`) — 커밋 `929b4dd` |

---

# 회의실 예약 모의 개발 키트 (상은)

## 파일 구성
```
practice-kit/
├── README.md                    # 이 문서 (진행 순서 + 프롬프트)
├── CLAUDE.md                    # Claude Code 작업 규칙
├── issues.md                    # Issue 초안 REQ-00 ~ REQ-03
├── docs/prd.md                  # 요구사항, AC, API 계약
└── features/reservation-*.feature  # BDD 시나리오 3개 (AC-01 ~ AC-11)
```

## 시작 방법
1. 빈 폴더(예: `~/aidx-practice`)를 만들고 이 키트의 파일을 전부 복사한다.
2. `git init` 후 첫 커밋.
3. 해당 폴더에서 Claude Code를 실행하고, 아래 프롬프트를 **단계별로 하나씩** 붙여넣는다.
4. 각 단계가 끝나면 직접 테스트를 돌려 확인하고 커밋한 뒤 다음 단계로 넘어간다.

---

## 프롬프트 1 — 환경 구축 (REQ-00) · 목표 1~2시간

```
CLAUDE.md, docs/prd.md, issues.md의 REQ-00을 읽어.
REQ-00의 완료 조건을 모두 만족하도록 프로젝트 기본 구조를 만들어.

- 예약 기능 자체는 아직 구현하지 마.
- 동작 확인용으로 features/smoke.feature에 시나리오 하나를 추가해:
  "상은"으로 로그인하면 화면에 "상은"이 표시되고, 회의실 목록 API로 받은
  회의실 3개(한라, 백두, 지리)가 화면에 표시된다.
- 이 시나리오가 실제 브라우저 → Next.js → Fastify → PostgreSQL을 거쳐 PASS해야 해.
- 마지막에 내가 새 터미널에서 처음부터 따라 할 수 있는 실행 순서를 알려줘.
```

**확인할 것**: 컨테이너를 내리고 처음부터 README 순서대로 다시 실행해도 smoke 테스트가 통과하는지.

---

## 프롬프트 2 — Step 정의 먼저 (테스트 우선) · 목표 30분

```
features/reservation-*.feature 3개 파일의 모든 Step Definition을 구현해.
- 공통 Step은 features/steps/common.steps.ts, 예약 Step은 features/steps/reservation.steps.ts에 둬.
- "~해 두었다" 같은 사전 조건 Step은 UI가 아니라 API로 데이터를 만들어.
- 아직 예약 기능은 구현하지 마.
- pnpm test:bdd를 실행해서 reservation 시나리오가 "Step 미정의"가 아니라
  "기능 없음" 때문에 실패하는지 확인하고 결과를 보여줘.
```

**확인할 것**: 실패 이유가 맞는지. 그리고 Step이 실제로 화면 결과를 검증하는지 (예: 그냥 `expect(true)`로 끝나지 않는지).

---

## 프롬프트 3 — REQ-01 구현

```
issues.md의 REQ-01을 구현해.
1. 연결된 BDD(@REQ-01)를 읽어.
2. 먼저 pnpm test:bdd --grep @REQ-01 을 실행해 현재 실패 상태를 확인해.
3. Frontend → Backend → DB Vertical Slice로 구현해.
4. .feature 파일은 절대 수정하지 마.
5. 입력 검증 단위 테스트를 추가해.
6. 테스트가 통과할 때까지 수정해.
7. 변경 파일, 실행 명령과 결과, 남은 문제를 요약해.
```

## 프롬프트 4 — REQ-02 구현
프롬프트 3에서 `REQ-01` → `REQ-02`로 바꾸고 아래 한 줄을 추가:
```
동시에 같은 시간대 예약 요청이 2개 들어와도 하나만 성공하도록 처리하고,
선택한 방법(트랜잭션 / exclusion constraint 등)과 이유를 설명해.
```

## 프롬프트 5 — REQ-03 구현
프롬프트 3에서 `REQ-01` → `REQ-03`으로 바꾸고 아래를 추가:
```
권한 검사는 백엔드에서 수행해. 구현 후 docs/security-compliance.md를 만들어
적용한 보안 항목(인증, 인가, 입력 검증)과 각각을 검증한 테스트를 표로 정리해.
```

## 프롬프트 6 — 최종 검증 (후반 역할 연습)

```
전체 검증을 해줘.
1. pnpm lint, typecheck, test:unit, test:bdd 전체를 실행하고 결과를 표로 정리해.
2. docs/e2e-test.md를 만들어: REQ | BDD 시나리오 | AC | 결과 | 실행 시각 | commit SHA
3. README.md에 실행 방법과 증거 인덱스(REQ → BDD → Issue → 테스트 → 결과)를 정리해.
실행하지 않은 항목은 PASS로 쓰지 마.
```

---

## 사람이 직접 리뷰할 체크포인트
- [ ] `.feature` 파일이 바뀌지 않았는가? (`git diff features/*.feature`)
- [ ] 겹침 판정 조건이 맞는가? 경계(11:00 끝 / 11:00 시작)가 허용되는가?
- [ ] 403 검사가 프론트가 아니라 **API 핸들러**에 있는가?
- [ ] `/api/test/reset`이 운영 환경에서 등록되지 않는가?
- [ ] 테스트가 `waitForTimeout` 같은 고정 대기에 의존하지 않는가?

## 회고 메모 (끝나고 작성 → 팀 공유)
| 항목 | 메모 |
|---|---|
| 각 단계 실제 소요 시간 | |
| 막힌 지점 | |
| AI가 규칙을 어긴 사례 (테스트 수정, Mock 사용 등) | |
| 당일 전략에 반영할 점 | |
