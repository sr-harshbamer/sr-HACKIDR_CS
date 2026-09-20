import { cn } from "@/lib/cn";

/**
 * Veridra logomark — a shield formed from a rising check curve.
 * Conveys verification + protection without being generic.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-soft"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.5 4 5.5v6.2c0 4.5 3.2 8.3 8 9.8 4.8-1.5 8-5.3 8-9.8V5.5l-8-3Z" />
          <path d="m8.5 12 2.6 2.6L16 9.8" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-tight text-ink-900">
          Veridra
        </span>
      )}
    </div>
  );
}
