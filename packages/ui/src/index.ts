/** Shared design tokens. The web app defines its live CSS variables in
 * apps/web/src/app/globals.css; this module is the cross-surface source of
 * truth that the Gesso design system mirrors. Every value that can be used as
 * text or as a UI boundary is chosen to meet WCAG 2.2 AA (4.5:1 for text,
 * 3:1 for non-text such as control borders). */
export const tokens = {
  color: {
    /** Decorative hairline (cards, separators). Not a control boundary. */
    border: "#d1d9e0",
    /** Form-control boundary: 3.45:1 on white, meets SC 1.4.11. */
    input: "#818b98",
    /** Secondary text: 6.1:1 on white. */
    muted: "#57606a",
    /** De-emphasized icons / large text / disabled fills only, never body
     *  text: 3.45:1 on white. */
    faint: "#818b98",
    surface: "#f6f8fa",
  },
  radius: { sm: 6, md: 8 },
  space: { sm: 8, md: 12, lg: 20 },
} as const;

/**
 * Per-status colors. `dot` is the saturated brand hue, safe only as a swatch or
 * fill (it fails text contrast on light surfaces). `fgLight` / `fgDark` are the
 * text-on-surface variants that clear 4.5:1 in each theme. Never render text in
 * `dot`; pair a dot with a text label or use the matching `fg*` value.
 */
export type StatusColor = {
  /** Saturated hue for dots and fills (decorative). */
  dot: string;
  /** Text color on a light surface (>= 4.5:1 on white). */
  fgLight: string;
  /** Text color on the dark surface (>= 4.5:1 on #0d1117). */
  fgDark: string;
};

export const statusColors: Record<string, StatusColor> = {
  backlog: { dot: "#9ca3af", fgLight: "#57606a", fgDark: "#9ca3af" },
  defining: { dot: "#a78bfa", fgLight: "#8250df", fgDark: "#a78bfa" },
  ready: { dot: "#60a5fa", fgLight: "#0969da", fgDark: "#60a5fa" },
  in_progress: { dot: "#fbbf24", fgLight: "#9a6700", fgDark: "#fbbf24" },
  in_review: { dot: "#f472b6", fgLight: "#bf3989", fgDark: "#f472b6" },
  done: { dot: "#34d399", fgLight: "#1a7f37", fgDark: "#34d399" },
  archived: { dot: "#d1d5db", fgLight: "#57606a", fgDark: "#9ca3af" },
};
