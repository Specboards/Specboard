"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import type { StatusWorkflow } from "@specboard/core";

import type { ProductTag } from "@/components/feature-card";
import { ReleaseDetailSheet } from "@/components/release-detail-sheet";
import { StatusDot } from "@/components/status-dot";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthRequiredError, patchFeature } from "@/lib/api-client";
import { statusLabel } from "@/lib/feature-helpers";
import { itemPath } from "@/lib/org-path";
import { productColorClasses } from "@/lib/product-color";
import type { FeatureRecord, ReleaseRecord } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const COL_PREFIX = "rel:";
const UNSCHEDULED = "__unscheduled__";

const RELEASE_STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
};

/** A roadmap column: one release, or the trailing "Unscheduled" bucket. */
export type RoadmapColumn = {
  releaseId: string | null;
  name: string;
  startDate: string | null;
  targetDate: string | null;
  status: string | null;
  /** The full release record (for the detail panel); null for Unscheduled. */
  release: ReleaseRecord | null;
};

/**
 * Interactive Roadmap: items grouped into release columns. Editors drag a card
 * into another release column to schedule it there (or into Unscheduled to
 * clear it); the drop optimistically re-places the card, persists the new
 * `releaseId`, then revalidates. Clicking a release heading opens its detail
 * panel, which is where the Release / Edit / Delete actions live.
 */
export function RoadmapBoard({
  columns,
  features,
  workflow,
  productsById,
  org,
  productSlug,
  allowDrag,
  isAdmin,
}: {
  columns: RoadmapColumn[];
  features: FeatureRecord[];
  workflow: StatusWorkflow;
  productsById?: Record<string, ProductTag>;
  org: string;
  productSlug: string;
  /** Whether items can be re-scheduled by dragging (editors, active view). */
  allowDrag: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [placement, setPlacement] = useState<Record<string, string | null>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailReleaseId, setDetailReleaseId] = useState<string | null>(null);

  // Re-seed from the server whenever fresh features arrive (after a drop's
  // refresh, or an edit elsewhere). Placement holds only optimistic overrides
  // between a drop and its refresh; clearing it falls back to server truth.
  useEffect(() => {
    setPlacement({});
  }, [features]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const releaseOf = (f: FeatureRecord): string | null =>
    f.specId in placement ? placement[f.specId]! : f.releaseId;

  const byColumn = useMemo(() => {
    const map = new Map<string, FeatureRecord[]>();
    for (const c of columns) map.set(c.releaseId ?? UNSCHEDULED, []);
    for (const f of features) {
      const key = releaseOf(f) ?? UNSCHEDULED;
      map.get(key)?.push(f);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, features, placement]);

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const specId = String(active.id);
    const feature = features.find((f) => f.specId === specId);
    if (!feature) return;

    const overId = String(over.id);
    if (!overId.startsWith(COL_PREFIX)) return;
    const key = overId.slice(COL_PREFIX.length);
    const targetReleaseId = key === UNSCHEDULED ? null : key;

    if (releaseOf(feature) === targetReleaseId) return; // no-op

    const prev = placement;
    setPlacement({ ...placement, [specId]: targetReleaseId });
    patchFeature(specId, { releaseId: targetReleaseId })
      .then(() => router.refresh())
      .catch((err) => {
        setPlacement(prev);
        if (err instanceof AuthRequiredError) {
          router.push(
            `/sign-in?from=${encodeURIComponent(window.location.pathname)}`,
          );
          return;
        }
        toast.error(err instanceof Error ? err.message : "Move failed.");
      });
  }

  const activeFeature = activeId
    ? (features.find((f) => f.specId === activeId) ?? null)
    : null;
  const detailRelease =
    columns.find((c) => c.release?.id === detailReleaseId)?.release ?? null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {columns.map((column) => (
            <Column
              key={column.releaseId ?? UNSCHEDULED}
              column={column}
              items={byColumn.get(column.releaseId ?? UNSCHEDULED) ?? []}
              workflow={workflow}
              productsById={productsById}
              org={org}
              productSlug={productSlug}
              allowDrag={allowDrag}
              onOpenDetail={setDetailReleaseId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeFeature ? (
            <CardBody
              feature={activeFeature}
              workflow={workflow}
              productsById={productsById}
              org={org}
              productSlug={productSlug}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <ReleaseDetailSheet
        release={detailRelease}
        isAdmin={isAdmin}
        onClose={() => setDetailReleaseId(null)}
      />
    </>
  );
}

function Column({
  column,
  items,
  workflow,
  productsById,
  org,
  productSlug,
  allowDrag,
  onOpenDetail,
}: {
  column: RoadmapColumn;
  items: FeatureRecord[];
  workflow: StatusWorkflow;
  productsById?: Record<string, ProductTag>;
  org: string;
  productSlug: string;
  allowDrag: boolean;
  onOpenDetail: (releaseId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${COL_PREFIX}${column.releaseId ?? UNSCHEDULED}`,
  });
  const dates = formatReleaseDates(column.startDate, column.targetDate);
  const statusLabelText =
    column.status && column.status !== "planned"
      ? (RELEASE_STATUS_LABELS[column.status] ?? column.status)
      : null;

  return (
    <div className="space-y-2">
      {/* Heading: release name on top, dates (and non-default status) beneath. */}
      <div className="space-y-0.5 px-1">
        <div className="flex items-baseline justify-between gap-2">
          {column.release ? (
            <button
              type="button"
              onClick={() => onOpenDetail(column.release!.id)}
              className="text-left text-sm font-medium hover:underline"
            >
              {column.name}
            </button>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {column.name}
            </span>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {items.length}
          </span>
        </div>
        {dates || statusLabelText ? (
          <p className="text-xs text-muted-foreground">
            {dates}
            {dates && statusLabelText ? " · " : ""}
            {statusLabelText}
          </p>
        ) : null}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-16 space-y-2 rounded-md p-1 transition-colors",
          isOver ? "bg-muted/60" : "",
        )}
      >
        {items.map((f) => (
          <DraggableCard
            key={f.specId}
            feature={f}
            workflow={workflow}
            productsById={productsById}
            org={org}
            productSlug={productSlug}
            allowDrag={allowDrag}
          />
        ))}
        {items.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">Empty</p>
        ) : null}
      </div>
    </div>
  );
}

function DraggableCard({
  feature,
  workflow,
  productsById,
  org,
  productSlug,
  allowDrag,
}: {
  feature: FeatureRecord;
  workflow: StatusWorkflow;
  productsById?: Record<string, ProductTag>;
  org: string;
  productSlug: string;
  allowDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: feature.specId,
    disabled: !allowDrag,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={allowDrag ? "cursor-grab active:cursor-grabbing" : ""}
      {...(allowDrag ? attributes : {})}
      {...(allowDrag ? listeners : {})}
    >
      <CardBody
        feature={feature}
        workflow={workflow}
        productsById={productsById}
        org={org}
        productSlug={productSlug}
      />
    </div>
  );
}

/** Presentational roadmap card (shared by the column list and the drag overlay). */
function CardBody({
  feature,
  workflow,
  productsById,
  org,
  productSlug,
  dragging,
}: {
  feature: FeatureRecord;
  workflow: StatusWorkflow;
  productsById?: Record<string, ProductTag>;
  org: string;
  productSlug: string;
  dragging?: boolean;
}) {
  const product =
    productsById && feature.productId ? productsById[feature.productId] : undefined;
  return (
    <Card className={cn("rounded-lg shadow-sm", dragging && "shadow-md")}>
      <CardHeader className="space-y-1 p-3">
        {product ? (
          <Badge
            variant="secondary"
            className={cn(
              "w-fit border-transparent text-[10px]",
              productColorClasses(product).badge,
            )}
          >
            {product.name}
          </Badge>
        ) : null}
        <CardTitle className="text-sm">
          <Link
            href={itemPath(org, productSlug, feature)}
            className="hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {feature.title}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-xs">
          <StatusDot status={feature.status} />
          {statusLabel(feature.status, workflow)}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/** Render a release's date range as "start → ship", omitting missing ends. */
function formatReleaseDates(
  startDate: string | null,
  targetDate: string | null,
): string | null {
  if (startDate && targetDate) return `${startDate} → ${targetDate}`;
  if (targetDate) return `→ ${targetDate}`;
  if (startDate) return `${startDate} →`;
  return null;
}
