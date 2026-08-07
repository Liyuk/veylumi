import { rm } from "node:fs/promises";

// 每次 e2e 运行前清空本地数据文件，保证测试从干净状态开始、可重复执行。
export default async function globalSetup() {
  for (const file of [".data/e2e-veylumi.json", ".data/e2e-jobs.json", ".data/e2e-logs.jsonl"]) {
    await rm(file, { force: true }).catch(() => undefined);
  }
}
