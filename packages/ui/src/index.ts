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

/**
 * Deterministic dot palette for custom statuses not in the default workflow.
 * A status name is hashed to an index so the same custom status always gets the
 * same swatch. Decorative (dots only, always label-paired), so no `fg` variant.
 */
export const fallbackStatusDots: readonly string[] = [
  "#c084fc", // purple-400
  "#3b82f6", // blue-500
  "#fbbf24", // amber-400
  "#f472b6", // pink-400
  "#22c55e", // green-500
  "#22d3ee", // cyan-400
  "#fb7185", // rose-400
  "#a3e635", // lime-400
  "#818cf8", // indigo-400
  "#2dd4bf", // teal-400
];

/**
 * Per-idea-stage colors (public idea portal review pipeline). Same
 * `{ dot, fgLight, fgDark }` shape as status colors; today only the dot renders
 * (always label-paired), the `fg*` values are provided so text-on-surface uses
 * stay AA-safe if the label is ever colored.
 */
export const ideaStageColors: Record<string, StatusColor> = {
  new: { dot: "#60a5fa", fgLight: "#0969da", fgDark: "#60a5fa" },
  under_review: { dot: "#fbbf24", fgLight: "#9a6700", fgDark: "#fbbf24" },
  planned: { dot: "#a78bfa", fgLight: "#8250df", fgDark: "#a78bfa" },
  shipped: { dot: "#34d399", fgLight: "#1a7f37", fgDark: "#34d399" },
  parked: { dot: "#a1a1aa", fgLight: "#57606a", fgDark: "#9ca3af" },
  declined: { dot: "#fb7185", fgLight: "#cf222e", fgDark: "#fb7185" },
};

/**
 * Semantic feedback colors used for status/outcome affordances (webhook
 * delivery, gate completion, release progress). `solid` is the saturated fill
 * for bars and checkboxes (it carries a white icon, a non-text graphic); `fg`
 * is the accessible text variant, tuned to clear 4.5:1 on a 15%-alpha tint of
 * the fill (the badge background) in each theme. `danger` mirrors the app's
 * `--destructive`. The web app exposes these as `--success`/`--warning` CSS
 * variables in globals.css; this map is the framework-agnostic copy Gesso
 * mirrors.
 */
export type FeedbackColor = {
  /** Saturated fill for bars/checkboxes; carries a white icon (non-text). */
  solid: { light: string; dark: string };
  /** Accessible text on a page surface or the fill's soft tint (>= 4.5:1). */
  fg: { light: string; dark: string };
};

export const feedbackColors: Record<"success" | "warning" | "danger", FeedbackColor> = {
  success: {
    solid: { light: "#10b981", dark: "#10b981" },
    fg: { light: "#047857", dark: "#34d399" },
  },
  warning: {
    solid: { light: "#f59e0b", dark: "#f59e0b" },
    fg: { light: "#a84d08", dark: "#fbbf24" },
  },
  danger: {
    solid: { light: "#d1242f", dark: "#da3633" },
    fg: { light: "#d1242f", dark: "#f85149" },
  },
};

/**
 * Product accent palette. `dot` is the saturated swatch (the Tailwind `-500`
 * hue), rendered as a decorative fill. `badge` holds the soft-pill tints for
 * each theme. This is the canonical source of the product colors; the web app's
 * `product-color.ts` renders dots directly from `dot` and mirrors `badge` as
 * Tailwind utility classes. Keyed by the `ProductColor` names in
 * `@specboards/core`.
 */
export type ProductPalette = {
  /** Saturated swatch hue (Tailwind `-500`). */
  dot: string;
  /** Soft-pill background/foreground for each theme. */
  badge: { bgLight: string; fgLight: string; bgDark: string; fgDark: string };
};

/** The product accent names. Mirrors `ProductColor` in @specboards/core. */
export type ProductColorName =
  | "slate"
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "teal"
  | "sky"
  | "blue"
  | "violet"
  | "pink";

export const productColors: Record<ProductColorName, ProductPalette> = {
  slate: { dot: "#64748b", badge: { bgLight: "#f1f5f9", fgLight: "#334155", bgDark: "rgba(148,163,184,0.15)", fgDark: "#cbd5e1" } },
  red: { dot: "#ef4444", badge: { bgLight: "#fee2e2", fgLight: "#b91c1c", bgDark: "rgba(248,113,113,0.15)", fgDark: "#fca5a5" } },
  orange: { dot: "#f97316", badge: { bgLight: "#ffedd5", fgLight: "#c2410c", bgDark: "rgba(251,146,60,0.15)", fgDark: "#fdba74" } },
  amber: { dot: "#f59e0b", badge: { bgLight: "#fef3c7", fgLight: "#b45309", bgDark: "rgba(251,191,36,0.15)", fgDark: "#fcd34d" } },
  green: { dot: "#22c55e", badge: { bgLight: "#dcfce7", fgLight: "#15803d", bgDark: "rgba(74,222,128,0.15)", fgDark: "#86efac" } },
  teal: { dot: "#14b8a6", badge: { bgLight: "#ccfbf1", fgLight: "#0f766e", bgDark: "rgba(45,212,191,0.15)", fgDark: "#5eead4" } },
  sky: { dot: "#0ea5e9", badge: { bgLight: "#e0f2fe", fgLight: "#0369a1", bgDark: "rgba(56,189,248,0.15)", fgDark: "#7dd3fc" } },
  blue: { dot: "#3b82f6", badge: { bgLight: "#dbeafe", fgLight: "#1d4ed8", bgDark: "rgba(96,165,250,0.15)", fgDark: "#93c5fd" } },
  violet: { dot: "#8b5cf6", badge: { bgLight: "#ede9fe", fgLight: "#6d28d9", bgDark: "rgba(167,139,250,0.15)", fgDark: "#c4b5fd" } },
  pink: { dot: "#ec4899", badge: { bgLight: "#fce7f3", fgLight: "#be185d", bgDark: "rgba(244,114,182,0.15)", fgDark: "#f9a8d4" } },
};
