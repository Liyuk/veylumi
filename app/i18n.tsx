"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { UserSettings } from "./local-db";
import zhCN from "../messages/zh-CN.json";
import enUS from "../messages/en-US.json";

export const supportedLocales = ["zh-CN", "en-US"] as const;
export type Locale = (typeof supportedLocales)[number];
type Messages = typeof zhCN;
type I18nContextValue = { locale: Locale; t: (key: string) => string; setLocale: (locale: Locale) => void };
const resources: Record<Locale, Messages> = { "zh-CN": zhCN, "en-US": enUS };
const legacyKeyAliases: Record<string, keyof Messages> = {
  "概览": "navigation.overview", "开始分析": "navigation.analyze", "商品与教程": "navigation.library", "分析历史": "navigation.history", "我的收藏": "navigation.saved", "主导航": "navigation.main",
  "照片由你控制": "privacy.photoControl", "默认不保存，可选择保留 3 天。": "privacy.defaultRetention", "账户": "account.account", "用户设置": "account.settings", "隐私与数据": "account.privacy", "退出登录": "account.signOut", "打开账号菜单": "account.openMenu", "已登录 · Demo mode": "account.signedInDemo",
  "Profile ready": "overview.profileReady", "早上好，": "overview.goodMorning", "今天想从哪一种状态开始？": "overview.todayPrompt", "开始于看懂你的脸。": "overview.understandYourFace", "开始我的分析": "overview.startAnalysis", "探索商品与教程": "overview.explore", "从一次分析开始": "overview.startWithOne", "查看历史": "overview.viewHistory", "分析后生成": "overview.generatedAfterAnalysis", "待分析": "overview.notAnalyzed", "全部记录": "overview.allRecords",
  "正在看懂这张照片。": "analysis.understandingPhoto", "分析任务进行中": "analysis.inProgress", "这一步可能需要几十秒，因为分析和图像预览是异步完成的。": "analysis.asyncDescription", "状态：分析任务进行中": "analysis.status", "先让我们看见你。": "analysis.letUsSeeYou", "一张自然光下的单人正脸照片，就能开始你的个人美妆分析。": "analysis.frontPhotoIntro", "上传一张正脸照片": "analysis.uploadFrontPhoto", "只支持人类照片、单人、正面视角。我们会先检查图片质量和人脸数量。": "analysis.photoRules", "选择照片": "analysis.choosePhoto", "建议无遮挡、自然光": "analysis.photoTip", "本地 Demo": "analysis.localDemo", "一张好的照片，能让建议更可靠。": "analysis.goodPhoto", "单人正脸": "analysis.singleFace", "检测到多人脸会直接停止分析。": "analysis.multipleFaces", "自然光线": "analysis.naturalLight", "避免强烈滤镜、逆光和过度美颜。": "analysis.avoidFilters", "你的隐私": "analysis.yourPrivacy", "本地默认标记为立即删除，可选择保留 3 天。": "analysis.defaultDelete", "保存照片 3 天": "analysis.savePhotos", "保留 3 天": "analysis.keepThreeDays", "再生成一份": "analysis.generateAgain", "推荐需要调整？": "analysis.needAdjustment", "偏黄": "analysis.tooYellow", "偏深": "analysis.tooDeep", "偏干": "analysis.tooDry", "不适合": "analysis.notForMe",
  "个人资料": "settings.profile", "显示名称": "settings.displayName", "邮箱": "settings.email", "所在市场": "settings.market", "语言": "settings.language", "肤质": "settings.skinType", "肤色底调": "settings.undertone", "隐私与内容": "settings.content", "取消": "settings.cancel", "保存设置": "settings.save", "中国大陆": "settings.mainlandChina", "美国/海外": "settings.usOverseas", "未设置": "settings.notSet", "干皮": "settings.dry", "油皮": "settings.oily", "混合皮": "settings.combination", "中性皮肤": "settings.normal", "冷调": "settings.cool", "中性": "settings.neutral", "暖调": "settings.warm", "默认保留照片 3 天": "settings.keepByDefault", "个性化教程": "settings.personalizedTutorials", "关闭": "common.close", "设置通过本地 Server API 保存，用来让分析、商品和教程推荐更贴近你。": "settings.description", "用于历史记录和报告称呼": "settings.profileHint", "推荐偏好": "settings.preference", "可随时修改，不会替代照片观察结果": "settings.preferenceHint", "照片保存策略仍以每次分析页的选择为准": "settings.contentHint", "新分析默认使用 3 天后自动删除；你仍可在报告里单独修改。": "settings.keepByDefaultHint", "根据你的肤质、市场和反馈调整博主教程排序。": "settings.personalizedTutorialsHint"
};
const I18nContext = createContext<I18nContextValue>({ locale: "zh-CN", t: (key) => zhCN[legacyKeyAliases[key] ?? key as keyof Messages] ?? key, setLocale: () => undefined });

export function translate(locale: Locale, key: string): string {
  const resolvedKey = legacyKeyAliases[key] ?? key as keyof Messages;
  return resources[locale][resolvedKey] ?? resources["zh-CN"][resolvedKey] ?? key;
}

export function localeFromLanguage(language: UserSettings["language"]): Locale { return language === "English" || language === "en-US" ? "en-US" : "zh-CN"; }
export function languageFromLocale(locale: Locale): "zh-CN" | "en-US" { return locale; }

export function I18nProvider({ language, children }: { language: UserSettings["language"]; children: ReactNode }) {
  const locale = localeFromLanguage(language);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale: () => undefined, t: (key) => translate(locale, key) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() { return useContext(I18nContext); }
