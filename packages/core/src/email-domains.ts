/**
 * Consumer ("freemail") email-domain blocking for sign-up.
 *
 * The hosted SaaS wants workspaces anchored to work email addresses, so
 * sign-ups from generic consumer providers can be rejected. Self-host
 * installs leave this off by default (an admin opts in via the
 * `SPECBOARD_BLOCK_PUBLIC_EMAIL_DOMAINS` setting), so testing with a
 * personal Outlook/Gmail address still works out of the box.
 */

/** Well-known consumer email providers blocked when the setting is on. */
export const CONSUMER_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "aol.com",
  "comcast.net",
  "duck.com",
  "fastmail.com",
  "gmail.com",
  "gmx.com",
  "gmx.net",
  "googlemail.com",
  "hey.com",
  "hotmail.co.uk",
  "hotmail.com",
  "hotmail.fr",
  "icloud.com",
  "live.com",
  "mac.com",
  "mail.com",
  "mail.ru",
  "me.com",
  "msn.com",
  "outlook.com",
  "pm.me",
  "proton.me",
  "protonmail.com",
  "qq.com",
  "rocketmail.com",
  "tutanota.com",
  "yahoo.co.uk",
  "yahoo.com",
  "yandex.com",
  "ymail.com",
  "zoho.com",
]);

/** Extract the domain of an email address, lowercased; null if malformed. */
export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/**
 * True when the address should be rejected at sign-up: its domain is on the
 * blocklist, or it is malformed (no parseable domain). Subdomains of blocked
 * domains (e.g. `foo.gmail.com`) are rejected too.
 */
export function isBlockedEmailDomain(
  email: string,
  blocklist: ReadonlySet<string> = CONSUMER_EMAIL_DOMAINS,
): boolean {
  const domain = emailDomain(email);
  if (!domain) return true;
  if (blocklist.has(domain)) return true;
  for (const blocked of blocklist) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}
