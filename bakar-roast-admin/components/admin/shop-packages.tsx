"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import {
  shopAdminListPackages,
  shopAdminReorderPackages,
  shopAdminUpdatePackage,
  type ShopPackageAdmin,
} from "@/lib/shop-api";
import { moneyCents } from "@/lib/bun-theory";
import { formatRM } from "@/lib/admin";
import { isSessionGone } from "@/lib/admin-session";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { OrderArrows, useSerial } from "@/components/admin/list-tools";
import type { Notice } from "@/components/admin/bun-theory/order-parts";
import { MenuPhoto } from "@/components/admin/bun-theory/menu-photo";
import { useAdminQuery } from "@/components/admin/use-admin-query";

export const PACKAGE_LIST = "/admin/shop-packages";

/** What the editor reports back after it leaves (?done=…&name=…). */
function doneNotice(done: string | null, name: string): Notice {
  if (done === "added") return { tone: "ok", title: `Added ${name}.`, help: "It is on the order page if it is shown." };
  if (done === "saved") return { tone: "ok", title: `Saved ${name}.`, help: "Changes are live on the order page." };
  if (done === "deleted") return { tone: "ok", title: `Deleted ${name}.`, help: "Past orders keep their own copy of it." };
  return null;
}

/**
 * The packages sold on the Bakar & Roast order page, in menu order. Each row has its cover photo
 * and price, arrows to move it, a switch for showing it, and Edit. Adding, editing and deleting
 * happen on the editor screen.
 */
export function ShopPackagesScreen() {
  const params = useSearchParams();
  const { run } = useAdmin();
  const serial = useSerial();
  const q = useAdminQuery((t) => shopAdminListPackages(t), []);
  const [notice, setNotice] = useState<Notice>(() => doneNotice(params.get("done"), params.get("name") ?? "the package"));
  const [busy, setBusy] = useState<string | null>(null);

  // The message was read; drop it from the URL so a reload does not repeat it.
  useEffect(() => {
    if (params.get("done")) window.history.replaceState(null, "", PACKAGE_LIST);
  }, [params]);

  const list = q.data;

  const toggle = async (pkg: ShopPackageAdmin, on: boolean) => {
    setNotice(null);
    setBusy(pkg.id);
    q.setData((cur) => cur?.map((p) => (p.id === pkg.id ? { ...p, active: on } : p)));
    try {
      const saved = await run((t) => shopAdminUpdatePackage(t, pkg.id, { active: on }));
      q.setData((cur) => cur?.map((p) => (p.id === saved.id ? saved : p)));
      setNotice({ tone: "ok", title: on ? `${pkg.name} is on the order page.` : `${pkg.name} is hidden from the order page.` });
    } catch (err) {
      q.setData((cur) => cur?.map((p) => (p.id === pkg.id ? { ...p, active: !on } : p)));
      if (!isSessionGone(err)) setNotice({ tone: "error", ...describeError(err) });
    } finally {
      setBusy(null);
    }
  };

  // The list changes at once, then the whole order is sent. Sends run one at a time, so the
  // last tap always wins on the server.
  const move = async (index: number, dir: -1 | 1) => {
    if (!list) return;
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[index], next[j]] = [next[j], next[index]];
    setNotice(null);
    q.setData(() => next);
    try {
      await serial(() => run((t) => shopAdminReorderPackages(t, next.map((p) => p.id))));
    } catch (err) {
      if (!isSessionGone(err)) setNotice({ tone: "error", ...describeError(err) });
      void q.reload();
    }
  };

  return (
    <AdminPage
      eyebrow="Bakar & Roast"
      title="Packages"
      lead="What customers can order on the order page. Set the name, price, what is included and the photos."
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={() => void q.reload()} loading={q.loading && list !== undefined} loadingLabel="Refreshing">
            <span className="inline-flex items-center gap-2">
              <RefreshCw aria-hidden size={16} strokeWidth={1.75} />
              Refresh
            </span>
          </Button>
          <Button size="sm" href={`${PACKAGE_LIST}/new`}>
            <span className="inline-flex items-center gap-2">
              <Plus aria-hidden size={16} strokeWidth={1.75} />
              Add a package
            </span>
          </Button>
        </>
      }
    >
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}

      {list === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <div aria-busy="true" className="grid gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[92px]" />
            ))}
          </div>
        )
      ) : (
        <>
          {q.error ? <LoadError onRetry={q.reload} /> : null}
          {list.length === 0 ? (
            <EmptyState
              title="No packages yet."
              action={
                <Button size="sm" variant="cream" href={`${PACKAGE_LIST}/new`}>
                  Add a package
                </Button>
              }
            >
              Add one so customers have something to order.
            </EmptyState>
          ) : (
            <>
              {list.every((p) => !p.active) && (
                <Banner tone="error" title="Every package is hidden.">
                  The order page has nothing to sell until one is shown.
                </Banner>
              )}
              <ul className="m-0 grid list-none gap-2 p-0">
                {list.map((pkg, i) => (
                  <li
                    key={pkg.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-ink-raised px-3.5 py-3"
                  >
                    <div className={cn("flex min-w-0 flex-[1_1_260px] items-center gap-3", !pkg.active && "opacity-50")}>
                      <div aria-hidden className="w-[72px] flex-none">
                        <MenuPhoto url={pkg.images[0]} alt="" sizes="72px" className="h-[54px] rounded-[10px]" />
                      </div>
                      <div className="grid min-w-0 gap-0.5">
                        <b className="[overflow-wrap:anywhere]">{pkg.name}</b>
                        <span className="text-sm">
                          <b className="tabular-nums">{formatRM(moneyCents(pkg.price) ?? 0)}</b>
                          {pkg.tagline ? <span className="text-cream-muted"> · {pkg.tagline}</span> : null}
                        </span>
                        <span className="text-[13px] text-cream-muted">
                          {pkg.images.length === 0 ? "No photo yet" : pkg.images.length === 1 ? "1 photo" : `${pkg.images.length} photos`}
                          {" · "}
                          {pkg.includes.length === 1 ? "1 item included" : `${pkg.includes.length} items included`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderArrows name={pkg.name} first={i === 0} last={i === list.length - 1} onMove={(dir) => void move(i, dir)} />
                      <Toggle
                        label={<span className="sr-only">Show {pkg.name} on the order page</span>}
                        onText="Shown"
                        offText="Hidden"
                        checked={pkg.active}
                        disabled={busy === pkg.id}
                        aria-busy={busy === pkg.id || undefined}
                        onChange={(e) => void toggle(pkg, e.target.checked)}
                      />
                      <Button size="sm" variant="ghost" href={`${PACKAGE_LIST}/${pkg.id}`} aria-label={`Edit ${pkg.name}`}>
                        Edit
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </AdminPage>
  );
}
