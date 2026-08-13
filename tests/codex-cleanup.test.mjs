import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Codex analysis cleans its temporary input directory after completion or failure", () => {
  const source = fs.readFileSync("services/api/server/codex-provider.mjs", "utf8");
  assert.match(source, /finally/);
  assert.match(source, /rm\(tempDir, \{ recursive: true, force: true \}\)/);
});
