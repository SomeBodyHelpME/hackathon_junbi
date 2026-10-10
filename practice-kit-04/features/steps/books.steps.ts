import { expect } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Then } from "./fixtures";

Then("도서 목록에 다음 도서가 표시된다", async ({ page }, table: DataTable) => {
  const expected = table.hashes();
  const items = page.getByRole("list", { name: "도서 목록" }).getByRole("listitem");
  await expect(items).toHaveCount(expected.length);
  for (const [i, row] of expected.entries()) {
    await expect(items.nth(i)).toContainText(row["제목"]);
    await expect(items.nth(i).getByTestId("available")).toHaveText(row["남은 권수"]);
  }
});
