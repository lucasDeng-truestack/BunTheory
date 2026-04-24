"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { AdminMenuItemDialog } from "@/components/admin/admin-menu-item-dialog";
import type { MenuItem } from "@/types/menu";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

interface MenuEditorProps {
  items: MenuItem[];
  token: string;
  onUpdate: () => void;
}

export function MenuEditor({ items, token, onUpdate }: MenuEditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogItem, setDialogItem] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openCreate = () => {
    setDialogItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setDialogItem(item);
    setDialogOpen(true);
  };

  const openDeleteDialog = (item: MenuItem) => {
    setDeleteTarget(item);
    setDeleteStep(1);
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteStep(1);
  };

  const executeDelete = async () => {
    if (!deleteTarget || deleteStep !== 2) return;
    setDeleteLoading(true);
    try {
      await api(`/menu/${deleteTarget.id}`, { method: "DELETE", token });
      onUpdate();
      toast.success("Item deleted");
      setDeleteTarget(null);
      setDeleteStep(1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaved = () => {
    onUpdate();
    toast.success("Menu updated", { description: "Changes are live on the storefront." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant={editMode ? "default" : "outline"}
          className="font-display"
          onClick={() => setEditMode((e) => !e)}
        >
          {editMode ? "Done editing" : "Edit Menu"}
        </Button>
        <Button type="button" className="font-display" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="font-display"
          onClick={() => {
            void onUpdate();
            toast.message("Refreshed", { description: "Loaded latest menu from server." });
          }}
        >
          Save Changes
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-charcoal/5">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="320px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl text-charcoal/25">
                  🍔
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold font-display text-lg leading-tight">{item.name}</p>
              <p className="text-roast-red font-bold">
                RM {Number(item.price).toFixed(2)}
              </p>
              <p className="text-sm text-charcoal/65">
                {item.soldOut ? "Sold out" : item.available ? "Available" : "Hidden"}
                {item.maxQuantity != null ? ` · cap ${item.maxQuantity}` : ""}
              </p>
              {editMode && (
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="font-display"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600 font-display"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => openDeleteDialog(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminMenuItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        token={token}
        item={dialogItem}
        onSaved={handleSaved}
      />

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent className="border-charcoal/10 bg-cream/95 p-0 sm:max-w-md">
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="space-y-4 p-6 sm:p-7">
              {deleteStep === 1 ? (
                <>
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="font-display text-xl text-charcoal">
                      Delete this item?
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="space-y-2 text-left text-base leading-relaxed text-charcoal/75">
                        <p>
                          You are about to remove{" "}
                          <span className="font-display font-semibold text-charcoal">
                            {deleteTarget?.name}
                          </span>{" "}
                          (RM {deleteTarget != null ? Number(deleteTarget.price).toFixed(2) : "—"}) from
                          the menu. Continue to the final step to confirm.
                        </p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="font-display"
                      disabled={deleteLoading}
                      onClick={closeDeleteDialog}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="font-display"
                      disabled={deleteLoading}
                      onClick={() => setDeleteStep(2)}
                    >
                      Continue
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-left">
                    <div className="shrink-0 text-red-600">
                      <AlertTriangle className="h-6 w-6" aria-hidden />
                    </div>
                    <DialogHeader className="space-y-2 text-left">
                      <DialogTitle className="font-display text-lg text-charcoal">
                        Final confirmation
                      </DialogTitle>
                      <DialogDescription className="text-sm leading-relaxed text-charcoal/75">
                        This permanently removes the item from the live menu. Orders
                        that already include it are unchanged. This action cannot
                        be undone.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="font-display"
                      disabled={deleteLoading}
                      onClick={() => setDeleteStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="font-display"
                      disabled={deleteLoading}
                      onClick={() => void executeDelete()}
                    >
                      {deleteLoading ? "Deleting…" : "Delete item"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
