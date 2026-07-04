"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { ideaStatusLabel, type IdeaStage } from "@specboard/core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AuthRequiredError,
  createIdea,
  deleteIdea,
  promoteIdea,
  setIdeaVote,
  updateIdea,
} from "@/lib/api-client";
import { orgProductPath } from "@/lib/org-path";
import type { IdeaRecord } from "@/lib/store/types";
import { cn } from "@/lib/utils";

/**
 * The internal Ideas view: capture, vote, triage, and promote. Interactive
 * (vote/status/promote hit /api/v1 and refresh), so the whole board is a client
 * component seeded from the server-rendered list.
 */
export function IdeasBoard({
  ideas,
  stages,
  canEdit,
  org,
  productSlug,
  defaultProductId,
  products,
  productsById,
}: {
  ideas: IdeaRecord[];
  stages: readonly IdeaStage[];
  canEdit: boolean;
  org: string;
  productSlug: string;
  /** Owning product for new ideas, or null in the cross-product ("all") view. */
  defaultProductId: string | null;
  products: { id: string; name: string }[];
  /** product id → name, for cross-product tags (undefined in single-product view). */
  productsById?: Record<string, string>;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Ideas</h1>
          <p className="text-xs text-muted-foreground">
            Capture requests and feedback, vote on what matters, and promote the
            best into feature work.
          </p>
        </div>
        {canEdit ? (
          <IdeaCreate
            defaultProductId={defaultProductId}
            products={products}
            showProductPicker={defaultProductId === null}
          />
        ) : null}
      </div>

      {ideas.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No ideas yet.
          {canEdit ? " Capture the first one to start collecting demand." : ""}
        </p>
      ) : (
        <ul className="space-y-2">
          {ideas.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              stages={stages}
              canEdit={canEdit}
              org={org}
              productSlug={productSlug}
              productName={
                productsById && idea.productId
                  ? productsById[idea.productId]
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** "New idea" button + capture drawer. */
function IdeaCreate({
  defaultProductId,
  products,
  showProductPicker,
}: {
  defaultProductId: string | null;
  products: { id: string; name: string }[];
  showProductPicker: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) {
      setError("Title is required.");
      return;
    }
    const description = String(data.get("description") ?? "").trim() || null;
    const productId = showProductPicker
      ? String(data.get("productId") ?? "") || null
      : defaultProductId;
    startTransition(async () => {
      setError(null);
      try {
        await createIdea({ title, description, productId });
        toast.success("Idea captured");
        setOpen(false);
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          router.push(
            `/sign-in?from=${encodeURIComponent(window.location.pathname)}`,
          );
          return;
        }
        setError(err instanceof Error ? err.message : "Capture failed.");
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New idea
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New idea</SheetTitle>
          </SheetHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Title
              </span>
              <Input
                name="title"
                autoFocus
                placeholder="e.g. Bulk-edit statuses from the board"
                className="h-8"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Details
              </span>
              <Textarea
                name="description"
                rows={5}
                placeholder="What's the request, and who's asking for it?"
              />
            </label>
            {showProductPicker && products.length > 0 ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Product
                </span>
                <Select name="productId" className="h-8">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Capturing…" : "Capture idea"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** One idea: vote control, title, status, and (for editors) triage actions. */
function IdeaRow({
  idea,
  stages,
  canEdit,
  org,
  productSlug,
  productName,
}: {
  idea: IdeaRecord;
  stages: readonly IdeaStage[];
  canEdit: boolean;
  org: string;
  productSlug: string;
  productName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic vote state so the button reacts instantly; the server value
  // re-seeds on the next refresh.
  const [voted, setVoted] = useState(idea.viewerHasVoted);
  const [votes, setVotes] = useState(idea.voteCount);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthRequiredError) {
      router.push(`/sign-in?from=${encodeURIComponent(window.location.pathname)}`);
      return true;
    }
    return false;
  }

  function toggleVote() {
    const next = !voted;
    setVoted(next);
    setVotes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      try {
        await setIdeaVote(idea.id, next);
        router.refresh();
      } catch (err) {
        // Roll back the optimistic change on failure.
        setVoted(!next);
        setVotes((n) => n + (next ? -1 : 1));
        if (handleAuthError(err)) return;
        toast.error(err instanceof Error ? err.message : "Vote failed.");
      }
    });
  }

  function changeStatus(status: string) {
    startTransition(async () => {
      try {
        await updateIdea(idea.id, { status });
        toast.success("Status updated");
        router.refresh();
      } catch (err) {
        if (handleAuthError(err)) return;
        toast.error(err instanceof Error ? err.message : "Update failed.");
      }
    });
  }

  function promote() {
    if (
      !window.confirm(
        `Promote "${idea.title}" into a feature? It's added to the backlog and linked back here.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await promoteIdea(idea.id);
        toast.success("Promoted to a feature");
        router.refresh();
      } catch (err) {
        if (handleAuthError(err)) return;
        toast.error(err instanceof Error ? err.message : "Promote failed.");
      }
    });
  }

  function remove() {
    if (!window.confirm(`Delete the idea "${idea.title}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteIdea(idea.id);
        toast.success("Idea deleted");
        router.refresh();
      } catch (err) {
        if (handleAuthError(err)) return;
        toast.error(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  // The bare /backlog/{specId} permalink redirects to the canonical typed URL,
  // so we can link the promoted feature without knowing its level.
  const promotedHref = idea.promotedFeatureSpecId
    ? orgProductPath(org, productSlug, `/backlog/${idea.promotedFeatureSpecId}`)
    : null;

  const by =
    idea.submitterName ?? idea.authorName ?? null;

  return (
    <li className="flex items-start gap-3 rounded-lg border bg-background p-3">
      <button
        type="button"
        onClick={toggleVote}
        disabled={pending}
        aria-pressed={voted}
        aria-label={voted ? "Remove your vote" : "Vote for this idea"}
        className={cn(
          "flex w-12 shrink-0 flex-col items-center rounded-md border py-1 transition-colors",
          voted
            ? "border-primary bg-primary/10 text-primary"
            : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        )}
      >
        <ChevronUp className="size-4" />
        <span className="text-sm font-semibold tabular-nums">{votes}</span>
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{idea.title}</span>
          {productName ? (
            <Badge variant="secondary" className="text-[10px]">
              {productName}
            </Badge>
          ) : null}
        </div>
        {idea.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {idea.description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {by ? <span>by {by}</span> : null}
          {promotedHref ? (
            <Link href={promotedHref} className="text-primary hover:underline">
              Promoted → {idea.promotedFeatureTitle ?? "feature"}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canEdit ? (
          <Select
            value={idea.status}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={pending}
            className="h-8 w-36"
            aria-label={`Status of ${idea.title}`}
          >
            {stages.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        ) : (
          <Badge variant="outline">{ideaStatusLabel(idea.status, stages)}</Badge>
        )}
        {canEdit && !idea.promotedFeatureSpecId ? (
          <Button
            size="sm"
            variant="outline"
            onClick={promote}
            disabled={pending}
          >
            Promote
          </Button>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
            aria-label={`Delete ${idea.title}`}
          >
            Delete
          </button>
        ) : null}
      </div>
    </li>
  );
}
