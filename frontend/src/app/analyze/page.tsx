"use client";

import { ContentInput } from "@/components/ContentInput";
import { ModeTabs } from "@/components/ModeTabs";
import { RiskVerdictPanel } from "@/components/RiskVerdictPanel";
import { analyze, analyzeAudio } from "@/lib/api";
import type { AnalysisMode, AnalysisResult } from "@/lib/types";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function AnalyzePage() {
  const [mode, setMode] = useState<AnalysisMode>("message");
  const [content, setContent] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedContent, setAnalyzedContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Clear result when the user switches modes — a result from a different mode
  // would be misleading.
  useEffect(() => {
    setResult(null);
    setError(null);
    setAudioBlob(null);
  }, [mode]);

  const handleAnalyze = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Please paste some content first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let res: AnalysisResult;
      if (mode === "call" && audioBlob) {
        res = await analyzeAudio(audioBlob);
      } else {
        res = await analyze(mode, trimmed);
      }
      setResult(res);
      setAnalyzedContent(trimmed);
      // Scroll to result on the next frame
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [mode, content, audioBlob]);

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────── */}
      <section className="border-b border-ink-200 bg-white">
        <div className="container-wide py-12 sm:py-16">
          <span className="eyebrow">Analyze</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Check a suspicious message, link, or job offer
          </h1>
          <p className="mt-3 max-w-2xl text-ink-600">
            Pick the mode that matches what you received, paste the content, and
            Veridra will return a clear verdict with the specific red flags and
            next steps.
          </p>
        </div>
      </section>

      {/* ── Input ───────────────────────────────────────────────── */}
      <section className="bg-ink-50 py-10">
        <div className="container-wide space-y-6">
          <ModeTabs value={mode} onChange={setMode} />

          <div className="card p-6 sm:p-8">
            <ContentInput
              mode={mode}
              value={content}
              onChange={setContent}
              onAudioChange={setAudioBlob}
              disabled={loading}
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-500">
                Content is analyzed on the server and a minimal, anonymised
                record is kept to power Safety Insights — no raw content beyond
                a short preview is stored.
              </p>
              <div className="flex items-center gap-2">
                {content && (
                  <button
                    type="button"
                    onClick={() => {
                      setContent("");
                      setResult(null);
                      setError(null);
                      setAudioBlob(null);
                    }}
                    className="btn-ghost"
                    disabled={loading}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || !content.trim()}
                  className="btn-brand px-5 py-2.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Analyze content
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Result ──────────────────────────────────────────────── */}
      <section ref={resultRef} className="bg-ink-50 pb-20">
        <div className="container-wide">
          {result ? (
            <RiskVerdictPanel result={result} content={analyzedContent} />
          ) : (
            <EmptyState mode={mode} />
          )}
        </div>
      </section>
    </>
  );
}

function EmptyState({ mode }: { mode: AnalysisMode }) {
  const label =
    mode === "message"
      ? "a suspicious message"
      : mode === "link"
      ? "a suspicious URL"
      : "a recruiter message or job offer";

  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Search className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-semibold text-ink-900">
        Your result will appear here
      </h2>
      <p className="max-w-md text-sm text-ink-600">
        Paste {label} above and click <span className="font-medium">Analyze content</span>.
        Veridra returns a clear risk verdict, the exact red flags it found, and
        what to do next — usually in under a second.
      </p>
    </div>
  );
}
