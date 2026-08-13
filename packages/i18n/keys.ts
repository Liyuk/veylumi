import zhCN from "./locales/zh-CN.json";

export const translationKeys = Object.keys(zhCN) as readonly string[];
export type TranslationKey = (typeof translationKeys)[number];
export type SupportedLocale = "zh-CN" | "en-US";
