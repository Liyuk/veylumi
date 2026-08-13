import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

test("analysis polling has a client-side deadline instead of waiting forever", () => {
  const source = fs.readFileSync(fileURLToPath(new URL("../services/api/server/wait-analysis.mjs", import.meta.url)), "utf8");
  assert.match(source, /async function poll/);
  const deadline = source.indexOf("pollDeadlineMs");
  const timeoutStatus = source.indexOf('status: "failed"');
  assert.ok(deadline >= 0, "polling should define a deadline");
  assert.ok(timeoutStatus > 0, "polling should return a terminal failure at the deadline");
});
