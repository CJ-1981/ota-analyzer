/* ------------------------------------------------------------------ */
/*  Chart & state color helpers — distinct chromatic palette            */
/* ------------------------------------------------------------------ */

/* State colors — visually distinct for charts and flow diagrams */
export const STATE_COLORS: Record<string, string> = {
  INITIATED: "#94a3b8",     /* slate-400 — neutral starting point */
  AUTHENTICATING: "#60a5fa", /* blue-400 — verification phase */
  DOWNLOADING: "#38bdf8",   /* sky-400 — data transfer */
  VERIFYING: "#a78bfa",     /* violet-400 — integrity check */
  INSTALLING: "#34d399",    /* emerald-400 — progress */
  COMPLETED: "#22c55e",     /* green-500 — success */
  FAILED: "#ef4444",        /* red-500 — error */
  RETRYING: "#f59e0b",      /* amber-500 — retry */
  ABORTED: "#f87171",       /* red-400 — cancelled */
};

/* Chart palette — 12 distinct hues for bars, series, etc. */
export const CHART_PALETTE = [
  "#3b82f6", /* blue-500 */
  "#ef4444", /* red-500 */
  "#22c55e", /* green-500 */
  "#f59e0b", /* amber-500 */
  "#8b5cf6", /* violet-500 */
  "#06b6d4", /* cyan-500 */
  "#ec4899", /* pink-500 */
  "#f97316", /* orange-500 */
  "#14b8a6", /* teal-500 */
  "#6366f1", /* indigo-500 */
  "#84cc16", /* lime-500 */
  "#a855f7", /* purple-500 */
];

function computeStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return hash;
}

export function getStateColor(state: string): string {
  if (STATE_COLORS[state]) return STATE_COLORS[state];
  return CHART_PALETTE[Math.abs(computeStringHash(state)) % CHART_PALETTE.length];
}

/* Badge classes — tinted backgrounds matching state colors */
const BADGE_CLASSES = [
  "bg-blue-100 text-blue-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-slate-100 text-slate-800",
  "bg-green-100 text-green-800",
  "bg-red-100 text-red-800",
  "bg-orange-100 text-orange-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
];

const NAMED_BADGES: Record<string, string> = {
  INITIATED: "bg-slate-100 text-slate-700",
  AUTHENTICATING: "bg-blue-100 text-blue-800",
  DOWNLOADING: "bg-sky-100 text-sky-800",
  VERIFYING: "bg-violet-100 text-violet-800",
  INSTALLING: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  RETRYING: "bg-amber-100 text-amber-800",
  ABORTED: "bg-rose-100 text-rose-800",
};

export function getStateBadgeClass(state: string): string {
  if (NAMED_BADGES[state]) return NAMED_BADGES[state];
  return BADGE_CLASSES[Math.abs(computeStringHash(state)) % BADGE_CLASSES.length];
}

/* Tooltip — square corners, no shadow, hairline border */
export const TOOLTIP_CONTENT_STYLE = {
  borderRadius: "0px",
  border: "1px solid #e0e0e0",
  background: "#ffffff",
  color: "#000000",
  fontSize: "13px",
  fontFamily: "Inter, system-ui, sans-serif",
};
