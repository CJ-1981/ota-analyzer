"use client";

import { useState } from "react";
import { X, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStateBadgeClass } from "@/lib/chart-helpers";

export function TagInput({
  values,
  onChange,
  placeholder,
  reorderable,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  reorderable?: boolean;
}) {
  const [inputVal, setInputVal] = useState("");

  const addTag = () => {
    const trimmed = inputVal.trim().toUpperCase();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputVal("");
  };

  const removeTag = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const moveTag = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= values.length) return;
    const arr = [...values];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, idx) => (
          <span
            key={v}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${getStateBadgeClass(v)}`}
          >
            {reorderable && (
              <>
                <button
                  type="button"
                  onClick={() => moveTag(idx, -1)}
                  className="hover:bg-black/10 rounded p-0.5"
                  disabled={idx === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveTag(idx, 1)}
                  className="hover:bg-black/10 rounded p-0.5"
                  disabled={idx === values.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </>
            )}
            {v}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="hover:bg-black/10 rounded p-0.5 ml-0.5"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          className="h-8 px-2"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
