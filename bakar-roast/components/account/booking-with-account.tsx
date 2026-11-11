"use client";

import { useEffect, useMemo, useState, type ComponentProps } from "react";
import Link from "next/link";
import type { CateringBookingMine } from "@/lib/api";
import { getMyBookings } from "@/lib/catering-api";
import { accountCopy, bookingCopy } from "@/lib/content";
import { formatLong } from "@/lib/dates";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { BookingFlow } from "@/components/booking/booking-flow";
import { useCustomer } from "@/components/account/use-customer";
import { SIGNIN_EMAIL_KEY } from "@/components/account/account-screen";

const linkClass = "font-semibold text-cream underline decoration-ember underline-offset-4";
const c = accountCopy.booking;

type FlowProps = Omit<
  ComponentProps<typeof BookingFlow>,
  "initialContact" | "contactNote" | "customerToken" | "renderDoneAccount" | "renderPendingHelp"
>;

/**
 * /catering/book with the optional sign-in: prefills contact details, sends the customer token
 * so the booking is saved to the account, and draws the account lines on step 3, the done
 * screen and the too-many-pending banner. Guests get the plain flow plus a sign-in offer.
 */
export function BookingWithAccount(props: FlowProps) {
  const customer = useCustomer();
  const signedIn = customer.status === "signed-in";
  const [last, setLast] = useState<CateringBookingMine | null>(null);

  // The newest booking gives the phone (and the name a first sign-in lacks). Failures just skip it.
  useEffect(() => {
    if (!signedIn) return setLast(null);
    let live = true;
    getMyBookings(customer.token).then((list) => live && setLast(list[0] ?? null), () => {});
    return () => {
      live = false;
    };
  }, [signedIn, customer.token]);

  const initialContact = useMemo(
    () =>
      signedIn
        ? {
            customerName: customer.name || last?.customerName || "",
            customerPhone: last?.customerPhone || "",
            customerEmail: customer.email,
          }
        : undefined,
    [signedIn, customer.name, customer.email, last],
  );

  const contactNote = signedIn ? (
    c.signedIn(customer.email)
  ) : customer.status === "guest" ? (
    <>
      <p className="m-0">{bookingCopy.contactNote}</p>
      {/* Own line, so the link's 44px tap height does not loosen the sentence above. */}
      <p className="m-0 flex flex-wrap items-center gap-x-1">
        {c.guestAsk}
        <Link href="/account?next=/catering/book" className={`${linkClass} inline-flex min-h-11 items-center`}>
          {c.guestLink}
        </Link>
      </p>
    </>
  ) : undefined;

  return (
    <BookingFlow
      {...props}
      initialContact={initialContact}
      contactNote={contactNote}
      customerToken={signedIn ? customer.token : undefined}
      renderDoneAccount={({ email }) =>
        signedIn ? (
          <Banner tone="ok" title={c.saved}>
            <Link href="/account" className={`${linkClass} inline-flex min-h-11 items-center`}>
              {c.seeAll}
            </Link>
          </Banner>
        ) : (
          <div className="grid max-w-[60ch] justify-items-start gap-3 rounded-card-sm border border-ink-line bg-ink-raised p-5">
            <b className="text-lg font-semibold">{c.guestTitle}</b>
            <p className="type-body m-0 text-cream-muted">{c.guestBody(email)}</p>
            <Button
              variant="cream"
              href="/account"
              onClick={() => {
                try {
                  sessionStorage.setItem(SIGNIN_EMAIL_KEY, email);
                } catch {}
              }}
            >
              {c.guestAction}
            </Button>
          </div>
        )
      }
      renderPendingHelp={signedIn ? () => <PendingLinks token={customer.token} /> : undefined}
    />
  );
}

/** Links to each request still waiting, fetched when the banner appears so it includes this session's bookings. */
function PendingLinks({ token }: { token: string }) {
  const [waiting, setWaiting] = useState<CateringBookingMine[]>([]);
  useEffect(() => {
    let live = true;
    getMyBookings(token).then((list) => live && setWaiting(list.filter((b) => b.status === "PENDING")), () => {});
    return () => {
      live = false;
    };
  }, [token]);
  if (!waiting.length) return null;
  return (
    <span className="grid basis-full justify-items-start">
      <span>{c.waiting}</span>
      {waiting.map((b) => (
        <Link key={b.reference} href={`/booking/${encodeURIComponent(b.accessToken)}`} className={`${linkClass} inline-flex min-h-11 items-center`}>
          {b.reference}, {formatLong(b.eventDate)}
        </Link>
      ))}
    </span>
  );
}
