"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CateringPackageAdmin } from "@/lib/api";
import { adminListPackages, adminUpdatePackage, imageSrc } from "@/lib/catering-api";
import { plural } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { Toggle } from "@/components/ui/toggle";
import { guestRange } from "@/components/sections/package-card";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { OrderArrows, useReorder } from "@/components/admin/list-tools";
import { useAdminQuery } from "@/components/admin/use-admin-query";

type Notice = { tone: "ok" | "error"; title: string; help?: string } | null;

/** What the editor reports back after it leaves (?done=…&name=…). */
function doneNotice(done: string | null, name: string): Notice {
  if (done === "added") return { tone: "ok", title: `Added ${name}.`, help: "It is on the catering page if it is shown." };
  if (done === "saved") return { tone: "ok", title: `Saved ${name}.` };
  if (done === "deleted") return { tone: "ok", title: `Deleted ${name}.` };
  if (done === "hidden")
    return { tone: "ok", title: "This package has bookings, so it was hidden instead of deleted.", help: "Old requests keep it." };
  return null;
}

export function PackagesScreen() {
  const params = useSearchParams();
  const { run } = useAdmin();
  const q = useAdminQuery(adminListPackages, []);
  const [notice, setNotice] = useState<Notice>(() => doneNotice(params.get("done"), params.get("name") ?? "the package"));

  // The message was read; drop it from the URL so a reload does not repeat it.
  useEffect(() => {
    if (params.get("done")) window.history.replaceState(null, "", "/admin/packages");
  }, [params]);

  const list = q.data ?? [];
  const setList = (l: CateringPackageAdmin[]) => q.setData(l);
  const failed = (err: unknown) => setNotice({ tone: "error", ...describeError(err) });

  const move = useReorder({
    list,
    setList,
    send: (t, id, sortOrder) => adminUpdatePackage(t, id, { sortOrder }),
    onFail: failed,
    reload: () => void q.reload(),
  });

  const toggle = async (pkg: CateringPackageAdmin, on: boolean) => {
    setNotice(null);
    q.setData((cur) => cur?.map((p) => (p.id === pkg.id ? { ...p, isActive: on } : p)));
    try {
      const saved = await run((t) => adminUpdatePackage(t, pkg.id, { isActive: on }));
      q.setData((cur) => cur?.map((p) => (p.id === saved.id ? saved : p)));
    } catch (err) {
      q.setData((cur) => cur?.map((p) => (p.id === pkg.id ? { ...p, isActive: !on } : p)));
      failed(err);
    }
  };

  return (
    <AdminPage
      title="Packages"
      lead="Order and visibility change the catering page at once. No prices are shown to customers."
    >
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}
      {q.data === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <div aria-busy="true" className="grid gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[76px]" />
            ))}
          </div>
        )
      ) : list.length === 0 ? (
        <EmptyState
          title="No packages yet."
          action={
            <Button size="sm" variant="cream" href="/admin/packages/new">
              Add a package
            </Button>
          }
        >
          Add one so customers can book.
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {list.map((p, i) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-ink-raised px-3.5 py-2.5"
            >
              <div className={cn("flex min-w-0 flex-[1_1_240px] items-center gap-3", !p.isActive && "opacity-50")}>
                <div aria-hidden className="w-16 flex-none">
                  <PhotoSlot src={imageSrc(p.imageUrl) || null} alt="" radius="none" sizes="64px" className="h-12 min-h-0 rounded-[10px] p-0" />
                </div>
                <div className="min-w-0">
                  <b className="block [overflow-wrap:anywhere]">{p.name}</b>
                  <span className="text-cream-muted [overflow-wrap:anywhere]">
                    {p.tagline ? `${p.tagline} ` : ""}
                    {guestRange(p)}, {plural(p.includes.length, "item")}.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <OrderArrows name={p.name} first={i === 0} last={i === list.length - 1} onMove={(d) => void move(i, d)} />
                <Toggle
                  label={<span className="sr-only">Show {p.name} on the site</span>}
                  onText="Shown"
                  offText="Hidden"
                  checked={p.isActive}
                  onChange={(e) => void toggle(p, e.target.checked)}
                />
                <Button size="sm" variant="ghost" href={`/admin/packages/${p.id}`} aria-label={`Edit ${p.name}`}>
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && (
        <div>
          <Button size="sm" href="/admin/packages/new">
            Add a package
          </Button>
        </div>
      )}
    </AdminPage>
  );
}
