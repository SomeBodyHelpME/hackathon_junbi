import { expect } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Then } from "./fixtures";

Then("메뉴 목록에 다음 메뉴가 표시된다", async ({ page }, table: DataTable) => {
  const expected = table.hashes();
  const items = page.getByRole("list", { name: "메뉴 목록" }).getByRole("listitem");

  // 개수·순서·가격까지 정확히 일치해야 한다.
  await expect(items).toHaveCount(expected.length);
  for (const [i, row] of expected.entries()) {
    await expect(items.nth(i)).toContainText(row["이름"]);
    await expect(items.nth(i)).toContainText(row["가격"]);
  }
});
