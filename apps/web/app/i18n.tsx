"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { UserSettings } from "./local-db";
import zhCN from "../../../packages/i18n/locales/zh-CN.json";
import enUS from "../../../packages/i18n/locales/en-US.json";

export const supportedLocales = ["zh-CN", "en-US"] as const;
export type Locale = (typeof supportedLocales)[number];
type Messages = typeof zhCN;
type I18nContextValue = { locale: Locale; t: (key: string) => string; setLocale: (locale: Locale) => void };
const resources: Record<Locale, Messages> = { "zh-CN": zhCN, "en-US": enUS };
const I18nContext = createContext<I18nContextValue>({ locale: "zh-CN", t: (key) => zhCN[key as keyof Messages] ?? key, setLocale: () => undefined });

export function translate(locale: Locale, key: string): string {
  const resolvedKey = key as keyof Messages;
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
