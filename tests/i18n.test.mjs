import test from "node:test";
import assert from "node:assert/strict";
import zhCN from "../messages/zh-CN.json" with { type: "json" };
import enUS from "../messages/en-US.json" with { type: "json" };

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
