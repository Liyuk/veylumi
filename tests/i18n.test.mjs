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
