"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MenuEditor } from "@/components/admin/menu-editor";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { MenuItem } from "@/types/menu";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function AdminMenuPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const fetchMenu = async () => {
    const t = localStorage.getItem("admin_token");
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    try {
      const data = await api<MenuItem[]>("/menu/draft", { token: t });
      setItems(
        data.map((i) => ({
          ...i,
          price: typeof i.price === "string" ? parseFloat(i.price) : i.price,
        }))
      );
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Menu"
        description="Create items, set availability, and upload photos."
      />

      <MenuEditor items={items} token={token!} onUpdate={fetchMenu} />
    </div>
  );
}
