import {
  CustomerPageShell,
  CustomerTopBar,
  customerMainPaddingClass,
} from "@/components/layout/customer-shell";
import { cn } from "@/lib/utils";
import { TrackOrderView } from "@/components/order/track-order-view";
import { PackageSearch } from "lucide-react";

export const metadata = {
  title: "Track order | Bakar & Roast",
  description: "Look up your in-progress order with your phone number",
};

export default function TrackOrderPage() {
  return (
    <CustomerPageShell>
      <CustomerTopBar title="Track order" backHref="/" backLabel="Home" />
      <main
        className={cn(
          "flex flex-1 flex-col py-6 sm:py-10 lg:py-12",
          customerMainPaddingClass
        )}
      >
        <div className="mx-auto w-full max-w-[min(100%,1600px)]">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12 xl:gap-16">
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="relative overflow-hidden rounded-3xl border border-charcoal/10 bg-white p-6 shadow-elevated sm:p-8 lg:sticky lg:top-28">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-roast-red/10 blur-2xl"
                  aria-hidden
                />
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                  <PackageSearch className="h-6 w-6" aria-hidden />
                </span>
                <h1 className="mt-4 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                  Track your order
                </h1>
                <p className="mt-3 text-pretty text-sm leading-relaxed text-charcoal/70 lg:text-base">
                  Enter the phone number you used at checkout. Only orders still in the
                  kitchen queue are shown — completed orders are hidden so you see
                  what&apos;s live.
                </p>
                <ul className="mt-6 space-y-2 text-sm text-charcoal/55">
                  <li className="flex gap-2">
                    <span className="text-roast-red" aria-hidden>
                      ·
                    </span>
                    Refreshes every few seconds while you keep this page open
                  </li>
                  <li className="flex gap-2">
                    <span className="text-roast-red" aria-hidden>
                      ·
                    </span>
                    Same number format as when you placed the order
                  </li>
                </ul>
              </div>
            </div>
            <div className="lg:col-span-7 xl:col-span-8">
              <h2 className="sr-only">Look up by phone</h2>
              <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-5 shadow-card sm:p-8 lg:p-10">
                <TrackOrderView />
              </div>
            </div>
          </div>
        </div>
      </main>
    </CustomerPageShell>
  );
}
