import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { StatusDot } from "@/components/status-dot";
import { StatusSelect } from "@/components/status-select";
import { priorityLabel, sortFeatures } from "@/lib/feature-helpers";
import { getStore } from "@/lib/store";
import { canWrite } from "@/lib/workspace";
import { canConnectRepos, requireWorkspaceAccess } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

/**
 * Backlog: prioritized list of features. Status edits here update metadata
 * only (DB or local file) — spec content stays canonical in git.
 */
export default async function BacklogPage() {
  const access = await requireWorkspaceAccess();
  const canEdit = !access || canWrite(access.role);
  const store = await getStore();
  const features = sortFeatures(await store.listFeatures(access ?? undefined)).filter(
    (f) => f.status !== "archived",
  );

  // Order rows as a hierarchy: each top-level feature followed by its children.
  const bySpec = new Map(features.map((f) => [f.specId, f]));
  const childrenOf = new Map<string, typeof features>();
  const topLevel: typeof features = [];
  for (const f of features) {
    const parent = f.parentSpecId ? bySpec.get(f.parentSpecId) : undefined;
    if (parent) {
      const arr = childrenOf.get(parent.specId) ?? [];
      arr.push(f);
      childrenOf.set(parent.specId, arr);
    } else {
      topLevel.push(f);
    }
  }
  const rows: { f: (typeof features)[number]; depth: number }[] = [];
  for (const f of topLevel) {
    rows.push({ f, depth: 0 });
    for (const c of childrenOf.get(f.specId) ?? []) rows.push({ f: c, depth: 1 });
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Backlog</h1>
        <p className="text-sm text-muted-foreground">
          Prioritized features. Metadata edits land in the database; spec
          content stays in git.
        </p>
      </div>
      {features.length === 0 ? (
        <EmptyState canConnect={canConnectRepos(access)} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Pri</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead className="w-44">Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-24">Quarter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ f, depth }) => (
              <TableRow key={f.specId}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {priorityLabel(f.priority)}
                </TableCell>
                <TableCell>
                  <span
                    className="flex items-center gap-2"
                    style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}
                  >
                    {depth > 0 ? (
                      <span className="text-muted-foreground">↳</span>
                    ) : null}
                    <Link
                      href={`/feature/${f.specId}`}
                      className="font-medium hover:underline"
                    >
                      {f.title}
                    </Link>
                    {f.childCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        title={`${f.childDoneCount} of ${f.childCount} children done`}
                      >
                        epic {f.childDoneCount}/{f.childCount}
                      </Badge>
                    )}
                    {f.blockedByCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="text-[10px]"
                        title={`Blocked by ${f.blockedByCount} feature(s)`}
                      >
                        Blocked
                      </Badge>
                    )}
                  </span>
                  <div className="text-xs text-muted-foreground">{f.path}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusDot status={f.status} />
                    <StatusSelect
                      specId={f.specId}
                      status={f.status}
                      className="h-8 w-36"
                      canEdit={canEdit}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {f.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {f.roadmapQuarter ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
