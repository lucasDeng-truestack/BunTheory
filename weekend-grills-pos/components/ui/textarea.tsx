import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-border/80 bg-card/90 px-3.5 py-3 text-base font-medium text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.38),0_1px_2px_rgb(15_14_13/0.06)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/70 hover:border-bbq-flame/40 hover:bg-card focus-visible:border-bbq-flame focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-bbq-flame/20 disabled:cursor-not-allowed disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
