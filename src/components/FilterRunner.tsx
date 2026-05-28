"use client";

import { useEffect } from "react";

export function FilterRunner({
  entityFilter,
  stateFilter,
  runCustomAnalysis,
}: {
  entityFilter: string[];
  stateFilter: string[];
  runCustomAnalysis: () => void;
}) {
  useEffect(() => {
    runCustomAnalysis();
  }, [entityFilter, stateFilter, runCustomAnalysis]);

  return null;
}
