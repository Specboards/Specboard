"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
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
import { GripVertical } from "lucide-react";
import { toast } from "sonner";

import {
  descendantGroupIds,
  MAX_GROUP_DEPTH,
  PRODUCT_COLORS,
  resolveProductColor,
  wouldCreateCycle,
  wouldExceedDepth,
  type ProductColor,
} from "@specboard/core";

import { ProductMembers } from "@/components/product-members";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  AuthRequiredError,
  createProduct,
  createProductGroup,
  deleteProduct,
  deleteProductGroup,
  updateProduct,
  updateProductGroup,
} from "@/lib/api-client";
import { colorDot, productColorClasses } from "@/lib/product-color";
import type {
  ProductGroupPatch,
  ProductGroupRecord,
  ProductRecord,
  ProductVisibility,
} from "@/lib/store/types";
import { cn } from "@/lib/utils";

type Member = { userId: string; name: string; email: string };

/**
 * Pick a product accent color. `null` ("Auto") derives a stable color from the
 * product key; the rest set an explicit palette token.
 */
function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="Auto color"
        aria-pressed={value === null}
        className={cn(
          "h-6 rounded-full border px-2 text-[11px] text-muted-foreground transition",
          value === null &&
            "ring-2 ring-ring ring-offset-1 ring-offset-background",
        )}
      >
        Auto
      </button>
      {PRODUCT_COLORS.map((c: ProductColor) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          aria-pressed={value === c}
          className={cn(
            "h-6 w-6 rounded-full transition",
            colorDot(c),
            value === c &&
              "ring-2 ring-ring ring-offset-1 ring-offset-background",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Manage the org's products: create new ones, rename / re-describe / change a
 * product's visibility, manage its members, or delete an empty one. Create is
 * org-admin only; per-product actions need org-admin or that product's admin
 * role (`canManage`). Non-managers see a read-only list.
 */
export function ProductsManager({
  products: initial,
  groups: initialGroups = [],
  members,
  isOrgAdmin,
}: {
  products: ProductRecord[];
  groups?: ProductGroupRecord[];
  members: Member[];
  isOrgAdmin: boolean;
}) {
  const [products, setProducts] = useState(initial);
  const [groups, setGroups] = useState(initialGroups);
  const [creating, setCreating] = useState(false);

  function onCreated(product: ProductRecord) {
    setProducts((ps) =>
      [...ps, product].sort((a, b) => a.position - b.position),
    );
  }

  function onUpdated(product: ProductRecord) {
    setProducts((ps) => ps.map((p) => (p.id === product.id ? product : p)));
  }

  function onDeleted(id: string) {
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      {/* Product groups only earn their place once there's more than one
          product to organize. Existing groups keep the card visible even if the
          product count later dips, so they never become unmanageable. */}
      {isOrgAdmin && (products.length > 1 || groups.length > 0) ? (
        <GroupsCard
          groups={groups}
          products={products}
          onChanged={setGroups}
          onProductChanged={onUpdated}
        />
      ) : null}

      {isOrgAdmin ? (
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          New product
        </Button>
      ) : null}

      <ul className="space-y-2">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            groups={groups}
            members={members}
            canManage={isOrgAdmin || product.viewerRole === "admin"}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        ))}
      </ul>

      {isOrgAdmin ? (
        <CreateProductSheet
          open={creating}
          onOpenChange={setCreating}
          onCreated={onCreated}
        />
      ) : null}
    </div>
  );
}

/** A group flattened for tree display: depth-first, sibling position order. */
interface TreeRow {
  group: ProductGroupRecord;
  depth: number;
}

/** Flatten the group tree depth-first. Cycle/orphan-safe: a dangling parent
 * renders at the top level and every group appears exactly once. */
function flattenGroupTree(groups: ProductGroupRecord[]): TreeRow[] {
  const ids = new Set(groups.map((g) => g.id));
  const byParent = new Map<string | null, ProductGroupRecord[]>();
  for (const g of groups) {
    const parent = g.parentId && ids.has(g.parentId) ? g.parentId : null;
    const list = byParent.get(parent);
    if (list) list.push(g);
    else byParent.set(parent, [g]);
  }
  const out: TreeRow[] = [];
  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
    const siblings = (byParent.get(parent) ?? []).sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    );
    for (const g of siblings) {
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      out.push({ group: g, depth });
      walk(g.id, depth + 1, seen);
    }
  };
  walk(null, 0, new Set());
  return out;
}

/** Split a "kind:rest" drag/drop id into its kind and payload. */
function parseDndId(raw: string): { kind: string; rest: string } {
  const i = raw.indexOf(":");
  return { kind: raw.slice(0, i), rest: raw.slice(i + 1) };
}

/**
 * Manage the org's product groups (org-admin only): create (optionally under
 * a parent), rename, recolor, reparent, or delete an empty one. Rendered as
 * a tree of groups with their products as draggable leaves: drag a product
 * onto a group to move it there (or onto the ungrouped zone to take it out),
 * drag a group onto another group to nest it, or drop it on the bar between
 * rows to reorder siblings. Nesting is capped at MAX_GROUP_DEPTH levels (the
 * server enforces cycles/depth; this UI pre-checks and narrows the choices).
 * A group appears in the product switcher and rolls its products' work up on
 * the group dashboard.
 */
function GroupsCard({
  groups,
  products,
  onChanged,
  onProductChanged,
}: {
  groups: ProductGroupRecord[];
  products: ProductRecord[];
  onChanged: (groups: ProductGroupRecord[]) => void;
  onProductChanged: (product: ProductRecord) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // What is being dragged right now (drives slot visibility and the overlay).
  const [drag, setDrag] = useState<{
    kind: "group" | "product";
    label: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const rows = flattenGroupTree(groups);
  const depthById = new Map(rows.map((r) => [r.group.id, r.depth]));
  // New groups land under parents that still have room below the depth cap.
  const parentOptions = rows.filter((r) => r.depth + 1 < MAX_GROUP_DEPTH);

  const groupIds = new Set(groups.map((g) => g.id));
  /** A group's effective parent; a dangling parent id renders at top level. */
  const parentOf = (g: ProductGroupRecord) =>
    g.parentId && groupIds.has(g.parentId) ? g.parentId : null;
  const childGroupsOf = (parent: string | null) =>
    groups
      .filter((g) => parentOf(g) === parent)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const productsOf = (groupId: string) =>
    products
      .filter((p) => p.groupId === groupId)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const ungrouped = products
    .filter((p) => !p.groupId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  function onAuthError() {
    window.location.href = "/sign-in";
  }

  function onDragStart(event: DragStartEvent) {
    const { kind, rest } = parseDndId(String(event.active.id));
    if (kind !== "group" && kind !== "product") return;
    const label =
      kind === "group"
        ? (groups.find((g) => g.id === rest)?.name ?? "")
        : (products.find((p) => p.id === rest)?.name ?? "");
    setDrag({ kind, label });
  }

  function moveProduct(product: ProductRecord, newGroupId: string | null) {
    if ((product.groupId ?? null) === newGroupId) return;
    const prev = product;
    const groupName = newGroupId
      ? (groups.find((g) => g.id === newGroupId)?.name ?? "group")
      : null;
    // Optimistically re-home the leaf, then persist and revalidate.
    onProductChanged({ ...product, groupId: newGroupId });
    updateProduct(product.id, { groupId: newGroupId })
      .then((updated) => {
        onProductChanged(updated);
        toast.success(
          groupName
            ? `${product.name} moved to ${groupName}`
            : `${product.name} ungrouped`,
        );
        router.refresh();
      })
      .catch((err) => {
        onProductChanged(prev);
        if (err instanceof AuthRequiredError) return onAuthError();
        toast.error(err instanceof Error ? err.message : "Move failed.");
      });
  }

  function moveGroup(
    dragged: ProductGroupRecord,
    newParent: string | null,
    insertIndex: number | null,
  ) {
    if (newParent === dragged.id) return;
    if (wouldCreateCycle(groups, dragged.id, newParent)) {
      toast.error("A group can't move inside its own subtree.");
      return;
    }
    if (wouldExceedDepth(groups, dragged.id, newParent)) {
      toast.error(
        `That nesting would exceed the ${MAX_GROUP_DEPTH}-level limit.`,
      );
      return;
    }

    const oldParent = parentOf(dragged);
    // Slot indexes count the dragged row itself when it already sits among the
    // target siblings; compensate so the drop lands where the bar showed.
    let index = insertIndex;
    if (index !== null && oldParent === newParent) {
      const orig = childGroupsOf(newParent).findIndex(
        (g) => g.id === dragged.id,
      );
      if (orig >= 0 && orig < index) index -= 1;
    }
    const siblings = childGroupsOf(newParent).filter(
      (g) => g.id !== dragged.id,
    );
    const at = index === null ? siblings.length : Math.min(index, siblings.length);
    const order = [...siblings.slice(0, at), dragged, ...siblings.slice(at)];

    // Renumber the target siblings 0..n and patch only what changed (position
    // is an integer column, so a clean insert needs its neighbors renumbered).
    const patches: { id: string; patch: ProductGroupPatch }[] = [];
    order.forEach((g, i) => {
      const patch: ProductGroupPatch = {};
      if (g.position !== i) patch.position = i;
      if (g.id === dragged.id && oldParent !== newParent) {
        patch.parentId = newParent;
      }
      if (Object.keys(patch).length > 0) patches.push({ id: g.id, patch });
    });
    if (patches.length === 0) return;

    const prevGroups = groups;
    const posById = new Map(order.map((g, i) => [g.id, i]));
    onChanged(
      groups.map((g) => ({
        ...g,
        position: posById.get(g.id) ?? g.position,
        parentId: g.id === dragged.id ? newParent : g.parentId,
      })),
    );
    Promise.all(patches.map(({ id, patch }) => updateProductGroup(id, patch)))
      .then(() => {
        toast.success("Group moved");
        router.refresh();
      })
      .catch((err) => {
        onChanged(prevGroups);
        if (err instanceof AuthRequiredError) return onAuthError();
        toast.error(err instanceof Error ? err.message : "Move failed.");
      });
  }

  function onDragEnd(event: DragEndEvent) {
    setDrag(null);
    const { active, over } = event;
    if (!over) return;
    const { kind, rest: id } = parseDndId(String(active.id));
    const target = parseDndId(String(over.id));

    // Resolve the drop target to a destination parent/group (+ slot index).
    let intoGroup: string | null;
    let slotIndex: number | null = null;
    if (target.kind === "into") {
      intoGroup = target.rest;
    } else if (target.kind === "slot") {
      const cut = target.rest.lastIndexOf(":");
      const parent = target.rest.slice(0, cut);
      intoGroup = parent === "root" ? null : parent;
      slotIndex = Number(target.rest.slice(cut + 1));
    } else if (target.kind === "ungrouped") {
      intoGroup = null;
    } else {
      return;
    }

    if (kind === "product") {
      const product = products.find((p) => p.id === id);
      if (product) moveProduct(product, intoGroup);
    } else if (kind === "group") {
      const dragged = groups.find((g) => g.id === id);
      if (dragged) moveGroup(dragged, intoGroup, slotIndex);
    }
  }

  /** One tree level: sibling groups (with reorder slots), then leaf products. */
  const renderLevel = (
    parent: string | null,
    depth: number,
  ): React.ReactNode => {
    const siblings = childGroupsOf(parent);
    return (
      <>
        {siblings.map((group, i) => (
          <Fragment key={group.id}>
            <DropSlot
              id={`slot:${parent ?? "root"}:${i}`}
              depth={depth}
              active={drag !== null}
            />
            <GroupRow
              group={group}
              depth={depth}
              groups={groups}
              depthById={depthById}
              productCount={productsOf(group.id).length}
              subgroupCount={childGroupsOf(group.id).length}
              editing={editingId === group.id}
              onEdit={() => setEditingId(group.id)}
              onCancel={() => setEditingId(null)}
              onSaved={onSaved}
              onDelete={() => onDelete(group)}
              onAuthError={onAuthError}
              busy={pending}
            />
            {renderLevel(group.id, depth + 1)}
            {productsOf(group.id).map((p) => (
              <ProductLeaf key={p.id} product={p} depth={depth + 1} />
            ))}
          </Fragment>
        ))}
        {siblings.length > 0 || drag !== null ? (
          <DropSlot
            id={`slot:${parent ?? "root"}:${siblings.length}`}
            depth={depth}
            active={drag !== null}
          />
        ) : null}
      </>
    );
  };

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      setError(null);
      try {
        const group = await createProductGroup({
          name: trimmed,
          parentId: parentId || null,
        });
        onChanged([...groups, group]);
        setName("");
        setParentId("");
        setAdding(false);
        toast.success("Group created");
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) return onAuthError();
        setError(err instanceof Error ? err.message : "Create failed.");
      }
    });
  }

  function onSaved(updated: ProductGroupRecord) {
    onChanged(groups.map((g) => (g.id === updated.id ? updated : g)));
    setEditingId(null);
  }

  function onDelete(group: ProductGroupRecord) {
    startTransition(async () => {
      setError(null);
      try {
        await deleteProductGroup(group.id);
        onChanged(groups.filter((g) => g.id !== group.id));
        toast.success("Group deleted");
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) return onAuthError();
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">Product groups</p>
        <p className="text-xs text-muted-foreground">
          Group products into parts of your platform, nesting groups up to{" "}
          {MAX_GROUP_DEPTH} levels. Drag a product onto a group to move it
          there, or drag a group to nest or reorder it. A group appears in the
          product switcher and rolls its products&apos; work up on its
          dashboard.
        </p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDrag(null)}
      >
        {rows.length > 0 ? (
          <ul className="space-y-0.5">{renderLevel(null, 0)}</ul>
        ) : null}
        <UngroupedZone
          products={ungrouped}
          show={groups.length > 0 && (ungrouped.length > 0 || drag?.kind === "product")}
        />
        <DragOverlay>
          {drag ? (
            <div className="w-fit rounded-md border bg-background px-2.5 py-1 text-sm shadow-md">
              {drag.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {/* Start as an "Add group" affordance, not an always-open form: the
          fields only appear once the admin opts in (see the "add" UX rule in
          CLAUDE.md). */}
      {adding ? (
        <form onSubmit={onCreate} className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New group name"
            className="h-8 max-w-xs"
            autoFocus
          />
          {parentOptions.length > 0 ? (
            <Select
              aria-label="Parent group"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-8 w-auto"
            >
              <option value="">Top level</option>
              {parentOptions.map(({ group, depth }) => (
                <option key={group.id} value={group.id}>
                  {`${"  ".repeat(depth)}${group.name}`}
                </option>
              ))}
            </Select>
          ) : null}
          <Button type="submit" size="sm" disabled={pending || !name.trim()}>
            {pending ? "Adding…" : "Add group"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setAdding(false);
              setName("");
              setParentId("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
        >
          Add group
        </Button>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * A thin insertion bar between sibling group rows. Invisible until a drag is
 * active; dropping a group here reorders it among these siblings (dropping a
 * product here files it into the surrounding parent).
 */
function DropSlot({
  id,
  depth,
  active,
}: {
  id: string;
  depth: number;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !active });
  return (
    <li
      ref={setNodeRef}
      aria-hidden
      style={{ marginLeft: `${depth * 1.25}rem` }}
      className={cn(
        "h-1 rounded transition-colors",
        active && "h-2",
        active && isOver && "bg-ring/60",
      )}
    />
  );
}

/** A product leaf in the group tree: drag it onto a group (or the ungrouped
 * zone) to re-home it. Display-only otherwise; the full editor is the product
 * card below. */
function ProductLeaf({
  product,
  depth,
}: {
  product: ProductRecord;
  depth: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `product:${product.id}`,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ marginLeft: `${depth * 1.25}rem`, opacity: isDragging ? 0.4 : 1 }}
      className="flex cursor-grab items-center gap-2 rounded px-1 py-0.5 text-sm active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical
        className="h-3 w-3 shrink-0 text-muted-foreground/50"
        aria-hidden
      />
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          productColorClasses(product).dot,
        )}
        aria-hidden
      />
      <span>{product.name}</span>
      <span className="text-xs text-muted-foreground">
        {product.itemCount} {product.itemCount === 1 ? "item" : "items"}
      </span>
    </li>
  );
}

/** Products outside any group, doubling as the drop target that takes a
 * product out of its group. Hidden until it has contents or a product drag
 * makes it a meaningful destination. */
function UngroupedZone({
  products,
  show,
}: {
  products: ProductRecord[];
  show: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "ungrouped:" });
  if (!show) return null;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md border border-dashed p-2 transition-colors",
        isOver && "bg-muted",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">Ungrouped</p>
      {products.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {products.map((p) => (
            <ProductLeaf key={p.id} product={p} depth={0} />
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Drop a product here to take it out of its group.
        </p>
      )}
    </div>
  );
}

/** One group tree row: indented summary or an inline editor. */
function GroupRow({
  group,
  depth,
  groups,
  depthById,
  productCount,
  subgroupCount,
  editing,
  onEdit,
  onCancel,
  onSaved,
  onDelete,
  onAuthError,
  busy,
}: {
  group: ProductGroupRecord;
  depth: number;
  groups: ProductGroupRecord[];
  depthById: Map<string, number>;
  productCount: number;
  subgroupCount: number;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: (g: ProductGroupRecord) => void;
  onDelete: () => void;
  onAuthError: () => void;
  busy: boolean;
}) {
  const router = useRouter();
  const [color, setColor] = useState<string | null>(group.color);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Draggable (to nest/reorder this group) and a drop target (for products
  // joining it or groups nesting under it). Both idle while editing.
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: `group:${group.id}`, disabled: editing });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `into:${group.id}`,
    disabled: editing,
  });

  // Legal parents exclude the group's own subtree (a cycle) and any parent
  // whose depth leaves no room for this group's subtree; the server is the
  // real guard, this narrows the menu to choices that can succeed.
  const subtree = descendantGroupIds(groups, group.id);
  const subtreeHeight =
    Math.max(...[...subtree].map((id) => depthById.get(id) ?? depth)) -
    depth +
    1;
  const parentOptions = flattenGroupTree(groups).filter(
    ({ group: candidate, depth: candidateDepth }) =>
      !subtree.has(candidate.id) &&
      candidateDepth + 1 + subtreeHeight <= MAX_GROUP_DEPTH,
  );

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    const patch = {
      name,
      color,
      parentId: String(data.get("parentId") ?? "") || null,
    };
    startTransition(async () => {
      setError(null);
      try {
        onSaved(await updateProductGroup(group.id, patch));
        toast.success("Group saved");
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) return onAuthError();
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  const deletable = productCount === 0 && subgroupCount === 0;

  if (editing) {
    return (
      <li
        className="space-y-3 rounded-md border p-3"
        style={{ marginLeft: `${depth * 1.25}rem` }}
      >
        <form onSubmit={onSave} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Name
            </span>
            <Input
              name="name"
              defaultValue={group.name}
              className="h-8"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Parent group
            </span>
            <Select
              name="parentId"
              defaultValue={group.parentId ?? ""}
              className="h-8"
            >
              <option value="">Top level</option>
              {parentOptions.map(
                ({ group: candidate, depth: candidateDepth }) => (
                  <option key={candidate.id} value={candidate.id}>
                    {`${"  ".repeat(candidateDepth)}${candidate.name}`}
                  </option>
                ),
              )}
            </Select>
          </label>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Color
            </span>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded px-1 text-sm active:cursor-grabbing",
        isOver && "bg-muted ring-1 ring-ring/40",
      )}
      style={{ marginLeft: `${depth * 1.25}rem`, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <GripVertical
        className="h-3 w-3 shrink-0 text-muted-foreground/50"
        aria-hidden
      />
      {group.color ? (
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            colorDot(resolveProductColor(group)),
          )}
          aria-hidden
        />
      ) : null}
      <span className="font-medium">{group.name}</span>
      <span className="text-xs text-muted-foreground">
        {productCount} {productCount === 1 ? "product" : "products"}
        {subgroupCount > 0
          ? ` · ${subgroupCount} ${subgroupCount === 1 ? "subgroup" : "subgroups"}`
          : ""}
      </span>
      <span className="ml-auto flex items-center gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={busy || !deletable}
          title={
            deletable
              ? undefined
              : "Move its products and subgroups out before deleting."
          }
          onClick={onDelete}
        >
          Delete
        </Button>
      </span>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </li>
  );
}

const VISIBILITY_LABEL: Record<ProductVisibility, string> = {
  org: "Everyone in org",
  private: "Private",
};

/** One product row: summary, an inline editor, a members panel, and delete. */
function ProductCard({
  product,
  groups,
  members,
  canManage,
  onUpdated,
  onDeleted,
}: {
  product: ProductRecord;
  groups: ProductGroupRecord[];
  members: Member[];
  canManage: boolean;
  onUpdated: (p: ProductRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [color, setColor] = useState<string | null>(product.color);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAuthError() {
    window.location.href = "/sign-in";
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    const patch = {
      name,
      description: String(data.get("description") ?? "").trim() || null,
      visibility: String(data.get("visibility")) as ProductVisibility,
      color,
      // Only sent when the group select is rendered (there are groups).
      ...(groups.length > 0
        ? { groupId: String(data.get("groupId") ?? "") || null }
        : {}),
    };
    startTransition(async () => {
      setError(null);
      try {
        onUpdated(await updateProduct(product.id, patch));
        setEditing(false);
        toast.success("Product saved");
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) return onAuthError();
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  function onDelete() {
    if (!confirm(`Delete “${product.name}”? This can't be undone.`)) return;
    startTransition(async () => {
      setError(null);
      try {
        await deleteProduct(product.id);
        onDeleted(product.id);
        toast.success("Product deleted");
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) return onAuthError();
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <li className="rounded-md border p-3">
      {editing ? (
        <form onSubmit={onSave} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Name
            </span>
            <Input
              name="name"
              defaultValue={product.name}
              className="h-8"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Description
            </span>
            <Textarea
              name="description"
              defaultValue={product.description ?? ""}
              rows={2}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Visibility
            </span>
            <Select
              name="visibility"
              defaultValue={product.visibility}
              className="h-8"
            >
              <option value="org">{VISIBILITY_LABEL.org}</option>
              <option value="private">{VISIBILITY_LABEL.private}</option>
            </Select>
          </label>
          {groups.length > 0 ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Group
              </span>
              <Select
                name="groupId"
                defaultValue={product.groupId ?? ""}
                className="h-8"
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Color
            </span>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                productColorClasses(product).dot,
              )}
              aria-hidden
            />
            <span className="font-medium">{product.name}</span>
            {product.visibility === "private" ? (
              <Badge variant="outline" className="text-[10px]">
                Private
              </Badge>
            ) : null}
            {product.groupId ? (
              <Badge variant="outline" className="text-[10px]">
                {groups.find((g) => g.id === product.groupId)?.name ?? "Group"}
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {product.itemCount} {product.itemCount === 1 ? "item" : "items"}
            </span>
            {canManage ? (
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMembers((s) => !s)}
                >
                  Members
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={pending || product.itemCount > 0}
                  title={
                    product.itemCount > 0
                      ? "Move or remove its items before deleting."
                      : undefined
                  }
                  onClick={onDelete}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
          {product.description ? (
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {showMembers && canManage ? (
            <div className="border-t pt-3">
              <ProductMembers productId={product.id} candidates={members} />
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

/** "New product" drawer (org-admin only). */
function CreateProductSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (p: ProductRecord) => void;
}) {
  const router = useRouter();
  const [color, setColor] = useState<string | null>(null);
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
    const input = {
      name,
      description: String(data.get("description") ?? "").trim() || null,
      visibility: String(data.get("visibility")) as ProductVisibility,
      color,
    };
    startTransition(async () => {
      setError(null);
      try {
        onCreated(await createProduct(input));
        toast.success("Product created");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          router.push("/sign-in");
          return;
        }
        setError(err instanceof Error ? err.message : "Create failed.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New product</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Name
            </span>
            <Input name="name" autoFocus className="h-8" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Description
            </span>
            <Textarea name="description" rows={2} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Visibility
            </span>
            <Select name="visibility" defaultValue="org" className="h-8">
              <option value="org">{VISIBILITY_LABEL.org}</option>
              <option value="private">{VISIBILITY_LABEL.private}</option>
            </Select>
          </label>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Color
            </span>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Creating…" : "Create product"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
