import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

// 上传 demo 正脸照片，等待分析完成并返回报告页。
async function uploadAndAnalyze(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByText("开始我的分析").first()).toBeVisible({ timeout: 20_000 });
  await page.getByText("开始我的分析").first().click();
  await page.getByText("选择照片").first().click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("demo/face.jpeg");
  // 等待报告出现（local-mock 秒回，SSE 完成）
  await expect(page.getByText("柔和暖中性日常妆").first()).toBeVisible({ timeout: 30_000 });
}

test("1. 应用启动就绪且无连接错误", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("开始我的分析").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".api-loading")).toHaveCount(0);
  await expect(page.locator(".mock-login-shell")).toHaveCount(0);
});

test("2. 默认已登录，可退出并重新登录", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Yuki").first()).toBeVisible({ timeout: 20_000 });
  // 退出
  await page.getByLabel("打开账号菜单").first().click();
  await page.getByText("退出登录").click();
  await expect(page.getByText("以 Demo 账号登录")).toBeVisible();
  await page.getByText("以 Demo 账号登录").click();
  await expect(page.getByText("开始我的分析").first()).toBeVisible();
});

test("3. 上传照片→分析→完整报告（SSE 全链路）", async ({ page }) => {
  await uploadAndAnalyze(page);
  // 报告关键要素
  await expect(page.getByText("PERSONALIZED BEAUTY REPORT")).toBeVisible();
  await expect(page.getByText("脸型")).toBeVisible();
  await expect(page.getByText("肤色倾向")).toBeVisible();
  await expect(page.getByText("可见肤质")).toBeVisible();
  // 8 步计划
  await expect(page.getByText("照着做就好")).toBeVisible();
  await expect(page.getByText("妆前准备：修眉、保湿与隔离")).toBeVisible();
  // 商品匹配
  await expect(page.getByText("为你挑的")).toBeVisible();
  await expect(page.locator(".product-row").first()).toBeVisible();
  // 教程
  await expect(page.getByText("跟着练习")).toBeVisible();
  // AFTER 预览已加载（objectURL 或占位均可，但不应有加载态残留）
  await expect(page.locator(".face-preview.after")).toBeVisible();
});

test("4. 收藏商品并可在收藏页看到", async ({ page }) => {
  await uploadAndAnalyze(page);
  await page.locator(".product-row .save-button").first().click();
  await page.getByText("我的收藏", { exact: true }).click();
  await expect(page.getByText("件商品").first()).toBeVisible();
});

test("5. 反馈被记录到历史计数", async ({ page }) => {
  await uploadAndAnalyze(page);
  await page.getByText("偏黄").click();
  await expect(page.getByText("已记录反馈").first()).toBeVisible({ timeout: 10_000 });
  await page.getByText("分析历史", { exact: true }).click();
  await expect(page.getByText("条反馈已记录").first()).toBeVisible();
});

test("6. 历史列表可重开报告", async ({ page }) => {
  await uploadAndAnalyze(page);
  await page.getByText("分析历史", { exact: true }).click();
  await expect(page.getByText("柔和暖中性日常妆").first()).toBeVisible();
  await page.locator(".history-item").first().click();
  await expect(page.getByText("PERSONALIZED BEAUTY REPORT")).toBeVisible();
});

test("7. 报告页保留 3 天开关可用且真实落库", async ({ page, request }) => {
  await uploadAndAnalyze(page);
  const switchLabel = page.locator(".privacy-panel .switch-row");
  const input = switchLabel.locator("input");
  // 若当前未选中则点开，无论初始状态都应显示"到期时间"
  if (!(await input.isChecked())) {
    await switchLabel.locator("i").click();
  }
  await expect(input).toBeChecked();
  await expect(page.getByText("到期时间：3 天后自动删除")).toBeVisible();
  // 轮询等待 debounce 落库后，直接查 API 确认 photo.retention 真实为 3d（修复 mergeDb 回滚）
  const token = (await (await request.get("http://127.0.0.1:8787/api/bootstrap")).json()).data.token as string;
  let retentionValues: string[] = [];
  await expect.poll(async () => {
    const res = await request.get("http://127.0.0.1:8787/api/state", { headers: { authorization: `Bearer ${token}` } });
    const db = (await res.json()).data;
    retentionValues = (db.photos as Array<{ retention: string }>).map((p) => p.retention);
    return retentionValues.includes("3d");
  }, { timeout: 5000 }).toBe(true);
});

test("8. 设置默认保留 3 天影响下次上传", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("开始我的分析").first()).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("打开账号菜单").first().click();
  await page.getByText("用户设置").click();
  const retainToggle = page.locator(".settings-toggle").first();
  // 无条件确保"默认保留 3 天"为 true（容忍初始状态，避免 toggle 幂等翻转）
  if (!(await retainToggle.locator("input").isChecked())) {
    await retainToggle.locator("i").click();
  }
  await page.getByText("保存设置").click();
  await expect(page.getByText("用户设置已保存")).toBeVisible({ timeout: 10_000 });
  // 等待 debounce(500ms) 的 saveDb 持久化完成，避免重载前未落盘
  await page.waitForTimeout(800);
  // 下次上传后报告页开关应默认选中
  await uploadAndAnalyze(page);
  await expect(page.locator(".privacy-panel .switch-row input")).toBeChecked();
});

test("9. 多标签并发保存不丢数据（revision merge）", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("开始我的分析").first()).toBeVisible({ timeout: 20_000 });
  const pageB = await context.newPage();
  await pageB.goto("/");
  await expect(pageB.getByText("开始我的分析").first()).toBeVisible({ timeout: 20_000 });
  // A 收藏商品
  await uploadAndAnalyze(page);
  await page.locator(".product-row .save-button").first().click();
  // B 改设置（无条件确保 toggle 为 true，容忍初始状态）
  await pageB.getByLabel("打开账号菜单").first().click();
  await pageB.getByText("用户设置").click();
  const bToggle = pageB.locator(".settings-toggle").first();
  if (!(await bToggle.locator("input").isChecked())) {
    await bToggle.locator("i").click();
  }
  await pageB.getByText("保存设置").click();
  await expect(pageB.getByText("用户设置已保存")).toBeVisible({ timeout: 10_000 });
  // 刷新 B 确认 A 的收藏仍在（merge 生效）
  await pageB.reload();
  await expect(pageB.getByText("开始我的分析").first()).toBeVisible({ timeout: 20_000 });
  await pageB.getByText("我的收藏", { exact: true }).click();
  await expect(pageB.getByText("件商品").first()).toBeVisible({ timeout: 10_000 });
});

test("10. 超大文件被拒绝且不进入分析", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("开始我的分析").first()).toBeVisible({ timeout: 20_000 });
  await page.getByText("开始我的分析").first().click();
  await page.getByText("选择照片").first().click();
  const fileInput = page.locator('input[type="file"]');
  // 构造 11MB 的 PNG（超过 10MB 限制）
  const big = Buffer.alloc(11 * 1024 * 1024, 0x89);
  big[0] = 0x89; big[1] = 0x50; big[2] = 0x4e; big[3] = 0x47;
  await fileInput.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: big });
  await expect(page.getByText("图片不能超过 10MB")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("正在看懂这张照片")).toHaveCount(0);
});
