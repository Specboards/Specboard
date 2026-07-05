import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for user-supplied webhook URLs. On a hosted multi-tenant app the
 * endpoint URL is attacker-controllable, so a naive `fetch` is a server-side
 * request forgery primitive: it could hit the cloud metadata IP, internal
 * services, or loopback. We require HTTPS, reject URLs whose host is (or
 * resolves to) a private / loopback / link-local / metadata address, and the
 * caller disallows redirects so a 30x can't bounce to a private target.
 *
 * Known residual gap (documented, acceptable for V1): DNS rebinding between this
 * check and the actual connection. Closing it fully means pinning the connection
 * to the validated IP, which the platform `fetch` doesn't expose.
 */

export type UrlCheck = { ok: true } | { ok: false; reason: string };

/** True if `ip` (v4 or v6 literal) is in a range we must never call out to. */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) return isBlockedIpv6(ip);
  return true; // not a parseable IP → treat as blocked
}

function isBlockedIpv4(ip: string): boolean {
  const o = ip.split(".").map((n) => Number(n));
  if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const a = o[0]!;
  const b = o[1]!;
  if (a === 0) return true; // 0.0.0.0/8 (incl. "this host")
  if (a === 10) return true; // 10/8 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 private
  if (a === 192 && b === 168) return true; // 192.168/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a >= 224) return true; // multicast / reserved / broadcast
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0] ?? ""; // strip any zone id
  if (addr === "::" || addr === "::1") return true; // unspecified / loopback
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible: re-check the v4 part.
  const mapped = addr.match(/(?:::ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isBlockedIpv4(mapped[1]);
  const head = addr.split(":")[0] ?? "";
  if (head.startsWith("fc") || head.startsWith("fd")) return true; // fc00::/7 ULA
  if (head.startsWith("fe8") || head.startsWith("fe9") || head.startsWith("fea") || head.startsWith("feb")) {
    return true; // fe80::/10 link-local
  }
  if (head.startsWith("ff")) return true; // ff00::/8 multicast
  return false;
}

/**
 * Validate a webhook target URL: HTTPS only, well-formed, and neither a literal
 * blocked IP nor a hostname that resolves to one. Resolves every A/AAAA record
 * and blocks if any is private (a single public record is not enough to be safe).
 */
export async function assertPublicUrl(raw: string): Promise<UrlCheck> {
  // Self-host / test escape hatch: when set, allow http and private targets so a
  // self-hosted install can hit internal services (and e2e can hit a local
  // receiver). OFF by default, so the hosted multi-tenant app stays locked down.
  const allowPrivate = process.env.SPECBOARD_WEBHOOK_ALLOW_PRIVATE === "1";

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Not a valid URL." };
  }
  if (url.protocol !== "https:" && !(allowPrivate && url.protocol === "http:")) {
    return { ok: false, reason: "Webhook URLs must use https." };
  }
  if (allowPrivate) return { ok: true };
  const host = url.hostname;

  // Literal IP host: check directly, no DNS.
  if (isIP(host)) {
    return isBlockedIp(host)
      ? { ok: false, reason: "URL points at a private or reserved address." }
      : { ok: true };
  }

  // Hostname: resolve and reject if any resolved address is blocked.
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    return { ok: false, reason: "Could not resolve the host." };
  }
  if (addrs.length === 0) return { ok: false, reason: "Host did not resolve." };
  for (const { address } of addrs) {
    if (isBlockedIp(address)) {
      return { ok: false, reason: "Host resolves to a private or reserved address." };
    }
  }
  return { ok: true };
}
