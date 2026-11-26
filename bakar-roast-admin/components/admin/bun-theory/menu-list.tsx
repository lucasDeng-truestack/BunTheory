"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Star } from "lucide-react";
import { listMenu, updateMenuItem, type MenuItem } from "@/lib/bun-theory-api";
import { menuItemState, moneyCents } from "@/lib/bun-theory";
import { formatRM } from "@/lib/admin";
import { isSessionGone } from "@/lib/admin-session";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import type { Notice } from "@/components/admin/bun-theory/order-parts";
import { MenuPhoto } from "@/components/admin/bun-theory/menu-photo";
import { useAdminQuery } from "@/components/admin/use-admin-query";

export const MENU_LIST = "/admin/bun-theory/menu";

/** What the editor reports back after it leaves (?done=…&name=…). */
function doneNotice(done: string | null, name: string): Notice {
  if (done === "added") return { tone: "ok", title: `Added ${name}.`, help: "It is on the storefront menu if it is available." };
  if (done === "saved") return { tone: "ok", title: `Saved ${name}.`, help: "Changes are live on the storefront." };
  if (done === "deleted")
    return {
      tone: "ok",
      title: `Deleted ${name}.`,
      help: "Its order lines were removed, and so were orders that held only this item. Carts drop it the next time the menu loads.",
    };
  return null;
}

/** "Available · cap 40 · 12 sold", as the old card. */
const itemMeta = (i: MenuItem) =>
  [menuItemState(i), i.maxQuantity != null ? `cap ${i.maxQuantity}` : "", i.soldQuantity > 0 ? `${i.soldQuantity} sold` : ""]
    .filter(Boolean)
    .join(" · ");

/**
 * The Bun Theory menu: every item, including hidden ones, in the storefront's order. Each row has
 * its photo, price and state, a switch for showing it on the storefront, and Edit. Adding,
 * editing and deleting happen on the editor screen.
 */
export function MenuScreen() {
  const params = useSearchParams();
  const { run } = useAdmin();
  const q = useAdminQuery((t) => listMenu(t), []);
  const [notice, setNotice] = useState<Notice>(() => doneNotice(params.get("done"), params.get("name") ?? "the item"));
  const [busy, setBusy] = useState<string | null>(null);

  // The message was read; drop it from the URL so a reload does not repeat it.
  useEffect(() => {
    if (params.get("done")) window.history.replaceState(null, "", MENU_LIST);
  }, [params]);

  // Only `available` is sent: an optionGroups key would replace every group.
  const toggle = async (item: MenuItem, on: boolean) => {
    setNotice(null);
    setBusy(item.id);
    q.setData((cur) => cur?.map((i) => (i.id === item.id ? { ...i, available: on } : i)));
    try {
      const saved = await run((t) => updateMenuItem(t, item.id, { available: on }));
      q.setData((cur) => cur?.map((i) => (i.id === saved.id ? saved : i)));
      setNotice({ tone: "ok", title: on ? `${item.name} is on the storefront.` : `${item.name} is hidden from the storefront.` });
    } catch (err) {
      q.setData((cur) => cur?.map((i) => (i.id === item.id ? { ...i, available: !on } : i)));
      if (!isSessionGone(err)) setNotice({ tone: "error", ...describeError(err) });
    } finally {
      setBusy(null);
    }
  };

  const list = q.data;

  return (
    <AdminPage
      title="Menu"
      lead="The Bun Theory storefront menu. Add items, set what shows and what is sold out, and upload photos."
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={() => void q.reload()} loading={q.loading && list !== undefined} loadingLabel="Refreshing">
            <span className="inline-flex items-center gap-2">
              <RefreshCw aria-hidden size={16} strokeWidth={1.75} />
              Refresh
            </span>
          </Button>
          <Button size="sm" href={`${MENU_LIST}/new`}>
            <span className="inline-flex items-center gap-2">
              <Plus aria-hidden size={16} strokeWidth={1.75} />
              Add an item
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
              title="No menu items yet."
              action={
                <Button size="sm" variant="cream" href={`${MENU_LIST}/new`}>
                  Add an item
                </Button>
              }
            >
              Add one so customers have something to order.
            </EmptyState>
          ) : (
            <ul className="m-0 grid list-none gap-2 p-0">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-ink-raised px-3.5 py-3"
                >
                  <div className={cn("flex min-w-0 flex-[1_1_260px] items-center gap-3", !item.available && "opacity-50")}>
                    <div aria-hidden className="w-[72px] flex-none">
                      <MenuPhoto url={item.image} alt="" sizes="72px" className="h-[54px] rounded-[10px]" />
                    </div>
                    <div className="grid min-w-0 gap-0.5">
                      <b className="flex items-center gap-1.5 [overflow-wrap:anywhere]">
                        {item.name}
                        {item.isFavorite && (
                          <Star aria-label="Favourite" size={14} strokeWidth={1.75} className="flex-none fill-ember text-ember" />
                        )}
                      </b>
                      <span className="text-sm">
                        <b className="tabular-nums">{formatRM(moneyCents(item.price) ?? 0)}</b>
                        {item.category ? <span className="text-cream-muted"> · {item.category}</span> : null}
                      </span>
                      <span className={cn("text-[13px]", item.soldOut ? "font-semibold text-cream" : "text-cream-muted")}>
                        {itemMeta(item)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Toggle
                      label={<span className="sr-only">Show {item.name} on the storefront</span>}
                      onText="Shown"
                      offText="Hidden"
                      checked={item.available}
                      disabled={busy === item.id}
                      aria-busy={busy === item.id || undefined}
                      onChange={(e) => void toggle(item, e.target.checked)}
                    />
                    <Button size="sm" variant="ghost" href={`${MENU_LIST}/${item.id}`} aria-label={`Edit ${item.name}`}>
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminPage>
  );
}
