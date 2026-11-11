"use client";

import { useState } from "react";
import { Lock, PencilLine, Pencil, Plus, Radio, Trash2, type LucideIcon } from "lucide-react";
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
  type OrderBatchStatus,
} from "@/lib/bun-theory-api";
import { formatBatchWindow, fromKlDatetimeLocal, toKlDatetimeLocal } from "@/lib/bun-theory";
import { formatShort, klToday } from "@/lib/dates";
import { isSessionGone } from "@/lib/admin-session";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { iconBtn } from "@/components/admin/list-tools";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import type { Notice } from "@/components/admin/bun-theory/order-parts";

type Draft = { label: string; fulfillmentDate: string; opensAt: string; closesAt: string; maxItems: string };
type DraftErrors = Partial<Record<keyof Draft, string>>;

const THREE_HOURS = 3 * 60 * 60 * 1000;

/** A new batch: today, opening now, closing in three hours, 30 items (as the old screen). */
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

/** The old screen's checks, plus empty dates (which used to throw). Payload is unchanged. */
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

const STATUS: Record<OrderBatchStatus, { label: string; Icon: LucideIcon; className: string; iconClass?: string }> = {
  DRAFT: { label: "Draft", Icon: PencilLine, className: "border-[1.5px] border-dashed border-cream-faint text-cream-muted" },
  PUBLISHED: { label: "Published", Icon: Radio, className: "bg-ember text-ink" },
  CLOSED: { label: "Closed", Icon: Lock, className: "border-[1.5px] border-cream-faint text-cream" },
};

/** Batch status by icon, fill and outline: draft dashed, published ember, closed outlined. */
function BatchStatusChip({ status }: { status: OrderBatchStatus }) {
  const { label, Icon, className } = STATUS[status] ?? STATUS.DRAFT;
  return (
    <span className={cn("type-admin-meta inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 leading-none", className)}>
      <Icon aria-hidden size={14} strokeWidth={1.75} className="flex-none" />
      {label}
    </span>
  );
}

const batchName = (b: OrderBatch) => b.label?.trim() || "Untitled batch";

/**
 * Order batches: the windows when customers can order from the live menu. Drafts are edited,
 * published or deleted; a published batch is closed early with its switch; a closed one can be
 * edited and switched back on. The backend owns every rule (overlap, window, orders) and its
 * message is shown as it comes.
 */
export function BatchesScreen() {
  const { run } = useAdmin();
  const q = useAdminQuery(listBatches, []);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // The form keeps its batch after closing, so the native dialog can close (and hand focus back) before it goes.
  const [form, setForm] = useState<{ batch?: OrderBatch; key: number; open: boolean }>({ key: 0, open: false });
  const setEditing = (b: OrderBatch | "new") =>
    setForm((f) => ({ batch: b === "new" ? undefined : b, key: f.key + 1, open: true }));
  const [deleting, setDeleting] = useState<OrderBatch | null>(null);

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

  const publish = (b: OrderBatch) =>
    act(b, (t) => publishBatch(t, b.id), `${batchName(b)} is published. Customers can order once its window opens.`);
  const close = (b: OrderBatch) => act(b, (t) => closeBatch(t, b.id), `${batchName(b)} is closed.`);
  const reopen = (b: OrderBatch) =>
    act(b, (t) => reopenBatch(t, b.id), `${batchName(b)} is open again. It takes orders while its window lasts.`);

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

  const rows = q.data;

  return (
    <AdminPage
      title="Batches"
      lead="The windows when customers can order from the live menu. A batch stays a draft until you publish it, and capacity counts per batch. Times are Malaysia time."
      actions={
        <Button size="sm" onClick={() => setEditing("new")}>
          <span className="inline-flex items-center gap-2">
            <Plus aria-hidden size={16} strokeWidth={1.75} />
            New batch
          </span>
        </Button>
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
                <Button size="sm" variant="cream" onClick={() => setEditing("new")}>
                  New batch
                </Button>
              }
            >
              Create one to start taking orders.
            </EmptyState>
          ) : (
            <BatchList
              rows={rows}
              busy={busy}
              onEdit={setEditing}
              onDelete={(b) => {
                setDeleteError(null);
                setDeleting(b);
              }}
              onPublish={publish}
              onClose={close}
              onReopen={reopen}
            />
          )}
        </>
      )}

      {form.key > 0 && (
        <BatchForm
          key={form.key}
          open={form.open}
          batch={form.batch}
          onClose={() => setForm((f) => ({ ...f, open: false }))}
          onSaved={(title) => {
            setForm((f) => ({ ...f, open: false }));
            setNotice({ tone: "ok", title });
            void q.reload();
          }}
        />
      )}

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

type ListProps = {
  rows: OrderBatch[];
  busy: string | null;
  onEdit: (b: OrderBatch) => void;
  onDelete: (b: OrderBatch) => void;
  onPublish: (b: OrderBatch) => void;
  onClose: (b: OrderBatch) => void;
  onReopen: (b: OrderBatch) => void;
};

/** Table from 1024px, cards below. */
function BatchList(props: ListProps) {
  const { rows } = props;
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Batch", "Day", "Window", "Max items", "Orders", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "type-admin-meta whitespace-nowrap border-b border-ink-line px-3 py-2.5 text-left text-cream-faint",
                    h === "Actions" && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="[&>td]:border-b [&>td]:border-ink-line [&>td]:px-3 [&>td]:py-3 [&>td]:align-middle">
                <td className="font-semibold [overflow-wrap:anywhere]">{batchName(b)}</td>
                <td className="whitespace-nowrap">{formatShort(b.fulfillmentDate.slice(0, 10))}</td>
                <td className="min-w-[180px] text-cream-muted">{formatBatchWindow(b)}</td>
                <td className="tabular-nums">{b.maxItems}</td>
                <td className="tabular-nums">{b._count.orders}</td>
                <td>
                  <BatchStatusChip status={b.status} />
                </td>
                <td>
                  <Actions {...props} b={b} className="justify-end" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="m-0 grid list-none gap-2 p-0 lg:hidden">
        {rows.map((b) => (
          <li key={b.id} className="grid gap-3 rounded-card-sm bg-ink-raised p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="grid min-w-0 gap-0.5">
                <b className="text-base [overflow-wrap:anywhere]">{batchName(b)}</b>
                <span className="text-[13px] text-cream-muted">For {formatShort(b.fulfillmentDate.slice(0, 10))}</span>
              </div>
              <BatchStatusChip status={b.status} />
            </div>
            <p className="m-0 text-sm">{formatBatchWindow(b)}</p>
            <p className="m-0 text-[13px] text-cream-muted">
              Up to <b className="tabular-nums text-cream">{b.maxItems}</b> items ·{" "}
              <b className="tabular-nums text-cream">{b._count.orders}</b> order{b._count.orders === 1 ? "" : "s"}
            </p>
            <Actions {...props} b={b} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** Per status, as the old screen: draft (edit, delete, publish), published (switch off to close), closed (edit, switch on to reopen). */
function Actions({
  b,
  busy,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onReopen,
  className,
}: ListProps & { b: OrderBatch; className?: string }) {
  const isBusy = busy === b.id;
  const name = batchName(b);
  const edit = (
    <button type="button" className={iconBtn} aria-label={`Edit ${name}`} disabled={isBusy} onClick={() => onEdit(b)}>
      <Pencil aria-hidden size={16} strokeWidth={1.75} />
    </button>
  );
  const open = (
    <Toggle
      label={<span className="sr-only">Taking orders: {name}</span>}
      onText="Open"
      offText="Closed"
      checked={b.status === "PUBLISHED"}
      disabled={isBusy}
      aria-busy={isBusy || undefined}
      onChange={(e) => (e.target.checked ? onReopen(b) : onClose(b))}
    />
  );
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {b.status === "DRAFT" && (
        <>
          {edit}
          <button type="button" className={iconBtn} aria-label={`Delete ${name}`} disabled={isBusy} onClick={() => onDelete(b)}>
            <Trash2 aria-hidden size={16} strokeWidth={1.75} />
          </button>
          <Button size="sm" variant="cream" onClick={() => onPublish(b)} loading={isBusy} loadingLabel="Publishing" disabled={isBusy}>
            Publish
          </Button>
        </>
      )}
      {b.status === "PUBLISHED" && open}
      {b.status === "CLOSED" && (
        <>
          {edit}
          {open}
        </>
      )}
    </div>
  );
}

/** Create or edit, in a Dialog. Explicit save; field errors under each field, a server error on top. */
function BatchForm({
  open,
  batch,
  onClose,
  onSaved,
}: {
  open: boolean;
  batch?: OrderBatch;
  onClose: () => void;
  onSaved: (title: string) => void;
}) {
  const { run } = useAdmin();
  const [d, setD] = useState<Draft>(() => (batch ? toDraft(batch) : newDraft()));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [error, setError] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setD((cur) => ({ ...cur, [k]: v }));
    setErrors((cur) => (cur[k] ? { ...cur, [k]: undefined } : cur));
  };

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
      const saved = batch
        ? await run((t) => updateBatch(t, batch.id, input))
        : await run((t) => createBatch(t, input));
      onSaved(batch ? `${batchName(saved)} is saved.` : `${batchName(saved)} is created as a draft.`);
    } catch (err) {
      setSaving(false);
      if (!isSessionGone(err)) setError({ tone: "error", ...describeError(err) });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={batch ? "Edit batch" : "New batch"}
      description="Customers see a batch only after you publish it. Two published batches cannot overlap in time."
      confirmLabel={batch ? "Save" : "Create draft batch"}
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
      <div className="grid gap-3">
        <Field
          id="batch-label"
          size="sm"
          label="Label"
          optional
          autoComplete="off"
          placeholder="Lunch pickup, Saturday dinner"
          value={d.label}
          onChange={set("label")}
        />
        <Field
          id="batch-fulfillmentDate"
          size="sm"
          type="date"
          label="Day the food goes out"
          value={d.fulfillmentDate}
          error={errors.fulfillmentDate}
          onChange={set("fulfillmentDate")}
        />
        <div className="grid gap-3">
          <Field
            id="batch-opensAt"
            size="sm"
            type="datetime-local"
            label="Ordering opens"
            value={d.opensAt}
            error={errors.opensAt}
            onChange={set("opensAt")}
          />
          <Field
            id="batch-closesAt"
            size="sm"
            type="datetime-local"
            label="Ordering closes"
            value={d.closesAt}
            error={errors.closesAt}
            onChange={set("closesAt")}
          />
        </div>
        <Field
          id="batch-maxItems"
          size="sm"
          type="number"
          inputMode="numeric"
          min={1}
          label="Capacity: total items"
          help="The most items, added up across every order, this batch takes."
          value={d.maxItems}
          error={errors.maxItems}
          onChange={set("maxItems")}
        />
      </div>
    </Dialog>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[120px] lg:h-14" />
      ))}
    </div>
  );
}
