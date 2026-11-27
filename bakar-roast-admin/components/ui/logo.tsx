import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Bakar & Roast logo (flame, crossed tools, name). Two files, because its black parts
 * vanish on the dark theme: `logo.png` for light ground, `logo-dark.png` (tools in cream) for
 * dark ground. Both are in the page and CSS shows one (`.brand-logo` in globals.css), so the
 * right one is there on first paint with no flash. Size it with a height class on `className`.
 */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  const shared = { width: 800, height: 635, priority, sizes: "(min-width: 768px) 520px, 80vw" } as const;
  return (
    <span className={cn("brand-logo relative inline-block aspect-[800/635]", className)}>
      <Image src="/images/logo-dark.png" alt="Bakar & Roast" {...shared} className="brand-logo-dark h-full w-full" />
      <Image src="/images/logo.png" alt="Bakar & Roast" {...shared} className="brand-logo-light h-full w-full" />
    </span>
  );
}
