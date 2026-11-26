import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the design tokens, so cn("rounded-card-lg", "rounded-card-sm") keeps one.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ "rounded-card": ["sm", "md", "lg"] }],
      py: ["py-section"],
      px: ["px-gutter"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
