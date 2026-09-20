"""
Explanation engine.

Turns detected `Signal` objects into the evidence-based prose shown in
output layers 3 ("Why it was flagged") and 4 ("Why you should not proceed").
Each mapping references the actual matched evidence rather than generic text.
"""
from __future__ import annotations

from typing import List

from .schemas import HighlightedPhrase, Signal


# Layer 3: "Why It Was Flagged" — what the analyzer actually saw
WHY_FLAGGED_TEMPLATES = {
    # Message
    "credential_request":
        "The message asks for sensitive credentials (e.g. {ev}). Legitimate "
        "institutions never request OTPs, PINs, or passwords through chat or SMS.",
    "urgency_pressure":
        "It uses urgency language such as {ev} to push you into acting before "
        "you verify anything — a core pressure tactic in phishing.",
    "brand_impersonation":
        "It references a trusted brand or institution ({ev}), which is a common "
        "way to borrow authority that the sender has not proven.",
    "reward_bait":
        "It dangles a prize or reward ({ev}) to lower your guard before asking "
        "for information or payment.",
    "financial_fraud_wording":
        "It contains money-transfer, fee, or guaranteed-return wording ({ev}) "
        "typical of financial fraud.",
    "coercive_threat":
        "It threatens consequences ({ev}) to scare you into compliance.",
    "url_plus_pressure":
        "A link is combined with pressure or a credential request ({ev}) — a "
        "high-confidence phishing pattern.",
    # Link
    "ip_literal_host":
        "The URL points to a raw IP address ({ev}) instead of a named domain, "
        "which real businesses essentially never do for customer-facing pages.",
    "no_https":
        "The connection is not encrypted (HTTP). Any data you submit would "
        "travel in clear text.",
    "suspicious_tld":
        "The domain ends in {ev}, a TLD frequently used by short-lived scam "
        "sites because registration is cheap and rarely verified.",
    "url_shortener":
        "The link is a shortener ({ev}), so the true destination is hidden "
        "until you click.",
    "brand_in_subdomain":
        "A trusted brand name is placed in the subdomain ({ev}) to make the "
        "URL look official — the actual owner is the registered domain, not the brand.",
    "typosquatting":
        "The registered domain ({ev}) is only 1–2 characters away from a "
        "well-known brand, which is a textbook typosquatting pattern.",
    "excessive_subdomains":
        "The URL stacks multiple subdomains ({ev}) to bury the real owner "
        "deep inside the address.",
    "noisy_domain":
        "The domain ({ev}) mixes unusual hyphens and digits, which legitimate "
        "brands rarely do.",
    "lure_path_on_bad_tld":
        "Login-style path terms ({ev}) appear on a domain with an abuse-prone "
        "TLD — a strong phishing signature.",
    "punycode_host":
        "The hostname uses punycode ({ev}), which can disguise non-Latin "
        "lookalike characters to mimic a real brand.",
    "very_long_url":
        "The URL is unusually long ({ev}), which scammers use to hide the "
        "true destination in a wall of text.",
    "unparseable_url":
        "The input could not be parsed as a valid URL, which itself is a red flag.",
    "missing_host":
        "The URL has no hostname ({ev}), so there is nothing to verify or trust.",
    # Job offer
    "unrealistic_pay":
        "The offer promises unrealistic pay ({ev}) for little or no experience. "
        "Real employers benchmark compensation against the market.",
    "upfront_fee":
        "It asks for an upfront fee, deposit, or payment ({ev}). Legitimate "
        "employers do not charge you to be hired.",
    "rushed_hiring":
        "It skips or compresses the hiring process ({ev}). Real companies "
        "run interviews, reference checks, and document review.",
    "premature_pii":
        "It requests identity documents or bank details ({ev}) before a real "
        "offer is signed — a common identity-theft setup.",
    "vague_role":
        "The role description ({ev}) matches templates used in reshipping, "
        "money-mule, and data-entry scams.",
    "off_channel_contact":
        "It pushes communication to personal WhatsApp or Telegram ({ev}) "
        "instead of a company email or ATS.",
    "free_email_recruiter":
        "The recruiter contacts you from a personal free-email address ({ev}) "
        "rather than a company domain.",
    "no_verifiable_company":
        "No company website or verifiable domain is provided, so the employer "
        "cannot be independently confirmed.",
}


# Layer 4: "Why You Should Not Proceed" — user-facing consequence framing
WHY_NOT_PROCEED = {
    "credential_request":
        "Sharing OTPs, PINs, or passwords gives the sender full control of "
        "the related account — often within minutes.",
    "urgency_pressure":
        "Acting under artificial pressure bypasses the verification habits "
        "that normally protect you.",
    "brand_impersonation":
        "If the sender is not actually that institution, responding confirms "
        "that your number or email is active and worth targeting again.",
    "reward_bait":
        "Prize and reward lures almost always lead to either a fee request, "
        "credential theft, or both.",
    "financial_fraud_wording":
        "Any money you send to this sender is extremely unlikely to be recoverable.",
    "coercive_threat":
        "Responding to threats legitimizes the sender and invites escalation.",
    "url_plus_pressure":
        "Clicking the link may load a credential-harvesting page or drop "
        "malicious content on your device.",
    "ip_literal_host":
        "Raw-IP pages cannot be verified against any legitimate owner.",
    "no_https":
        "Credentials or personal data entered here can be intercepted in transit.",
    "suspicious_tld":
        "Abuse-prone TLDs are often taken down within days — the page you "
        "see today may already be flagged elsewhere.",
    "url_shortener":
        "You cannot tell where you will actually land until after the redirect.",
    "brand_in_subdomain":
        "The page is not operated by the brand it impersonates, regardless "
        "of how it looks.",
    "typosquatting":
        "One mistyped character routes you to an attacker-controlled site "
        "that can mirror the real one almost perfectly.",
    "excessive_subdomains":
        "Deep subdomain chains are used to fool quick visual checks.",
    "noisy_domain":
        "Unusual domain patterns are a cheap signal of a disposable scam site.",
    "lure_path_on_bad_tld":
        "Submitting credentials here almost certainly hands them to the attacker.",
    "punycode_host":
        "You may be looking at a lookalike domain that is visually identical "
        "to a real one.",
    "very_long_url":
        "Long URLs make it easy to miss a swapped domain or injected redirect.",
    "unparseable_url": "Anything submitted to a broken URL is going somewhere unpredictable.",
    "missing_host":    "There is no destination to verify or trust.",
    "unrealistic_pay":
        "Offers that promise far above market rate are typically designed to "
        "extract fees or personal data before disappearing.",
    "upfront_fee":
        "Once you pay, the recruiter almost always goes silent or asks for "
        "more fees under new pretexts.",
    "rushed_hiring":
        "Skipping real interviews means the employer is not evaluating you — "
        "something else is the real goal of the conversation.",
    "premature_pii":
        "Your identity documents and bank details can be used for account "
        "takeover, loan fraud, or laundering in your name.",
    "vague_role":
        "These templates are often fronts for money laundering or shipping "
        "stolen goods — both of which carry legal exposure for you.",
    "off_channel_contact":
        "Private messaging apps remove the paper trail and accountability "
        "that a real hiring pipeline would leave.",
    "free_email_recruiter":
        "You have no way to verify that the person actually works for the "
        "company they claim to represent.",
    "no_verifiable_company":
        "Without an official site or domain, the employer cannot be confirmed to exist.",
}


def _format_evidence(evidence: List[str]) -> str:
    if not evidence:
        return "the detected pattern"
    # Show at most three snippets, quoted
    shown = evidence[:3]
    parts = [f"\"{e}\"" for e in shown]
    if len(evidence) > 3:
        parts.append(f"and {len(evidence) - 3} more")
    return ", ".join(parts)


def build_why_flagged(signals: List[Signal]) -> List[str]:
    out: List[str] = []
    for sig in signals:
        template = WHY_FLAGGED_TEMPLATES.get(sig.id)
        if template:
            out.append(template.format(ev=_format_evidence(sig.evidence)))
    return out


def build_why_not_proceed(signals: List[Signal]) -> List[str]:
    out: List[str] = []
    seen: set[str] = set()
    for sig in signals:
        text = WHY_NOT_PROCEED.get(sig.id)
        if text and text not in seen:
            seen.add(text)
            out.append(text)
    return out


def build_highlighted_phrases(signals: List[Signal]) -> List[HighlightedPhrase]:
    """Flatten evidence across signals into phrases the UI can highlight."""
    out: List[HighlightedPhrase] = []
    seen: set[str] = set()
    for sig in signals:
        for ev in sig.evidence:
            key = ev.lower().strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(HighlightedPhrase(phrase=ev, reason=sig.label))
    return out
