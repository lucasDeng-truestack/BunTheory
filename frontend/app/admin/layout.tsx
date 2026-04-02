import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-cream/90 text-base leading-relaxed text-charcoal">
      <header className="sticky top-0 z-20 border-b border-charcoal/10 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:py-5">
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 shrink items-center gap-3 rounded-xl py-0.5 text-left font-bold tracking-tight text-roast-red outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-roast-red lg:gap-4"
          >
            <span className="shrink-0" aria-hidden>
              <BrandLogo size="md" className="size-10 lg:size-14" />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-xl uppercase text-deep-red lg:text-[2rem]">
                Bakar & Roast
              </span>
              <span className="font-display block truncate text-sm font-normal text-charcoal/55 lg:text-base">
                Admin Panel
              </span>
            </span>
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
