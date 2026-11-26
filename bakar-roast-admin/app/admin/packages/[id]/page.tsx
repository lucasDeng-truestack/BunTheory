import { PackageEditorScreen } from "@/components/admin/package-editor";

export default async function AdminPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackageEditorScreen id={id} />;
}
