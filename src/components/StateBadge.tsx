"use client";

import { getStateBadgeClass } from "@/lib/chart-helpers";

export function StateBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(state)}`}
    >
      {state}
    </span>
  );
}
