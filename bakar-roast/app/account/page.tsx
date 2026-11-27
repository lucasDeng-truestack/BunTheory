import type { Metadata } from "next";
import { accountCopy } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { AccountScreen } from "@/components/account/account-screen";
import { safeNext } from "@/components/account/next-path";

export const metadata: Metadata = {
  title: accountCopy.title,
  robots: { index: false, follow: false },
};

/** Sign in with an emailed code, then "Your orders". `?next=` returns to the order flow. */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

  return (
    <Band className="pt-[calc(120px+env(safe-area-inset-top))]">
      <Container>
        <AccountScreen next={safeNext(one(params.next))} />
      </Container>
    </Band>
  );
}
