import type { Metadata } from "next";
import { getCateringRules, getPackages } from "@/lib/catering-api";
import { bookingCopy, fallbackRules, waLink } from "@/lib/content";
import { safe } from "@/lib/safe";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Headline } from "@/components/ui/headline";
import { BookingWithAccount } from "@/components/account/booking-with-account";

export const metadata: Metadata = {
  title: "Check a date | Bakar & Roast",
  description: "Pick a date, choose a package and tell us about your table. We hold the date while we call you.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string | string[]; occasion?: string | string[] }>;
}) {
  const [params, packages, rules] = await Promise.all([
    searchParams,
    safe(getPackages(), null),
    safe(getCateringRules(), fallbackRules),
  ]);
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

  if (!packages || packages.length === 0) {
    return (
      <Band className="pt-[calc(120px+env(safe-area-inset-top))]">
        <Container>
          <div className="grid max-w-[820px] justify-items-start gap-6">
          <Headline as="h1" size="lg" eyebrow="Check a date">
            Let us <em>talk.</em>
          </Headline>
          <p className="type-body-lg m-0 max-w-[44ch] text-cream-muted">
            {packages ? bookingCopy.packagesEmpty : bookingCopy.packagesFailed}
          </p>
          <Button href={waLink(bookingCopy.whatsappMessage)} target="_blank" rel="noopener noreferrer">
            Message us
          </Button>
          </div>
        </Container>
      </Band>
    );
  }

  return (
    <BookingWithAccount
      rules={rules}
      packages={packages}
      initialPackageId={one(params.package)}
      initialOccasion={one(params.occasion)}
    />
  );
}
