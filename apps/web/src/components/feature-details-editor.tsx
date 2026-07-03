"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { MarkdownEditor } from "@/components/markdown-editor";
import { Button } from "@/components/ui/button";
import { AuthRequiredError, patchFeature } from "@/lib/api-client";

/**
 * Edit a DB-native item's Details body (Markdown) after creation. The rich-text
 * editor is remounted on each successful save so it re-seeds from the persisted
 * value. Spec-backed items don't use this: their body lives in git.
 */
export function FeatureDetailsEditor({
  specId,
  initial,
}: {
  specId: string;
  /** Current Markdown body. */
  initial: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Bump to remount the editor after a save so it reflects the saved value and
  // the dirty check resets.
  const [rev, setRev] = useState(0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const details = String(new FormData(e.currentTarget).get("details") ?? "");
    startTransition(async () => {
      try {
        await patchFeature(specId, { details: details.trim() ? details : null });
        toast.success("Details saved");
        setRev((r) => r + 1);
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          router.push(
            `/sign-in?from=${encodeURIComponent(window.location.pathname)}`,
          );
          return;
        }
        toast.error(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <MarkdownEditor
        key={rev}
        name="details"
        defaultValue={initial}
        placeholder="Describe the problem to solve, or the spec…"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
