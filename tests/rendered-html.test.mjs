import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../apps/web/dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Veylumi application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Veylumi — Personal Beauty Intelligence<\/title>/i);
  assert.match(html, /class="api-loading"/);
  assert.match(html, /正在连接 Veylumi Server API/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|sites-skeleton/);
});

test("keeps the V1 component boundaries explicit", async () => {
  const [page, ui, beauty, data] = await Promise.all([
    readFile(new URL("../apps/web/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/components/ui.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/components/beauty.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/catalog-data.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /from "\.\/components\/ui"/);
  assert.match(page, /from "\.\/components\/beauty"/);
  assert.doesNotMatch(page, /function Analyze\(|function Library\(/);
  assert.match(ui, /export function ProductLikeButton/);
  assert.match(ui, /export function Metric/);
  assert.match(beauty, /export function CatalogCard/);
  assert.match(beauty, /export function CatalogFilters/);
  assert.match(data, /export const products/);
  assert.match(data, /export const tutorials/);
});

test("starts a fresh analysis from the history page", async () => {
  const page = await readFile(new URL("../apps/web/app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function HistoryPage\(\{ records, feedback, onOpen, onNewAnalysis \}/);
  assert.match(page, /<Button className="primary-button" onClick=\{onNewAnalysis\}>\{t\("history.new"\)\}/);
  assert.match(page, /<HistoryPage records=\{analyses\} feedback=\{feedback\} onOpen=\{onOpenAnalysis\} onNewAnalysis=\{onStart\}/);
});
