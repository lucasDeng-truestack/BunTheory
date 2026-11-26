import { Suspense } from "react";
import { RequestDetailScreen } from "@/components/admin/request-detail";

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <RequestDetailScreen id={id} />
    </Suspense>
  );
}
