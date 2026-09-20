import Link from "next/link";
import {
  BookOpenCheck,
  Compass,
  Gauge,
  HeartHandshake,
  Microscope,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="border-b border-ink-200 bg-white">
        <div className="container-wide py-14 sm:py-20">
          <span className="eyebrow">About Veridra</span>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Everyday cyber safety, explained in plain language.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            Veridra helps ordinary people evaluate suspicious messages, links,
            and job offers with the same kind of reasoning a careful security
            professional would apply — without the jargon, the guesswork, or
            the false certainty.
          </p>
        </div>
      </section>

      {/* ── Motivation ─────────────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="container-wide grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <span className="eyebrow">Why this exists</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
              Most scams don&apos;t need sophisticated attackers — just a confused
              person on the other end.
            </h2>
          </div>
          <div className="prose-tight space-y-5 text-ink-700 lg:col-span-7">
            <p>
              The majority of financial loss from digital fraud does not come
              from novel exploits. It comes from ordinary text messages, DMs,
              and emails that trick people into sharing an OTP, clicking a
              convincing-looking link, or paying a &quot;processing fee&quot; for a
              job that does not exist.
            </p>
            <p>
              Professional security tools exist, but they are built for
              enterprise defenders, not for someone checking a suspicious SMS at
              a bus stop. Veridra fills that gap: a clean, public-facing
              platform that takes content a person is already unsure about and
              returns a clear, explainable verdict they can act on.
            </p>
          </div>
        </div>
      </section>

      {/* ── What Veridra analyses ──────────────────────────────── */}
      <section className="bg-ink-50 py-16">
        <div className="container-wide">
          <div className="max-w-2xl">
            <span className="eyebrow">How Veridra analyses content</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
              Each mode looks for the red flags that actually matter for that
              kind of content.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <MethodCard
              id="phishing"
              icon={<Microscope className="h-5 w-5" />}
              title="Message analysis"
              body="Detects urgency pressure, OTP and credential requests, brand impersonation, reward bait, financial fraud wording, and coercive threats. Combined signals (like a suspicious link next to an OTP request) carry extra weight."
            />
            <MethodCard
              id="links"
              icon={<Compass className="h-5 w-5" />}
              title="Link analysis"
              body="Parses the URL structure, checks abuse-prone TLDs, URL shorteners, raw-IP hosts, lookalike brand domains via edit distance, subdomain tricks, punycode, and login-style paths on disposable hosts."
            />
            <MethodCard
              id="jobs"
              icon={<HeartHandshake className="h-5 w-5" />}
              title="Job offer analysis"
              body="Flags unrealistic pay, upfront fees and deposits, rushed hiring without interviews, premature requests for ID or bank details, mule-style roles, off-channel contact pushes, and free-email recruiters."
            />
          </div>
        </div>
      </section>

      {/* ── The six output layers ──────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="container-wide">
          <div className="max-w-2xl">
            <span className="eyebrow">The six output layers</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
              A verdict alone is not enough.
            </h2>
            <p className="mt-4 text-ink-600">
              Every Veridra analysis returns six layers, from the headline risk
              level all the way down to concrete next steps. Each layer is
              grounded in the specific evidence the analyser saw.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-2">
            <LayerCard
              n={1}
              icon={<Gauge className="h-4 w-4" />}
              title="Risk Level"
              body="Safe, Low Risk, Suspicious, Likely Scam, or High Risk — with a 0–100 score and a confidence range."
            />
            <LayerCard
              n={2}
              icon={<ShieldAlert className="h-4 w-4" />}
              title="Threat Category"
              body="What kind of threat this looks like: phishing, OTP scam, fake job offer, suspicious link, impersonation, financial fraud, or unclassified suspicious pattern."
            />
            <LayerCard
              n={3}
              icon={<Microscope className="h-4 w-4" />}
              title="Why It Was Flagged"
              body="The exact patterns that triggered — urgency wording, brand-impersonation subdomains, recruiter fee requests, etc. — with the matched evidence shown."
            />
            <LayerCard
              n={4}
              icon={<ShieldAlert className="h-4 w-4" />}
              title="Why You Should Not Proceed"
              body="What could realistically happen if you act on the content, expressed in ordinary language."
            />
            <LayerCard
              n={5}
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Recommended Safe Action"
              body="Concrete steps tailored to the threat type, including what to do if you have already acted."
            />
            <LayerCard
              n={6}
              icon={<BookOpenCheck className="h-4 w-4" />}
              title="Block & Report Guidance"
              body="Platform-agnostic steps to block the sender and report the content through the channels you already use."
            />
          </ol>
        </div>
      </section>

      {/* ── Principles ──────────────────────────────────────────── */}
      <section className="bg-ink-50 py-16">
        <div className="container-wide grid gap-8 lg:grid-cols-3">
          <Principle
            title="Explainability over certainty"
            body="Security verdicts that can't be explained are security theater. Veridra shows its work, so users can judge the reasoning themselves."
          />
          <Principle
            title="Guidance, not action"
            body="Veridra never automatically blocks, reports, or replies to anything on your behalf. It gives you the steps — you stay in control."
          />
          <Principle
            title="Public, not gatekept"
            body="Ordinary people face the same social-engineering attacks that professionals defend against. The tools to evaluate them should be public too."
          />
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="container-wide grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow">Who it&apos;s for</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
              Built for the person who says &quot;this feels off.&quot;
            </h2>
          </div>
          <ul className="space-y-5 text-ink-700 lg:col-span-7">
            <Audience
              icon={<Users className="h-5 w-5" />}
              title="Anyone receiving suspicious messages"
              body="Parents, students, freelancers, small-business owners — people who get a dodgy SMS or DM and want a second opinion in under a minute."
            />
            <Audience
              icon={<Users className="h-5 w-5" />}
              title="Job seekers navigating online recruiters"
              body="Especially on platforms where fake recruiters, advance-fee jobs, and identity-theft setups routinely reach applicants."
            />
            <Audience
              icon={<Users className="h-5 w-5" />}
              title="Community helpers and educators"
              body="People who informally help family or friends assess risky content, and want a clear explanation they can point to."
            />
          </ul>
        </div>
      </section>

      {/* ── Disclaimer ──────────────────────────────────────────── */}
      <section className="bg-white pb-20">
        <div className="container-wide">
          <div className="rounded-3xl border border-ink-200 bg-ink-50 p-8 sm:p-10">
            <h2 className="text-lg font-semibold text-ink-900">
              Important scope and limitations
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              Veridra is a decision-support and educational platform. It does{" "}
              <strong>not</strong> replace official cybersecurity authorities,
              law-enforcement reporting channels, or your bank&apos;s fraud
              department. Results reflect heuristic analysis of the content you
              provide and should be read as a guide, not a guarantee. When
              something matters — money, identity documents, or account access
              — verify through the sender&apos;s official channels before acting.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/analyze" className="btn-brand">
                Try an analysis
              </Link>
              <Link href="/insights" className="btn-outline">
                View safety insights
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */

function MethodCard({
  id,
  icon,
  title,
  body,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article id={id} className="card p-6">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
    </article>
  );
}

function LayerCard({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="card flex gap-4 p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-900 text-sm font-semibold text-white">
        {n}
      </span>
      <div>
        <div className="flex items-center gap-2 text-ink-800">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
      </div>
    </li>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">{body}</p>
    </div>
  );
}

function Audience({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
      </div>
    </li>
  );
}
