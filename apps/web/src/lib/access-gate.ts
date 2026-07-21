import { and, eq, invitations, sql, type Database } from "@specboard/db";

/**
 * Pre-v1 the hosted service is invite-only: public sign-up is closed and access
 * is granted by sending an org invitation (see invitations-service). This gate
 * enforces that at the auth layer so someone can't bypass the marketing site's
 * "Request access" flow by navigating straight to /sign-up.
 *
 * Enabled on the hosted SaaS via `SPECBOARDS_INVITE_ONLY`; off by default so
 * self-host deployments keep open sign-up. Independent of
 * `SPECBOARDS_BLOCK_PUBLIC_EMAIL_DOMAINS` (which only restricts *which* domains).
 */
export function inviteOnlyEnabled(): boolean {
  const value = process.env.SPECBOARDS_INVITE_ONLY?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/**
 * True when `email` has at least one invitation that is still redeemable: status
 * `pending` and not past its expiry. Matches the redemption rules in
 * invitations-service so the gate and the redeem path agree. Emails are stored
 * lowercased, so we compare case-insensitively.
 */
export async function hasValidPendingInvitation(
  db: Database,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const [row] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        sql`lower(${invitations.email}) = ${normalized}`,
        eq(invitations.status, "pending"),
        sql`${invitations.expiresAt} > now()`,
      ),
    )
    .limit(1);
  return Boolean(row);
}
