import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="container-wide grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-ink-600">
            A decision-support platform that helps ordinary people evaluate
            suspicious messages, links, and job offers with clear, evidence-based
            reasoning.
          </p>
        </div>

        <FooterCol title="Product" items={[
          { label: "Analyze", href: "/analyze" },
          { label: "Safety Insights", href: "/insights" },
          { label: "About", href: "/about" },
        ]} />

        <FooterCol title="Safety topics" items={[
          { label: "Phishing", href: "/about#phishing" },
          { label: "OTP scams", href: "/about#otp" },
          { label: "Fake job offers", href: "/about#jobs" },
          { label: "Unsafe links", href: "/about#links" },
        ]} />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-ink-900">Note</h4>
          <p className="text-xs leading-relaxed text-ink-500">
            Veridra provides educational guidance and risk indicators. It is not
            an official cybersecurity authority and does not automatically block,
            report, or take action on content for you.
          </p>
        </div>
      </div>
      <div className="hairline">
        <div className="container-wide flex flex-col gap-2 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Veridra. All rights reserved.</span>
          <span>Built for public cyber safety.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="text-sm text-ink-600 transition hover:text-ink-900"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
