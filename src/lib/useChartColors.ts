"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** Chart inline colors derived from the current theme. */
export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Avoid hydration mismatch: default to false until mounted
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  return {
    /** Grid stroke (CartesianGrid) */
    gridStroke: isDark ? "#262626" : "#e0e0e0",
    /** Axis tick label fill */
    tickFill: isDark ? "#a3a3a3" : "#757575",
    /** Bold axis label fill */
    labelFill: isDark ? "#e5e5e5" : "#000000",
    /** Tooltip background */
    tooltipBg: isDark ? "#111111" : "#ffffff",
    /** Tooltip text */
    tooltipText: isDark ? "#e5e5e5" : "#000000",
    /** Tooltip border */
    tooltipBorder: isDark ? "#262626" : "#e0e0e0",
  };
}
