"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AuthRequiredError, saveBoardPreferences } from "@/lib/api-client";
import type { CardFieldDef } from "@/lib/card-fields";

/**
 * Board toolbar control to customize which fields show on a card and which
 * custom field is "featured". Persists per-user via the board-preferences API.
 */
export function CardFieldsMenu({
  catalog,
  customFields,
  selected,
  featured,
}: {
  catalog: CardFieldDef[];
  /** Custom fields (key + label) that can be featured. */
  customFields: { key: string; label: string }[];
  selected: string[];
  featured: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set(selected));
  const [feat, setFeat] = useState<string | null>(featured);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  async function persist(nextChosen: Set<string>, nextFeatured: string | null) {
    // Keep stored order stable (catalog order); the API de-dupes.
    const cardFields = catalog.map((f) => f.key).filter((k) => nextChosen.has(k));
    setSaving(true);
    try {
      await saveBoardPreferences({ cardFields, featured: nextFeatured });
      router.refresh();
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.push(`/sign-in?from=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      toast.error(err instanceof Error ? err.message : "Couldn't save preferences.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: string) {
    const next = new Set(chosen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChosen(next);
    void persist(next, feat);
  }

  function changeFeatured(value: string) {
    const next = value || null;
    setFeat(next);
    void persist(chosen, next);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Settings2 />
        Card fields
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-60 rounded-md border bg-background p-3 shadow-md">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Show on cards
          </p>
          <div className="space-y-1.5">
            {catalog.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosen.has(f.key)}
                  onChange={() => toggle(f.key)}
                  disabled={saving}
                  className="size-3.5"
                />
                {f.label}
              </label>
            ))}
          </div>
          {customFields.length > 0 ? (
            <div className="mt-3 space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                Featured field
              </p>
              <Select
                value={feat ?? ""}
                onChange={(e) => changeFeatured(e.target.value)}
                disabled={saving}
                className="h-8 text-xs"
              >
                <option value="">None</option>
                {customFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
