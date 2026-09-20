"use client";

import { cn } from "@/lib/cn";
import { fetchHistory, fetchInsights } from "@/lib/api";
import { modeLabel, riskTheme } from "@/lib/risk";
import { signalLabel } from "@/lib/signalLabels";
import type { HistoryItem, InsightsSummary, RiskLevel } from "@/lib/types";
import {
  Activity,
  AlertTriangle,
  Database,
  Info,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  Phishing: "#dc2626",
  "Fake Job Offer": "#b91c1c",
  "Suspicious Link": "#d97706",
  "OTP Scam": "#ea580c",
  Impersonation: "#9333ea",
  "Financial Fraud": "#0891b2",
  "Unknown Suspicious Pattern": "#6b7280",
  "No Clear Threat Detected": "#10a572",
};

const LEVEL_ORDER: RiskLevel[] = [
  "Safe",
  "Low Risk",
  "Suspicious",
  "Likely Scam",
  "High Risk",
];

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [i, h] = await Promise.all([fetchInsights(), fetchHistory(12)]);
        if (!cancelled) {
          setInsights(i);
          setHistory(h);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load insights");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────── */}
      <section className="border-b border-ink-200 bg-white">
        <div className="container-wide py-12 sm:py-16">
          <span className="eyebrow">Safety Insights</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            What Veridra is seeing across recent analyses
          </h1>
          <p className="mt-3 max-w-2xl text-ink-600">
            Aggregated, privacy-minimal view of threat categories, red-flag
            patterns, and recent analysis volume — useful for spotting campaigns
            before they reach you.
          </p>
        </div>
      </section>

      <section className="bg-ink-50 py-12">
        <div className="container-wide space-y-8">
          {error && <ErrorCard message={error} />}

          {insights && <TotalsRow insights={insights} />}

          {insights && (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="card p-6 lg:col-span-3">
                <SectionHeader
                  icon={<TrendingUp className="h-4 w-4" />}
                  title="Threat category distribution"
                  subtitle="Count of analyses by detected category"
                />
                <div className="mt-4 h-80">
                  {insights.by_category.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={insights.by_category}
                        margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                      >
                        <XAxis
                          dataKey="category"
                          interval={0}
                          tick={{ fontSize: 11, fill: "#4c5366" }}
                          tickFormatter={(v: string) =>
                            v.length > 16 ? v.slice(0, 14) + "…" : v
                          }
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: "#4c5366" }}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          cursor={{ fill: "rgba(20,23,42,0.04)" }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {insights.by_category.map((row) => (
                            <Cell
                              key={row.category}
                              fill={CATEGORY_COLORS[row.category] ?? "#2f9595"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card p-6 lg:col-span-2">
                <SectionHeader
                  icon={<Shield className="h-4 w-4" />}
                  title="Risk level mix"
                  subtitle="Share of analyses by verdict"
                />
                <div className="mt-4 h-80">
                  {insights.by_level.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sortByLevel(insights.by_level)}
                          dataKey="count"
                          nameKey="level"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {sortByLevel(insights.by_level).map((row) => (
                            <Cell
                              key={row.level}
                              fill={levelColor(row.level as RiskLevel)}
                              stroke="white"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {insights && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-6">
                <SectionHeader
                  icon={<AlertTriangle className="h-4 w-4" />}
                  title="Most common red flags"
                  subtitle="Signals firing most often across recent analyses"
                />
                {insights.top_signals.length === 0 ? (
                  <EmptyBlock />
                ) : (
                  <ul className="mt-4 space-y-2">
                    {insights.top_signals.map((s, idx) => {
                      const max = insights.top_signals[0].count || 1;
                      const pct = (s.count / max) * 100;
                      return (
                        <li
                          key={s.signal_id}
                          className="rounded-xl border border-ink-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink-800">
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-ink-900 text-[11px] font-semibold text-white">
                                {idx + 1}
                              </span>
                              <span className="truncate">
                                {signalLabel(s.signal_id)}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-ink-500">
                              {s.count}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="card p-6">
                <SectionHeader
                  icon={<Database className="h-4 w-4" />}
                  title="Red-flag phrases we see often"
                  subtitle="Sampled from recent analyses"
                />
                {insights.top_phrases.length === 0 ? (
                  <EmptyBlock />
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {insights.top_phrases.map((p) => (
                      <span
                        key={p.phrase}
                        className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-sm text-ink-800"
                      >
                        <span className="font-mono">{p.phrase}</span>
                        <span className="text-xs text-ink-500">×{p.count}</span>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-5 text-xs leading-relaxed text-ink-500">
                  These are short snippets matched by the analyzer&apos;s red-flag
                  patterns — not raw user content. Real names, numbers, and
                  personal details are never surfaced here.
                </p>
              </div>
            </div>
          )}

          {/* Recent history */}
          <div className="card p-6">
            <SectionHeader
              icon={<Activity className="h-4 w-4" />}
              title="Recent analyses"
              subtitle="Most recent checks run on Veridra"
            />
            {!history ? (
              <EmptyBlock />
            ) : history.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">
                No analyses yet — run a check on the Analyze page to populate
                this view.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Mode</th>
                      <th className="px-3 py-2 font-semibold">Risk</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Preview</th>
                      <th className="px-3 py-2 font-semibold">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => {
                      const theme = riskTheme(h.risk_level as RiskLevel);
                      return (
                        <tr key={i} className="border-t border-ink-100">
                          <td className="px-3 py-3 font-medium text-ink-800">
                            {modeLabel(h.mode)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn("chip border", theme.chip)}
                            >
                              {h.risk_level}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-ink-700">
                            {h.threat_category}
                          </td>
                          <td className="max-w-[320px] truncate px-3 py-3 text-ink-600">
                            {h.preview}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-ink-500">
                            {relativeTime(h.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Safety tips */}
          <TipsCard />
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function TotalsRow({ insights }: { insights: InsightsSummary }) {
  const totalSafe =
    insights.by_level.find((l) => l.level === "Safe")?.count ?? 0;
  const totalHighRisk = insights.by_level
    .filter((l) => l.level === "High Risk" || l.level === "Likely Scam")
    .reduce((acc, l) => acc + l.count, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Total analyses"
        value={insights.total_analyses.toLocaleString()}
        icon={<Activity className="h-4 w-4" />}
      />
      <StatCard
        label="Clean verdicts"
        value={totalSafe.toLocaleString()}
        icon={<Shield className="h-4 w-4" />}
        accent="text-emerald-700"
      />
      <StatCard
        label="High-risk or likely scams"
        value={totalHighRisk.toLocaleString()}
        icon={<AlertTriangle className="h-4 w-4" />}
        accent="text-red-700"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-500">
        <span>{label}</span>
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg bg-ink-900 text-white", accent && "bg-ink-100", accent)}>
          {icon}
        </span>
      </div>
      <div className={cn("mt-3 text-3xl font-semibold tabular-nums text-ink-900", accent)}>
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </span>
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        <p className="text-xs text-ink-500">{subtitle}</p>
      </div>
    </div>
  );
}

function TipsCard() {
  const tips = [
    "Banks, couriers, and tax authorities never ask for an OTP, PIN, or password through chat or SMS.",
    "If a message presses you to act within minutes, treat that urgency itself as a warning sign.",
    "Type the company’s domain yourself instead of clicking links in messages — even links that look right.",
    "Legitimate employers never charge you a fee, deposit, or training cost to start a job.",
    "If a recruiter contacts you from a free-email address (Gmail, Yahoo, etc.), verify them via the company’s real HR page.",
  ];
  return (
    <div className="card p-6">
      <SectionHeader
        icon={<Info className="h-4 w-4" />}
        title="Quick safety reminders"
        subtitle="Short rules of thumb that cover most common scams"
      />
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {tips.map((tip) => (
          <li
            key={tip}
            className="flex gap-3 rounded-xl border border-ink-200 bg-white p-3 text-sm text-ink-700"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center text-sm text-ink-400">
      No data yet. Run an analysis to populate this chart.
    </div>
  );
}

function EmptyBlock() {
  return (
    <p className="mt-4 text-sm text-ink-500">
      No data yet. Run an analysis to populate this section.
    </p>
  );
}

const tooltipStyle = {
  background: "white",
  border: "1px solid #d7dae2",
  borderRadius: 10,
  boxShadow: "0 4px 14px rgba(10,12,26,0.06)",
  fontSize: 12,
};

function levelColor(level: RiskLevel): string {
  switch (level) {
    case "Safe":
      return "#10a572";
    case "Low Risk":
      return "#65a30d";
    case "Suspicious":
      return "#d97706";
    case "Likely Scam":
      return "#dc2626";
    case "High Risk":
      return "#991b1b";
  }
}

function sortByLevel<T extends { level: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      LEVEL_ORDER.indexOf(a.level as RiskLevel) -
      LEVEL_ORDER.indexOf(b.level as RiskLevel),
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
