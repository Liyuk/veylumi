"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon, ReloadIcon, ActivityLogIcon, ExclamationTriangleIcon, BarChartIcon } from "@radix-ui/react-icons";

type Metrics = { totalRequests: number; successRequests: number; errorRequests: number; averageDurationMs: number; uptimeSeconds: number; byStatus: Record<string, number>; byCode: Record<string, number>; byRoute: Record<string, number>; lastRequestAt: string | null };
type LogEntry = { timestamp: string; level: string; requestId: string; method: string; route: string; status: number; durationMs: number; errorCode: string | null };
const API_BASE = process.env.NEXT_PUBLIC_VEYLUMI_API_URL ?? "http://127.0.0.1:8787";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_VEYLUMI_ADMIN_TOKEN ?? "local-admin";

async function adminRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: { "x-admin-token": ADMIN_TOKEN }, cache: "no-store" });
  const envelope = await response.json() as { ok: boolean; data?: T; error?: { message: string } };
  if (!response.ok || !envelope.ok) throw new Error(envelope.error?.message ?? `请求失败 ${response.status}`);
  return envelope.data as T;
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() { setLoading(true); setError(""); try { const [nextMetrics, nextLogs] = await Promise.all([adminRequest<Metrics>("/api/admin/metrics"), adminRequest<LogEntry[]>("/api/admin/logs?limit=80")]); setMetrics(nextMetrics); setLogs(nextLogs); } catch (reason) { setError(reason instanceof Error ? reason.message : "监控数据读取失败"); } finally { setLoading(false); } }
  useEffect(() => { const initial = window.setTimeout(() => void refresh(), 0); const timer = window.setInterval(() => void refresh(), 15000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, []);
  const errorRate = metrics?.totalRequests ? Math.round(metrics.errorRequests / metrics.totalRequests * 100) : 0;
  return <Theme accentColor="brown" grayColor="sand" radius="medium" scaling="100%"><main className="admin-shell"><header className="admin-header"><div><span className="eyebrow">VEYLUMI OPERATIONS</span><h1>服务监控</h1><p>接口健康、错误码和最近请求的本地控制台。</p></div><div className="admin-header-actions"><button type="button" className="admin-back" onClick={() => { window.location.href = "/"; }}><ArrowLeftIcon /> 返回前台</button><Button variant="outline" onClick={() => void refresh()} disabled={loading}><ReloadIcon /> {loading ? "刷新中" : "刷新"}</Button></div></header>{error && <div className="admin-alert"><ExclamationTriangleIcon /><span>{error}</span></div>}<section className="admin-metric-grid"><MetricCard label="请求总量" value={metrics?.totalRequests ?? "—"} detail="进程启动以来" icon={<ActivityLogIcon />} /><MetricCard label="错误率" value={`${errorRate}%`} detail={`${metrics?.errorRequests ?? 0} 个错误请求`} icon={<ExclamationTriangleIcon />} tone={errorRate > 5 ? "danger" : "normal"} /><MetricCard label="平均延迟" value={`${metrics?.averageDurationMs ?? "—"} ms`} detail="服务端处理耗时" icon={<BarChartIcon />} /><MetricCard label="进程运行" value={metrics ? `${metrics.uptimeSeconds}s` : "—"} detail="当前 API 实例" icon={<ActivityLogIcon />} /></section><section className="admin-grid"><Card className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">ERROR CODES</span><h2>错误码分布</h2></div><Badge color={errorRate > 5 ? "red" : "green"} variant="soft">{metrics?.errorRequests ?? 0} errors</Badge></div><div className="admin-bars">{Object.entries(metrics?.byCode ?? {}).length ? Object.entries(metrics?.byCode ?? {}).map(([code, count]) => <div className="admin-bar-row" key={code}><div><span>{code}</span><strong>{count}</strong></div><i style={{ width: `${Math.max(8, Math.min(100, count / Math.max(metrics?.errorRequests ?? 1, 1) * 100))}%` }} /></div>) : <p className="admin-empty">暂无错误码记录。</p>}</div></Card><Card className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">ROUTES</span><h2>接口调用</h2></div></div><div className="admin-route-list">{Object.entries(metrics?.byRoute ?? {}).sort(([, a], [, b]) => b - a).map(([route, count]) => <div key={route}><code>{route}</code><strong>{count}</strong></div>)}</div></Card></section><Card className="admin-panel admin-log-panel"><div className="admin-panel-head"><div><span className="eyebrow">REQUEST LOG</span><h2>最近请求</h2></div><small>{metrics?.lastRequestAt ? `最后请求 ${new Date(metrics.lastRequestAt).toLocaleString("zh-CN")}` : "暂无请求"}</small></div><div className="admin-log-table"><div className="admin-log-head"><span>时间</span><span>请求</span><span>状态</span><span>耗时</span><span>错误码</span></div>{logs.map((entry) => <div className="admin-log-row" key={`${entry.requestId}-${entry.timestamp}`}><span>{new Date(entry.timestamp).toLocaleTimeString("zh-CN")}</span><code>{entry.method} {entry.route}</code><Badge color={entry.status >= 400 ? "red" : "green"} variant="soft">{entry.status}</Badge><span>{entry.durationMs} ms</span><span>{entry.errorCode ?? "—"}</span></div>)}</div></Card></main></Theme>;
}

function MetricCard({ label, value, detail, icon, tone = "normal" }: { label: string; value: string | number; detail: string; icon: React.ReactNode; tone?: "normal" | "danger" }) { return <Card className={`admin-metric-card ${tone === "danger" ? "danger" : ""}`}><div className="admin-metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></Card>; }
