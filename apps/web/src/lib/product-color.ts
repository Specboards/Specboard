import type { CSSProperties } from "react";

import { resolveProductColor, type ProductColor } from "@specboards/core";
import { productColors } from "@specboards/ui";

/**
 * Product accent colors. The saturated hues, soft-pill tints, and their
 * dark-mode variants all live once in `productColors` (@specboards/ui), the
 * cross-surface source of truth Gesso mirrors. This module is a thin adapter
 * that renders those hex values into the app:
 *   - `productDotColor` -> an inline `background-color` for a decorative swatch.
 *   - `productBadge` -> `{ className, style }` for a soft pill: the hex values
 *     ride in as CSS custom properties so the same classes adapt to light and
 *     dark without a per-color Tailwind map (which the JIT would otherwise purge).
 */

/** Hex swatch color for a resolved product color (render as `background-color`). */
export function productDotColor(color: ProductColor): string {
  return productColors[color].dot;
}

/** Soft-pill classes + the CSS variables they read, for a product's color. */
export function productBadge(p: { color?: string | null; key: string }): {
  className: string;
  style: CSSProperties;
} {
  const { badge } = productColors[resolveProductColor(p)];
  return {
    className:
      "bg-[var(--pc-bg)] text-[var(--pc-fg)] dark:bg-[var(--pc-bg-dark)] dark:text-[var(--pc-fg-dark)]",
    style: {
      "--pc-bg": badge.bgLight,
      "--pc-fg": badge.fgLight,
      "--pc-bg-dark": badge.bgDark,
      "--pc-fg-dark": badge.fgDark,
    } as CSSProperties,
  };
}
