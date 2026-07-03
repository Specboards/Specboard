"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "specboard:item-detail:collapsed";

function readCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeCollapsed(id: string, collapsed: boolean) {
  try {
    const set = readCollapsed();
    if (collapsed) set.add(id);
    else set.delete(id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Persistence is best-effort.
  }
}

/**
 * A titled, collapsible section of the work item detail view (Metadata /
 * Details / Integrations). The collapsed state persists per section id in
 * localStorage, so it survives navigation and new sessions. Rendered expanded
 * on the server and reconciled after mount to avoid an SSR mismatch.
 */
export function DetailSection({
  id,
  title,
  children,
}: {
  /** Stable storage id, shared across items (e.g. "metadata"). */
  id: string;
  title: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed().has(id));
  }, [id]);

  function toggle() {
    setCollapsed((prev) => {
      writeCollapsed(id, !prev);
      return !prev;
    });
  }

  return (
    <section className="rounded-lg border">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            collapsed ? "-rotate-90" : "",
          )}
        />
      </button>
      {collapsed ? null : <div className="border-t px-4 py-4">{children}</div>}
    </section>
  );
}
