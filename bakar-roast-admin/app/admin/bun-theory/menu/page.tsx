import { Suspense } from "react";
import { MenuScreen } from "@/components/admin/bun-theory/menu-list";

export default function BunTheoryMenuPage() {
  return (
    <Suspense>
      <MenuScreen />
    </Suspense>
  );
}
