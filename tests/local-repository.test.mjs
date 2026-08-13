import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createJsonRepository } from "../services/api/server/local-repository.mjs";

test("json repository appends and reloads state through its storage boundary", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-repo-"));
  try {
    const file = path.join(dir, "state.json");
    const repository = createJsonRepository(file);
    await repository.append("analyses", { id: "analysis_test", status: "complete" });
    const state = await createJsonRepository(file).snapshot();
    assert.equal(state.analyses[0].id, "analysis_test");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("json repository writes atomically and does not hide corrupt data", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "veylumi-repository-corrupt-"));
  const filePath = path.join(directory, "state.json");
  await writeFile(filePath, "not-json", "utf8");
  const repository = createJsonRepository(filePath);
  await assert.rejects(() => repository.snapshot(), /损坏/);
  await rm(directory, { recursive: true, force: true });
});
