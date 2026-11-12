"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { ApiError, type CateringPackageAdmin } from "@/lib/api";
import {
  adminCreatePackage,
  adminDeletePackage,
  adminListPackages,
  adminUpdatePackage,
  imageSrc,
} from "@/lib/catering-api";
import { nextSortOrder, validatePackage, type PackageDraft, type PackageErrors } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, ErrorMark, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextareaField } from "@/components/ui/field";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { useAdmin, useAdminTopBar } from "@/components/admin/admin-context";
import { ADMIN_TITLE, AdminActionBar, describeError, LoadError } from "@/components/admin/admin-page";
import { iconBtn, OrderArrows, PhotoPicker, useUpload } from "@/components/admin/list-tools";
import { useAdminQuery } from "@/components/admin/use-admin-query";

const LIST = "/admin/packages";
const MAX_ITEMS = 30;

const toDraft = (p?: CateringPackageAdmin): PackageDraft => ({
  name: p?.name ?? "",
  tagline: p?.tagline ?? "",
  description: p?.description ?? "",
  includes: p?.includes.length ? [...p.includes] : [""],
  imageUrl: p?.imageUrl ?? "",
  minGuests: p ? String(p.minGuests) : "",
  maxGuests: p?.maxGuests != null ? String(p.maxGuests) : "",
  price: p?.price != null ? String(Number(p.price)) : "",
  priceUnit: p?.priceUnit ?? "PER_SET",
});

/** Same content, ignoring blank included rows and outer spaces (what Save would send). */
const same = (a: PackageDraft, b: PackageDraft) => {
  const norm = (d: PackageDraft) =>
    JSON.stringify({
      ...d,
      name: d.name.trim(),
      tagline: d.tagline.trim(),
      description: d.description.trim(),
      includes: d.includes.map((s) => s.trim()).filter(Boolean),
      minGuests: d.minGuests.trim(),
      maxGuests: d.maxGuests.trim(),
      price: d.price.trim(),
    });
  return norm(a) === norm(b);
};

/** `/admin/packages/new` (no id) or `/admin/packages/[id]`. Loads the list for the row and the next sort order. */
export function PackageEditorScreen({ id }: { id?: string }) {
  const q = useAdminQuery(adminListPackages, []);
  const pkg = id ? q.data?.find((p) => p.id === id) : undefined;
  const missing = !!id && q.data !== undefined && !pkg;
  useAdminTopBar({ title: id ? (pkg?.name ?? "Package") : "New package", back: LIST });

  if (q.data === undefined) return q.error ? <LoadError onRetry={q.reload} /> : <EditorSkeleton />;
  if (missing) {
    return (
      <div className="grid animate-fade-in gap-5">
        <h1 className={cn(ADMIN_TITLE, "max-lg:sr-only")}>Package</h1>
        <EmptyState
          title="We could not find that package."
          action={
            <Button size="sm" variant="cream" href={LIST}>
              All packages
            </Button>
          }
        >
          It may have been deleted.
        </EmptyState>
      </div>
    );
  }
  return <PackageEditor key={pkg?.id ?? "new"} pkg={pkg} all={q.data} />;
}

type FieldKey = keyof PackageErrors;
const FIELD_ORDER: FieldKey[] = ["name", "description", "includes", "price", "minGuests", "maxGuests"];

// leaveTo value for the browser Back button.
const BACK = "#back";

/**
 * Explicit Save (not save-on-blur): validate, show field errors, then send. Leaving with unsaved
 * changes asks first: Discard, the back links (a capture-phase click guard on same-site links) and
 * closing the tab (beforeunload), and browser Back (a duplicate history entry absorbs it).
 */
function PackageEditor({ pkg, all }: { pkg?: CateringPackageAdmin; all: CateringPackageAdmin[] }) {
  const router = useRouter();
  const { run } = useAdmin();
  const { upload, uploading } = useUpload();
  const [base, setBase] = useState(() => toDraft(pkg));
  const [d, setD] = useState(base);
  const [errors, setErrors] = useState<PackageErrors>({});
  const [notice, setNotice] = useState<{ title: string; help?: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const leaving = useRef(false);
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Stable row keys, so a moved item keeps its input (and focus follows it).
  const nextKey = useRef(base.includes.length);
  const [keys, setKeys] = useState(() => base.includes.map((_, i) => i));
  const focusItem = useRef<number | null>(null);
  const dirty = !same(d, base);
  const name = pkg?.name ?? "New package";

  // Ask before a tab close or a same-site link takes unsaved changes away.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (leaving.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;
      if (a.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(a.pathname + a.search);
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  // Browser Back while dirty: one extra same-URL entry takes the first Back, which asks first.
  // shortcut: after a revert to clean the entry stays, so Back needs one extra press; fine for an admin form.
  const guarded = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    if (!guarded.current) window.history.pushState(window.history.state, "", window.location.href);
    guarded.current = true;
    const onPop = () => {
      if (leaving.current) return;
      window.history.pushState(window.history.state, "", window.location.href);
      setLeaveTo(BACK);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dirty]);

  useEffect(() => {
    if (focusItem.current === null) return;
    itemRefs.current[focusItem.current]?.focus();
    focusItem.current = null;
  });

  const leave = (href: string) => {
    leaving.current = true;
    if (href === BACK) return window.history.go(-2);
    // Replace the guard entry, so Back from the list does not land on the editor twice.
    if (guarded.current) router.replace(href);
    else router.push(href);
  };

  const set = (patch: Partial<PackageDraft>) => {
    setD((cur) => ({ ...cur, ...patch }));
    setNotice(null);
  };
  const setItem = (i: number, v: string) => set({ includes: d.includes.map((x, j) => (j === i ? v : x)) });
  const swap = <T,>(list: T[], i: number, j: number) => {
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const moveItem = (i: number, dir: -1 | 1) => {
    set({ includes: swap(d.includes, i, i + dir) });
    setKeys((k) => swap(k, i, i + dir));
  };
  const removeItem = (i: number) => {
    if (d.includes.length === 1) set({ includes: [""] });
    else {
      set({ includes: d.includes.filter((_, j) => j !== i) });
      setKeys((k) => k.filter((_, j) => j !== i));
    }
    focusItem.current = Math.max(0, i - 1);
  };
  const addItem = () => {
    if (d.includes.length >= MAX_ITEMS) {
      setErrors((e) => ({ ...e, includes: "Keep it to 30 items." }));
      return;
    }
    set({ includes: [...d.includes, ""] });
    setKeys((k) => [...k, nextKey.current++]);
    focusItem.current = d.includes.length;
  };

  const onPhoto = async (file: File) => {
    setUploadError("");
    const res = await upload(file);
    if ("error" in res) setUploadError(res.error);
    else set({ imageUrl: res.url });
  };

  const save = async () => {
    if (uploading) {
      setNotice({ title: "The photo is still uploading.", help: "Save again when it shows in the frame." });
      return;
    }
    const { errors: errs, input } = validatePackage(d);
    setErrors(errs);
    if (!input) {
      setNotice({ title: "Check the fields marked below.", help: "Nothing was saved yet." });
      const first = FIELD_ORDER.find((f) => errs[f]);
      if (first) document.getElementById(`pkg-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const saved = pkg
        ? await run((t) => adminUpdatePackage(t, pkg.id, input))
        : await run((t) => adminCreatePackage(t, { ...input, isActive: true, sortOrder: nextSortOrder(all) }));
      setBase(toDraft(saved));
      leave(`${LIST}?done=${pkg ? "saved" : "added"}&name=${encodeURIComponent(saved.name)}`);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && err.status === 404) {
        setNotice({ title: "This package was deleted somewhere else.", help: "Go back to the list to see the latest." });
      } else setNotice(describeError(err));
    }
  };

  const remove = async () => {
    if (!pkg) return;
    setDeleting(true);
    try {
      const res = await run((t) => adminDeletePackage(t, pkg.id));
      leave(`${LIST}?done=${"isActive" in res ? "hidden" : "deleted"}&name=${encodeURIComponent(pkg.name)}`);
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      if (err instanceof ApiError && err.status === 404) leave(LIST);
      else setNotice(describeError(err));
    }
  };

  const discard = () => (dirty ? setLeaveTo(LIST) : leave(LIST));
  const src = imageSrc(d.imageUrl) || null;
  const items = d.includes;

  const actions = (bar: boolean) => (
    <>
      <Button
        size="sm"
        variant="ember"
        loading={saving}
        loadingLabel="Saving"
        onClick={() => {
          if (!saving) void save();
        }}
        className={cn(bar && "h-[52px] flex-[2] px-3")}
      >
        Save package
      </Button>
      <Button size="sm" variant="ghost" onClick={discard} disabled={saving} className={cn(bar && "h-[52px] flex-1 px-3")}>
        Discard changes
      </Button>
    </>
  );

  return (
    <div className="grid animate-fade-in content-start gap-5">
      <Link
        href={LIST}
        className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-cream-muted no-underline hover:text-cream max-lg:hidden"
      >
        <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
        All packages
      </Link>
      <h1 className={cn(ADMIN_TITLE, "max-lg:sr-only [overflow-wrap:anywhere]")}>{pkg ? `Edit ${pkg.name}` : "New package"}</h1>

      {notice && (
        <Banner tone="error" title={notice.title}>
          {notice.help}
        </Banner>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-4">
          <Block title="Details">
            <Field
              id="pkg-name"
              size="sm"
              label="Name"
              placeholder="The Feast"
              maxLength={80}
              autoComplete="off"
              value={d.name}
              error={errors.name}
              onChange={(e) => set({ name: e.target.value })}
            />
            <Field
              size="sm"
              label="Tagline"
              optional
              placeholder="One short line"
              maxLength={160}
              autoComplete="off"
              value={d.tagline}
              onChange={(e) => set({ tagline: e.target.value })}
            />
            <TextareaField
              id="pkg-description"
              size="sm"
              label="Description"
              help="Shown when there is no tagline."
              placeholder="A few sentences for the package page"
              maxLength={2000}
              value={d.description}
              error={errors.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Block>

          <Block title="What is included">
            <ol id="pkg-includes" tabIndex={-1} className="m-0 grid list-none gap-2 p-0 focus:outline-none">
              {items.map((item, i) => (
                <li key={keys[i] ?? `extra-${i}`} className="flex flex-wrap items-center gap-2">
                  <Field
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    size="sm"
                    label={<span className="sr-only">Included item {i + 1}</span>}
                    placeholder="Apple-wood roast chicken"
                    maxLength={160}
                    autoComplete="off"
                    value={item}
                    aria-invalid={errors.includes ? true : undefined}
                    aria-describedby={errors.includes ? "pkg-includes-error" : undefined}
                    onChange={(e) => setItem(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (i === items.length - 1) addItem();
                        else itemRefs.current[i + 1]?.focus();
                      }
                    }}
                    className="min-w-0 flex-[1_1_200px] [&>label]:contents"
                  />
                  <span className="flex gap-2">
                    <OrderArrows
                      name={`item ${i + 1}`}
                      first={i === 0}
                      last={i === items.length - 1}
                      onMove={(dir) => moveItem(i, dir)}
                    />
                    <button
                      type="button"
                      className={iconBtn}
                      aria-label={`Remove item ${i + 1}`}
                      onClick={() => removeItem(i)}
                    >
                      <X aria-hidden size={16} strokeWidth={1.75} />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
            {errors.includes && <FieldError id="pkg-includes-error">{errors.includes}</FieldError>}
            <div>
              <Button size="sm" variant="ghost" onClick={addItem}>
                Add an item
              </Button>
            </div>
          </Block>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Block title="Photo">
            <div className="relative">
              <PhotoSlot
                src={src}
                alt={`Photo for ${d.name.trim() || "this package"}`}
                note="Photo: the food for this package."
                radius="sm"
                sizes="(min-width: 1024px) 340px, 100vw"
                className={cn("aspect-[4/3] min-h-[150px]", uploading && "opacity-50")}
              />
              {uploading && (
                <span role="status" className="absolute inset-0 grid place-items-center font-semibold">
                  Uploading
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <PhotoPicker onFile={(f) => void onPhoto(f)} uploading={uploading} describedBy="pkg-photo-help">
                {src ? "Replace photo" : "Upload a photo"}
              </PhotoPicker>
              {src && !uploading && (
                <Button size="sm" variant="ghost" onClick={() => set({ imageUrl: "" })}>
                  Remove photo
                </Button>
              )}
            </div>
            {uploadError ? (
              <FieldError id="pkg-photo-help">{uploadError}</FieldError>
            ) : (
              <p id="pkg-photo-help" className="type-small m-0 text-cream-muted">
                JPG, PNG or WebP, landscape, up to 5 MB. Saves with the package.
              </p>
            )}
          </Block>

          <Block title="Price">
            <div className="grid grid-cols-2 items-start gap-3">
              <Field
                id="pkg-price"
                size="sm"
                label="Price (RM)"
                optional
                inputMode="decimal"
                autoComplete="off"
                placeholder="Quote on request"
                value={d.price}
                error={errors.price}
                onChange={(e) => set({ price: e.target.value.replace(/[^\d.]/g, "") })}
              />
              <div role="radiogroup" aria-label="Price is" className="grid gap-1.5">
                <span className="text-[13px] font-semibold">Price is</span>
                <div className="inline-flex gap-0.5 rounded-full bg-ink p-1">
                  {(["PER_SET", "PER_PAX"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      role="radio"
                      aria-checked={d.priceUnit === u}
                      onClick={() => set({ priceUnit: u })}
                      className={cn(
                        "min-h-10 flex-1 rounded-full px-3 text-sm font-semibold",
                        d.priceUnit === u ? "bg-cream text-ink" : "text-cream-muted",
                      )}
                    >
                      {u === "PER_SET" ? "Per set" : "Per pax"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="type-small m-0 text-cream-muted">
              Per pax multiplies by the guests the customer picks. Leave the price empty to quote each booking yourself.
            </p>
          </Block>

          <Block title="Guests (pax)">
            <div className="grid grid-cols-2 items-start gap-3">
              <Field
                id="pkg-minGuests"
                size="sm"
                label="Minimum"
                inputMode="numeric"
                autoComplete="off"
                value={d.minGuests}
                error={errors.minGuests}
                onChange={(e) => set({ minGuests: e.target.value.replace(/\D/g, "") })}
              />
              <Field
                id="pkg-maxGuests"
                size="sm"
                label="Maximum"
                optional
                inputMode="numeric"
                autoComplete="off"
                placeholder="No limit"
                value={d.maxGuests}
                error={errors.maxGuests}
                onChange={(e) => set({ maxGuests: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <p className="type-small m-0 text-cream-muted">
              The booking stepper is limited to this range. Leave the maximum empty for no upper limit.
            </p>
          </Block>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 max-lg:hidden">{actions(false)}</div>
        {pkg && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex min-h-11 items-center font-semibold text-cream-muted underline hover:text-cream"
          >
            Delete this package
          </button>
        )}
      </div>

      <AdminActionBar>{actions(true)}</AdminActionBar>

      <Dialog
        open={leaveTo !== null}
        onClose={() => setLeaveTo(null)}
        title="Discard your changes?"
        description={`What you changed on ${pkg ? pkg.name : "this new package"} will be lost.`}
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          if (leaveTo) leave(leaveTo);
        }}
      />
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this package?"
        description={`${name} leaves the catering page. Existing requests keep it.`}
        confirmLabel="Delete package"
        cancelLabel="Keep it"
        onConfirm={() => void remove()}
        confirmLoading={deleting}
        confirmLoadingLabel="Deleting"
      />
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="type-small m-0 flex items-center gap-2 text-cream">
      <ErrorMark />
      {children}
    </p>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-3 rounded-card-sm bg-ink-raised p-4">
      <h2 className="type-admin-meta m-0 text-cream-faint">{title}</h2>
      {children}
    </section>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-36" />
        </div>
      </div>
    </div>
  );
}
