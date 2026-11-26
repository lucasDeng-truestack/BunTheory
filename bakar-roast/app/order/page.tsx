import type { Metadata } from "next";
import { getShopConfig, getShopAvailability } from "@/lib/shop-api";
import { waLink } from "@/lib/content";
import { safe } from "@/lib/safe";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { EmptyState } from "@/components/ui/banner";
import { OrderFlow } from "@/components/shop/order-flow";
import { ContinueOrder } from "@/components/shop/continue-order";

export const metadata: Metadata = {
  title: "Order Now | Bakar & Roast",
  description: "Order online from Bakar & Roast. Delivery or pickup in Petaling Jaya.",
};

// Availability is live, so this page is never statically cached.
export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const [config, availability] = await Promise.all([
    safe(getShopConfig(), null),
    safe(getShopAvailability(), null),
  ]);

  return (
    <Band className="!pt-[clamp(120px,15vw,200px)]">
      <Container className="mb-10 max-w-[640px] grid gap-5">
        <div className="grid gap-3">
          <Eyebrow>Order Now</Eyebrow>
          <h1 className="display-lg m-0 text-cream">Real smoke, to your table.</h1>
        </div>
        <ContinueOrder />
      </Container>

      {config && availability ? (
        <OrderFlow config={config} availability={availability} />
      ) : (
        <Container className="max-w-[640px]">
          <EmptyState
            title="We could not load ordering just now"
            action={
              <Button
                href={waLink("Hi Bakar & Roast, I'd like to place an order.")}
                variant="cream"
              >
                Order over WhatsApp
              </Button>
            }
          >
            Please try again in a moment, or message us and we will take your order.
          </EmptyState>
        </Container>
      )}
    </Band>
  );
}
