"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import { createMenuItem, deleteMenuItem, listMenu, updateMenuItem, type MenuItem } from "@/lib/bun-theory-api";
import {
  counter,
  moneyCents,
  sanitizeIntText,
  sanitizeMoneyText,
  toMenuDraft,
  validateMenuItem,
  type MenuGroupDraft,
  type MenuItemDraft,
  type MenuItemErrors,
  type MenuOptionDraft,
} from "@/lib/bun-theory";
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
import { iconBtn, PhotoPicker, useUpload } from "@/components/admin/list-tools";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Block } from "@/components/admin/bun-theory/order-parts";
import { MENU_LIST } from "@/components/admin/bun-theory/menu-list";
import { MenuPhoto } from "@/components/admin/bun-theory/menu-photo";

/** `/admin/bun-theory/menu/new` (no id) or `/admin/bun-theory/menu/[id]`. Finds the item in the menu list. */
export function MenuEditorScreen({ id }: { id?: string }) {
  const q = useAdminQuery((t) => listMenu(t), []);
  const item = id ? q.data?.find((i) => i.id === id) : undefined;
  const missing = !!id && q.data !== undefined && !item;
  useAdminTopBar({ title: id ? (item?.name ?? "Menu item") : "New item", back: MENU_LIST });

  if (q.data === undefined) return q.error ? <LoadError onRetry={q.reload} /> : <EditorSkeleton />;
  if (missing) {
    return (
      <div className="grid animate-fade-in gap-5">
        <h1 className={cn(ADMIN_TITLE, "max-lg:sr-only")}>Menu item</h1>
        <EmptyState
          title="We could not find that item."
          action={
            <Button size="sm" variant="cream" href={MENU_LIST}>
              The whole menu
            </Button>
          }
        >
          It may have been deleted.
        </EmptyState>
      </div>
    );
  }
  return <MenuEditor key={item?.id ?? "new"} item={item} />;
}

// leaveTo value for the browser Back button.
const BACK = "#back";

/**
 * Ask before unsaved changes are lost: closing the tab (beforeunload), a same-site link (a
 * capture-phase click guard) and browser Back (a duplicate history entry absorbs it). The same
 * guard as the package editor.
 */
function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const leaving = useRef(false);
  const guarded = useRef(false);

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

  const leave = (href: string) => {
    leaving.current = true;
    if (href === BACK) return window.history.go(-2);
    // Replace the guard entry, so Back from the list does not land on the editor twice.
    if (guarded.current) router.replace(href);
    else router.push(href);
  };

  return { leaveTo, setLeaveTo, leave };
}

/** The draft as Save would read it: no row keys, outer spaces trimmed. */
const comparable = (d: MenuItemDraft) =>
  JSON.stringify({
    ...d,
    name: d.name.trim(),
    description: d.description.trim(),
    category: d.category.trim(),
    groups: d.groups.map((g) => ({
      name: g.name.trim(),
      required: g.required,
      multiSelect: g.multiSelect,
      options: g.options.map((o) => ({ label: o.label.trim(), priceDelta: o.priceDelta })),
    })),
  });

/**
 * Create or edit one item, with its option groups (drinks, size, add-ons) and photo. Explicit
 * Save: validate, show field errors, then send the old dialog's body. Delete asks twice, because
 * it also strips the item from past orders.
 */
function MenuEditor({ item }: { item?: MenuItem }) {
  const { run } = useAdmin();
  const { upload, uploading } = useUpload();
  const nextKey = useRef(counter()).current;
  const [base, setBase] = useState(() => toMenuDraft(item, nextKey));
  const [d, setD] = useState(base);
  const [errors, setErrors] = useState<MenuItemErrors>({});
  const [notice, setNotice] = useState<{ title: string; help?: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{ title: string; help?: string } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const dirty = comparable(d) !== comparable(base);
  const { leaveTo, setLeaveTo, leave } = useLeaveGuard(dirty);
  const name = item?.name ?? "this new item";

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const set = (patch: Partial<MenuItemDraft>) => {
    setD((cur) => ({ ...cur, ...patch }));
    setNotice(null);
    // An edited field drops its own error; the rest wait for the next Save.
    if (("name" in patch && errors.name) || ("price" in patch && errors.price)) {
      setErrors((cur) => ({ ...cur, ...("name" in patch ? { name: undefined } : {}), ...("price" in patch ? { price: undefined } : {}) }));
    }
  };
  const setGroup = (key: number, patch: Partial<MenuGroupDraft>) => {
    set({ groups: d.groups.map((g) => (g.key === key ? { ...g, ...patch } : g)) });
    if (errors.groups?.[key]) setErrors((cur) => ({ ...cur, groups: { ...cur.groups, [key]: "" } }));
  };
  const setOption = (g: MenuGroupDraft, key: number, patch: Partial<MenuOptionDraft>) => {
    setGroup(g.key, { options: g.options.map((o) => (o.key === key ? { ...o, ...patch } : o)) });
    if (errors.options?.[key]) setErrors((cur) => ({ ...cur, options: { ...cur.options, [key]: "" } }));
  };

  const newOption = (): MenuOptionDraft => ({ key: nextKey(), label: "", priceDelta: "0" });
  const addGroup = () => {
    const g: MenuGroupDraft = { key: nextKey(), name: "", required: false, multiSelect: false, options: [newOption()] };
    set({ groups: [...d.groups, g] });
    setFocusId(`grp-${g.key}`);
  };
  const removeGroup = (key: number) => set({ groups: d.groups.filter((g) => g.key !== key) });
  const addOption = (g: MenuGroupDraft) => {
    const o = newOption();
    setGroup(g.key, { options: [...g.options, o] });
    setFocusId(`opt-${o.key}`);
  };
  const removeOption = (g: MenuGroupDraft, key: number) => {
    const i = g.options.findIndex((o) => o.key === key);
    const rest = g.options.filter((o) => o.key !== key);
    const options = rest.length ? rest : [newOption()];
    setGroup(g.key, { options });
    setFocusId(`opt-${options[Math.max(0, i - 1)].key}`);
  };

  const onPhoto = async (file: File) => {
    setUploadError("");
    const res = await upload(file);
    if ("error" in res) setUploadError(res.error);
    else set({ image: res.url });
  };

  const save = async () => {
    if (uploading) {
      setNotice({ title: "The photo is still uploading.", help: "Save again when it shows in the frame." });
      return;
    }
    const { errors: errs, input } = validateMenuItem(d, !!item);
    setErrors(errs);
    if (!input) {
      setNotice({ title: "Check the fields marked below.", help: "Nothing was saved yet." });
      const groupKey = d.groups.find((g) => errs.groups?.[g.key])?.key;
      const optionKey = d.groups.flatMap((g) => g.options).find((o) => errs.options?.[o.key])?.key;
      const first = errs.name
        ? "menu-name"
        : errs.price
          ? "menu-price"
          : groupKey !== undefined
            ? `grp-${groupKey}`
            : optionKey !== undefined
              ? `opt-price-${optionKey}`
              : null;
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const saved = item ? await run((t) => updateMenuItem(t, item.id, input)) : await run((t) => createMenuItem(t, input));
      setBase(toMenuDraft(saved, nextKey));
      leave(`${MENU_LIST}?done=${item ? "saved" : "added"}&name=${encodeURIComponent(saved.name)}`);
    } catch (err) {
      setSaving(false);
      if (isSessionGone(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        setNotice({ title: "This item was deleted somewhere else.", help: "Go back to the menu to see the latest." });
      } else setNotice(describeError(err));
    }
  };

  const remove = async () => {
    if (!item) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await run((t) => deleteMenuItem(t, item.id));
      leave(`${MENU_LIST}?done=deleted&name=${encodeURIComponent(item.name)}`);
    } catch (err) {
      setDeleting(false);
      if (isSessionGone(err)) return;
      if (err instanceof ApiError && err.status === 404) leave(MENU_LIST);
      else setDeleteError(describeError(err));
    }
  };

  const discard = () => (dirty ? setLeaveTo(MENU_LIST) : leave(MENU_LIST));
  const err = (id: string, text?: string) =>
    text ? (
      <p id={id} className="type-small m-0 flex items-center gap-2 text-cream">
        <ErrorMark />
        {text}
      </p>
    ) : null;

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
        Save item
      </Button>
      <Button size="sm" variant="ghost" onClick={discard} disabled={saving} className={cn(bar && "h-[52px] flex-1 px-3")}>
        Discard changes
      </Button>
    </>
  );

  return (
    <div className="grid animate-fade-in content-start gap-5">
      <Link
        href={MENU_LIST}
        className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-cream-muted no-underline hover:text-cream max-lg:hidden"
      >
        <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
        The whole menu
      </Link>
      <h1 className={cn(ADMIN_TITLE, "max-lg:sr-only [overflow-wrap:anywhere]")}>{item ? `Edit ${item.name}` : "New item"}</h1>

      {notice && (
        <Banner tone="error" title={notice.title}>
          {notice.help}
        </Banner>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-4">
          <Block title="Details">
            <Field
              id="menu-name"
              size="sm"
              label="Name"
              placeholder="Chicken Burger"
              autoComplete="off"
              value={d.name}
              error={errors.name}
              onChange={(e) => set({ name: e.target.value })}
            />
            <Field
              id="menu-price"
              size="sm"
              label="Price (RM)"
              inputMode="decimal"
              autoComplete="off"
              placeholder="12.90"
              value={d.price}
              error={errors.price}
              onChange={(e) => set({ price: sanitizeMoneyText(e.target.value) })}
              className="max-w-[220px]"
            />
            <TextareaField
              size="sm"
              label="Description"
              optional
              placeholder="What makes this item special"
              rows={3}
              value={d.description}
              onChange={(e) => set({ description: e.target.value })}
            />
            <Field
              size="sm"
              label="Category"
              optional
              placeholder="Buns, Sides, Drinks"
              autoComplete="off"
              help="Groups this item into a section on the storefront menu."
              value={d.category}
              onChange={(e) => set({ category: e.target.value })}
            />
          </Block>

          <Block title="Option groups">
            <p className="type-small m-0 text-cream-muted">
              Drinks, size, add-ons. Customers pick these when they add the item. Extra prices are in RM; 0 means no extra charge.
            </p>
            {d.groups.length === 0 ? (
              <EmptyState title="No option groups yet." className="py-6">
                Add one for choices like drinks or spice level.
              </EmptyState>
            ) : (
              <ol className="m-0 grid list-none gap-3 p-0">
                {d.groups.map((g, gi) => {
                  const groupName = g.name.trim() || `group ${gi + 1}`;
                  const groupError = errors.groups?.[g.key];
                  return (
                    <li key={g.key} className="grid gap-3 rounded-card-sm border border-ink-line p-3">
                      <div className="flex items-end gap-2">
                        <Field
                          id={`grp-${g.key}`}
                          size="sm"
                          label={`Group ${gi + 1}`}
                          placeholder="Drinks, Size"
                          autoComplete="off"
                          value={g.name}
                          aria-invalid={groupError ? true : undefined}
                          aria-describedby={groupError ? `grp-${g.key}-error` : undefined}
                          onChange={(e) => setGroup(g.key, { name: e.target.value })}
                          className="min-w-0 flex-1"
                        />
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={`Remove ${groupName}`}
                          onClick={() => removeGroup(g.key)}
                        >
                          <Trash2 aria-hidden size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                      {err(`grp-${g.key}-error`, groupError)}
                      <div className="flex flex-wrap gap-x-6">
                        <Toggle
                          label="Required"
                          checked={g.required}
                          onChange={(e) => setGroup(g.key, { required: e.target.checked })}
                        />
                        <Toggle
                          label="Pick more than one"
                          checked={g.multiSelect}
                          onChange={(e) => setGroup(g.key, { multiSelect: e.target.checked })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <div aria-hidden className="type-admin-meta flex gap-2 text-cream-faint">
                          <span className="flex-1">Option</span>
                          <span className="w-[104px]">Extra RM</span>
                          <span className="w-11" />
                        </div>
                        <ol className="m-0 grid list-none gap-2 p-0">
                          {g.options.map((o, oi) => {
                            const optionError = errors.options?.[o.key];
                            return (
                              <li key={o.key} className="grid gap-1.5">
                                <div className="flex items-center gap-2">
                                  <Field
                                    id={`opt-${o.key}`}
                                    size="sm"
                                    label={<span className="sr-only">Option {oi + 1} in {groupName}</span>}
                                    placeholder="Coke"
                                    autoComplete="off"
                                    value={o.label}
                                    onChange={(e) => setOption(g, o.key, { label: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (oi === g.options.length - 1) addOption(g);
                                        else document.getElementById(`opt-${g.options[oi + 1].key}`)?.focus();
                                      }
                                    }}
                                    className="min-w-0 flex-1 [&>label]:contents"
                                  />
                                  <Field
                                    id={`opt-price-${o.key}`}
                                    size="sm"
                                    label={<span className="sr-only">Extra price in RM for option {oi + 1} in {groupName}</span>}
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder="0"
                                    value={o.priceDelta}
                                    aria-invalid={optionError ? true : undefined}
                                    aria-describedby={optionError ? `opt-price-${o.key}-error` : undefined}
                                    onChange={(e) => setOption(g, o.key, { priceDelta: sanitizeMoneyText(e.target.value) })}
                                    className="w-[104px] flex-none [&>label]:contents [&_input]:text-right [&_input]:tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    className={iconBtn}
                                    aria-label={`Remove option ${oi + 1} in ${groupName}`}
                                    onClick={() => removeOption(g, o.key)}
                                  >
                                    <X aria-hidden size={16} strokeWidth={1.75} />
                                  </button>
                                </div>
                                {err(`opt-price-${o.key}-error`, optionError)}
                              </li>
                            );
                          })}
                        </ol>
                        <div>
                          <Button size="sm" variant="ghost" onClick={() => addOption(g)}>
                            Add an option
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <div>
              <Button size="sm" variant="cream" onClick={addGroup}>
                <span className="inline-flex items-center gap-2">
                  <Plus aria-hidden size={16} strokeWidth={1.75} />
                  Add a group
                </span>
              </Button>
            </div>
          </Block>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Block title="Photo">
            <div className="relative">
              <MenuPhoto
                url={d.image}
                alt={`Photo of ${d.name.trim() || "this item"}`}
                note="Photo: the item as it is served."
                sizes="(min-width: 1024px) 340px, 100vw"
                className={cn("aspect-[4/3] rounded-card-sm p-4", uploading && "opacity-50")}
              />
              {uploading && (
                <span role="status" className="absolute inset-0 grid place-items-center font-semibold">
                  Uploading
                </span>
              )}
            </div>
            <div>
              <PhotoPicker onFile={(f) => void onPhoto(f)} uploading={uploading} describedBy="menu-photo-help">
                {d.image ? "Replace photo" : "Upload a photo"}
              </PhotoPicker>
            </div>
            {uploadError ? (
              err("menu-photo-help", uploadError)
            ) : (
              <p id="menu-photo-help" className="type-small m-0 text-cream-muted">
                JPG, PNG or WebP up to 5 MB. Saves with the item.
              </p>
            )}
          </Block>

          <Block title="On the menu">
            <div className="grid">
              <Toggle
                label="Show on the storefront"
                onText="Shown"
                offText="Hidden"
                checked={d.available}
                onChange={(e) => set({ available: e.target.checked })}
              />
              <Toggle
                label="Sold out"
                checked={d.soldOut}
                onChange={(e) => set({ soldOut: e.target.checked })}
              />
              <Toggle
                label="Favourite"
                checked={d.isFavorite}
                onChange={(e) => set({ isFavorite: e.target.checked })}
              />
            </div>
            <Field
              size="sm"
              label="Most that can be sold"
              optional
              inputMode="numeric"
              autoComplete="off"
              placeholder="No limit"
              help="Across all orders. The item shows as sold out once it is reached."
              value={d.maxQuantity}
              onChange={(e) => set({ maxQuantity: sanitizeIntText(e.target.value) })}
            />
            {item && item.soldQuantity > 0 && (
              <p className="type-small m-0 text-cream-muted">
                <b className="tabular-nums text-cream">{item.soldQuantity}</b> sold so far.
              </p>
            )}
          </Block>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 max-lg:hidden">{actions(false)}</div>
        {item && (
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteStep(1);
            }}
            className="inline-flex min-h-11 items-center font-semibold text-cream-muted underline hover:text-cream"
          >
            Delete this item
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
      {/* Two dialogs, not one with two steps, so the second opens with focus on its safe button. */}
      <Dialog
        open={deleteStep === 1}
        onClose={() => setDeleteStep(0)}
        title="Delete this item?"
        description={
          item
            ? `${item.name} (${formatRM(moneyCents(item.price) ?? 0)}) is removed for good, from the menu and from carts the next time customers load it.`
            : undefined
        }
        confirmLabel="Continue"
        cancelLabel="Keep it"
        onConfirm={() => setDeleteStep(2)}
      />
      <Dialog
        open={deleteStep === 2}
        onClose={() => setDeleteStep(1)}
        title="This changes past orders"
        confirmLabel="Delete item"
        cancelLabel="Back"
        confirmLoading={deleting}
        confirmLoadingLabel="Deleting"
        onConfirm={() => void remove()}
      >
        <div className="grid gap-2 text-cream-muted">
          <p className="m-0">
            Every order line for this item is removed. An order that held only this item is removed too.
          </p>
          {item && item.soldQuantity > 0 && (
            <p className="m-0">
              It has <b className="tabular-nums text-cream">{item.soldQuantity}</b> sold across past orders.
            </p>
          )}
          <p className="m-0 font-semibold text-cream">This cannot be undone.</p>
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

function EditorSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-56" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  );
}
