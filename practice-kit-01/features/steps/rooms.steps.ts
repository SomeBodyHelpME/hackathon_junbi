import { expect } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Then } from "./fixtures";

Then("회의실 목록에 다음 회의실이 표시된다", async ({ page }, table: DataTable) => {
  const expected = table.hashes().map((row) => row["이름"]);
  const items = page.getByRole("list", { name: "회의실 목록" }).getByRole("listitem");

  // 개수와 순서까지 정확히 일치해야 한다.
  await expect(items).toHaveCount(expected.length);
  for (const [i, name] of expected.entries()) {
    await expect(items.nth(i)).toContainText(name);
  }
});
