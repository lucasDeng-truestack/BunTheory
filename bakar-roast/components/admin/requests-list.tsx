"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { CateringBookingAdmin } from "@/lib/api";
import { adminListBookings } from "@/lib/catering-api";
import {
  asSort,
  asTab,
  bookingPayHeadline,
  holdLeft,
  inTab,
  matchesSearch,
  REQUEST_TABS,
  sortRequests,
  type RequestSort,
  type RequestTab,
} from "@/lib/admin";
import { formatTime12, plural } from "@/lib/booking";
import { klToday, parseYmd } from "@/lib/dates";
import { adminCopy } from "@/lib/content";
import { cn } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui/banner";
import { Field, SelectField } from "@/components/ui/field";
import { StatusChip } from "@/components/ui/status-chip";
import { AdminPage, LoadError, PendingBadge } from "@/components/admin/admin-page";
import { DateBlock } from "@/components/admin/date-block";
import { useAdminQuery } from "@/components/admin/use-admin-query";

const TAB_LABEL: Record<RequestTab, string> = { pending: "Pending", approved: "Approved", past: "Past", all: "All" };
const TAKE = 200;

/** The view lives in the URL (?tab=&q=&sort=) so back from a request lands on the same list. */
function viewQuery(tab: RequestTab, q: string, sort: RequestSort) {
  const s = new URLSearchParams();
  if (tab !== "pending") s.set("tab", tab);
  if (q.trim()) s.set("q", q.trim());
  if (sort !== "event") s.set("sort", sort);
  const out = s.toString();
  return out ? `?${out}` : "";
}

export function RequestsScreen() {
  const params = useSearchParams();
  const tab = asTab(params.get("tab"));
  const sort = asSort(params.get("sort"));
  const [q, setQ] = useState(params.get("q") ?? "");
  const list = useAdminQuery((t) => adminListBookings(t, { take: TAKE }), []);

  // replaceState keeps useSearchParams in sync without a navigation per keystroke.
  const setView = (next: { tab?: RequestTab; q?: string; sort?: RequestSort }) => {
    const v = { tab, q, sort, ...next };
    if (next.q !== undefined) setQ(next.q);
    window.history.replaceState(null, "", `/admin/requests${viewQuery(v.tab, v.q, v.sort)}`);
  };

  return (
    <AdminPage title="Requests">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-0 flex-[1_1_240px]">
          <Field
            size="sm"
            type="search"
            label={<span className="sr-only">Search requests</span>}
            placeholder="Search name, reference or phone"
            autoComplete="off"
            value={q}
            onChange={(e) => setView({ q: e.target.value })}
            className="[&>input]:pl-10 [&>label]:contents"
          />
          <Search aria-hidden size={16} strokeWidth={1.75} className="pointer-events-none absolute bottom-[14px] left-3.5 text-cream-faint" />
        </div>
        <SelectField
          size="sm"
          label={<span className="sr-only">Sort</span>}
          value={sort}
          onChange={(e) => setView({ sort: asSort(e.target.value) })}
          className="[&>label]:contents"
        >
          <option value="event">By event date</option>
          <option value="new">Newest request first</option>
        </SelectField>
      </div>

      {list.data === undefined ? (
        list.error ? (
          <LoadError onRetry={list.reload} />
        ) : (
          <ListSkeleton />
        )
      ) : (
        <RequestsView
          all={list.data}
          today={klToday()}
          now={Date.now()}
          tab={tab}
          q={q}
          sort={sort}
          onTab={(t) => setView({ tab: t })}
          detailQuery={viewQuery(tab, q, sort)}
        />
      )}
    </AdminPage>
  );
}

/** Tabs, table (768px and up) and cards (phone). Pure props. */
export function RequestsView({
  all,
  today,
  now,
  tab,
  q,
  sort,
  onTab,
  detailQuery,
}: {
  all: CateringBookingAdmin[];
  today: string;
  now: number;
  tab: RequestTab;
  q: string;
  sort: RequestSort;
  onTab: (t: RequestTab) => void;
  detailQuery: string;
}) {
  const router = useRouter();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const counts = Object.fromEntries(REQUEST_TABS.map((t) => [t, all.filter((b) => inTab(b, t, today)).length])) as Record<
    RequestTab,
    number
  >;
  const rows = sortRequests(
    all.filter((b) => inTab(b, tab, today) && matchesSearch(b, q)),
    sort,
    tab,
  );
  const href = (b: CateringBookingAdmin) => `/admin/requests/${b.id}${detailQuery}`;

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + REQUEST_TABS.length) % REQUEST_TABS.length;
    onTab(REQUEST_TABS[next]);
    tabRefs.current[next]?.focus();
  };

  const [emptyTitle, emptyBody] = adminCopy.empty[tab];

  return (
    <>
      <div role="tablist" aria-label="Requests" className="flex gap-1 overflow-x-auto border-b border-ink-line">
        {REQUEST_TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="requests-panel"
            tabIndex={tab === t ? 0 : -1}
            onClick={() => onTab(t)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={cn(
              "inline-flex min-h-11 flex-none items-center gap-2 whitespace-nowrap border-b-2 px-3.5 font-semibold",
              tab === t ? "border-ember text-cream" : "border-transparent text-cream-muted hover:text-cream",
            )}
          >
            {TAB_LABEL[t]}
            {t === "pending" && counts.pending ? (
              <PendingBadge count={counts.pending} />
            ) : (
              <span className="font-normal text-cream-faint">{counts[t]}</span>
            )}
          </button>
        ))}
      </div>

      <div id="requests-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="grid gap-3">
        {!rows.length ? (
          q.trim() ? (
            <EmptyState title={adminCopy.noMatch(q.trim())}>{adminCopy.noMatchHelp}</EmptyState>
          ) : (
            <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>
          )
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Event", "Customer", "Package", "Status", "Hold", "Payment"].map((h) => (
                      <th key={h} className="type-admin-meta whitespace-nowrap border-b border-ink-line px-3 py-2.5 text-left text-cream-faint">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => {
                    const hold = holdLeft(b, now);
                    const pay = bookingPayHeadline(b);
                    return (
                      <tr
                        key={b.id}
                        onClick={() => router.push(href(b))}
                        className="cursor-pointer [&>td]:border-b [&>td]:border-ink-line [&>td]:px-3 [&>td]:py-3 [&>td]:align-middle hover:[&>td]:bg-ink-soft"
                      >
                        <td>
                          <span className="flex items-center gap-3">
                            <DateBlock ymd={b.eventDate} className="bg-ink-raised" />
                            <span className="whitespace-nowrap">
                              {formatTime12(b.serviceTime)}
                              <small className="block text-xs text-cream-muted">{parseYmd(b.eventDate).getUTCFullYear()}</small>
                            </span>
                          </span>
                        </td>
                        <td className="min-w-[160px]">
                          <Link href={href(b)} onClick={(e) => e.stopPropagation()} className="font-bold text-cream no-underline [overflow-wrap:anywhere] hover:underline">
                            {b.customerName}
                          </Link>
                          <small className="block text-xs font-bold tracking-[0.04em] text-cream-muted">{b.reference}</small>
                        </td>
                        <td>
                          {b.packageName}
                          <small className="block text-xs text-cream-muted">{plural(b.guests, "guest")}</small>
                        </td>
                        <td>
                          <StatusChip status={b.status} />
                        </td>
                        <td className={cn("whitespace-nowrap font-semibold", hold.urgent && "font-bold text-ember")}>{hold.text}</td>
                        <td className={cn("whitespace-nowrap", pay.hot && "font-semibold text-ember")}>{pay.title}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="m-0 grid list-none gap-2 p-0 md:hidden">
              {rows.map((b) => {
                const hold = holdLeft(b, now);
                return (
                  <li key={b.id}>
                    <Link
                      href={href(b)}
                      className="flex items-center justify-between gap-3 rounded-card-sm bg-ink-raised p-3 text-cream no-underline"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <DateBlock ymd={b.eventDate} />
                        <span className="grid min-w-0 gap-0.5">
                          <b className="text-base [overflow-wrap:anywhere]">{b.customerName}</b>
                          <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">
                            {b.packageName} · {plural(b.guests, "guest")}
                          </span>
                          <span className="text-xs font-bold tracking-[0.04em] text-cream-muted">{b.reference}</span>
                        </span>
                      </span>
                      <span className="flex flex-none flex-col items-end gap-2 text-[13px]">
                        <StatusChip status={b.status} />
                        {b.status === "PENDING" && (
                          <span className={cn("font-semibold", hold.urgent && "font-bold text-ember")}>{hold.text}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {all.length >= TAKE && <p className="m-0 text-cream-faint">{adminCopy.capped}</p>}
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3">
      <div className="flex gap-3 border-b border-ink-line pb-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[88px]" />
      ))}
    </div>
  );
}
