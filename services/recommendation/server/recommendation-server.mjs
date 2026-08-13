import { createServer as createHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { rankCandidates } from "../../../packages/recommendation-contract/engine.mjs";

function envelope(data, requestId) { return { ok: true, data, meta: { requestId } }; }
function error(status, code, message, requestId) { return { status, body: { ok: false, error: { code, message }, meta: { requestId } } }; }

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) { bytes += chunk.length; if (bytes > 1_000_000) throw new Error("payload too large"); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { throw new Error("invalid json"); }
}

function validRankRequest(value) {
  return value && typeof value === "object" && value.context && typeof value.context === "object" && Array.isArray(value.products) && value.products.length <= 500;
}

export function createServer({ internalToken = process.env.VEYLUMI_RECOMMENDATION_TOKEN ?? "", modelVersion = "rules-v1" } = {}) {
  const server = createHttpServer(async (request, response) => {
    const requestId = randomUUID();
    const send = (status, body) => { response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-request-id": requestId }); response.end(JSON.stringify(body)); };
    if (request.url === "/health" && request.method === "GET") return send(200, envelope({ service: "veylumi-recommendation", status: "ok", modelVersion }, requestId));
    if (request.url !== "/v1/rank" || request.method !== "POST") return send(404, error(404, "RECOMMENDATION_NOT_FOUND", "Route not found", requestId).body);
    if (!internalToken || request.headers.authorization !== `Bearer ${internalToken}`) return send(401, error(401, "RECOMMENDATION_UNAUTHORIZED", "Internal credential required", requestId).body);
    try {
      const input = await readJson(request);
      if (!validRankRequest(input)) return send(400, error(400, "RECOMMENDATION_VALIDATION_ERROR", "Invalid ranking request", requestId).body);
      return send(200, envelope(rankCandidates(input), requestId));
    } catch (cause) {
      return send(400, error(400, "RECOMMENDATION_INVALID_JSON", cause instanceof Error ? cause.message : "Invalid request", requestId).body);
    }
  });
  return { server, start: (port = Number(process.env.VEYLUMI_RECOMMENDATION_PORT ?? 8790)) => new Promise((resolve) => server.listen(port, "127.0.0.1", resolve)) };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const app = createServer();
  void app.start().then(() => console.log("Veylumi recommendation service listening"));
}
