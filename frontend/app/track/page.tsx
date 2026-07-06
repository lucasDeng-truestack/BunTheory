import { SubPageShell } from "@/components/layout/sub-page-shell";
import { TrackOrderView } from "@/components/order/track-order-view";
import { PackageSearch } from "lucide-react";
import { BRAND_FULL_NAME } from "@/lib/brand";

export const metadata = {
  title: `Track order | ${BRAND_FULL_NAME}`,
  description: "Look up your in-progress order with your phone number",
};

export default function TrackOrderPage() {
  return (
    <SubPageShell title="Track order" eyebrow="Where's my food?" backHref="/" backLabel="Home">
      <div className="mx-auto w-full max-w-[min(100%,1600px)]">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12 xl:gap-16">
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="relative overflow-hidden rounded-4xl border-2 border-bun-ink bg-white p-6 shadow-sticker sm:p-8 lg:sticky lg:top-28">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-bun-ink bg-bun-yellow text-bun-ink">
                <PackageSearch className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-bun-ink sm:text-3xl">
                Track your order
              </h2>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-bun-ink-soft lg:text-base">
                Enter the phone number you used at checkout. Only orders still in the
                kitchen queue are shown — completed orders are hidden so you see
                what&apos;s live.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-bun-ink-soft">
                <li className="flex gap-2">
                  <span className="font-bold text-bun-red" aria-hidden>
                    ·
                  </span>
                  Refreshes every few seconds while you keep this page open
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-bun-red" aria-hidden>
                    ·
                  </span>
                  Same number format as when you placed the order
                </li>
              </ul>
            </div>
          </div>
          <div className="lg:col-span-7 xl:col-span-8">
            <h2 className="sr-only">Look up by phone</h2>
            <div className="rounded-4xl border-2 border-bun-ink bg-white p-5 shadow-sticker sm:p-8 lg:p-10">
              <TrackOrderView />
            </div>
          </div>
        </div>
      </div>
    </SubPageShell>
  );
}
