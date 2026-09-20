"""
Link analysis.

Heuristic URL inspection: TLD quality, shorteners, brand typosquatting,
subdomain tricks, IP-literal hosts, excessive hyphens/digits, and
lookalike characters. Completely offline — no network calls.
"""
from __future__ import annotations

import ipaddress
import re
from typing import List, Tuple
from urllib.parse import urlparse

import tldextract

from .schemas import Severity, Signal, ThreatCategory

# Use tldextract's bundled snapshot without attempting a network fetch.
# This keeps the service fully offline and deterministic.
_TLD_EXTRACT = tldextract.TLDExtract(suffix_list_urls=(), fallback_to_snapshot=True)


SUSPICIOUS_TLDS = {
    "xyz", "top", "click", "link", "tk", "ml", "cf", "gq",
    "country", "stream", "download", "loan", "work", "men",
    "rest", "bar", "zip", "mov", "quest",
}

URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly",
    "is.gd", "buff.ly", "s.id", "cutt.ly", "rb.gy",
    "shorturl.at", "rebrand.ly", "bitly.com",
}

# Brands most commonly impersonated. We check for near-matches in the
# registered domain to catch typosquatting like "paypai", "arnazon".
IMPERSONATED_BRANDS = [
    "paypal", "apple", "icloud", "microsoft", "office365", "google",
    "gmail", "facebook", "instagram", "whatsapp", "netflix", "amazon",
    "ebay", "linkedin", "dropbox", "github",
    "bca", "mandiri", "bri", "bni", "cimb", "dana", "ovo",
    "gopay", "gojek", "grab", "shopee", "tokopedia", "lazada",
    "dhl", "fedex", "ups", "usps", "jnt", "jne",
]


def _levenshtein(a: str, b: str) -> int:
    """Standard edit distance; small enough for short domain labels."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            curr[j] = min(
                prev[j] + 1,        # deletion
                curr[j - 1] + 1,    # insertion
                prev[j - 1] + (ca != cb),  # substitution
            )
        prev = curr
    return prev[-1]


def _is_ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def analyze_link(raw_url: str) -> Tuple[List[Signal], ThreatCategory]:
    signals: List[Signal] = []
    url = raw_url.strip()

    # Allow users to paste domains without scheme
    if not re.match(r"^[a-zA-Z]+://", url):
        url = "http://" + url

    try:
        parsed = urlparse(url)
    except ValueError:
        signals.append(Signal(
            id="unparseable_url",
            label="URL could not be parsed",
            severity=Severity.HIGH,
            evidence=[raw_url],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))
        return signals, ThreatCategory.SUSPICIOUS_LINK

    host = (parsed.hostname or "").lower()
    if not host:
        signals.append(Signal(
            id="missing_host",
            label="URL has no hostname",
            severity=Severity.HIGH,
            evidence=[raw_url],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))
        return signals, ThreatCategory.SUSPICIOUS_LINK

    extracted = _TLD_EXTRACT(host)
    registered = f"{extracted.domain}.{extracted.suffix}" if extracted.suffix else extracted.domain
    subdomain = extracted.subdomain

    # --- IP literal host -----------------------------------------------------
    if _is_ip_literal(host):
        signals.append(Signal(
            id="ip_literal_host",
            label="URL points to a raw IP address instead of a domain",
            severity=Severity.CRITICAL,
            evidence=[host],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))

    # --- Non-HTTPS ----------------------------------------------------------
    if parsed.scheme == "http":
        signals.append(Signal(
            id="no_https",
            label="Connection is not encrypted (HTTP, not HTTPS)",
            severity=Severity.LOW,
            evidence=[f"scheme: {parsed.scheme}"],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))

    # --- Suspicious TLD ------------------------------------------------------
    if extracted.suffix in SUSPICIOUS_TLDS:
        signals.append(Signal(
            id="suspicious_tld",
            label="Domain uses a TLD frequently abused by scams",
            severity=Severity.HIGH,
            evidence=[f".{extracted.suffix}"],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))

    # --- URL shortener -------------------------------------------------------
    if registered in URL_SHORTENERS:
        signals.append(Signal(
            id="url_shortener",
            label="URL is a shortener — the real destination is hidden",
            severity=Severity.MEDIUM,
            evidence=[registered],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))

    # --- Brand impersonation / typosquatting --------------------------------
    # Two checks:
    #   (a) brand appears only in the SUBDOMAIN ("paypal.secure-login.xyz")
    #   (b) registered domain is 1-2 edits away from a known brand
    domain_label = extracted.domain.lower()
    for brand in IMPERSONATED_BRANDS:
        if brand in subdomain and brand != domain_label:
            signals.append(Signal(
                id="brand_in_subdomain",
                label=f"Uses the '{brand}' brand in the subdomain to look official",
                severity=Severity.CRITICAL,
                evidence=[host],
                category_hint=ThreatCategory.PHISHING,
            ))
            break
        dist = _levenshtein(domain_label, brand)
        if 0 < dist <= 2 and len(domain_label) >= 4:
            signals.append(Signal(
                id="typosquatting",
                label=f"Domain closely resembles '{brand}' (possible typosquatting)",
                severity=Severity.CRITICAL,
                evidence=[registered],
                category_hint=ThreatCategory.PHISHING,
            ))
            break

    # --- Excessive subdomains ------------------------------------------------
    if subdomain and subdomain.count(".") >= 2:
        signals.append(Signal(
            id="excessive_subdomains",
            label="URL has an unusually deep subdomain chain",
            severity=Severity.MEDIUM,
            evidence=[host],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))

    # --- Hyphen/digit noise in domain ---------------------------------------
    if domain_label.count("-") >= 2 or sum(c.isdigit() for c in domain_label) >= 3:
        signals.append(Signal(
            id="noisy_domain",
            label="Domain name contains unusual hyphen or digit patterns",
            severity=Severity.LOW,
            evidence=[registered],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))

    # --- Login/verify in path -----------------------------------------------
    path = parsed.path.lower()
    query = parsed.query.lower()
    lure_tokens = ["login", "verify", "secure", "account", "update", "confirm",
                   "banking", "signin", "wallet", "otp"]
    lure_hits = [t for t in lure_tokens if t in path or t in query]
    if lure_hits and extracted.suffix in SUSPICIOUS_TLDS:
        signals.append(Signal(
            id="lure_path_on_bad_tld",
            label="Login-style path on an abuse-prone domain",
            severity=Severity.HIGH,
            evidence=lure_hits,
            category_hint=ThreatCategory.PHISHING,
        ))

    # --- Punycode / lookalike chars -----------------------------------------
    if "xn--" in host:
        signals.append(Signal(
            id="punycode_host",
            label="Host uses punycode, which can hide lookalike characters",
            severity=Severity.HIGH,
            evidence=[host],
            category_hint=ThreatCategory.PHISHING,
        ))

    # --- Overall length ------------------------------------------------------
    if len(url) > 180:
        signals.append(Signal(
            id="very_long_url",
            label="URL is unusually long, which can be used to obscure targets",
            severity=Severity.LOW,
            evidence=[f"{len(url)} characters"],
            category_hint=ThreatCategory.SUSPICIOUS_LINK,
        ))

    category = _pick_category(signals)
    return signals, category


def _pick_category(signals: List[Signal]) -> ThreatCategory:
    if not signals:
        return ThreatCategory.NONE
    severity_rank = {
        Severity.LOW: 1, Severity.MEDIUM: 2,
        Severity.HIGH: 3, Severity.CRITICAL: 4,
    }
    tally: dict[ThreatCategory, int] = {}
    for sig in signals:
        if sig.category_hint:
            tally[sig.category_hint] = tally.get(sig.category_hint, 0) + severity_rank[sig.severity]
    if not tally:
        return ThreatCategory.SUSPICIOUS_LINK
    return max(tally.items(), key=lambda kv: kv[1])[0]
