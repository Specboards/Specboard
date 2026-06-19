import type { ProductRecord } from "@/lib/store";

/** Sentinel `?product=` value for the cross-product "All products" view. */
export const ALL_PRODUCTS = "all";

/**
 * Resolve the active product for a list view from the `?product=` query param.
 * Returns the matching product, or null for the cross-product "All products"
 * view — the default when the param is missing, "all", or names an unknown
 * (or no-longer-visible) product.
 */
export function resolveActiveProduct(
  products: ProductRecord[],
  raw: string | string[] | undefined,
): ProductRecord | null {
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key || key === ALL_PRODUCTS) return null;
  return products.find((p) => p.key === key) ?? null;
}
