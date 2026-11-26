import { MenuEditorScreen } from "@/components/admin/bun-theory/menu-editor";

export default async function BunTheoryMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MenuEditorScreen id={id} />;
}
