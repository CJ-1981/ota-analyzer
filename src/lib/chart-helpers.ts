/* ------------------------------------------------------------------ */
/*  Chart & state color helpers — shared across components             */
/* ------------------------------------------------------------------ */

export const STATE_COLORS: Record<string, string> = {
  INITIATED: "#6366f1",
  AUTHENTICATING: "#8b5cf6",
  DOWNLOADING: "#3b82f6",
  VERIFYING: "#06b6d4",
  INSTALLING: "#f59e0b",
  COMPLETED: "#10b981",
  FAILED: "#ef4444",
  RETRYING: "#f97316",
  ABORTED: "#ec4899",
};

export const CHART_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
  "#eab308",
];

const FALLBACK_COLORS = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#f59e0b",
  "#10b981", "#ef4444", "#f97316", "#ec4899", "#14b8a6",
  "#a855f7", "#eab308",
];

export function getStateColor(state: string): string {
  if (STATE_COLORS[state]) return STATE_COLORS[state];
  let hash = 0;
  for (let i = 0; i < state.length; i++)
    hash = state.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

const BADGE_CLASSES = [
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
];

const NAMED_BADGES: Record<string, string> = {
  INITIATED: BADGE_CLASSES[0],
  AUTHENTICATING: BADGE_CLASSES[1],
  DOWNLOADING: BADGE_CLASSES[2],
  VERIFYING: BADGE_CLASSES[3],
  INSTALLING: BADGE_CLASSES[4],
  COMPLETED: BADGE_CLASSES[5],
  FAILED: BADGE_CLASSES[6],
  RETRYING: BADGE_CLASSES[7],
  ABORTED: BADGE_CLASSES[8],
};

export function getStateBadgeClass(state: string): string {
  if (NAMED_BADGES[state]) return NAMED_BADGES[state];
  let hash = 0;
  for (let i = 0; i < state.length; i++)
    hash = state.charCodeAt(i) + ((hash << 5) - hash);
  return BADGE_CLASSES[Math.abs(hash) % BADGE_CLASSES.length];
}

export const TOOLTIP_CONTENT_STYLE = {
  borderRadius: "8px",
  border: "1px solid var(--border, #e5e7eb)",
  background: "var(--popover, #ffffff)",
  color: "var(--popover-foreground, #1a1a1a)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
};
