import { signatureHeader } from "@/lib/webhooks/signing";
import { assertPublicUrl } from "@/lib/webhooks/ssrf";
import type { WebhookEnvelope } from "@/lib/webhooks/types";

/**
 * POST one signed envelope to an endpoint. Shared by the outbox drainer and the
 * "send test event" action so signing, headers, the SSRF re-check, and the
 * timeout are identical for real and test deliveries. Takes the *plaintext*
 * secret (callers decrypt). `blocked` marks a terminal SSRF rejection the caller
 * should not retry.
 */

const TIMEOUT_MS = 5_000;

export type SendResult =
  | { ok: true; statusCode: number }
  | { ok: false; statusCode: number | null; error: string; blocked?: boolean };

export async function postSignedEnvelope(
  url: string,
  secret: string,
  envelope: WebhookEnvelope,
): Promise<SendResult> {
  const check = await assertPublicUrl(url);
  if (!check.ok) {
    return { ok: false, statusCode: null, error: check.reason, blocked: true };
  }

  const rawBody = JSON.stringify(envelope);
  const t = Math.floor(Date.now() / 1000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Specboard-Webhooks/1.0",
        "X-Specboard-Event": envelope.type,
        "X-Specboard-Delivery": envelope.id,
        "X-Specboard-Signature": signatureHeader(secret, rawBody, t),
      },
      body: rawBody,
      redirect: "manual", // never follow a 30x to a possibly-private target
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, statusCode: res.status };
    }
    return {
      ok: false,
      statusCode: res.status,
      error: `Endpoint returned HTTP ${res.status}.`,
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: null,
      error: err instanceof Error ? err.message : "Request failed.",
    };
  }
}
