"use server";

import { revalidatePath } from "next/cache";

import { canTransition } from "@specboard/core";

import { getStore } from "@/lib/store";

function revalidateBoards() {
  revalidatePath("/backlog");
  revalidatePath("/board");
  revalidatePath("/roadmap");
  revalidatePath("/feature/[id]", "page");
}

export async function updateFeatureStatus(
  specId: string,
  status: string,
): Promise<void> {
  const store = await getStore();
  const feature = await store.getFeature(specId);
  if (!feature) throw new Error(`Unknown feature: ${specId}`);
  if (!canTransition(feature.status, status)) {
    throw new Error(`Illegal transition: ${feature.status} -> ${status}`);
  }
  await store.updateFeature(specId, { status });
  revalidateBoards();
}

export async function updateFeatureMeta(
  specId: string,
  formData: FormData,
): Promise<void> {
  const store = await getStore();
  const feature = await store.getFeature(specId);
  if (!feature) throw new Error(`Unknown feature: ${specId}`);

  const status = String(formData.get("status") ?? feature.status);
  if (!canTransition(feature.status, status)) {
    throw new Error(`Illegal transition: ${feature.status} -> ${status}`);
  }

  const rawPriority = String(formData.get("priority") ?? "");
  const rawQuarter = String(formData.get("roadmapQuarter") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await store.updateFeature(specId, {
    status,
    priority: rawPriority === "" ? null : Number(rawPriority),
    roadmapQuarter: rawQuarter === "" ? null : rawQuarter,
    tags,
  });
  revalidateBoards();
}
