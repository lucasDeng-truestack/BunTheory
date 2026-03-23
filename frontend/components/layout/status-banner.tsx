import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

type StatusBannerProps = {
  variant?: "warning" | "info";
  title: string;
  description?: string;
  className?: string;
};

export function StatusBanner({
  variant = "warning",
  title,
  description,
  className,
}: StatusBannerProps) {
  const Icon = variant === "warning" ? AlertTriangle : Info;
  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border p-4 text-left shadow-sm",
        variant === "warning" &&
          "border-amber-200/80 bg-amber-50 text-amber-950",
        variant === "info" && "border-charcoal/10 bg-white text-charcoal",
        className
      )}
    >
      <div className="flex gap-3">
        <Icon
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            variant === "warning" ? "text-amber-700" : "text-roast-red"
          )}
          aria-hidden
        />
        <div>
          <p className="font-semibold leading-tight">{title}</p>
          {description && (
            <p className="mt-1 text-sm opacity-90">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
