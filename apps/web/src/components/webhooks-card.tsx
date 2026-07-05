"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
} from "@/lib/webhooks/types";

/** Endpoint shape the settings page serializes down (mirrors the store summary). */
export interface WebhookEndpointView {
  id: string;
  url: string;
  productId: string | null;
  eventTypes: string[];
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

type Status = { kind: "ok" | "error"; message: string } | null;

const ALL_PRODUCTS = "__all__";

export function WebhooksCard({
  initialEndpoints,
  products,
}: {
  initialEndpoints: WebhookEndpointView[];
  products: { id: string; name: string }[];
}) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState<string>(ALL_PRODUCTS);
  const [events, setEvents] = useState<Set<WebhookEventType>>(new Set());
  const [status, setStatus] = useState<Status>(null);
  const [created, setCreated] = useState<{ url: string; secret: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const productName = (id: string | null) =>
    id === null ? "All products" : (products.find((p) => p.id === id)?.name ?? "Unknown product");

  function toggleEvent(type: WebhookEventType) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function create() {
    if (!url.trim()) {
      setStatus({ kind: "error", message: "Enter an https delivery URL." });
      return;
    }
    if (events.size === 0) {
      setStatus({ kind: "error", message: "Select at least one event." });
      return;
    }
    setStatus(null);
    startTransition(async () => {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim() || null,
          productId: productId === ALL_PRODUCTS ? null : productId,
          eventTypes: [...events],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({ kind: "error", message: body.error ?? "Could not create the endpoint." });
        return;
      }
      const body = (await res.json()) as {
        endpoint: WebhookEndpointView;
        secret: string;
      };
      setCreated({ url: body.endpoint.url, secret: body.secret });
      setEndpoints((prev) => [body.endpoint, ...prev]);
      setUrl("");
      setDescription("");
      setProductId(ALL_PRODUCTS);
      setEvents(new Set());
    });
  }

  function toggleActive(ep: WebhookEndpointView) {
    startTransition(async () => {
      const res = await fetch(`/api/v1/webhooks/${ep.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !ep.active }),
      });
      if (!res.ok) {
        setStatus({ kind: "error", message: "Could not update the endpoint." });
        return;
      }
      const body = (await res.json()) as { endpoint: WebhookEndpointView };
      setEndpoints((prev) => prev.map((e) => (e.id === ep.id ? body.endpoint : e)));
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setStatus({ kind: "error", message: "Could not delete the endpoint." });
        return;
      }
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
    });
  }

  function sendTest(id: string) {
    setStatus(null);
    startTransition(async () => {
      const res = await fetch(`/api/v1/webhooks/${id}/test`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        statusCode?: number | null;
        error?: string;
      };
      if (res.ok && body.ok) {
        setStatus({
          kind: "ok",
          message: `Test delivered (HTTP ${body.statusCode}).`,
        });
      } else {
        setStatus({
          kind: "error",
          message: `Test failed: ${body.error ?? "no response"}${
            body.statusCode ? ` (HTTP ${body.statusCode})` : ""
          }.`,
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        <CardDescription>
          Register HTTPS endpoints that receive a signed POST when items and
          releases change. Each delivery is signed with the endpoint&rsquo;s
          secret (HMAC-SHA256 over <code>{"{timestamp}.{body}"}</code>, sent as
          the <code>X-Specboard-Signature</code> header). The secret is shown
          once, at creation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {created && (
          <div className="space-y-2 rounded-md border border-brand/40 bg-brand/5 p-3">
            <p className="text-sm font-medium">
              Endpoint created. Copy the signing secret now; you won&rsquo;t see
              it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                {created.secret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard?.writeText(created.secret)}
              >
                Copy
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreated(null)}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Create form */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1">
            <label htmlFor="wh-url" className="text-xs text-muted-foreground">
              Delivery URL (https)
            </label>
            <Input
              id="wh-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hooks/specboard"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="wh-product" className="text-xs text-muted-foreground">
                Product
              </label>
              <Select
                id="wh-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value={ALL_PRODUCTS}>All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="wh-desc" className="text-xs text-muted-foreground">
                Description (optional)
              </label>
              <Input
                id="wh-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Zapier deploy notifier"
                maxLength={200}
              />
            </div>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-xs text-muted-foreground">Events</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {WEBHOOK_EVENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={events.has(type)}
                    onChange={() => toggleEvent(type)}
                    className="size-4 rounded border-input"
                  />
                  {WEBHOOK_EVENT_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={create} disabled={pending}>
              Add endpoint
            </Button>
            {status && (
              <p
                className={`text-xs ${
                  status.kind === "ok" ? "text-muted-foreground" : "text-destructive"
                }`}
              >
                {status.message}
              </p>
            )}
          </div>
        </div>

        {/* List */}
        {endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No endpoints yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {endpoints.map((ep) => (
              <li key={ep.id} className="space-y-1.5 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ep.url}</p>
                    <p className="text-xs text-muted-foreground">
                      {productName(ep.productId)} ·{" "}
                      {ep.eventTypes
                        .map((t) => WEBHOOK_EVENT_LABELS[t as WebhookEventType] ?? t)
                        .join(", ")}
                      {ep.description ? ` · ${ep.description}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      ep.active
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ep.active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => sendTest(ep.id)}
                    disabled={pending}
                  >
                    Send test
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(ep)}
                    disabled={pending}
                  >
                    {ep.active ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(ep.id)}
                    disabled={pending}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
