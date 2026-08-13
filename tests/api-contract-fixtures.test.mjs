import test from "node:test";
import assert from "node:assert/strict";
import bootstrap from "../packages/api-contract/fixtures/bootstrap.json" with { type: "json" };
import state from "../packages/api-contract/fixtures/state.json" with { type: "json" };
import job from "../packages/api-contract/fixtures/analysis-job.json" with { type: "json" };
import conflict from "../packages/api-contract/fixtures/error-conflict.json" with { type: "json" };

test("cross-platform API fixtures retain stable success and error envelopes", () => {
  for (const fixture of [bootstrap, state, job]) { assert.equal(fixture.ok, true); assert.ok(fixture.data); assert.match(fixture.meta.requestId, /^fixture-/); }
  assert.equal(state.data.version, 1);
  assert.equal(typeof state.data.revision, "number");
  assert.equal(job.data.status, "completed");
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error.code, "API_CONFLICT");
});
