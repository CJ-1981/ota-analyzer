"use client";

import { useEffect } from "react";

export function FilterRunner({
  runCustomAnalysis,
}: {
  runCustomAnalysis: () => void;
}) {
  useEffect(() => {
    runCustomAnalysis();
  }, [runCustomAnalysis]);

  return null;
}
