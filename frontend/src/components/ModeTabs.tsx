"use client";

import { cn } from "@/lib/cn";
import type { AnalysisMode } from "@/lib/types";
import { BriefcaseBusiness, Link2, MessageSquareWarning, PhoneCall } from "lucide-react";

const TABS: { id: AnalysisMode; label: string; icon: React.ReactNode; hint: string }[] = [
  {
    id: "message",
    label: "Message Check",
    icon: <MessageSquareWarning className="h-4 w-4" />,
    hint: "SMS, chat, or email text",
  },
  {
    id: "link",
    label: "Link Check",
    icon: <Link2 className="h-4 w-4" />,
    hint: "A single URL",
  },
  {
    id: "job_offer",
    label: "Job Offer Check",
    icon: <BriefcaseBusiness className="h-4 w-4" />,
    hint: "Recruiter message or posting",
  },
  {
    id: "call",
    label: "Call Check",
    icon: <PhoneCall className="h-4 w-4" />,
    hint: "Simulated call / voice check",
  },
];

export function ModeTabs({
  value,
  onChange,
}: {
  value: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Select analysis mode"
      className="grid grid-cols-1 gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-soft sm:grid-cols-4"
    >
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-3 text-left transition",
              active
                ? "bg-ink-900 text-white shadow-soft"
                : "text-ink-700 hover:bg-ink-50",
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                active ? "bg-white/10 text-white" : "bg-brand-50 text-brand-700",
              )}
            >
              {t.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t.label}</span>
              <span
                className={cn(
                  "block text-xs",
                  active ? "text-white/70" : "text-ink-500",
                )}
              >
                {t.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
