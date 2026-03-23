"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLastOrderId } from "@/lib/last-order";

/**
 * When `/order/success` is opened without `?id=`, recover from the last placed
 * order id stored after checkout, or prompt the user to browse the menu.
 */
export function OrderSuccessRedirect() {
  const router = useRouter();
  const [state, setState] = useState<"pending" | "none">("pending");

  useEffect(() => {
    const id = getLastOrderId();
    if (id) {
      router.replace(`/order/success?id=${encodeURIComponent(id)}`);
    } else {
      setState("none");
    }
  }, [router]);

  if (state === "pending") {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-charcoal/70">Looking up your order…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <p className="text-pretty text-charcoal/70">
        We couldn&apos;t find a recent order on this device. Open the link from
        your confirmation message, or start a new order.
      </p>
      <Button asChild size="lg" className="min-h-12">
        <Link href="/menu">Browse menu</Link>
      </Button>
    </div>
  );
}
