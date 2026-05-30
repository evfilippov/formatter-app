import { test, expect } from "@playwright/test";

test("Pretty форматирует XML", async ({ page }) => {
  await page.goto("/#xml");
  await expect(page.locator("#xml")).toBeVisible();

  await page.fill("#xmlInput", "<a><b>1</b></a>");
  await page.click("#btnXmlPretty");

  const out = page.locator("#xmlOutput");
  await expect(out).toContainText("<a>");
  await expect(out).toContainText("<b>1</b>");
  await expect(page.locator("#btnCopyXml")).toBeEnabled();
});
