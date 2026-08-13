import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../services/recommendation/server/recommendation-server.mjs";
import { rankCandidates } from "../packages/recommendation-contract/engine.mjs";
import { createRecommendationGateway } from "../services/api/server/recommendation-gateway.mjs";

const products = [
  { id: 1, categoryId: "blush", undertone: "warm", skinTags: ["dry"], region: "欧美", finish: "glow", latest: true },
  { id: 2, categoryId: "blush", undertone: "cool", skinTags: ["oily"], region: "欧美", finish: "matte", latest: false },
];

test("recommendation engine filters candidates and supplies an auditable base score", () => {
  const result = rankCandidates({ context: { undertone: "warm", skin: "dry", region: "欧美", categoryId: "blush" }, products, limit: 10 });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].productId, 1);
  assert.equal(result.items[0].score, 99);
  assert.match(result.items[0].reason, /undertone/);
  assert.equal(result.ruleVersion, 1);
  assert.equal(result.fallback, false);
});

test("recommendation service rejects requests without its internal credential", async () => {
  const app = createServer({ internalToken: "internal-test" });
  await app.start(0);
  try {
    const response = await fetch(`http://127.0.0.1:${app.server.address().port}/v1/rank`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ context: {}, products: [] }) });
    assert.equal(response.status, 401);
  } finally { app.server.close(); }
});

test("recommendation service returns a versioned ranking over its internal API", async () => {
  const app = createServer({ internalToken: "internal-test" });
  await app.start(0);
  try {
    const response = await fetch(`http://127.0.0.1:${app.server.address().port}/v1/rank`, { method: "POST", headers: { authorization: "Bearer internal-test", "content-type": "application/json" }, body: JSON.stringify({ context: { undertone: "warm", skin: "dry", region: "欧美", categoryId: "blush" }, products, limit: 2 }) });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.items[0].productId, 1);
    assert.equal(body.data.modelVersion, "rules-v1");
  } finally { app.server.close(); }
});

test("API gateway calls the independent service and serves the cached result", async () => {
  const app = createServer({ internalToken: "internal-test" });
  await app.start(0);
  try {
    const gateway = createRecommendationGateway({ url: `http://127.0.0.1:${app.server.address().port}`, token: "internal-test", timeoutMs: 500 });
    const input = { state: { revision: 7, settings: { undertone: "warm", skinProfile: "dry", region: "欧美" }, savedProductIds: [], feedback: [] }, products, categoryId: "blush", limit: 2 };
    const first = await gateway.rank(input);
    const second = await gateway.rank(input);
    assert.equal(first.fallback, false);
    assert.equal(first.items[0].productId, 1);
    assert.equal(second.cached, true);
  } finally { app.server.close(); }
});
