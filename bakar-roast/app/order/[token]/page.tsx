import type { Metadata } from "next";
import { ApiError } from "@/lib/api";
import { getShopOrder, type ShopOrderPage } from "@/lib/shop-api";
import { waLink } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { EmptyState } from "@/components/ui/banner";
import { OrderStatus } from "@/components/shop/order-status";

export const metadata: Metadata = {
  title: "Your order | Bakar & Roast",
  robots: { index: false },
};

/**
 * The order page, keyed by the unguessable accessToken. Server-rendered from the saved order,
 * so a refresh, a tab eviction, or returning from a banking app always reloads the same order.
 * Never holds client-only order state.
 */
export default async function OrderTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let order: ShopOrderPage | null = null;
  let notFound = false;
  try {
    order = await getShopOrder(token);
  } catch (err) {
    // A 404 means the token is wrong; anything else is transient, and the order is safe.
    notFound = err instanceof ApiError && err.status === 404;
    order = null;
  }

  if (!order) {
    return (
      <Band className="!pt-[clamp(120px,15vw,200px)]">
        <Container className="max-w-[640px]">
          <Eyebrow>Order</Eyebrow>
          {notFound ? (
            <>
              <EmptyState
                title="We could not find that order"
                action={
                  <Button href="/order" variant="cream">
                    Start a new order
                  </Button>
                }
              >
                The link may be old or mistyped. Message us if you need a hand.
              </EmptyState>
              <div className="mt-4">
                <Button href={waLink("Hi Bakar & Roast, I need help finding my order.")} variant="ghost">
                  Message us
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              title="We could not load your order just now"
              action={
                <Button href={`/order/${encodeURIComponent(token)}`} variant="cream">
                  Try again
                </Button>
              }
            >
              Your order is safe. This is a temporary hiccup. Try again in a moment, or message us.
            </EmptyState>
          )}
        </Container>
      </Band>
    );
  }

  return (
    <Band className="!pt-[clamp(120px,15vw,200px)]">
      <OrderStatus initialOrder={order} />
    </Band>
  );
}
