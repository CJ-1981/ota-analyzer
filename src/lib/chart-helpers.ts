/* ------------------------------------------------------------------ */
/*  Chart & state color helpers — Wired monochrome editorial palette   */
/* ------------------------------------------------------------------ */

/* Monochrome ink palette — no chromatic accents */
export const STATE_COLORS: Record<string, string> = {
  INITIATED: "#cccccc",
  AUTHENTICATING: "#bbbbbb",
  DOWNLOADING: "#999999",
  VERIFYING: "#757575",
  INSTALLING: "#555555",
  COMPLETED: "#000000",
  FAILED: "#333333",
  RETRYING: "#4a4a4a",
  ABORTED: "#8a8a8a",
};

export const CHART_PALETTE = [
  "#000000",
  "#1a1a1a",
  "#333333",
  "#4a4a4a",
  "#555555",
  "#6a6a6a",
  "#757575",
  "#8a8a8a",
  "#999999",
  "#aaaaaa",
  "#bbbbbb",
  "#cccccc",
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

/* Badge classes — monochrome ink system */
const BADGE_CLASSES = [
  "bg-ink/10 text-ink",
  "bg-ink/8 text-ink",
  "bg-ink/6 text-ink",
  "bg-ink/5 text-ink",
  "bg-secondary text-ink",
  "bg-ink/12 text-ink",
  "bg-ink/4 text-ink",
  "bg-ink/7 text-ink",
  "bg-ink/9 text-ink",
  "bg-ink/3 text-ink",
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
