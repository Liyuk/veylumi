import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import zhCN from "../packages/i18n/locales/zh-CN.json" with { type: "json" };
import enUS from "../packages/i18n/locales/en-US.json" with { type: "json" };

test("all supported locales expose the same translation keys", () => {
  assert.deepEqual(Object.keys(enUS).sort(), Object.keys(zhCN).sort());
  for (const key of Object.keys(zhCN)) {
    assert.notEqual(zhCN[key], "", `Chinese translation is empty: ${key}`);
    assert.notEqual(enUS[key], "", `English translation is empty: ${key}`);
  }
});

test("translation resources use semantic keys instead of source-language sentences", () => {
  for (const key of Object.keys(zhCN)) {
    assert.match(key, /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/);
  }
});

test("user-facing components call translations with semantic keys", async () => {
  const source = await Promise.all([
    readFile(new URL("../apps/web/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/components/beauty.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/components/ui.tsx", import.meta.url), "utf8"),
  ]);
  const keys = [...source.join("\n").matchAll(/\bt\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.match(key, /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/, `non-semantic translation key: ${key}`);
    assert.ok(Object.hasOwn(zhCN, key), `missing zh-CN translation: ${key}`);
    assert.ok(Object.hasOwn(enUS, key), `missing en-US translation: ${key}`);
  }
});

test("generated native resources preserve every shared translation key", async () => {
  const android = await readFile(new URL("../apps/android/app/src/main/res/values/strings.xml", import.meta.url), "utf8");
  const ios = await readFile(new URL("../apps/ios/Veylumi/Resources/zh-Hans.lproj/Localizable.strings", import.meta.url), "utf8");
  for (const key of Object.keys(zhCN)) {
    assert.match(android, new RegExp(`name=\\"${key.replace(".", "_")}\\"`));
    assert.match(ios, new RegExp(`\\"${key}\\"`));
  }
});

test("design tokens generate Web, Android, and iOS platform resources", async () => {
  const [web, android, ios] = await Promise.all([
    readFile(new URL("../apps/web/app/generated-tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../apps/android/app/src/main/java/com/veylumi/DesignTokens.kt", import.meta.url), "utf8"),
    readFile(new URL("../apps/ios/Veylumi/DesignTokens.swift", import.meta.url), "utf8"),
  ]);
  assert.match(web, /--veylumi-ink: #24211f/);
  assert.match(android, /val Ink = Color\(0xFF24211F\)/);
  assert.match(ios, /static let ink = Color\(hex: 0xFF24211F\)/);
});

test("client contract generates one upload and polling policy for every platform", async () => {
  const [web, android, ios] = await Promise.all([
    readFile(new URL("../packages/client-contract/generated.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/android/app/src/main/java/com/veylumi/PlatformContract.kt", import.meta.url), "utf8"),
    readFile(new URL("../apps/ios/Veylumi/PlatformContract.swift", import.meta.url), "utf8"),
  ]);
  assert.match(web, /"maxBytes": 10485760/);
  assert.match(android, /maxUploadBytes = 10485760/);
  assert.match(ios, /maxUploadBytes = 10485760/);
});

test("cross-platform UI specification only references semantic design tokens", async () => {
  const spec = JSON.parse(await readFile(new URL("../packages/ui-spec/components.json", import.meta.url), "utf8"));
  assert.equal(spec.components.card.radiusToken, "radius.card");
  assert.equal(spec.components.primaryAction.minimumTouchTarget, 44);
  assert.equal(spec.accessibility.focusToken, "color.focusRing");
});

test("shared API contract defines named state operations and a complete state envelope", async () => {
  const [openapi, types] = await Promise.all([
    readFile(new URL("../packages/api-contract/openapi.yaml", import.meta.url), "utf8"),
    readFile(new URL("../packages/api-contract/generated/types.ts", import.meta.url), "utf8"),
  ]);
  assert.match(openapi, /patch:\n      summary: Apply one named user-state operation/);
  assert.match(openapi, /StateSnapshot:/);
  assert.match(types, /operation: "toggleSavedProduct"/);
  assert.match(types, /export type StateSnapshot/);
});

test("recommendation base weights are generated for Web, Android, and iOS", async () => {
  const [web, android, ios] = await Promise.all([
    readFile(new URL("../packages/recommendation-contract/generated.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/android/app/src/main/java/com/veylumi/RecommendationRules.kt", import.meta.url), "utf8"),
    readFile(new URL("../apps/ios/Veylumi/RecommendationRules.swift", import.meta.url), "utf8"),
  ]);
  assert.match(web, /"undertone": 20/);
  assert.match(android, /undertone = 20/);
  assert.match(ios, /undertone = 20/);
});
