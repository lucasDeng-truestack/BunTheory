import type { ReactNode } from "react";
import {
  CustomerPageShell,
  customerMainPaddingClass,
  customerHeaderChromeClass,
  customerHeaderInnerClass,
} from "@/components/layout/customer-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function LoadingStatus({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("min-h-0 flex-1", className)}
    >
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

/** Top chrome matching {@link CustomerTopBar} / marketing layout. */
function CustomerHeaderSkeleton({ variant }: { variant: "marketing" | "inner" }) {
  return (
    <header className={customerHeaderChromeClass}>
      <div
        className={cn(
          "h-1 w-full bg-gradient-to-r from-roast-red via-roast-red/90 to-amber-500/35",
          variant === "marketing" && "h-1.5 from-deep-red via-roast-red to-accent-orange/60"
        )}
        aria-hidden
      />
      <div
        className={cn(
          customerHeaderInnerClass,
          variant === "marketing"
            ? "flex flex-col gap-4 py-3 sm:gap-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:py-5"
            : "grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 py-3 sm:gap-x-3 sm:py-4 lg:gap-x-6 lg:py-5"
        )}
      >
        {variant === "inner" ? (
          <>
            <Skeleton className="h-10 w-24 rounded-full justify-self-start" />
            <Skeleton className="mx-auto h-10 w-36 rounded-xl sm:w-44 lg:h-12 lg:w-56" />
            <div className="flex justify-end gap-2">
              <Skeleton className="hidden h-10 w-16 rounded-full lg:block" />
              <Skeleton className="hidden h-10 w-16 rounded-full lg:block" />
              <Skeleton className="h-10 w-24 rounded-full lg:w-28" />
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12 lg:h-16 lg:w-16" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-48 max-w-[70vw] rounded-lg lg:h-12 lg:w-64" />
                <Skeleton className="h-4 w-32 max-w-[50vw] rounded lg:h-5" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Skeleton className="h-10 w-20 rounded-full" />
              <Skeleton className="h-10 w-20 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/** Landing `/` */
export function MarketingHomeSkeleton() {
  return (
    <CustomerPageShell>
      <LoadingStatus>
        <CustomerHeaderSkeleton variant="marketing" />
        <main
          className={cn(
            "flex flex-1 flex-col pb-12 pt-8 sm:pt-12 lg:pt-14",
            customerMainPaddingClass
          )}
        >
          <div className="relative overflow-hidden rounded-3xl bg-hero-warm shadow-hero">
            <div className="relative grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8 lg:pl-10">
              <div className="space-y-4 text-center lg:space-y-6 lg:text-left">
                <Skeleton className="mx-auto h-8 w-40 rounded-full lg:mx-0 lg:h-9" />
                <Skeleton className="mx-auto h-14 w-full max-w-md rounded-2xl lg:mx-0 lg:h-20" />
                <Skeleton className="mx-auto h-14 w-full max-w-lg rounded-xl lg:mx-0" />
                <Skeleton className="mx-auto h-14 w-full max-w-md rounded-xl lg:mx-0" />
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Skeleton className="h-14 min-h-14 w-full rounded-xl sm:w-56" />
                  <Skeleton className="h-14 min-h-14 w-full rounded-xl sm:w-44" />
                </div>
              </div>
              <div className="relative mx-auto flex min-h-[220px] w-full max-w-md items-center justify-center lg:min-h-[360px]">
                <Skeleton className="h-56 w-full max-w-sm rounded-[2rem] sm:h-72 lg:h-96" />
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8">
            <Skeleton className="h-28 rounded-2xl lg:h-32" />
            <Skeleton className="h-28 rounded-2xl lg:h-32" />
          </div>
          <div className="mt-10 space-y-4 lg:mt-16">
            <Skeleton className="h-6 w-40 rounded-full" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </LoadingStatus>
    </CustomerPageShell>
  );
}

/** `/menu` */
export function MenuPageSkeleton() {
  return (
    <CustomerPageShell>
      <LoadingStatus>
        <CustomerHeaderSkeleton variant="inner" />
        <main
          className={cn(
            "flex flex-1 flex-col py-6 sm:py-8 lg:py-10",
            customerMainPaddingClass
          )}
        >
          <Skeleton className="mb-6 h-28 w-full rounded-2xl lg:mb-8" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        </main>
      </LoadingStatus>
    </CustomerPageShell>
  );
}

/** `/order` */
export function OrderPageSkeleton() {
  return (
    <CustomerPageShell>
      <LoadingStatus>
        <CustomerHeaderSkeleton variant="inner" />
        <main
          className={cn(
            "flex flex-1 flex-col py-6 sm:py-8 lg:py-10",
            customerMainPaddingClass
          )}
        >
          <Skeleton className="mb-6 h-24 w-full rounded-2xl lg:mb-8 lg:h-28" />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            <Skeleton className="min-h-[280px] rounded-3xl lg:min-h-[320px]" />
            <Skeleton className="min-h-[280px] rounded-3xl lg:min-h-[320px]" />
          </div>
        </main>
      </LoadingStatus>
    </CustomerPageShell>
  );
}

/** `/track` */
export function TrackPageSkeleton() {
  return (
    <CustomerPageShell>
      <LoadingStatus>
        <CustomerHeaderSkeleton variant="inner" />
        <main
          className={cn(
            "flex flex-1 flex-col py-6 sm:py-10 lg:py-12",
            customerMainPaddingClass
          )}
        >
          <div className="mx-auto w-full max-w-[min(100%,1600px)]">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              <Skeleton className="min-h-[320px] rounded-3xl lg:col-span-5 xl:col-span-4" />
              <Skeleton className="min-h-[240px] rounded-3xl lg:col-span-7 xl:col-span-8" />
            </div>
          </div>
        </main>
      </LoadingStatus>
    </CustomerPageShell>
  );
}

/** `/order/success` */
export function OrderSuccessSkeleton() {
  return (
    <CustomerPageShell>
      <LoadingStatus>
        <CustomerHeaderSkeleton variant="inner" />
        <main
          className={cn(
            "flex flex-1 flex-col py-6 sm:py-8 lg:py-10",
            customerMainPaddingClass
          )}
        >
          <div className="mx-auto w-full max-w-lg space-y-6">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </main>
      </LoadingStatus>
    </CustomerPageShell>
  );
}

/** Admin area — only main content (layout already renders header). */
export function AdminPageSkeleton() {
  return (
    <LoadingStatus className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48 max-w-[80vw] rounded-lg" />
          <Skeleton className="h-4 w-full max-w-md rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-card">
        <div className="border-b border-charcoal/10 bg-cream/30 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20 rounded" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-charcoal/8 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4 py-4">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-5 flex-1 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingStatus>
  );
}

/** `/admin/login` — centered card, no duplicate nav (layout still shows). */
export function AdminLoginSkeleton() {
  return (
    <LoadingStatus className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-charcoal/10 bg-white/80 p-8 shadow-elevated">
        <Skeleton className="mx-auto h-10 w-10 rounded-full" />
        <Skeleton className="h-8 w-[75%] rounded-lg" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </LoadingStatus>
  );
}
