export type MockUser = {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
};

export type PhotoAsset = {
  id: string;
  analysisId: string;
  name: string;
  mimeType: string;
  size: number;
  retention: "immediate" | "3d";
  expiresAt: string;
  createdAt: string;
  deletedAt: string | null;
};

export type AnalysisRecord = {
  id: string;
  userId: string;
  title: string;
  detail: string;
  createdAt: string;
  photoAssetId: string;
  analysisJobId?: string;
  provider?: string | null;
  previewImageUrl?: string | null;
  imageProvider?: string | null;
  imageModel?: string | null;
  previewDisclosure?: string | null;
  context?: { skinProfile: string; region: string; occasion: string };
  status: "complete";
  result: {
    faceShape: string;
    undertone: string;
    skinCondition: string;
    direction: string;
    confidence: number;
    caveats?: string[];
    colorProfile?: { season: string; palette: string[]; bestColors: string[]; avoidColors: string[] };
    skinObservation?: { summary: string; areas: string[]; caveat: string };
    styleMatches?: Array<{ id: string; name: string; score: number; why: string; colors: string[] }>;
    makeupPlan?: Array<{ id: string; order: number; area: string; title: string; action: string; amount: string; texture: string; avoid: string; productCategoryIds: string[]; tutorialIds: string[] }>;
    previewPrompt?: { prompt: string; negativePrompt: string; preserveIdentity: boolean; disclosure: string };
  };
};

export type RecommendationFeedback = {
  id: string;
  userId: string;
  analysisId: string;
  productId: number | null;
  kind: "too-yellow" | "too-deep" | "too-dry" | "too-oily" | "not-for-me" | "broken-link" | "other";
  note: string;
  createdAt: string;
};

export type UserSettings = {
  displayName: string;
  email: string;
  region: "中国大陆" | "美国/海外";
  language: "zh-CN" | "en-US" | "中文" | "English";
  skinProfile: "未设置" | "干皮" | "油皮" | "混合皮" | "中性皮肤";
  undertone: "未设置" | "冷调" | "中性" | "暖调";
  savePhotosForThreeDays: boolean;
  personalizedTutorials: boolean;
};

export type LocalDb = {
  version: 1;
  revision: number;
  authenticated: boolean;
  user: MockUser;
  savedProductIds: number[];
  analyses: AnalysisRecord[];
  photos: PhotoAsset[];
  feedback: RecommendationFeedback[];
  settings: UserSettings;
};

export const demoUser: MockUser = {
  id: "mock-user-yuki",
  displayName: "Yuki",
  email: "yuki@local.veylumi",
  createdAt: "2026-06-16T09:00:00.000Z",
};

export const defaultSettings: UserSettings = {
  displayName: demoUser.displayName,
  email: demoUser.email,
  region: "中国大陆",
  language: "zh-CN",
  skinProfile: "未设置",
  undertone: "未设置",
  savePhotosForThreeDays: false,
  personalizedTutorials: true,
};

export function emptyDb(): LocalDb {
  return { version: 1, revision: 0, authenticated: true, user: demoUser, savedProductIds: [], analyses: [], photos: [], feedback: [], settings: defaultSettings };
}

export function purgeExpiredPhotos(db: LocalDb, now = Date.now()): LocalDb {
  const photos = db.photos.map((photo) => {
    if (photo.deletedAt) return photo;
    if (new Date(photo.expiresAt).getTime() <= now) return { ...photo, deletedAt: new Date(now).toISOString() };
    return photo;
  });
  return { ...db, photos };
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function formatLocalDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
