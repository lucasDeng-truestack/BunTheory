"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getBunTheorySettings } from "@/lib/bun-theory-api";
import { shopAdminGetContactSettings } from "@/lib/shop-api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/banner";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { BunTheorySettingsForm, type BunTheorySettingsSection } from "@/components/admin/bun-theory/settings-screen";
import { ShopSettingsForm, type ShopSettingsSection, type ShopSettingsStatus } from "@/components/admin/shop-payment";
import { TeamPanel } from "@/components/admin/team-screen";
import { BUN_THEORY_URL, SITE_URL } from "@/components/admin/nav";
import { useAdminQuery } from "@/components/admin/use-admin-query";

type Brand = "bakar-roast" | "bun-theory";

const BRANDS: Record<
  Brand,
  { label: string; sections: { id: string; label: string }[]; elsewhere: { label: string; href: string }[] }
> = {
  "bakar-roast": {
    label: "Bakar & Roast",
    sections: [
      { id: "payment", label: "Payment" },
      { id: "contact", label: "Contact" },
    ],
    elsewhere: [
      { label: "Schedule", href: "/admin/shop-schedule" },
      { label: "Packages", href: "/admin/shop-packages" },
      { label: "Website", href: SITE_URL },
    ],
  },
  "bun-theory": {
    label: "The Bun Theory",
    sections: [
      { id: "ordering", label: "Ordering" },
      { id: "payment", label: "Payment" },
      { id: "outlet", label: "Outlet, fees and tax" },
    ],
    elsewhere: [
      { label: "Batches", href: "/admin/bun-theory/batches" },
      { label: "Menu", href: "/admin/bun-theory/menu" },
      { label: "Website", href: BUN_THEORY_URL },
    ],
  },
};

const BRAND_IDS = Object.keys(BRANDS) as Brand[];
const TEAM = "team";

const hrefFor = (brand: Brand, section: string) => `/admin/settings?brand=${brand}&section=${section}`;

const GROUP_LABEL = "type-admin-meta m-0 px-3 pb-1.5 text-cream-faint";
const ROW = "flex min-h-11 items-center gap-2.5 rounded-[12px] px-3 font-semibold no-underline transition-colors";

/**
 * Settings for every brand on one page: a tab per brand, then that brand's sections, with Team
 * (shared by all brands) below them. The brand and section live in the query string, so a
 * section can be linked to and switching never remounts a form: both brands' forms stay mounted
 * and hidden, which keeps an unsaved Bakar & Roast draft while the owner looks elsewhere.
 */
export function SettingsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const brand: Brand = params.get("brand") === "bun-theory" ? "bun-theory" : "bakar-roast";
  const asked = params.get("section");
  const team = asked === TEAM;
  const known = BRANDS[brand].sections.some((s) => s.id === asked);

  // The section each brand was last on, so a tab returns to it.
  const [last, setLast] = useState<Record<Brand, string>>({ "bakar-roast": "payment", "bun-theory": "ordering" });
  useEffect(() => {
    if (known && asked) setLast((cur) => (cur[brand] === asked ? cur : { ...cur, [brand]: asked }));
  }, [known, asked, brand]);
  const section = known && asked ? asked : last[brand];

  const shop = useAdminQuery((t) => shopAdminGetContactSettings(t), []);
  const bun = useAdminQuery(getBunTheorySettings, []);
  const [shopStatus, setShopStatus] = useState<ShopSettingsStatus | null>(null);
  const [orderingOn, setOrderingOn] = useState<boolean | null>(null);

  const chips: Record<Brand, string | null> = {
    "bakar-roast": shopStatus?.dirty ? "Unsaved" : shopStatus?.noPay ? "No payment set" : null,
    "bun-theory": orderingOn === false ? "Paused" : null,
  };

  const showing = (b: Brand) => !team && brand === b;

  return (
    <AdminPage title="Settings" lead="One place for every brand. Pick a brand, then a section.">
      <nav aria-label="Brand" className="flex flex-wrap gap-1 border-b border-ink-line">
        {BRAND_IDS.map((b) => {
          const current = b === brand;
          return (
            <Link
              key={b}
              href={hrefFor(b, last[b])}
              scroll={false}
              aria-current={current ? "true" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-12 items-center gap-2.5 border-b-[3px] px-4 font-semibold no-underline transition-colors",
                current ? "border-ember text-cream" : "border-transparent text-cream-muted hover:text-cream",
              )}
            >
              {BRANDS[b].label}
              {chips[b] && (
                <span className="type-admin-meta inline-flex h-6 items-center rounded-full border border-cream-faint px-2 leading-none text-cream">
                  {chips[b]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="grid content-start gap-0.5 rounded-card-sm border border-ink-line bg-ink-soft px-2 py-3.5 lg:sticky lg:top-6"
        >
          <p className={GROUP_LABEL}>{BRANDS[brand].label}</p>
          {BRANDS[brand].sections.map((s) => (
            <SectionLink key={s.id} href={hrefFor(brand, s.id)} current={!team && s.id === section}>
              {s.label}
            </SectionLink>
          ))}
          <p className={cn(GROUP_LABEL, "mt-3 border-t border-ink-line pt-3.5")}>People, all brands</p>
          <SectionLink href={hrefFor(brand, TEAM)} current={team}>
            Team
          </SectionLink>
          <p className={cn(GROUP_LABEL, "mt-3 border-t border-ink-line pt-3.5")}>Managed elsewhere</p>
          {BRANDS[brand].elsewhere.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              {...(/^https?:/.test(e.href) ? { target: "_blank", rel: "noreferrer" } : {})}
              className={cn(ROW, "justify-between text-cream-muted hover:text-cream")}
            >
              {e.label}
              <ArrowUpRight aria-hidden size={16} strokeWidth={1.6} className="flex-none text-cream-faint" />
            </Link>
          ))}
        </nav>

        <div className="grid min-w-0 content-start gap-4">
          <div className={cn("grid min-w-0 content-start gap-4", !showing("bakar-roast") && "hidden")}>
            {shop.data === undefined ? (
              shop.error ? (
                <LoadError onRetry={shop.reload} />
              ) : (
                <Skeleton className="h-80" />
              )
            ) : (
              <ShopSettingsForm
                initial={shop.data}
                section={section === "contact" ? "contact" : "payment"}
                onSection={(s: ShopSettingsSection) => router.replace(hrefFor("bakar-roast", s), { scroll: false })}
                onStatus={setShopStatus}
              />
            )}
          </div>

          <div className={cn("grid min-w-0 content-start gap-4", !showing("bun-theory") && "hidden")}>
            {bun.data === undefined ? (
              bun.error ? (
                <LoadError onRetry={bun.reload} />
              ) : (
                <Skeleton className="h-80" />
              )
            ) : (
              <BunTheorySettingsForm
                initial={bun.data}
                section={(brand === "bun-theory" ? section : last["bun-theory"]) as BunTheorySettingsSection}
                onOrdering={setOrderingOn}
              />
            )}
          </div>

          {team && <TeamPanel />}
        </div>
      </div>
    </AdminPage>
  );
}

function SectionLink({ href, current, children }: { href: string; current: boolean; children: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      className={cn(ROW, current ? "bg-ink-raised text-cream" : "text-cream-muted hover:text-cream")}
    >
      <span aria-hidden className={cn("h-2 w-2 flex-none rounded-full", current ? "bg-ember" : "bg-transparent")} />
      {children}
    </Link>
  );
}
