"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock,
  ChevronDown,
  CircleStop,
  Copy,
  Flag,
  Lock,
  Pencil,
  PencilLine,
  Play,
  Plus,
  Radio,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  closeBatch,
  createBatch,
  deleteBatch,
  listBatches,
  publishBatch,
  reopenBatch,
  updateBatch,
  type BatchInput,
  type OrderBatch,
} from "@/lib/bun-theory-api";
import { formatBatchWindow, fromKlDatetimeLocal, toKlDatetimeLocal } from "@/lib/bun-theory";
import { addDaysYmd, formatShort, klToday } from "@/lib/dates";
import { isSessionGone } from "@/lib/admin-session";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { iconBtn } from "@/components/admin/list-tools";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import type { Notice } from "@/components/admin/bun-theory/order-parts";

// ─── What a batch is doing right now ─────────────────────────────────────────
// The backend keeps three statuses (draft, published, closed). Owners think in what the
// customer sees, so the screen turns status + window into one plain state.

type Phase = "live" | "scheduled" | "draft" | "paused" | "ended" | "stale";

function phaseOf(b: OrderBatch, now: number): Phase {
  const opens = new Date(b.opensAt).getTime();
  const closes = new Date(b.closesAt).getTime();
  const over = closes <= now;
  if (b.status === "DRAFT") return over ? "stale" : "draft";
  if (b.status === "CLOSED") return over ? "ended" : "paused";
  if (over) return "ended";
  return opens <= now ? "live" : "scheduled";
}

const isPast = (p: Phase) => p === "ended" || p === "stale";

const PHASE: Record<Phase, { label: string; Icon: LucideIcon; className: string }> = {
  live: { label: "Taking orders", Icon: Radio, className: "bg-ember text-ink" },
  scheduled: { label: "Scheduled", Icon: CalendarClock, className: "border-[1.5px] border-ember text-cream" },
  draft: { label: "Draft", Icon: PencilLine, className: "border-[1.5px] border-dashed border-cream-faint text-cream-muted" },
  paused: { label: "Stopped", Icon: Lock, className: "border-[1.5px] border-cream-faint text-cream" },
  ended: { label: "Ended", Icon: Flag, className: "bg-ink-line text-cream-muted" },
  stale: { label: "Never opened", Icon: PencilLine, className: "border-[1.5px] border-dashed border-cream-faint text-cream-faint" },
};

function PhaseChip({ phase }: { phase: Phase }) {
  const { label, Icon, className } = PHASE[phase];
  return (
    <span className={cn("type-admin-meta inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 leading-none", className)}>
      <Icon aria-hidden size={14} strokeWidth={1.75} className="flex-none" />
      {label}
    </span>
  );
}

/** One line under the name that says what happens next, in Malaysia time. */
function phaseLine(b: OrderBatch, phase: Phase): string {
  const window = formatBatchWindow(b);
  switch (phase) {
    case "live":
      return `Open now. Closes ${window.split(" to ").pop()}.`;
    case "scheduled":
      return `Opens automatically: ${window}.`;
    case "draft":
      return `Not visible to customers yet. Planned for ${window}.`;
    case "paused":
      return `Stopped early. The window runs ${window}.`;
    default:
      return window;
  }
}

const batchName = (b: OrderBatch) => b.label?.trim() || `Batch for ${formatShort(b.fulfillmentDate.slice(0, 10))}`;

// ─── Form draft ──────────────────────────────────────────────────────────────

type Draft = { label: string; fulfillmentDate: string; opensAt: string; closesAt: string; maxItems: string };
type DraftErrors = Partial<Record<keyof Draft, string>>;

const THREE_HOURS = 3 * 60 * 60 * 1000;
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** A fresh batch: food today, open now, close in three hours, 30 items. */
const newDraft = (): Draft => ({
  label: "",
  fulfillmentDate: klToday(),
  opensAt: toKlDatetimeLocal(new Date()),
  closesAt: toKlDatetimeLocal(new Date(Date.now() + THREE_HOURS)),
  maxItems: "30",
});

const toDraft = (b: OrderBatch): Draft => ({
  label: b.label ?? "",
  fulfillmentDate: b.fulfillmentDate.slice(0, 10),
  opensAt: toKlDatetimeLocal(b.opensAt),
  closesAt: toKlDatetimeLocal(b.closesAt),
  maxItems: String(b.maxItems),
});

/**
 * "Run again": the same batch moved forward whole weeks until its window is still ahead,
 * so a Saturday lunch batch becomes next Saturday's. Malaysia has no DST, so a week is
 * always 7 x 24 hours.
 */
function runAgainDraft(b: OrderBatch, now = Date.now()): Draft {
  const opens = new Date(b.opensAt).getTime();
  const closes = new Date(b.closesAt).getTime();
  let weeks = 1;
  while (closes + weeks * WEEK <= now) weeks++;
  return {
    label: b.label ?? "",
    fulfillmentDate: addDaysYmd(b.fulfillmentDate.slice(0, 10), weeks * 7),
    opensAt: toKlDatetimeLocal(new Date(opens + weeks * WEEK)),
    closesAt: toKlDatetimeLocal(new Date(closes + weeks * WEEK)),
    maxItems: String(b.maxItems),
  };
}

function validate(d: Draft): { errors: DraftErrors; input?: BatchInput } {
  const errors: DraftErrors = {};
  const max = parseInt(d.maxItems, 10);
  if (Number.isNaN(max) || max < 1) errors.maxItems = "Enter how many items this batch can take, 1 or more.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fulfillmentDate)) errors.fulfillmentDate = "Pick the day the food goes out.";
  const o = fromKlDatetimeLocal(d.opensAt);
  const c = fromKlDatetimeLocal(d.closesAt);
  if (!o) errors.opensAt = "Pick when ordering opens.";
  if (!c) errors.closesAt = "Pick when ordering closes.";
  if (o && c && o >= c) errors.closesAt = "Closing must be after opening.";
  if (Object.keys(errors).length || !o || !c) return { errors };
  return {
    errors,
    input: {
      label: d.label.trim() || undefined,
      fulfillmentDate: d.fulfillmentDate,
      opensAt: o.toISOString(),
      closesAt: c.toISOString(),
      maxItems: max,
    },
  };
}

const FIELD_ORDER: (keyof Draft)[] = ["fulfillmentDate", "opensAt", "closesAt", "maxItems"];

// ─── Screen ──────────────────────────────────────────────────────────────────

type FormState = { key: number; open: boolean; batch?: OrderBatch; start?: Draft; title?: string };

/**
 * Order batches: the windows when customers can order. Each batch shows what it is doing in
 * plain words (taking orders, scheduled, draft, stopped, ended). New batches open for orders
 * on save unless saved as a draft, and any past batch can be run again a week later.
 * The backend owns every rule (overlap, window, orders) and its message is shown as it comes.
 */
export function BatchesScreen() {
  const { run } = useAdmin();
  const q = useAdminQuery(listBatches, []);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // The form keeps its batch after closing, so the native dialog can close (and hand focus back) before it goes.
  const [form, setForm] = useState<FormState>({ key: 0, open: false });
  const openForm = (next: Omit<FormState, "key" | "open">) => setForm((f) => ({ ...next, key: f.key + 1, open: true }));
  const [deleting, setDeleting] = useState<OrderBatch | null>(null);
  const [stopping, setStopping] = useState<OrderBatch | null>(null);

  const act = async (row: OrderBatch, call: (t: string) => Promise<unknown>, ok: string) => {
    setBusy(row.id);
    setNotice(null);
    try {
      await run(call);
      setNotice({ tone: "ok", title: ok });
      await q.reload();
    } catch (err) {
      if (!isSessionGone(err)) setNotice({ tone: "error", ...describeError(err) });
    } finally {
      setBusy(null);
    }
  };

  const handlers: Handlers = {
    busy,
    onEdit: (b) => openForm({ batch: b }),
    onRunAgain: (b) => openForm({ start: runAgainDraft(b), title: `Run ${batchName(b)} again` }),
    onDelete: (b) => {
      setDeleteError(null);
      setDeleting(b);
    },
    onOpen: (b) =>
      act(b, (t) => publishBatch(t, b.id), `${batchName(b)} is on. Customers can order while its window is open.`),
    onStop: (b) => setStopping(b),
    onResume: (b) => act(b, (t) => reopenBatch(t, b.id), `${batchName(b)} is taking orders again.`),
  };

  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<Notice>(null);
  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await run((t) => deleteBatch(t, deleting.id));
      setNotice({ tone: "ok", title: `${batchName(deleting)} is deleted.` });
      setDeleting(null);
      await q.reload();
    } catch (err) {
      if (!isSessionGone(err)) setDeleteError({ tone: "error", ...describeError(err) });
    } finally {
      setDeleteBusy(false);
    }
  };

  const stop = () => {
    const b = stopping;
    if (!b) return;
    setStopping(null);
    void act(b, (t) => closeBatch(t, b.id), `${batchName(b)} has stopped taking orders.`);
  };

  // Recomputed on every load, so a batch moves from scheduled to live to ended on refresh.
  const groups = useMemo(() => {
    const now = Date.now();
    const rows = (q.data ?? []).map((b) => ({ b, phase: phaseOf(b, now) }));
    const rank: Record<Phase, number> = { live: 0, scheduled: 1, paused: 2, draft: 3, ended: 4, stale: 5 };
    const current = rows
      .filter((r) => !isPast(r.phase))
      .sort((x, y) => rank[x.phase] - rank[y.phase] || x.b.opensAt.localeCompare(y.b.opensAt));
    // The list arrives newest first, which is the order past batches read best in.
    const past = rows.filter((r) => isPast(r.phase));
    return { current, past };
  }, [q.data]);

  // The newest batch that actually ran (or is on), so "Copy last batch" repeats a real one, not a draft.
  const latest = q.data?.find((b) => b.status !== "DRAFT") ?? q.data?.[0];
  const rows = q.data;

  return (
    <AdminPage
      title="Batches"
      lead="A batch is one ordering window: when customers can order, the day the food goes out, and how many items you can make. Times are Malaysia time."
      actions={
        <>
          {latest && (
            <Button size="sm" variant="cream" onClick={() => handlers.onRunAgain(latest)}>
              <span className="inline-flex items-center gap-2">
                <Copy aria-hidden size={16} strokeWidth={1.75} />
                Copy last batch
              </span>
            </Button>
          )}
          <Button size="sm" onClick={() => openForm({})}>
            <span className="inline-flex items-center gap-2">
              <Plus aria-hidden size={16} strokeWidth={1.75} />
              New batch
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

      {rows === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <ListSkeleton />
        )
      ) : (
        <>
          {q.error ? <LoadError onRetry={q.reload} /> : null}
          {rows.length === 0 ? (
            <EmptyState
              title="No batches yet."
              action={
                <Button size="sm" variant="cream" onClick={() => openForm({})}>
                  New batch
                </Button>
              }
            >
              Create one to start taking orders.
            </EmptyState>
          ) : (
            <div className="grid gap-6">
              <section aria-labelledby="batches-now" className="grid gap-2">
                <h2 id="batches-now" className="type-admin-meta m-0 text-cream-faint">
                  Now and coming up
                </h2>
                {groups.current.length === 0 ? (
                  <div className="grid justify-items-start gap-3 rounded-card-sm bg-ink-raised p-4">
                    <p className="m-0 text-sm text-cream-muted">
                      Nothing is open or scheduled, so customers cannot order right now.
                    </p>
                    {latest && (
                      <Button size="sm" variant="cream" onClick={() => handlers.onRunAgain(latest)}>
                        Copy last batch to next week
                      </Button>
                    )}
                  </div>
                ) : (
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {groups.current.map(({ b, phase }) => (
                      <BatchCard key={b.id} b={b} phase={phase} {...handlers} />
                    ))}
                  </ul>
                )}
              </section>

              {groups.past.length > 0 && (
                <details className="group/past grid gap-2">
                  <summary className="type-admin-meta flex min-h-11 cursor-pointer list-none items-center gap-2 text-cream-faint">
                    <ChevronDown aria-hidden size={16} strokeWidth={1.75} className="transition-transform group-open/past:rotate-180" />
                    Past batches ({groups.past.length})
                  </summary>
                  <ul className="m-0 mt-2 grid list-none gap-2 p-0">
                    {groups.past.map(({ b, phase }) => (
                      <BatchCard key={b.id} b={b} phase={phase} {...handlers} />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </>
      )}

      {form.key > 0 && (
        <BatchForm
          key={form.key}
          open={form.open}
          batch={form.batch}
          start={form.start}
          title={form.title}
          onClose={() => setForm((f) => ({ ...f, open: false }))}
          onSaved={(n) => {
            setForm((f) => ({ ...f, open: false }));
            setNotice(n);
            void q.reload();
          }}
        />
      )}

      <Dialog
        open={!!stopping}
        onClose={() => setStopping(null)}
        title="Stop taking orders?"
        description={
          stopping
            ? `Customers can no longer order from ${batchName(stopping)}. Orders already placed stay. You can turn it back on while its window lasts.`
            : undefined
        }
        confirmLabel="Yes, stop orders"
        cancelLabel="Keep it open"
        onConfirm={stop}
      />

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this draft?"
        description={deleting ? `${batchName(deleting)} is removed for good. Customers never saw it.` : undefined}
        confirmLabel="Yes, delete it"
        cancelLabel="Keep it"
        confirmLoading={deleteBusy}
        confirmLoadingLabel="Deleting"
        onConfirm={() => void remove()}
      >
        {deleteError && (
          <Banner tone="error" title={deleteError.title}>
            {deleteError.help}
          </Banner>
        )}
      </Dialog>
    </AdminPage>
  );
}

type Handlers = {
  busy: string | null;
  onEdit: (b: OrderBatch) => void;
  onRunAgain: (b: OrderBatch) => void;
  onDelete: (b: OrderBatch) => void;
  onOpen: (b: OrderBatch) => void;
  onStop: (b: OrderBatch) => void;
  onResume: (b: OrderBatch) => void;
};

function BatchCard({ b, phase, ...h }: Handlers & { b: OrderBatch; phase: Phase }) {
  const isBusy = h.busy === b.id;
  const name = batchName(b);
  const orders = b._count.orders;

  const iconAction = (label: string, Icon: LucideIcon, onClick: () => void) => (
    <button type="button" className={iconBtn} aria-label={`${label}: ${name}`} title={label} disabled={isBusy} onClick={onClick}>
      <Icon aria-hidden size={16} strokeWidth={1.75} />
    </button>
  );
  const main = (label: string, Icon: LucideIcon, onClick: () => void, variant: "ember" | "cream" = "cream") => (
    <Button size="sm" variant={variant} onClick={onClick} loading={isBusy} loadingLabel="Saving" disabled={isBusy}>
      <span className="inline-flex items-center gap-2">
        <Icon aria-hidden size={16} strokeWidth={1.75} />
        {label}
      </span>
    </Button>
  );

  let actions: ReactNode;
  switch (phase) {
    case "live":
    case "scheduled":
      actions = (
        <>
          {iconAction("Edit", Pencil, () => h.onEdit(b))}
          {main(phase === "live" ? "Stop orders" : "Cancel opening", CircleStop, () => h.onStop(b))}
        </>
      );
      break;
    case "draft":
      actions = (
        <>
          {iconAction("Edit", Pencil, () => h.onEdit(b))}
          {orders === 0 && iconAction("Delete", Trash2, () => h.onDelete(b))}
          {main("Open for orders", Play, () => h.onOpen(b), "ember")}
        </>
      );
      break;
    case "paused":
      actions = (
        <>
          {iconAction("Edit", Pencil, () => h.onEdit(b))}
          {main("Resume orders", Play, () => h.onResume(b))}
        </>
      );
      break;
    case "stale":
      actions = (
        <>
          {orders === 0 && iconAction("Delete", Trash2, () => h.onDelete(b))}
          {main("Run again", Copy, () => h.onRunAgain(b))}
        </>
      );
      break;
    case "ended":
      actions = main("Run again", Copy, () => h.onRunAgain(b));
      break;
  }

  return (
    <li
      className={cn(
        "grid gap-3 rounded-card-sm bg-ink-raised p-4 sm:grid-cols-[1fr_auto] sm:items-center",
        phase === "live" && "shadow-[inset_0_0_0_1.5px_theme(colors.ember.DEFAULT)]",
      )}
    >
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-base [overflow-wrap:anywhere]">{name}</b>
          <PhaseChip phase={phase} />
        </div>
        <p className="m-0 text-sm text-cream-muted">{phaseLine(b, phase)}</p>
        <p className="m-0 text-[13px] text-cream-muted">
          Food goes out <b className="text-cream">{formatShort(b.fulfillmentDate.slice(0, 10))}</b> · Up to{" "}
          <b className="tabular-nums text-cream">{b.maxItems}</b> items · <b className="tabular-nums text-cream">{orders}</b>{" "}
          order{orders === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
    </li>
  );
}

// ─── Form ────────────────────────────────────────────────────────────────────

/** Small preset button under a time field. */
function Preset({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 rounded-full px-3 text-[13px] font-semibold text-cream shadow-[inset_0_0_0_1px_theme(colors.cream.faint)] hover:shadow-[inset_0_0_0_1px_theme(colors.cream.DEFAULT)]"
    >
      {children}
    </button>
  );
}

/**
 * Create, copy or edit, in a Dialog. A new batch opens for orders on save unless "Save as a
 * draft" is picked. Editing never changes whether a batch is on.
 */
function BatchForm({
  open,
  batch,
  start,
  title,
  onClose,
  onSaved,
}: {
  open: boolean;
  batch?: OrderBatch;
  start?: Draft;
  title?: string;
  onClose: () => void;
  onSaved: (n: NonNullable<Notice>) => void;
}) {
  const { run } = useAdmin();
  const [d, setD] = useState<Draft>(() => (batch ? toDraft(batch) : start ?? newDraft()));
  const [goLive, setGoLive] = useState(true);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [error, setError] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const isNew = !batch;

  const setValue = (k: keyof Draft, v: string) => {
    setD((cur) => ({ ...cur, [k]: v }));
    setErrors((cur) => (cur[k] ? { ...cur, [k]: undefined } : cur));
  };
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setValue(k, e.target.value);

  const save = async () => {
    const { errors: errs, input } = validate(d);
    setErrors(errs);
    if (!input) {
      const first = FIELD_ORDER.find((f) => errs[f]);
      if (first) document.getElementById(`batch-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (batch) {
        const saved = await run((t) => updateBatch(t, batch.id, input));
        onSaved({ tone: "ok", title: `${batchName({ ...batch, ...saved })} is saved.` });
        return;
      }
      const created = await run((t) => createBatch(t, input));
      const name = batchName({ ...created, _count: { orders: 0 } });
      if (!goLive) {
        onSaved({ tone: "ok", title: `${name} is saved as a draft. Customers cannot see it yet.` });
        return;
      }
      try {
        await run((t) => publishBatch(t, created.id));
        onSaved({ tone: "ok", title: `${name} is on. It takes orders from ${formatBatchWindow(created)}.` });
      } catch (err) {
        if (isSessionGone(err)) return;
        // The batch exists now, so report it as a draft rather than letting a retry make a second one.
        onSaved({
          tone: "error",
          title: `${name} is saved as a draft, but it could not open for orders.`,
          help: describeError(err).title,
        });
      }
    } catch (err) {
      setSaving(false);
      if (!isSessionGone(err)) setError({ tone: "error", ...describeError(err) });
    }
  };

  const food = /^\d{4}-\d{2}-\d{2}$/.test(d.fulfillmentDate) ? d.fulfillmentDate : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={batch ? "Edit batch" : title ?? "New batch"}
      description={
        batch
          ? "Changes apply straight away. Two batches that are on cannot overlap in time."
          : "Two batches that are on cannot overlap in time."
      }
      confirmLabel={batch ? "Save" : goLive ? "Save and open for orders" : "Save as draft"}
      confirmLoading={saving}
      confirmLoadingLabel="Saving"
      cancelLabel="Cancel"
      onConfirm={() => void save()}
    >
      {error && (
        <Banner tone="error" title={error.title}>
          {error.help}
        </Banner>
      )}
      <div className="grid gap-4">
        <Field
          id="batch-fulfillmentDate"
          size="sm"
          type="date"
          label="Day the food goes out"
          value={d.fulfillmentDate}
          error={errors.fulfillmentDate}
          onChange={set("fulfillmentDate")}
        />

        <div className="grid gap-2">
          <Field
            id="batch-opensAt"
            size="sm"
            type="datetime-local"
            label="Customers can order from"
            value={d.opensAt}
            error={errors.opensAt}
            onChange={set("opensAt")}
          />
          <div className="flex flex-wrap gap-2">
            <Preset onClick={() => setValue("opensAt", toKlDatetimeLocal(new Date()))}>Now</Preset>
            {food && <Preset onClick={() => setValue("opensAt", `${addDaysYmd(food, -2)}T10:00`)}>2 days before, 10 am</Preset>}
          </div>
        </div>

        <div className="grid gap-2">
          <Field
            id="batch-closesAt"
            size="sm"
            type="datetime-local"
            label="Orders close at"
            value={d.closesAt}
            error={errors.closesAt}
            onChange={set("closesAt")}
          />
          {food && (
            <div className="flex flex-wrap gap-2">
              <Preset onClick={() => setValue("closesAt", `${addDaysYmd(food, -1)}T22:00`)}>Night before, 10 pm</Preset>
              <Preset onClick={() => setValue("closesAt", `${food}T10:00`)}>Same day, 10 am</Preset>
            </div>
          )}
        </div>

        <Field
          id="batch-maxItems"
          size="sm"
          type="number"
          inputMode="numeric"
          min={1}
          label="How many items can you make?"
          help="All orders added up. Ordering stops by itself when this is reached."
          value={d.maxItems}
          error={errors.maxItems}
          onChange={set("maxItems")}
        />

        <Field
          id="batch-label"
          size="sm"
          label="Name"
          optional
          autoComplete="off"
          placeholder="Saturday lunch"
          value={d.label}
          onChange={set("label")}
        />

        {isNew && (
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-2 text-[13px] font-semibold text-cream">When I save</legend>
            {[
              { v: true, title: "Open for orders", text: "Customers can order once the time above arrives." },
              { v: false, title: "Save as a draft", text: "Hidden from customers until you open it." },
            ].map((o) => (
              <label
                key={String(o.v)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-card-sm p-3 shadow-[inset_0_0_0_1px_theme(colors.ink.line)]",
                  goLive === o.v && "shadow-[inset_0_0_0_1.5px_theme(colors.ember.DEFAULT)]",
                )}
              >
                <input
                  type="radio"
                  name="batch-golive"
                  checked={goLive === o.v}
                  onChange={() => setGoLive(o.v)}
                  className="mt-1 h-4 w-4 accent-[rgb(var(--ember))]"
                />
                <span className="grid gap-0.5">
                  <b className="text-sm">{o.title}</b>
                  <span className="text-[13px] text-cream-muted">{o.text}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
      </div>
    </Dialog>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[120px] lg:h-24" />
      ))}
    </div>
  );
}
