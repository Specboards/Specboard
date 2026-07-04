import { revalidatePath } from "next/cache";

/**
 * Revalidate the pages that render item fields after a card-config change
 * (custom properties, releases): boards, item detail, roadmap, and the Cards
 * settings page.
 */
export function revalidateCardPages(): void {
  for (const path of [
    "/[org]/[product]/backlog",
    "/[org]/[product]/roadmap",
    "/[org]/settings/work-cards",
  ])
    revalidatePath(path, "page");
  revalidatePath("/[org]/[product]/backlog/[...slug]", "page");
}

/**
 * Revalidate the Ideas pages after an idea change (capture, status, vote,
 * promote). Promotion also creates a feature, so refresh the boards/roadmap too.
 */
export function revalidateIdeaPages(): void {
  for (const path of [
    "/[org]/[product]/ideas",
    "/[org]/[product]/backlog",
    "/[org]/[product]/roadmap",
    "/[org]/settings/ideas",
  ])
    revalidatePath(path, "page");
}
