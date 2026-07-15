import { expect, test } from "@playwright/test";

const PASSWORD = "Divine-gallery-2026";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nHsAAAAASUVORK5CYII=",
  "base64",
);

test("setup, upload, search, lightbox and selection flow", async ({ page }) => {
  await page.goto("/");
  if (page.url().includes("/setup")) {
    await page.getByLabel("管理员密码").fill(PASSWORD);
    await page.getByLabel("确认密码").fill(PASSWORD);
    await page.getByRole("button", { name: "创建我的神图集" }).click();
  } else if (page.url().includes("/login")) {
    await page.getByLabel("管理员密码").fill(PASSWORD);
    await page.getByRole("button", { name: "进入神图集" }).click();
  }

  await expect(page.getByRole("heading", { name: "全部神图" })).toBeVisible();
  await page.getByRole("button", { name: /收神图/ }).first().click();
  await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles({
    name: "playwright-shentu.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByPlaceholder(/沙雕/).fill("自动化，测试神图");
  await page.getByRole("button", { name: /收藏 1 张图片/ }).click();
  await expect(page.getByRole("status")).toContainText("已收藏 1 张图片");

  const search = page.getByLabel("搜索关键字");
  await search.fill("自动化");
  await search.press("Enter");
  await expect(page.getByRole("button", { name: /查看 playwright-shentu.png/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /查看 playwright-shentu.png/ }).first().click();
  await expect(page.getByText("整理信息")).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("button", { name: /选择playwright-shentu.png/ }).first().click();
  await expect(page.getByText("已选择")).toBeVisible();
});
