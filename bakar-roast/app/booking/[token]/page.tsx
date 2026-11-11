import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError, type CateringBookingPublic } from "@/lib/api";
import { getBooking } from "@/lib/catering-api";
import { statusCopy, waLink } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Headline } from "@/components/ui/headline";
import { StatusTimeline } from "@/components/booking/status-timeline";
import { StatusBack } from "@/components/account/status-back";
import { accent } from "@/components/sections/accent";

// Neutral title: never the reference or the customer's name.
export const metadata: Metadata = {
  title: statusCopy.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BookingStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let booking: CateringBookingPublic | null = null;
  try {
    booking = await getBooking(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    console.warn(`[booking] status fetch failed: ${(err as Error)?.message ?? err}`);
  }

  return (
    <Band className="pt-[calc(120px+env(safe-area-inset-top))]">
      <Container>
        {booking ? (
          <StatusTimeline booking={booking} token={token} back={<StatusBack />} />
        ) : (
          <div className="grid max-w-[820px] justify-items-start gap-6">
            <Headline as="h1" size="lg" eyebrow={statusCopy.loadFailed.eyebrow}>
              {accent(statusCopy.loadFailed.headline)}
            </Headline>
            <p className="type-body-lg m-0 max-w-[48ch] text-cream-muted">{statusCopy.loadFailed.body}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button href={`/booking/${encodeURIComponent(token)}`}>{statusCopy.loadFailed.retry}</Button>
              <a
                href={waLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-semibold text-cream underline decoration-ember underline-offset-4"
              >
                Message us
              </a>
            </div>
          </div>
        )}
      </Container>
    </Band>
  );
}
