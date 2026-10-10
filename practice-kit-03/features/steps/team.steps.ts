import { expect } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Then } from "./fixtures";

// 표시 순서는 요구사항이 아니므로 순서와 무관하게 같은 팀원이 정확히 표시되는지 확인한다.
Then("팀원 목록에 다음 팀원이 표시된다", async ({ page }, table: DataTable) => {
  const expected = table.hashes().map((r) => r["이름"]);
  const items = page.getByRole("list", { name: "팀원 목록" }).getByRole("listitem");
  await expect(items).toHaveCount(expected.length);
  expect((await items.allTextContents()).map((t) => t.trim()).sort()).toEqual([...expected].sort());
});
