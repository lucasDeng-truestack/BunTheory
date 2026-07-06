import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="admin-accent-bar w-14" aria-hidden />
        <h1 className="font-display text-3xl font-bold tracking-tight text-bun-ink lg:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-base text-bun-ink-soft">{description}</p>
        )}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
