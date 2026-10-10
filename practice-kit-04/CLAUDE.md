# CLAUDE.md

## 프로젝트
사내 도서 대여 서비스 (해커톤 모의 개발, kit-04). 요구사항은 `docs/prd.md`, 작업 단위는 `issues.md`.

## 기술 스택
- pnpm workspace monorepo
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind CSS — port 3000
- `apps/api`: Fastify + TypeScript — port 4000
- `packages/contracts`: Zod 스키마 (FE/BE 공유)
- PostgreSQL (docker compose) + Drizzle ORM
- BDD/E2E: Gherkin + playwright-bdd + Playwright
- 단위 테스트: Vitest

## 디렉터리 규칙
- 대여 도메인 프론트: `apps/web/src/features/loan/`
- 대여 도메인 백엔드: `apps/api/src/modules/loan/`
- 공통 처리: `apps/web/src/components/`, `apps/api/src/common/`
- BDD: `features/*.feature`, Step 정의: `features/steps/`
  - 공통 Step은 `common.steps.ts`에만 정의한다. 도메인 Step은 `<domain>.steps.ts`.
  - 같은 문장의 Step을 두 파일에 중복 정의하지 않는다.

## 작업 규칙 (반드시 지킬 것)
1. 작업 전 해당 Issue(`issues.md`)와 연결된 BDD 시나리오를 먼저 읽는다.
2. 구현 전에 테스트를 실행해 **실패하는 것을 먼저 확인**한다.
3. Frontend → Backend → DB까지 이어지는 Vertical Slice로 구현한다. Mock API 금지, 실제 API와 DB를 사용한다.
4. `.feature` 파일의 시나리오를 삭제·수정·완화하거나, `skip`/`fixme`로 우회하지 않는다. 시나리오 자체가 잘못됐다고 판단되면 **수정하지 말고 이유를 보고**한다.
5. 검증(입력값, 중복, 권한)은 반드시 백엔드에서 수행한다. 프론트 검증은 UX 보조용.
6. 공통부(`packages/contracts`, DB 스키마, `common/`)를 변경하면 변경 내용을 요약에 명시한다.
7. 테스트를 직접 실행하고, 통과할 때까지 수정한다. 실행하지 않은 테스트를 통과했다고 보고하지 않는다.
8. 작업 완료 시 다음을 요약한다: 변경 파일, 실행한 명령과 결과(PASS/FAIL 수), 남은 문제.

## 테스트 데이터
- 각 시나리오 시작 전 Before hook에서 `POST /api/test/reset`으로 대여 기록을 지우고 도서 재고를 시드 값으로 되돌린다.
- 시드(사용자, 도서 목록)는 지우지 않는다.
- playwright `workers: 1`로 시작한다 (데이터 오염 방지). 병렬화는 안정화 이후 검토.
- 반납 기한은 서버의 오늘 날짜(Asia/Seoul) 기준이므로, Step은 실행 시점의 오늘 날짜로 기대값을 계산한다.

## 명령
```
pnpm install
docker compose up -d --wait
pnpm db:migrate && pnpm db:seed
pnpm dev
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:int      # 실제 DB 필요
pnpm test:bdd        # = bddgen && playwright test
```
