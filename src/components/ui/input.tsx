import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-ink placeholder:text-body selection:bg-ink selection:text-white border border-ink flex h-9 w-full min-w-0 bg-transparent px-3 py-1 text-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-ink/50 focus-visible:ring-[2px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
