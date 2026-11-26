"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  adminCreateGalleryImage,
  adminCreateTestimonial,
  adminDeleteGalleryImage,
  adminDeleteTestimonial,
  adminListGallery,
  adminListTestimonials,
  adminUpdateGalleryImage,
  adminUpdateTestimonial,
  imageSrc,
  type CateringGalleryImageAdmin,
  type CateringTestimonialAdmin,
} from "@/lib/catering-api";
import { nextSortOrder } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextareaField } from "@/components/ui/field";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { Toggle } from "@/components/ui/toggle";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { OrderArrows, PhotoPicker, useReorder, useSerial, useUpload } from "@/components/admin/list-tools";
import { useAdminQuery } from "@/components/admin/use-admin-query";

type Notice = { tone: "ok" | "error"; title: string; help?: string } | null;

export function ContentScreen() {
  return (
    <AdminPage
      title="Gallery and testimonials"
      lead="Shown on the home and catering pages. With nothing shown, the section disappears."
    >
      <Gallery />
      <Testimonials />
    </AdminPage>
  );
}

function SectionHead({ id, title, action }: { id: string; title: string; action: ReactNode }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="m-0 text-lg font-bold">
        {title}
      </h2>
      {action}
    </div>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  return notice ? (
    <Banner tone={notice.tone} title={notice.title}>
      {notice.help}
    </Banner>
  ) : null;
}

/**
 * A text the owner edits in place: saves when they leave the field if it changed, then says
 * "Saved" under it. Server updates never overwrite what they are still typing.
 */
function useInPlace(saved: string, onSave: (v: string) => Promise<boolean>, required?: string) {
  const [value, setValue] = useState(saved);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setValue(saved);
  }, [saved]);
  return {
    value,
    error,
    done,
    onChange: (v: string) => {
      dirty.current = true;
      setValue(v);
      setDone(false);
      setError("");
    },
    onBlur: async () => {
      const v = value.trim();
      if (v === saved.trim()) {
        dirty.current = false;
        return;
      }
      if (required && !v) {
        setError(required);
        return;
      }
      const sent = value;
      const ok = await onSave(v);
      setValue((cur) => {
        if (cur === sent) dirty.current = false;
        return ok ? cur : saved;
      });
      if (!ok) dirty.current = false;
      setDone(ok);
    },
  };
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function Gallery() {
  const { run } = useAdmin();
  const serial = useSerial();
  const q = useAdminQuery(adminListGallery, []);
  const { upload, uploading } = useUpload();
  const [notice, setNotice] = useState<Notice>(null);
  const [removing, setRemoving] = useState<{ img: CateringGalleryImageAdmin; n: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const list = q.data ?? [];
  const failed = (err: unknown) => setNotice({ tone: "error", ...describeError(err) });
  const replace = (img: CateringGalleryImageAdmin) => q.setData((cur) => cur?.map((x) => (x.id === img.id ? img : x)));

  const move = useReorder({
    list,
    setList: (l) => q.setData(l),
    send: (t, id, sortOrder) => adminUpdateGalleryImage(t, id, { sortOrder }),
    onFail: failed,
    reload: () => void q.reload(),
  });

  const add = async (file: File) => {
    setNotice(null);
    const res = await upload(file);
    if ("error" in res) {
      setNotice({ tone: "error", title: res.error });
      return;
    }
    try {
      const img = await run((t) =>
        adminCreateGalleryImage(t, { imageUrl: res.url, isActive: true, sortOrder: nextSortOrder(q.data ?? []) }),
      );
      q.setData((cur) => [...(cur ?? []), img]);
      setNotice({ tone: "ok", title: "Photo added.", help: "Add a caption so the site can describe it." });
    } catch (err) {
      failed(err);
    }
  };

  const update = (img: CateringGalleryImageAdmin, body: Parameters<typeof adminUpdateGalleryImage>[2]) =>
    serial(() => run((t) => adminUpdateGalleryImage(t, img.id, body))).then(
      (saved) => {
        replace(saved);
        return true;
      },
      (err) => {
        failed(err);
        return false;
      },
    );

  const toggle = async (img: CateringGalleryImageAdmin, on: boolean) => {
    setNotice(null);
    replace({ ...img, isActive: on });
    if (!(await update(img, { isActive: on }))) replace({ ...img, isActive: !on });
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await run((t) => adminDeleteGalleryImage(t, removing.img.id));
      q.setData((cur) => cur?.filter((x) => x.id !== removing.img.id));
      setNotice({ tone: "ok", title: "Photo removed." });
    } catch (err) {
      failed(err);
      void q.reload();
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  return (
    <section aria-labelledby="gallery-title" className="grid gap-3">
      <SectionHead
        id="gallery-title"
        title="Photos"
        action={
          <PhotoPicker variant="cream" onFile={(f) => void add(f)} uploading={uploading}>
            Upload a photo
          </PhotoPicker>
        }
      />
      <p className="m-0 text-cream-muted">JPG, PNG or WebP up to 5 MB. Landscape photos of past tables work best.</p>
      <NoticeBanner notice={notice} />
      {q.data === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <CardsSkeleton />
        )
      ) : list.length === 0 && !uploading ? (
        <EmptyState title="No photos yet.">Upload a few past events to show the gallery.</EmptyState>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,210px),1fr))] gap-3 p-0">
          {list.map((img, i) => (
            <GalleryCard
              key={img.id}
              img={img}
              n={i + 1}
              first={i === 0}
              last={i === list.length - 1}
              onMove={(d) => void move(i, d)}
              onCaption={(caption) => update(img, { caption })}
              onToggle={(on) => void toggle(img, on)}
              onRemove={() => setRemoving({ img, n: i + 1 })}
            />
          ))}
          {uploading && (
            <li aria-busy="true" className="grid gap-2.5 rounded-card-sm bg-ink-raised p-3">
              <Skeleton className="aspect-[4/3]" />
              <span role="status" className="text-cream-muted">
                Uploading
              </span>
            </li>
          )}
        </ul>
      )}
      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this photo?"
        description="It leaves the gallery on the site."
        confirmLabel="Remove photo"
        cancelLabel="Keep it"
        onConfirm={() => void remove()}
        confirmLoading={busy}
        confirmLoadingLabel="Removing"
      />
    </section>
  );
}

function GalleryCard({
  img,
  n,
  first,
  last,
  onMove,
  onCaption,
  onToggle,
  onRemove,
}: {
  img: CateringGalleryImageAdmin;
  n: number;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onCaption: (caption: string) => Promise<boolean>;
  onToggle: (on: boolean) => void;
  onRemove: () => void;
}) {
  const caption = useInPlace(img.caption ?? "", onCaption);
  return (
    <li className="grid content-start gap-2.5 rounded-card-sm bg-ink-raised p-3">
      <PhotoSlot
        src={imageSrc(img.imageUrl)}
        alt={img.caption || `Gallery photo ${n}`}
        radius="none"
        sizes="(min-width: 1024px) 260px, 100vw"
        // The first card's photo is the screen's largest image on load (LCP).
        priority={n === 1}
        className={cn("aspect-[4/3] min-h-[120px] rounded-[12px]", !img.isActive && "opacity-40")}
      />
      <Field
        size="sm"
        label="Caption"
        optional
        maxLength={200}
        autoComplete="off"
        placeholder="What the photo shows"
        value={caption.value}
        help={caption.done ? "Saved" : undefined}
        onChange={(e) => caption.onChange(e.target.value)}
        onBlur={() => void caption.onBlur()}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OrderArrows name={`photo ${n}`} sideways first={first} last={last} onMove={onMove} />
        <Toggle
          label={<span className="sr-only">Show photo {n} on the site</span>}
          onText="Shown"
          offText="Hidden"
          checked={img.isActive}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-11 w-fit items-center font-semibold text-cream-muted underline hover:text-cream"
      >
        Remove<span className="sr-only"> photo {n}</span>
      </button>
    </li>
  );
}

// ─── Testimonials ────────────────────────────────────────────────────────────

const QUOTE_MISSING = "Add what the client said.";
const NAME_MISSING = "Add who said it.";

function Testimonials() {
  const { run } = useAdmin();
  const serial = useSerial();
  const q = useAdminQuery(adminListTestimonials, []);
  const [notice, setNotice] = useState<Notice>(null);
  const [draft, setDraft] = useState(false);
  const [removing, setRemoving] = useState<CateringTestimonialAdmin | null>(null);
  const [busy, setBusy] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const list = q.data ?? [];
  const failed = (err: unknown) => setNotice({ tone: "error", ...describeError(err) });
  const replace = (row: CateringTestimonialAdmin) => q.setData((cur) => cur?.map((x) => (x.id === row.id ? row : x)));

  const move = useReorder({
    list,
    setList: (l) => q.setData(l),
    send: (t, id, sortOrder) => adminUpdateTestimonial(t, id, { sortOrder }),
    onFail: failed,
    reload: () => void q.reload(),
  });

  const update = (row: CateringTestimonialAdmin, body: Parameters<typeof adminUpdateTestimonial>[2]) =>
    serial(() => run((t) => adminUpdateTestimonial(t, row.id, body))).then(
      (saved) => {
        replace(saved);
        return true;
      },
      (err) => {
        failed(err);
        return false;
      },
    );

  const toggle = async (row: CateringTestimonialAdmin, on: boolean) => {
    setNotice(null);
    replace({ ...row, isActive: on });
    if (!(await update(row, { isActive: on }))) replace({ ...row, isActive: !on });
  };

  const create = async (body: { quote: string; name: string; role: string }) => {
    try {
      const row = await run((t) =>
        adminCreateTestimonial(t, {
          quote: body.quote,
          name: body.name,
          ...(body.role ? { role: body.role } : {}),
          isActive: true,
          sortOrder: nextSortOrder(q.data ?? []),
        }),
      );
      q.setData((cur) => [...(cur ?? []), row]);
      setDraft(false);
      setNotice({ tone: "ok", title: "Testimonial added." });
      return true;
    } catch (err) {
      failed(err);
      return false;
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await run((t) => adminDeleteTestimonial(t, removing.id));
      q.setData((cur) => cur?.filter((x) => x.id !== removing.id));
      setNotice({ tone: "ok", title: "Testimonial removed." });
    } catch (err) {
      failed(err);
      void q.reload();
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  useEffect(() => {
    if (draft) draftRef.current?.focus();
  }, [draft]);

  return (
    <section aria-labelledby="quotes-title" className="grid gap-3">
      <SectionHead
        id="quotes-title"
        title="Testimonials"
        action={
          <Button
            size="sm"
            variant="cream"
            onClick={() => {
              setNotice(null);
              if (draft) draftRef.current?.focus();
              else setDraft(true);
            }}
          >
            Add a testimonial
          </Button>
        }
      />
      <NoticeBanner notice={notice} />
      {q.data === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <CardsSkeleton rows />
        )
      ) : (
        <>
          {list.length === 0 && !draft && (
            <EmptyState title="No testimonials yet.">Add one after your next event.</EmptyState>
          )}
          {list.length > 0 && (
            <ul className="m-0 grid max-w-[860px] list-none gap-2 p-0">
              {list.map((row, i) => (
                <QuoteCard
                  key={row.id}
                  row={row}
                  n={i + 1}
                  first={i === 0}
                  last={i === list.length - 1}
                  onMove={(d) => void move(i, d)}
                  onSave={(body) => update(row, body)}
                  onToggle={(on) => void toggle(row, on)}
                  onRemove={() => setRemoving(row)}
                />
              ))}
            </ul>
          )}
          {draft && <DraftQuote textareaRef={draftRef} onAdd={create} onCancel={() => setDraft(false)} />}
        </>
      )}
      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this testimonial?"
        description={removing ? `The quote from ${removing.name} leaves the site.` : undefined}
        confirmLabel="Remove testimonial"
        cancelLabel="Keep it"
        onConfirm={() => void remove()}
        confirmLoading={busy}
        confirmLoadingLabel="Removing"
      />
    </section>
  );
}

function QuoteCard({
  row,
  n,
  first,
  last,
  onMove,
  onSave,
  onToggle,
  onRemove,
}: {
  row: CateringTestimonialAdmin;
  n: number;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onSave: (body: { quote?: string; name?: string; role?: string }) => Promise<boolean>;
  onToggle: (on: boolean) => void;
  onRemove: () => void;
}) {
  const quote = useInPlace(row.quote, (v) => onSave({ quote: v }), QUOTE_MISSING);
  const name = useInPlace(row.name, (v) => onSave({ name: v }), NAME_MISSING);
  const role = useInPlace(row.role ?? "", (v) => onSave({ role: v }));
  return (
    <li className="grid gap-3 rounded-card-sm bg-ink-raised p-4">
      <div className={cn("grid gap-3", !row.isActive && "opacity-60")}>
        <TextareaField
          size="sm"
          label="Quote"
          maxLength={600}
          placeholder="What the client said"
          value={quote.value}
          error={quote.error}
          help={quote.done ? "Saved" : undefined}
          onChange={(e) => quote.onChange(e.target.value)}
          onBlur={() => void quote.onBlur()}
        />
        <div className="grid items-start gap-3 sm:grid-cols-2">
          <Field
            size="sm"
            label="Name"
            maxLength={80}
            autoComplete="off"
            value={name.value}
            error={name.error}
            help={name.done ? "Saved" : undefined}
            onChange={(e) => name.onChange(e.target.value)}
            onBlur={() => void name.onBlur()}
          />
          <Field
            size="sm"
            label="Role or occasion"
            optional
            maxLength={120}
            autoComplete="off"
            value={role.value}
            help={role.done ? "Saved" : undefined}
            onChange={(e) => role.onChange(e.target.value)}
            onBlur={() => void role.onBlur()}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-3">
          <OrderArrows name={`testimonial ${n}`} first={first} last={last} onMove={onMove} />
          <Toggle
            label={<span className="sr-only">Show testimonial {n} on the site</span>}
            onText="Shown"
            offText="Hidden"
            checked={row.isActive}
            onChange={(e) => onToggle(e.target.checked)}
          />
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex min-h-11 items-center font-semibold text-cream-muted underline hover:text-cream"
        >
          Remove<span className="sr-only"> testimonial {n}</span>
        </button>
      </div>
    </li>
  );
}

/** A new testimonial: nothing reaches the server until the quote and the name are filled and Add is pressed. */
function DraftQuote({
  textareaRef,
  onAdd,
  onCancel,
}: {
  textareaRef: React.Ref<HTMLTextAreaElement>;
  onAdd: (body: { quote: string; name: string; role: string }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [quote, setQuote] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState({ quote: "", name: "" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const e = { quote: quote.trim() ? "" : QUOTE_MISSING, name: name.trim() ? "" : NAME_MISSING };
    setErrors(e);
    if (e.quote || e.name) return;
    setSaving(true);
    const ok = await onAdd({ quote: quote.trim(), name: name.trim(), role: role.trim() });
    if (!ok) setSaving(false);
  };

  return (
    <section aria-label="New testimonial" className="grid max-w-[860px] animate-fade-in gap-3 rounded-card-sm border border-dashed border-cream-faint bg-ink-raised p-4">
      <h3 className="type-admin-meta m-0 text-cream-faint">New testimonial</h3>
      <TextareaField
        ref={textareaRef}
        size="sm"
        label="Quote"
        maxLength={600}
        placeholder="What the client said"
        value={quote}
        error={errors.quote}
        onChange={(e) => setQuote(e.target.value)}
      />
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Field size="sm" label="Name" maxLength={80} autoComplete="off" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <Field
          size="sm"
          label="Role or occasion"
          optional
          maxLength={120}
          autoComplete="off"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="cream"
          loading={saving}
          loadingLabel="Adding"
          onClick={() => {
            if (!saving) void add();
          }}
        >
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
      <p className="type-small m-0 text-cream-muted">Nothing is saved until you press Add.</p>
    </section>
  );
}

function CardsSkeleton({ rows = false }: { rows?: boolean }) {
  return (
    <div
      aria-busy="true"
      className={cn("grid gap-3", rows ? "max-w-[860px]" : "grid-cols-[repeat(auto-fill,minmax(min(100%,210px),1fr))]")}
    >
      {Array.from({ length: rows ? 2 : 3 }, (_, i) => (
        <Skeleton key={i} className={rows ? "h-56" : "h-72"} />
      ))}
    </div>
  );
}
