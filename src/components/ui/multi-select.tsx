"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MultiSelectProps = {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplay?: number;
};

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className = "",
  maxDisplay = 3,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const displayed = selected.slice(0, maxDisplay);
  const remaining = selected.length - maxDisplay;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex flex-1 items-center gap-1 overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 overflow-hidden">
              {displayed.map((val) => (
                <Badge
                  key={val}
                  variant="secondary"
                  className="shrink-0 px-1.5 py-0 text-xs font-medium max-w-[120px] truncate"
                >
                  {val}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(val);
                    }}
                    className="ml-0.5 rounded-sm outline-none ring-offset-background focus:ring-1 focus:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {remaining > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">
                  +{remaining}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-sm p-0.5 hover:bg-accent"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto">
          {/* Select All / Clear All */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
            <button
              type="button"
              onClick={() => onChange([...options])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>

          {options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {isSelected && <Check className="h-4 w-4" />}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
