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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 shrink items-center gap-3 rounded-xl py-0.5 text-left font-bold tracking-tight text-roast-red outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-roast-red"
          >
            <span className="shrink-0" aria-hidden>
              <BrandLogo size="sm" className="size-10" />
            </span>
            <span className="min-w-0">
              <span className="block truncate">Admin</span>
              <span className="block truncate text-sm font-normal text-charcoal/55">
                Bun Theory
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
