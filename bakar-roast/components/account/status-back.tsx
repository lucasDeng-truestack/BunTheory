"use client";

import { accountCopy, statusCopy } from "@/lib/content";
import { BackLink } from "@/components/booking/status-timeline";
import { useCustomer } from "@/components/account/use-customer";

/** Status page back action: "Back to catering" until a sign-in is confirmed, then "All my bookings". */
export function StatusBack() {
  const { status } = useCustomer();
  return <BackLink {...(status === "signed-in" ? accountCopy.back : statusCopy.back)} />;
}
