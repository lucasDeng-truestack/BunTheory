"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { uploadImage } from "@/services/upload.service";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
}

interface MenuEditorProps {
  items: MenuItem[];
  token: string;
  onUpdate: () => void;
}

export function MenuEditor({ items, token, onUpdate }: MenuEditorProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    available: true,
  });
  const [uploading, setUploading] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    try {
      await api("/menu", {
        method: "POST",
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.description || undefined,
          price: parseFloat(newItem.price),
          available: newItem.available,
        }),
        token,
      });
      setNewItem({ name: "", description: "", price: "", available: true });
      onUpdate();
      toast.success("Menu item added", { description: newItem.name });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add menu item");
    }
  };

  const handleUpdate = async (
    id: string,
    data: Partial<MenuItem>,
    silent?: boolean
  ) => {
    try {
      await api(`/menu/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      });
      setEditing(null);
      onUpdate();
      if (!silent) toast.success("Menu item updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update menu item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api(`/menu/${id}`, { method: "DELETE", token });
      onUpdate();
      toast.success("Menu item deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete menu item");
    }
  };

  const handleImageUpload = async (menuId: string, file: File) => {
    setUploading(menuId);
    try {
      const { url } = await uploadImage(file, token);
      await handleUpdate(menuId, { image: url }, true);
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-charcoal/10 bg-cream/30">
          <CardTitle className="text-lg">Add menu item</CardTitle>
          <p className="text-sm font-normal text-charcoal/65">
            New items appear on the public menu immediately after saving.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem((n) => ({ ...n, name: e.target.value }))
                  }
                  placeholder="Signature Roast Bun"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Price (RM)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem((n) => ({ ...n, price: e.target.value }))
                  }
                  placeholder="12.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newItem.description}
                onChange={(e) =>
                  setNewItem((n) => ({ ...n, description: e.target.value }))
                }
                placeholder="Our famous slow-roasted beef..."
              />
            </div>
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-semibold">Menu Items</h3>
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-20 w-20 rounded-lg bg-charcoal/5 overflow-hidden flex-shrink-0">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">
                      🍔
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-charcoal/50 opacity-0 hover:opacity-100 transition-opacity">
                    {uploading === item.id ? (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                      <Upload className="h-6 w-6 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(item.id, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  {editing === item.id ? (
                    <div className="space-y-2">
                      <Input
                        defaultValue={item.name}
                        onBlur={(e) =>
                          handleUpdate(item.id, { name: e.target.value })
                        }
                        placeholder="Name"
                      />
                      <Input
                        defaultValue={String(item.price)}
                        type="number"
                        onBlur={(e) =>
                          handleUpdate(item.id, {
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="Price"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={item.available ? "default" : "outline"}
                          onClick={() =>
                            handleUpdate(item.id, { available: !item.available })
                          }
                        >
                          {item.available ? "Available" : "Sold Out"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-charcoal/70">
                        RM {Number(item.price).toFixed(2)} ·{" "}
                        {item.available ? "Available" : "Sold Out"}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(item.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
