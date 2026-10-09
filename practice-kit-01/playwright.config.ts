import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "features/*.feature",
  steps: "features/steps/*.ts",
  // Step이 없는 시나리오는 생성 단계가 아니라 실행 시점에 실패시킨다.
  // → 다른 시나리오는 정상 실행되고, 미정의 Step은 결과에 FAIL로 드러난다.
  missingSteps: "fail-on-run",
});

export default defineConfig({
  testDir,
  // 시나리오 간 데이터 오염 방지 (CLAUDE.md 테스트 데이터 규칙)
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // /api/test/reset이 등록되도록 반드시 NODE_ENV=test로 띄운다.
      // pnpm dev(개발 모드 API)를 재사용하면 reset이 404가 되므로 재사용하지 않는다.
      command: "pnpm --filter @kit/api dev:test",
      url: "http://localhost:4000/api/rooms",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @kit/web dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
