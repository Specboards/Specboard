import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { updateFeatureMeta } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusDot } from "@/components/status-dot";
import { statusLabel, statusOptions } from "@/lib/feature-helpers";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Feature detail: the spec markdown (canonical in git) beside the metadata
 * sidebar (status/priority/quarter/tags, persisted to the metadata store).
 */
export default async function FeaturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStore();
  const feature = await store.getFeature(id);
  if (!feature) notFound();

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <article>
        <div className="mb-6 space-y-1">
          <Link
            href="/backlog"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Backlog
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {feature.title}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {feature.path}
          </p>
        </div>
        <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
          <ReactMarkdown>{feature.content}</ReactMarkdown>
        </div>
      </article>

      <aside className="space-y-4 lg:border-l lg:pl-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <StatusDot status={feature.status} />
          {statusLabel(feature.status)}
        </div>
        <Separator />
        <form
          action={updateFeatureMeta.bind(null, feature.specId)}
          className="space-y-3"
        >
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Status
            </span>
            <Select name="status" defaultValue={feature.status} className="h-8">
              {statusOptions(feature.status).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Priority (0 = highest)
            </span>
            <Input
              name="priority"
              type="number"
              min={0}
              max={4}
              defaultValue={feature.priority ?? ""}
              className="h-8"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Roadmap quarter
            </span>
            <Input
              name="roadmapQuarter"
              placeholder="2026-Q3"
              defaultValue={feature.roadmapQuarter ?? ""}
              className="h-8"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Tags (comma-separated)
            </span>
            <Input
              name="tags"
              defaultValue={feature.tags.join(", ")}
              className="h-8"
            />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save metadata
          </Button>
        </form>
        <Separator />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {feature.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            spec id: {feature.specId}
          </p>
        </div>
      </aside>
    </section>
  );
}
