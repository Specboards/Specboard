"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "specboard:settings:sections";

/**
 * Read the per-section collapsed map. A section with no entry falls back to its
 * `defaultCollapsed`, so an explicit "expanded" choice is distinguishable from
 * "never touched".
 */
function readState(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeState(id: string, collapsed: boolean) {
  try {
    const map = readState();
    map[id] = collapsed;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Persistence is best-effort.
  }
}

/**
 * A titled, bordered settings panel whose body collapses. The header keeps the
 * title and description visible even when collapsed, so a new user can scan all
 * of a settings page's sections at a glance and expand only the one they need.
 * Collapsed state persists per section id in localStorage; `defaultCollapsed`
 * applies only until the user first toggles it. Rendered with the default on
 * the server and reconciled after mount to avoid an SSR mismatch.
 */
export function CollapsibleSettingsGroup({
  id,
  title,
  description,
  defaultCollapsed = false,
  children,
}: {
  /** Stable storage id (e.g. "workflow"). */
  id: string;
  title: string;
  description: string;
  /** Collapsed state before the user has an explicit preference. */
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    const stored = readState()[id];
    setCollapsed(stored ?? defaultCollapsed);
  }, [id, defaultCollapsed]);

  function toggle() {
    setCollapsed((prev) => {
      writeState(id, !prev);
      return !prev;
    });
  }

  return (
    <section className="rounded-md border">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className={cn(
          "flex w-full items-start justify-between gap-3 px-5 py-4 text-left",
          collapsed ? "" : "border-b",
        )}
      >
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            collapsed ? "-rotate-90" : "",
          )}
        />
      </button>
      {collapsed ? null : <div className="space-y-8 p-5">{children}</div>}
    </section>
  );
}
