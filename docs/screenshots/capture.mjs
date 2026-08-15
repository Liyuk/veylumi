// Veylumi 截图脚本：驱动本地 dev server，覆盖核心页面与交互流程。
import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";

const BASE = "http://localhost:3011";
const OUT = new URL(".", import.meta.url).pathname;

await mkdir(OUT, { recursive: true });
// 清掉旧截图，避免命名混乱
for (const name of ["01-login","02-for-you","03-analyze-upload","04-upload-modal","05-processing","06-report-top","07-report-bottom","08-library","09-me","10-history","11-saved","12-settings","13-english","14-admin","15-mobile","error"]) {
  await rm(`${OUT}${name}.png`, { force: true });
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});

async function shot(name) {
  const path = `${OUT}${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log("captured", path);
}

try {
  // 1. For You 首页（默认已登录）
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("text=早上好，Yuki", { timeout: 20000 });
  await page.waitForTimeout(1200);
  await shot("02-for-you");

  // 2. 退出登录 → 登录页
  await page.getByLabel("打开账号菜单").first().click();
  await page.waitForTimeout(400);
  await page.getByText("退出登录").click();
  await page.waitForSelector("text=以 Demo 账号登录", { timeout: 10000 });
  await page.waitForTimeout(800);
  await shot("01-login");

  // 3. 重新登录
  await page.getByText("以 Demo 账号登录").first().click();
  await page.waitForSelector("text=早上好，Yuki", { timeout: 15000 });
  await page.waitForTimeout(800);

  // 4. Analyze 上传提示（中文导航：开始分析）
  await page.getByText("开始分析", { exact: true }).first().click();
  await page.waitForTimeout(800);
  await shot("03-analyze-upload");

  // 5. 打开上传弹窗
  await page.getByText("选择照片").first().click();
  await page.waitForTimeout(600);
  await shot("04-upload-modal");

  // 6. 上传照片 → 处理中
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("/Users/kunli/Documents/Repos/veylumi/demo/face.jpeg");
  await page.waitForTimeout(1000);
  await shot("05-processing");

  // 7. 分析报告（等完成）
  await page.waitForSelector("text=柔和暖中性日常妆", { timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot("06-report-top");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await shot("07-report-bottom");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // 8. 商品与教程（Library 次级页：从"为你"进入）
  await page.getByText("为你", { exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.getByText("探索商品与教程").first().click();
  await page.waitForTimeout(1200);
  await shot("08-library");

  // 9. Me 页面
  await page.getByText("我的", { exact: true }).first().click();
  await page.waitForTimeout(800);
  await shot("09-me");

  // 10. History 历史
  await page.getByText("分析历史").first().click();
  await page.waitForTimeout(800);
  await shot("10-history");

  // 11. 收藏页（先收藏一个商品）
  await page.getByText("为你", { exact: true }).first().click();
  await page.waitForTimeout(600);
  const saveBtn = page.locator(".save-button, .product-row .save-button").first();
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.waitForTimeout(600);
  }
  await page.getByText("我的", { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByText("我的收藏").first().click();
  await page.waitForTimeout(800);
  await shot("11-saved");

  // 12. 设置弹窗
  await page.getByLabel("打开账号菜单").first().click();
  await page.waitForTimeout(400);
  await page.getByText("用户设置").click();
  await page.waitForTimeout(800);
  await shot("12-settings");

  // 13. 英文界面：API 直改语言（设置弹窗内切换语言存在未生效问题，改用 API 保证英文截图真实）
  await page.locator(".settings-dialog-content button").filter({ hasText: "取消" }).click().catch(() => {});
  await page.waitForTimeout(500);
  // 通过页内 fetch 直改 db.settings.language
  await page.evaluate(async () => {
    const base = "http://127.0.0.1:8787";
    const boot = await (await fetch(`${base}/api/bootstrap`)).json();
    const token = boot.data.token;
    const state = await (await fetch(`${base}/api/state`, { headers: { authorization: `Bearer ${token}` } })).json();
    const db = state.data;
    db.settings.language = "en-US";
    await fetch(`${base}/api/state`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "if-match": String(db.revision) },
      body: JSON.stringify(db),
    });
  });
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Good morning", { timeout: 20000 });
  await page.waitForTimeout(1200);
  await shot("13-english");
  // 恢复中文，保证后续 admin / mobile 截图一致
  await page.evaluate(async () => {
    const base = "http://127.0.0.1:8787";
    const boot = await (await fetch(`${base}/api/bootstrap`)).json();
    const token = boot.data.token;
    const state = await (await fetch(`${base}/api/state`, { headers: { authorization: `Bearer ${token}` } })).json();
    const db = state.data;
    db.settings.language = "zh-CN";
    await fetch(`${base}/api/state`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "if-match": String(db.revision) },
      body: JSON.stringify(db),
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=早上好，Yuki", { timeout: 20000 });
  await page.waitForTimeout(800);

  // 14. Admin 控制台
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await shot("14-admin");

  // 15. 移动端 For You（iPhone 视口）
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844, deviceScaleFactor: 2 } });
  await mobile.goto(BASE, { waitUntil: "networkidle" });
  await mobile.waitForSelector("text=早上好，Yuki", { timeout: 20000 }).catch(() => {});
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: `${OUT}15-mobile.png` });
  console.log("captured", `${OUT}15-mobile.png`);
  await mobile.close();
} catch (error) {
  console.error("FAILED:", error.message);
  await page.screenshot({ path: `${OUT}error.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
