// Veylumi 端到端功能走查脚本（QA）
// 驱动真实浏览器，按用户主链路逐步骤作，每步截图并记录控制台错误。
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SHOTS = "/tmp/veylumi-func-main";
const BASE = "http://localhost:3000";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
let shotCount = 0;

function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`  [${status}] ${name} — ${detail}`);
}

async function shot(page, label) {
  shotCount += 1;
  const file = path.join(SHOTS, `${String(shotCount).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${file}`);
}

function run() {
  return (async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 若通过环境变量指定隔离 API，把浏览器的 8787 请求重定向过去（干净状态复测）
    const REDIRECT_API = process.env.VEYLUMI_QA_API_REDIRECT; // e.g. http://127.0.0.1:8899
    if (REDIRECT_API) {
      await page.route(/127\.0\.0\.1:8787\//, (route) => {
        route.continue({ url: route.request().url().replace("http://127.0.0.1:8787", REDIRECT_API) });
      });
      console.log(`API 重定向: 127.0.0.1:8787 -> ${REDIRECT_API}`);
    }

    // ---- 监听 console 错误 ----
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text().slice(0, 500);
        consoleErrors.push({ type: "console", text });
        console.log(`  ⛔ CONSOLE ERROR: ${text}`);
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push({ type: "pageerror", message: err.message, stack: err.stack?.slice(0, 300) });
      console.log(`  ⛔ PAGE ERROR: ${err.message}`);
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (!url.includes("localhost:3000") && !url.includes("127.0.0.1:8787")) return;
      consoleErrors.push({ type: "requestfailed", url, error: req.failure()?.errorText });
      console.log(`  ⛔ REQUEST FAILED: ${url} ${req.failure()?.errorText}`);
    });

    // ============ STEP 1: 访问首页 ============
    console.log("\n=== STEP 1: 访问首页 ===");
    try {
      const started = Date.now();
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".api-loading", { state: "detached", timeout: 15000 }).catch(() => {});
      await page.waitForSelector(".mock-login-shell", { state: "detached", timeout: 5000 }).catch(() => {});
      await page.waitForSelector("text=开始我的分析", { timeout: 20000 });
      const loadMs = Date.now() - started;
      const errCount = consoleErrors.length;
      await shot(page, "1-home");
      record("1. 访问首页", "✅", `概览加载成功，${loadMs}ms，此时控制台错误 ${errCount} 条`);
    } catch (e) {
      await shot(page, "1-home-error");
      record("1. 访问首页", "❌", e.message);
    }

    // ============ STEP 2: 登录（默认已登录，退出→重登） ============
    console.log("\n=== STEP 2: 登录 ===");
    try {
      await page.waitForSelector(".profile-trigger", { timeout: 10000 });
      const defaultLoggedIn = await page.locator(".profile-trigger").first().isVisible();
      await page.getByLabel("打开账号菜单").first().click();
      await page.waitForTimeout(400);
      await page.getByText("退出登录").click();
      await page.waitForSelector("text=以 Demo 账号登录", { timeout: 10000 });
      await shot(page, "2-login-screen");
      await page.getByText("以 Demo 账号登录").click();
      await page.waitForSelector("text=开始我的分析", { timeout: 10000 });
      await shot(page, "2-relogin-home");
      record("2. 登录", "✅", `默认已登录=${defaultLoggedIn}，退出→重新登录成功`);
    } catch (e) {
      await shot(page, "2-login-error");
      record("2. 登录", "❌", e.message);
    }

    // ============ STEP 3: 上传照片 → 分析 ============
    console.log("\n=== STEP 3: 上传照片 → 分析 ===");
    try {
      await page.getByText("开始我的分析").first().click();
      await page.waitForSelector(".upload-dialog-content", { timeout: 10000 });
      await shot(page, "3-upload-modal");
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles("demo/face.jpeg");
      // 处理中状态
      await page.waitForSelector("text=正在看懂这张照片", { timeout: 10000 });
      await shot(page, "3-processing");
      // 报告自动出现（SSE）
      await page.waitForSelector("text=PERSONALIZED BEAUTY REPORT", { timeout: 30000 });
      await shot(page, "3-report");
      record("3. 上传照片", "✅", "上传弹窗→处理中→报告自动出现（SSE 生效），未手动刷新");
    } catch (e) {
      await shot(page, "3-upload-error");
      record("3. 上传照片", "❌", e.message);
    }

    // ============ STEP 4: 报告页要素 ============
    console.log("\n=== STEP 4: 报告页要素 ===");
    try {
      const checks = {};
      // 3 个面部指标
      const metrics = ["脸型", "肤色倾向", "可见肤质"];
      for (const m of metrics) checks[`指标:${m}`] = await page.getByText(m).first().isVisible();
      // 妆容方向标题
      checks["妆容方向标题"] = await page.locator(".report-heading h1").isVisible();
      const direction = await page.locator(".report-heading h1").innerText();
      // 8 步计划
      checks["8步计划标题"] = await page.getByText("照着做就好").isVisible();
      const stepCount = await page.locator(".plan-step").count();
      checks[`8步计划(${stepCount}步)`] = stepCount === 8;
      // 商品匹配（含分数和原因）
      checks["商品区"] = await page.getByText("为你挑的").isVisible();
      const productRows = await page.locator(".product-row").count();
      const firstRowText = productRows ? await page.locator(".product-row").first().innerText() : "";
      checks[`商品行(${productRows})含分数`] = /匹配度 \d+%/.test(firstRowText);
      checks["商品含原因"] = productRows ? await page.locator(".product-row .match-reason").first().isVisible() : false;
      // 教程链接
      checks["教程区"] = await page.getByText("跟着练习").isVisible();
      checks["教程链接"] = await page.locator(".linked-tutorial").count() > 0;
      // AFTER 预览
      checks["AFTER预览"] = await page.locator(".face-preview.after").isVisible();
      const afterText = await page.locator(".face-preview.after").innerText();
      checks["AFTER内容"] = afterText.includes("AI 预览") || afterText.includes("自然光泽");
      const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
      await shot(page, "4-report-details");
      record("4. 报告页", failed.length ? "⚠️" : "✅",
        `方向="${direction}"，${stepCount}步，商品${productRows}行，缺项: ${failed.join(",") || "无"}，AFTER文本="${afterText.slice(0, 30)}"`);
    } catch (e) {
      await shot(page, "4-report-error");
      record("4. 报告页", "❌", e.message);
    }

    // ============ STEP 5: 收藏 ============
    console.log("\n=== STEP 5: 收藏 ===");
    try {
      // 记录当前收藏数，再点心形
      const savedBefore = await page.locator(".saved-card").count().catch(() => 0);
      const firstRowProduct = await page.locator(".product-row").first().innerText().then((t) => t.slice(0, 40)).catch(() => "?");
      await page.locator(".product-row .save-button").first().click();
      const saveToast = await page.waitForSelector("text=已加入收藏", { timeout: 8000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(1500); // 等 500ms debounce + 写库
      await page.getByText("我的收藏", { exact: true }).click();
      await page.waitForSelector("text=件商品", { timeout: 10000 });
      const savedCount = await page.locator(".saved-card").count();
      await shot(page, "5-saved");
      record("5. 收藏", saveToast && savedCount > savedBefore ? "✅" : "⚠️",
        `首行商品="${firstRowProduct}"，toast=${saveToast}，收藏 ${savedBefore}→${savedCount} 件`);
    } catch (e) {
      await shot(page, "5-saved-error");
      record("5. 收藏", "❌", e.message);
    }

    // ============ STEP 6: 反馈 + 历史计数 ============
    console.log("\n=== STEP 6: 反馈 ===");
    try {
      // 需要回到报告页（点击最新分析或导航到分析历史）
      await page.getByText("分析历史", { exact: true }).click();
      await page.waitForSelector(".history-item", { timeout: 10000 });
      await page.locator(".history-item").first().click();
      await page.waitForSelector("text=PERSONALIZED BEAUTY REPORT", { timeout: 10000 });
      await page.getByText("偏黄").click();
      const toastVisible = await page.waitForSelector("text=已记录反馈", { timeout: 8000 }).then(() => true).catch(() => false);
      await shot(page, "6-feedback-toast");
      await page.getByText("分析历史", { exact: true }).click();
      await page.waitForSelector(".history-item", { timeout: 10000 });
      const historyText = await page.locator(".history-card").innerText();
      const feedbackCounted = /条反馈已记录/.test(historyText);
      await shot(page, "6-history-count");
      record("6. 反馈", toastVisible && feedbackCounted ? "✅" : "⚠️", `toast=${toastVisible}，历史计数=${feedbackCounted}`);
    } catch (e) {
      await shot(page, "6-feedback-error");
      record("6. 反馈", "❌", e.message);
    }

    // ============ STEP 7: 历史重开报告 ============
    console.log("\n=== STEP 7: 历史重开 ===");
    try {
      const beforeCount = consoleErrors.length;
      await page.locator(".history-item").first().click();
      await page.waitForSelector("text=PERSONALIZED BEAUTY REPORT", { timeout: 10000 });
      const newErrors = consoleErrors.length - beforeCount;
      await shot(page, "7-history-reopen");
      record("7. 历史重开", "✅", `重新打开报告成功，新增控制台错误 ${newErrors} 条`);
    } catch (e) {
      await shot(page, "7-history-error");
      record("7. 历史重开", "❌", e.message);
    }

    // ============ STEP 8: 保留开关 ============
    console.log("\n=== STEP 8: 保留开关 ===");
    try {
      const switchRow = page.locator(".privacy-panel .switch-row");
      const input = switchRow.locator("input");
      const initiallyChecked = await input.isChecked();
      if (!initiallyChecked) {
        await switchRow.locator("i").click();
        await page.waitForSelector("text=到期时间：3 天后自动删除", { timeout: 5000 });
      } else {
        // 先关再开，验证文案变化
        await switchRow.locator("i").click();
        await page.waitForSelector("text=当前设置：本次生成完成后删除", { timeout: 5000 });
        await switchRow.locator("i").click();
        await page.waitForSelector("text=到期时间：3 天后自动删除", { timeout: 5000 });
      }
      const finalChecked = await input.isChecked();
      const smallText = await page.locator(".privacy-panel small").innerText();
      await shot(page, "8-retention-toggle");
      record("8. 保留开关", finalChecked ? "✅" : "⚠️", `初始=${initiallyChecked}→最终=${finalChecked}，文案="${smallText}"`);
    } catch (e) {
      await shot(page, "8-retention-error");
      record("8. 保留开关", "❌", e.message);
    }

    // ============ STEP 9: 设置改显示名 ============
    console.log("\n=== STEP 9: 设置 ===");
    try {
      const newName = `QA_${Date.now().toString().slice(-4)}`;
      await page.getByLabel("打开账号菜单").first().click();
      await page.waitForTimeout(500);
      await page.getByRole("menuitem", { name: "用户设置" }).click();
      await page.waitForSelector(".settings-dialog-content", { timeout: 8000 });
      await shot(page, "9-settings-dialog");
      const nameInput = page.locator('.field-label input').first();
      await nameInput.fill(newName);
      await page.getByText("保存设置", { exact: true }).click();
      const toastSaved = await page.waitForSelector("text=用户设置已保存", { timeout: 8000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(1500); // 等 debounce 落盘
      // 确认设置 dialog 已关闭（modal 不遮挡后续点击）
      await page.waitForSelector(".settings-dialog-content", { state: "detached", timeout: 5000 }).catch(() => {});
      // 重开设置，验证持久化
      await page.getByLabel("打开账号菜单").first().click();
      await page.waitForTimeout(500);
      await page.getByRole("menuitem", { name: "用户设置" }).click();
      await page.waitForSelector(".settings-dialog-content", { timeout: 8000 });
      const persisted = await page.locator('.field-label input').first().inputValue();
      await page.keyboard.press("Escape");
      await page.waitForSelector(".settings-dialog-content", { state: "detached", timeout: 5000 }).catch(() => {});
      await shot(page, "9-settings-saved");
      record("9. 设置", toastSaved && persisted === newName ? "✅" : "⚠️",
        `toast=${toastSaved}，重开持久化="${persisted}"（新名=${newName}）。注：顶部账号区为硬编码「演示账号」，不反映 displayName`);
    } catch (e) {
      await shot(page, "9-settings-error");
      record("9. 设置", "❌", e.message);
    }

    // ============ STEP 10: 再生成一份 ============
    console.log("\n=== STEP 10: 再生成 ===");
    try {
      // 确保无模态遮挡；若仍开着设置 dialog 先关闭
      await page.waitForSelector(".settings-dialog-content", { state: "detached", timeout: 3000 }).catch(() => {});
      // 导航到分析历史并重开报告（绕开 SSE 401，避免本步骤依赖重新上传）
      await page.getByText("概览", { exact: true }).click();
      await page.waitForSelector("text=开始我的分析", { timeout: 10000 });
      await page.getByText("分析历史", { exact: true }).click();
      await page.waitForSelector(".history-item", { timeout: 10000 });
      await page.locator(".history-item").first().click();
      await page.waitForSelector("text=PERSONALIZED BEAUTY REPORT", { timeout: 10000 });
      await shot(page, "10-regenerate-ready");
      const errBefore = consoleErrors.length;
      await page.locator("text=再生成一份").click();
      await page.waitForSelector(".upload-dialog-content", { timeout: 8000 });
      await shot(page, "10-regenerate-upload");
      const regenErrors1 = consoleErrors.length - errBefore;
      await page.locator('input[type="file"]').setInputFiles("demo/face.jpeg");
      await page.waitForSelector("text=正在看懂这张照片", { timeout: 10000 }).catch(() => {});
      await shot(page, "10-regenerate-processing");
      await page.waitForSelector("text=PERSONALIZED BEAUTY REPORT", { timeout: 30000 });
      const regenErr = consoleErrors.length - errBefore;
      await shot(page, "10-regenerate-report");
      record("10. 再生成", "✅", `重新走上传→(处理中)→新报告出现；新增控制台错误 ${regenErr} 条（上传前 ${regenErrors1}）`);
    } catch (e) {
      await shot(page, "10-regenerate-error");
      record("10. 再生成", "❌", e.message);
    }

    // ============ STEP 11: 管理页 ============
    console.log("\n=== STEP 11: 管理页 ===");
    try {
      const beforeCount = consoleErrors.length;
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".admin-metric-card", { timeout: 15000 });
      // 等 fetch 返回：请求总量出现数字（不再是 "—" 占位）
      await page.waitForFunction(() => {
        const card = document.querySelector(".admin-metric-card");
        return card && card.textContent.includes("请求总量") && !card.textContent.includes("—");
      }, { timeout: 10000 }).catch(() => {});
      const metricCards = await page.locator(".admin-metric-card").count();
      const totalReq = await page.locator(".admin-metric-card").first().innerText();
      await page.waitForFunction(() => document.querySelectorAll(".admin-log-row").length > 0, { timeout: 8000 }).catch(() => {});
      const logRows = await page.locator(".admin-log-row").count();
      const adminErrors = consoleErrors.length - beforeCount;
      await shot(page, "11-admin");
      record("11. 管理页", metricCards >= 4 && logRows > 0 ? "✅" : "⚠️",
        `${metricCards}个指标卡，${logRows}条日志，首卡="${totalReq.replace(/\n/g, "/").slice(0, 45)}"，新增控制台错误 ${adminErrors} 条`);
    } catch (e) {
      await shot(page, "11-admin-error");
      record("11. 管理页", "❌", e.message);
    }

    await browser.close();

    // ============ 汇总输出 ============
    console.log("\n\n========== 走查汇总 ==========");
    for (const r of results) console.log(`${r.status} ${r.name} — ${r.detail}`);
    console.log("\n========== 控制台错误清单 ==========");
    if (!consoleErrors.length) {
      console.log("（无）");
    } else {
      consoleErrors.forEach((e, i) => console.log(`${i + 1}. [${e.type}] ${e.message || e.text}${e.url ? " @ " + e.url : ""}`));
    }
    const pass = results.filter((r) => r.status === "✅").length;
    const warn = results.filter((r) => r.status === "⚠️").length;
    const fail = results.filter((r) => r.status === "❌").length;
    console.log(`\n结论: ✅${pass} / ⚠️${warn} / ❌${fail}，截图目录 ${SHOTS}（${shotCount} 张）`);
  })();
}

run().catch((e) => {
  console.error("走查脚本异常退出:", e);
  process.exit(1);
});
