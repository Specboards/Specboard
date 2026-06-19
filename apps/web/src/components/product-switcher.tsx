"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ALL_PRODUCTS } from "@/lib/active-product";
import type { ProductRecord } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Switches the Board / Roadmap between products (sibling backlogs), plus an
 * "All products" tab for the cross-product view. The active product lives in
 * the `?product=` query param; each tab links to its product while preserving
 * the rest of the query. Hidden when the workspace has a single product
 * (nothing to switch between).
 */
export function ProductSwitcher({
  products,
  active,
}: {
  products: ProductRecord[];
  active: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (products.length < 2) return null;

  function hrefFor(key: string): string {
    const next = new URLSearchParams(params.toString());
    // "All products" is the default — keep it out of the URL.
    if (key === ALL_PRODUCTS) next.delete("product");
    else next.set("product", key);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const tabs = [{ key: ALL_PRODUCTS, name: "All products" }, ...products];

  return (
    <div className="inline-flex items-center rounded-md border bg-background p-0.5 text-sm">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            scroll={false}
            className={cn(
              "rounded px-3 py-1 font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
