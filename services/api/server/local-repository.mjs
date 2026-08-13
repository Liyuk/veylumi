import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const demoUser = { id: "mock-user-yuki", displayName: "Yuki", email: "yuki@local.veylumi", createdAt: "2026-06-16T09:00:00.000Z" };
const defaultSettings = { displayName: "Yuki", email: "yuki@local.veylumi", region: "中国大陆", language: "中文", skinProfile: "未设置", undertone: "未设置", savePhotosForThreeDays: false, personalizedTutorials: true };

// 结构修复只补中性默认值，绝不把 demo fixture 注入真实用户数据。
function structuralDefaults() {
  return {
    version: 1,
    authenticated: true,
    user: demoUser,
    savedProductIds: [],
    analyses: [],
    photos: [],
    feedback: [],
    settings: defaultSettings,
  };
}

function emptyState() {
  return { ...structuralDefaults(), revision: 0 };
}

// 修复缺失字段的类型/结构；对已存在字段保留原值，不覆盖。
export function normalizeState(value = {}) {
  const defaults = structuralDefaults();
  const state = { ...defaults, ...value };
  return {
    version: 1,
    revision: Number.isFinite(Number(state.revision)) ? Number(state.revision) : 0,
    authenticated: state.authenticated !== false,
    user: { ...defaults.user, ...(state.user ?? {}) },
    savedProductIds: Array.isArray(state.savedProductIds) ? state.savedProductIds : [],
    analyses: Array.isArray(state.analyses) ? state.analyses : [],
    photos: Array.isArray(state.photos) ? state.photos : [],
    feedback: Array.isArray(state.feedback) ? state.feedback : [],
    settings: { ...defaults.settings, ...(state.settings ?? {}) },
  };
}

export class ConflictError extends Error {
  constructor(message = "数据已被其他写入更新，请刷新后重试") {
    super(message);
    this.name = "ConflictError";
    this.code = "API_CONFLICT";
  }
}

export function createJsonRepository(filePath = path.resolve(".data/veylumi.json")) {
  let queue = Promise.resolve();

  async function read() {
    try { return normalizeState(JSON.parse(await readFile(filePath, "utf8"))); }
    catch (error) { if (error?.code === "ENOENT") return emptyState(); throw new Error("本地数据文件损坏或无法读取"); }
  }

  async function write(state) {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(state, null, 2), "utf8");
    await rename(temporaryPath, filePath);
    return state;
  }

  function transaction(mutator) {
    queue = queue.catch(() => undefined).then(mutator).catch((error) => { console.error("[local-repository] 写入失败", error); throw error; });
    return queue;
  }

  return {
    async snapshot() { return read(); },
    async replace(state, { expectedRevision, skipConflict = false } = {}) {
      return transaction(async () => {
        const current = await read();
        if (!skipConflict && expectedRevision !== undefined && Number(current.revision) !== Number(expectedRevision)) {
          throw new ConflictError("数据已被其他写入更新，请刷新后重试");
        }
        const next = { ...normalizeState(state), revision: Number(current.revision) + 1 };
        return write(next);
      });
    },
    async update(mutator, { expectedRevision } = {}) {
      return transaction(async () => {
        const current = await read();
        if (expectedRevision !== undefined && Number(current.revision) !== Number(expectedRevision)) throw new ConflictError();
        const next = { ...normalizeState(mutator(current)), revision: Number(current.revision) + 1 };
        return write(next);
      });
    },
    async append(collection, value) {
      return transaction(async () => {
        const current = await read();
        const next = { ...current, revision: Number(current.revision) + 1, [collection]: [...(current[collection] ?? []), value] };
        return write(next);
      });
    },
  };
}
