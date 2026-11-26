"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { lastOrderToken, orderPath } from "@/lib/shop";

/** If this browser placed an order before, offer a one-tap link back to it. */
export function ContinueOrder() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => setToken(lastOrderToken()), []);
  if (!token) return null;
  return (
    <Link
      href={orderPath(token)}
      className="flex items-center justify-between gap-3 rounded-card-sm border border-ember bg-ember/10 px-[18px] py-3.5 text-cream no-underline"
    >
      <span>
        <b className="font-semibold">You have an order in progress.</b>{" "}
        <span className="text-cream-muted">Open it to pay or upload your receipt.</span>
      </span>
      <ArrowRight size={18} className="flex-none text-ember" />
    </Link>
  );
}
