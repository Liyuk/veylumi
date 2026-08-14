"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon, ReloadIcon, ActivityLogIcon, ExclamationTriangleIcon, BarChartIcon } from "@radix-ui/react-icons";
import { I18nProvider, useI18n, type Locale } from "../i18n";

type Metrics = { totalRequests: number; successRequests: number; errorRequests: number; averageDurationMs: number; uptimeSeconds: number; byStatus: Record<string, number>; byCode: Record<string, number>; byRoute: Record<string, number>; lastRequestAt: string | null; recommendation?: { status: string; remoteRequests: number; cachedRequests: number; fallbackRequests: number; averageRemoteDurationMs: number; modelVersion: string | null } | null };
type LogEntry = { timestamp: string; level: string; requestId: string; method: string; route: string; status: number; durationMs: number; errorCode: string | null };
const API_BASE = process.env.NEXT_PUBLIC_VEYLUMI_API_URL ?? "http://127.0.0.1:8787";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_VEYLUMI_ADMIN_TOKEN ?? "local-admin";

async function adminRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: { "x-admin-token": ADMIN_TOKEN }, cache: "no-store" });
  const envelope = await response.json() as { ok: boolean; data?: T; error?: { message: string } };
  if (!response.ok || !envelope.ok) throw new Error(envelope.error?.message ?? `request failed ${response.status}`);
  return envelope.data as T;
}

export default function AdminPage() {
  const [language, setLanguage] = useState<Locale>("zh-CN");
  return <I18nProvider language={language}><AdminDashboard language={language} onLanguageChange={setLanguage} /></I18nProvider>;
}

function AdminDashboard({ language, onLanguageChange }: { language: Locale; onLanguageChange: (language: Locale) => void }) {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { const [nextMetrics, nextLogs] = await Promise.all([adminRequest<Metrics>("/api/admin/metrics"), adminRequest<LogEntry[]>("/api/admin/logs?limit=80")]); setMetrics(nextMetrics); setLogs(nextLogs); } catch (reason) { setError(reason instanceof Error ? reason.message : t("admin.error")); } finally { setLoading(false); } }, [t]);
  useEffect(() => { const initial = window.setTimeout(() => void refresh(), 0); const timer = window.setInterval(() => void refresh(), 15000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [refresh]);
  const errorRate = metrics?.totalRequests ? Math.round(metrics.errorRequests / metrics.totalRequests * 100) : 0;
  return <Theme accentColor="brown" grayColor="sand" radius="medium" scaling="100%"><main className="admin-shell"><header className="admin-header"><div><span className="eyebrow">VEYLUMI OPERATIONS</span><h1>{t("admin.title")}</h1><p>{t("admin.description")}</p></div><div className="admin-header-actions"><button type="button" className="admin-back" onClick={() => { window.location.href = "/"; }}><ArrowLeftIcon /> {t("admin.back")}</button><Button variant="ghost" onClick={() => onLanguageChange(language === "zh-CN" ? "en-US" : "zh-CN")} aria-label={language === "zh-CN" ? "Switch to English" : "切换为中文"}>{language === "zh-CN" ? "EN" : "中文"}</Button><Button variant="outline" onClick={() => void refresh()} disabled={loading}><ReloadIcon /> {loading ? t("admin.refreshing") : t("admin.refresh")}</Button></div></header>{error && <div className="admin-alert"><ExclamationTriangleIcon /><span>{error}</span></div>}<section className="admin-metric-grid"><MetricCard label={t("admin.totalRequests")} value={metrics?.totalRequests ?? "—"} detail={t("admin.sinceStart")} icon={<ActivityLogIcon />} /><MetricCard label={t("admin.errorRate")} value={`${errorRate}%`} detail={`${metrics?.errorRequests ?? 0} ${t("admin.errorRequests")}`} icon={<ExclamationTriangleIcon />} tone={errorRate > 5 ? "danger" : "normal"} /><MetricCard label={t("admin.averageLatency")} value={`${metrics?.averageDurationMs ?? "—"} ms`} detail={t("admin.serverDuration")} icon={<BarChartIcon />} /><MetricCard label="Recommendation" value={metrics?.recommendation?.status ?? "—"} detail={`${metrics?.recommendation?.fallbackRequests ?? 0} fallback · ${metrics?.recommendation?.modelVersion ?? "rules"}`} icon={<ActivityLogIcon />} /></section><section className="admin-grid"><Card className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">ERROR CODES</span><h2>{t("admin.errorCodes")}</h2></div><Badge color={errorRate > 5 ? "red" : "green"} variant="soft">{metrics?.errorRequests ?? 0} errors</Badge></div><div className="admin-bars">{Object.entries(metrics?.byCode ?? {}).length ? Object.entries(metrics?.byCode ?? {}).map(([code, count]) => <div className="admin-bar-row" key={code}><div><span>{code}</span><strong>{count}</strong></div><i style={{ width: `${Math.max(8, Math.min(100, count / Math.max(metrics?.errorRequests ?? 1, 1) * 100))}%` }} /></div>) : <p className="admin-empty">{t("admin.noErrors")}</p>}</div></Card><Card className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">ROUTES</span><h2>{t("admin.routes")}</h2></div></div><div className="admin-route-list">{Object.entries(metrics?.byRoute ?? {}).sort(([, a], [, b]) => b - a).map(([route, count]) => <div key={route}><code>{route}</code><strong>{count}</strong></div>)}</div></Card></section><Card className="admin-panel admin-log-panel"><div className="admin-panel-head"><div><span className="eyebrow">REQUEST LOG</span><h2>{t("admin.requestLog")}</h2></div><small>{metrics?.lastRequestAt ? `${t("admin.lastRequest")} ${new Date(metrics.lastRequestAt).toLocaleString(language)}` : t("admin.noRequests")}</small></div><div className="admin-log-table"><div className="admin-log-head"><span>{t("admin.time")}</span><span>{t("admin.request")}</span><span>{t("admin.status")}</span><span>{t("admin.duration")}</span><span>{t("admin.errorCode")}</span></div>{logs.map((entry) => <div className="admin-log-row" key={`${entry.requestId}-${entry.timestamp}`}><span>{new Date(entry.timestamp).toLocaleTimeString(language)}</span><code>{entry.method} {entry.route}</code><Badge color={entry.status >= 400 ? "red" : "green"} variant="soft">{entry.status}</Badge><span>{entry.durationMs} ms</span><span>{entry.errorCode ?? "—"}</span></div>)}</div></Card></main></Theme>;
}

function MetricCard({ label, value, detail, icon, tone = "normal" }: { label: string; value: string | number; detail: string; icon: React.ReactNode; tone?: "normal" | "danger" }) { return <Card className={`admin-metric-card ${tone === "danger" ? "danger" : ""}`}><div className="admin-metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></Card>; }
