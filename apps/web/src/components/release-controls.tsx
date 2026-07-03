"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AuthRequiredError, createRelease, deleteRelease } from "@/lib/api-client";

/**
 * "New release" button + drawer on the Roadmap. Releases are workspace-wide
 * ship vehicles; items are scheduled into one from their detail page or the
 * board edit drawer.
 */
export function ReleaseCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    const targetDate = String(data.get("targetDate") ?? "") || null;
    startTransition(async () => {
      setError(null);
      try {
        await createRelease({ name, targetDate });
        toast.success("Release created");
        setOpen(false);
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          router.push(
            `/sign-in?from=${encodeURIComponent(window.location.pathname)}`,
          );
          return;
        }
        setError(err instanceof Error ? err.message : "Create failed.");
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        New release
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New release</SheetTitle>
          </SheetHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Name
              </span>
              <Input name="name" autoFocus placeholder="e.g. v0.4" className="h-8" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Target date (optional)
              </span>
              <Input name="targetDate" type="date" className="h-8" />
            </label>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creating…" : "Create release"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Small per-release delete control (admin); items are unscheduled, not deleted. */
export function ReleaseDelete({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !window.confirm(
        `Delete the "${name}" release? Its items stay on the board, unscheduled.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteRelease(id);
        toast.success("Release deleted");
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          router.push(
            `/sign-in?from=${encodeURIComponent(window.location.pathname)}`,
          );
          return;
        }
        toast.error(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      aria-label={`Delete release ${name}`}
    >
      Delete
    </button>
  );
}
