/**
 * Human-readable labels for the backend's signal IDs. Kept in one place so the
 * Insights dashboard doesn't leak internal identifiers into the UI.
 */
export const SIGNAL_LABELS: Record<string, string> = {
  // Message
  credential_request: "Credential or OTP request",
  urgency_pressure: "Urgency or time pressure",
  brand_impersonation: "Brand impersonation",
  reward_bait: "Prize or reward bait",
  financial_fraud_wording: "Financial fraud wording",
  coercive_threat: "Coercive threat",
  url_plus_pressure: "Link + pressure combo",
  // Link
  ip_literal_host: "Raw IP host",
  no_https: "No HTTPS",
  suspicious_tld: "Abuse-prone TLD",
  url_shortener: "URL shortener",
  brand_in_subdomain: "Brand in subdomain",
  typosquatting: "Typosquatted domain",
  excessive_subdomains: "Excessive subdomains",
  noisy_domain: "Noisy domain name",
  lure_path_on_bad_tld: "Lure path on bad TLD",
  punycode_host: "Punycode hostname",
  very_long_url: "Very long URL",
  unparseable_url: "Unparseable URL",
  missing_host: "Missing hostname",
  // Job offer
  unrealistic_pay: "Unrealistic pay",
  upfront_fee: "Upfront fee request",
  rushed_hiring: "Rushed hiring",
  premature_pii: "Premature PII request",
  vague_role: "Vague role (scam template)",
  off_channel_contact: "Off-channel contact push",
  free_email_recruiter: "Free-email recruiter",
  no_verifiable_company: "No verifiable company",
};

export function signalLabel(id: string): string {
  return SIGNAL_LABELS[id] ?? id.replace(/_/g, " ");
}
