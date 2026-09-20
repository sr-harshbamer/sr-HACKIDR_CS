import type { RiskLevel, Severity } from "./types";

export function riskTheme(level: RiskLevel) {
  switch (level) {
    case "Safe":
      return {
        label: "Safe",
        accent: "text-severity-safe",
        bg: "bg-emerald-50",
        ring: "ring-emerald-200",
        bar: "bg-severity-safe",
        chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
        headline: "No red flags detected",
      };
    case "Low Risk":
      return {
        label: "Low Risk",
        accent: "text-severity-low",
        bg: "bg-lime-50",
        ring: "ring-lime-200",
        bar: "bg-severity-low",
        chip: "bg-lime-50 text-lime-800 border-lime-200",
        headline: "Low-risk indicators present",
      };
    case "Suspicious":
      return {
        label: "Suspicious",
        accent: "text-severity-suspicious",
        bg: "bg-amber-50",
        ring: "ring-amber-200",
        bar: "bg-severity-suspicious",
        chip: "bg-amber-50 text-amber-900 border-amber-200",
        headline: "Proceed with caution",
      };
    case "Likely Scam":
      return {
        label: "Likely Scam",
        accent: "text-severity-scam",
        bg: "bg-red-50",
        ring: "ring-red-200",
        bar: "bg-severity-scam",
        chip: "bg-red-50 text-red-800 border-red-200",
        headline: "Strong scam indicators",
      };
    case "High Risk":
    default:
      return {
        label: "High Risk",
        accent: "text-severity-high",
        bg: "bg-red-100",
        ring: "ring-red-300",
        bar: "bg-severity-high",
        chip: "bg-red-100 text-red-900 border-red-300",
        headline: "Do not engage",
      };
  }
}

export function severityTheme(s: Severity) {
  switch (s) {
    case "low":
      return { dot: "bg-lime-500", text: "text-lime-800", label: "Low" };
    case "medium":
      return { dot: "bg-amber-500", text: "text-amber-800", label: "Medium" };
    case "high":
      return { dot: "bg-red-500", text: "text-red-800", label: "High" };
    case "critical":
    default:
      return { dot: "bg-red-700", text: "text-red-900", label: "Critical" };
  }
}

export function modeLabel(mode: string): string {
  if (mode === "message") return "Message Check";
  if (mode === "link") return "Link Check";
  if (mode === "job_offer") return "Job Offer Check";
  return mode;
}
