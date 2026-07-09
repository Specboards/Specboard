import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Primer "Box": GitHub's signature container. A bordered panel with a muted
 * header row and hairline row dividers, used for lists and detail panels (the
 * Backlog list, issue/PR lists). Flat by default: 1px borders carry structure,
 * no shadows. Rows inside should divide with `divide-y divide-border` rather
 * than gaps.
 */
const Box = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden rounded-md border bg-card text-card-foreground",
      className,
    )}
    {...props}
  />
));
Box.displayName = "Box";

/** Muted header row of a Box, with a hairline divider under it. */
const BoxHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-2 border-b bg-muted px-4 py-2 text-sm font-medium",
      className,
    )}
    {...props}
  />
));
BoxHeader.displayName = "BoxHeader";

export { Box, BoxHeader };
