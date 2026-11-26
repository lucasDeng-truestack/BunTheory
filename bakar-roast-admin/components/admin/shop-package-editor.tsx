"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  shopAdminCreatePackage,
  shopAdminDeletePackage,
  shopAdminListPackages,
  shopAdminUpdatePackage,
  type ShopPackageAdmin,
  type ShopPackageInput,
} from "@/lib/shop-api";
import { moneyCents, sanitizeMoneyText } from "@/lib/bun-theory";
import { formatRM } from "@/lib/admin";
import { isSessionGone } from "@/lib/admin-session";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, ErrorMark, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextareaField } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { useAdmin, useAdminTopBar } from "@/components/admin/admin-context";
import { ADMIN_TITLE, AdminActionBar, describeError, LoadError } from "@/components/admin/admin-page";
import { iconBtn, OrderArrows, PhotoPicker, useUpload } from "@/components/admin/list-tools";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Block } from "@/components/admin/bun-theory/order-parts";
import { useLeaveGuard } from "@/components/admin/bun-theory/menu-editor";
import { MenuPhoto } from "@/components/admin/bun-theory/menu-photo";
import { PACKAGE_LIST } from "@/components/admin/shop-packages";

// Mirrors the backend limits (shop.config.ts and shop-package.dto.ts).
const MAX_PHOTOS = 6;
const MAX_INCLUDES = 20;
const MAX_INCLUDE_LENGTH = 120;

/** The form as typed. "What's included" is one item per line. */
type Draft = {
  name: string;
  price: string;
  tagline: string;
  description: string;
  includes: string;
  images: string[];
  active: boolean;
};

type Errors = { name?: string; price?: string; includes?: string };

const toDraft = (p?: ShopPackageAdmin): Draft => ({
  name: p?.name ?? "",
  price: p ? p.price.replace(/\.00$/, "") : "",
  tagline: p?.tagline ?? "",
  description: p?.description ?? "",
  includes: p?.includes.join("\n") ?? "",
  images: p?.images ?? [],
  active: p?.active ?? true,
});

const includeLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** The draft as Save would send it, or the field errors. */
function validate(d: Draft): { errors: Errors; input: ShopPackageInput | null } {
  const errors: Errors = {};
  const name = d.name.trim();
  if (!name) errors.name = "Give the package a name.";
  const cents = moneyCents(d.price);
  if (cents === null) errors.price = "Enter the price in ringgit, like 88 or 88.50.";
  else if (cents <= 0) errors.price = "The price must be more than RM 0.";
  else if (cents > 99999999) errors.price = "That price is too high.";
  const includes = includeLines(d.includes);
  if (includes.length > MAX_INCLUDES) errors.includes = `List up to ${MAX_INCLUDES} items.`;
  else if (includes.some((l) => l.length > MAX_INCLUDE_LENGTH)) errors.includes = `Keep each line under ${MAX_INCLUDE_LENGTH} characters.`;
  if (Object.keys(errors).length > 0 || cents === null) return { errors, input: null };
  return {
    errors,
    input: {
      name,
      price: (cents / 100).toFixed(2),
      tagline: d.tagline.trim(),
      description: d.description.trim(),
      includes,
      images: d.images,
      active: d.active,
    },
  };
}

/** Two drafts are the same when Save would send the same thing. */
const comparable = (d: Draft) =>
  JSON.stringify({
    ...d,
    name: d.name.trim(),
    price: moneyCents(d.price),
    tagline: d.tagline.trim(),
    description: d.description.trim(),
    includes: includeLines(d.includes),
  });

/** `/admin/shop-packages/new` (no id) or `/admin/shop-packages/[id]`. Finds the package in the list. */
export function ShopPackageEditorScreen({ id }: { id?: string }) {
  const q = useAdminQuery((t) => shopAdminListPackages(t), []);
  const pkg = id ? q.data?.find((p) => p.id === id) : undefined;
  const missing = !!id && q.data !== undefined && !pkg;
  useAdminTopBar({ title: id ? (pkg?.name ?? "Package") : "New package", back: PACKAGE_LIST });

  if (q.data === undefined) {
    return q.error ? (
      <LoadError onRetry={q.reload} />
    ) : (
      <div aria-busy="true" className="grid gap-5">
        <Skeleton className="h-12 w-2/3 max-w-md" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  if (missing) {
    return (
      <div className="grid animate-fade-in gap-5">
        <h1 className={cn(ADMIN_TITLE, "max-lg:sr-only")}>Package</h1>
        <EmptyState
          title="We could not find that package."
          action={
            <Button size="sm" variant="cream" href={PACKAGE_LIST}>
              All packages
            </Button>
          }
        >
          It may have been deleted.
        </EmptyState>
      </div>
    );
  }
  return <Editor key={pkg?.id ?? "new"} pkg={pkg} />;
}

/**
 * Create or edit one package. Explicit Save: validate, show field errors, then send. Photos
 * upload as they are picked and are saved with the package; the first one is the cover.
 */
function Editor({ pkg }: { pkg?: ShopPackageAdmin }) {
  const { run } = useAdmin();
  const { upload, uploading } = useUpload();
  const [base, setBase] = useState(() => toDraft(pkg));
  const [d, setD] = useState(base);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<{ title: string; help?: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{ title: string; help?: string } | null>(null);
  const dirty = comparable(d) !== comparable(base);
  const { leaveTo, setLeaveTo, leave } = useLeaveGuard(dirty);
  const name = pkg?.name ?? "this new package";

  const set = (patch: Partial<Draft>) => {
    setD((cur) => ({ ...cur, ...patch }));
    setNotice(null);
    // An edited field drops its own error; the rest wait for the next Save.
    const cleared = (["name", "price", "includes"] as const).filter((k) => k in patch && errors[k]);
    if (cleared.length) setErrors((cur) => ({ ...cur, ...Object.fromEntries(cleared.map((k) => [k, undefined])) }));
  };

  const onPhoto = async (file: File) => {
    setUploadError("");
    const res = await upload(file);
    if ("error" in res) setUploadError(res.error);
    else {
      setD((cur) => (cur.images.length >= MAX_PHOTOS ? cur : { ...cur, images: [...cur.images, res.url] }));
      setNotice(null);
    }
  };
  const removePhoto = (i: number) => set({ images: d.images.filter((_, k) => k !== i) });
  const movePhoto = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.images.length) return;
    const images = [...d.images];
    [images[i], images[j]] = [images[j], images[i]];
    set({ images });
  };

  const save = async () => {
    if (uploading) {
      setNotice({ title: "A photo is still uploading.", help: "Save again when it shows below." });
      return;
    }
    const { errors: errs, input } = validate(d);
    setErrors(errs);
    if (!input) {
      setNotice({ title: "Check the fields marked below.", help: "Nothing was saved yet." });
      const first = errs.name ? "pkg-name" : errs.price ? "pkg-price" : errs.includes ? "pkg-includes" : null;
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const saved = pkg
        ? await run((t) => shopAdminUpdatePackage(t, pkg.id, input))
        : await run((t) => shopAdminCreatePackage(t, input));
      setBase(toDraft(saved));
      setD(toDraft(saved));
      leave(`${PACKAGE_LIST}?done=${pkg ? "saved" : "added"}&name=${encodeURIComponent(saved.name)}`);
    } catch (err) {
      setSaving(false);
      if (isSessionGone(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        setNotice({ title: "This package was deleted somewhere else.", help: "Go back to the list to see the latest." });
      } else setNotice(describeError(err));
    }
  };

  const remove = async () => {
    if (!pkg) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await run((t) => shopAdminDeletePackage(t, pkg.id));
      leave(`${PACKAGE_LIST}?done=deleted&name=${encodeURIComponent(pkg.name)}`);
    } catch (err) {
      setDeleting(false);
      if (isSessionGone(err)) return;
      if (err instanceof ApiError && err.status === 404) leave(PACKAGE_LIST);
      else setDeleteError(describeError(err));
    }
  };

  const discard = () => (dirty ? setLeaveTo(PACKAGE_LIST) : leave(PACKAGE_LIST));

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

  const full = d.images.length >= MAX_PHOTOS;

  return (
    <div className="grid animate-fade-in content-start gap-5">
      <Link
        href={PACKAGE_LIST}
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
              placeholder="Family Feast"
              autoComplete="off"
              maxLength={60}
              value={d.name}
              error={errors.name}
              onChange={(e) => set({ name: e.target.value })}
            />
            <Field
              id="pkg-price"
              size="sm"
              label="Price (RM)"
              inputMode="decimal"
              autoComplete="off"
              placeholder="128"
              value={d.price}
              error={errors.price}
              onChange={(e) => set({ price: sanitizeMoneyText(e.target.value) })}
              className="max-w-[220px]"
            />
            <Field
              size="sm"
              label="Short line"
              optional
              placeholder="For the family"
              autoComplete="off"
              maxLength={80}
              help="Shown under the name on the order page."
              value={d.tagline}
              onChange={(e) => set({ tagline: e.target.value })}
            />
            <TextareaField
              size="sm"
              label="Description"
              optional
              placeholder="What this package is and who it suits"
              rows={3}
              maxLength={600}
              value={d.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Block>

          <Block title="What's included">
            <TextareaField
              id="pkg-includes"
              size="sm"
              label="Items"
              optional
              placeholder={"1 whole smoked chicken\n6 beef skewers\nGarlic rice for 4"}
              rows={6}
              help="One item per line. Customers see this as a list."
              value={d.includes}
              error={errors.includes}
              onChange={(e) => set({ includes: e.target.value })}
            />
          </Block>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Block title="Photos">
            {d.images.length === 0 ? (
              <MenuPhoto url={null} alt="" note="No photo yet. The order page shows a plain frame." sizes="340px" className="aspect-[4/3] rounded-card-sm p-4" />
            ) : (
              <ol className="m-0 grid list-none gap-3 p-0">
                {d.images.map((url, i) => (
                  <li key={url} className="grid gap-2">
                    <div className="relative">
                      <MenuPhoto
                        url={url}
                        alt={`Photo ${i + 1} of ${d.name.trim() || "this package"}`}
                        sizes="(min-width: 1024px) 340px, 100vw"
                        className="aspect-[4/3] rounded-card-sm"
                      />
                      {i === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-cream">Cover</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <OrderArrows name={`photo ${i + 1}`} first={i === 0} last={i === d.images.length - 1} onMove={(dir) => movePhoto(i, dir)} />
                      <button type="button" className={iconBtn} aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)}>
                        <X aria-hidden size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {!full && (
              <div>
                <PhotoPicker onFile={(f) => void onPhoto(f)} uploading={uploading} describedBy="pkg-photo-help">
                  {d.images.length ? "Add another photo" : "Upload a photo"}
                </PhotoPicker>
              </div>
            )}
            {uploadError ? (
              <p id="pkg-photo-help" className="type-small m-0 flex items-center gap-2 text-cream">
                <ErrorMark />
                {uploadError}
              </p>
            ) : (
              <p id="pkg-photo-help" className="type-small m-0 text-cream-muted">
                {full
                  ? `That is the most photos a package can have (${MAX_PHOTOS}). Remove one to add another.`
                  : `JPG, PNG or WebP up to 5 MB, up to ${MAX_PHOTOS} photos. The first is the cover. Saves with the package.`}
              </p>
            )}
          </Block>

          <Block title="On the order page">
            <Toggle
              label="Show on the order page"
              onText="Shown"
              offText="Hidden"
              checked={d.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            <p className="type-small m-0 text-cream-muted">Hidden packages stay here but customers cannot see or order them.</p>
          </Block>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 max-lg:hidden">{actions(false)}</div>
        {pkg && (
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setConfirmDelete(true);
            }}
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
        description={`What you changed on ${name} will be lost.`}
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
        confirmLabel="Delete package"
        cancelLabel="Keep it"
        confirmLoading={deleting}
        confirmLoadingLabel="Deleting"
        onConfirm={() => void remove()}
      >
        <div className="grid gap-2 text-cream-muted">
          {pkg && (
            <p className="m-0">
              {pkg.name} ({formatRM(moneyCents(pkg.price) ?? 0)}) is removed from the order page for good. To take it off for a
              while, hide it.
            </p>
          )}
          <p className="m-0">Orders already placed keep it and are not changed.</p>
        </div>
        {deleteError && (
          <Banner tone="error" title={deleteError.title}>
            {deleteError.help}
          </Banner>
        )}
      </Dialog>
    </div>
  );
}
