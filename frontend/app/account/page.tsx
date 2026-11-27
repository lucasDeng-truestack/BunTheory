import { SubPageShell } from "@/components/layout/sub-page-shell";
import { AccountView } from "@/components/account/account-view";
import { BRAND_FULL_NAME } from "@/lib/brand";

export const metadata = {
  title: `Account | ${BRAND_FULL_NAME}`,
  description: "Sign in to see your orders and check out faster",
  robots: { index: false },
};

/** After sign-in, `?next=` may only lead back to checkout (no open redirect). */
const safeNext = (raw: string | string[] | undefined): string | null => {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "/order/confirm" || v === "/order" ? v : null;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return (
    <SubPageShell title="Account" eyebrow="Your orders" backHref="/" backLabel="Home">
      <div className="mx-auto w-full max-w-3xl">
        <AccountView next={safeNext(next)} />
      </div>
    </SubPageShell>
  );
}
