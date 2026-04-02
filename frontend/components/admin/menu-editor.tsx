"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { AdminMenuItemDialog } from "@/components/admin/admin-menu-item-dialog";
import type { MenuItem } from "@/types/menu";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

  const openCreate = () => {
    setDialogItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setDialogItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api(`/menu/${id}`, { method: "DELETE", token });
      onUpdate();
      toast.success("Item deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
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
                    onClick={() => void handleDelete(item.id)}
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
    </div>
  );
}
