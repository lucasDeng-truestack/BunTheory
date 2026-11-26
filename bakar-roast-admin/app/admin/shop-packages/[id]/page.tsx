import { ShopPackageEditorScreen } from "@/components/admin/shop-package-editor";

export default async function AdminShopPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShopPackageEditorScreen id={id} />;
}
