import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2 py-0.5 text-xs font-bold uppercase tracking-wider w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ink focus-visible:ring-ink/50 focus-visible:ring-[2px] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-ink text-white [a&]:hover:bg-ink/90",
        secondary:
          "border-hairline bg-secondary text-ink [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-ink text-white [a&]:hover:bg-ink/90",
        outline:
          "border-ink text-ink [a&]:hover:bg-secondary [a&]:hover:text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
