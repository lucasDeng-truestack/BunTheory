import type { Metadata } from "next";
import { Instagram, MapPin, MessageCircle } from "lucide-react";
import { getCateringRules } from "@/lib/catering-api";
import { bookCta, brand, contactCopy, contactHero, fallbackRules, packagesCopy, waLink } from "@/lib/content";
import { safe } from "@/lib/safe";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { AccordionItem, TipCard } from "@/components/ui/accordion";
import { Eyebrow } from "@/components/ui/headline";
import { CtaBand } from "@/components/ui/cta-band";
import { Hero } from "@/components/sections/hero";
import { ContactForm } from "@/components/sections/contact-form";
import { Reveal, SectionHead } from "@/components/sections/motion";

export const metadata: Metadata = {
  title: "Contact | Bakar & Roast",
  description:
    "Reach Bakar & Roast in Petaling Jaya, Kuala Lumpur. Check a date for catering, or message us on WhatsApp.",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function ContactPage() {
  const rules = await safe(getCateringRules(), fallbackRules);
  const info = [
    { icon: MessageCircle, label: "WhatsApp", value: brand.whatsappDisplay, href: waLink() },
    { icon: Instagram, label: "Instagram", value: `@${brand.instagram}`, href: brand.instagramUrl },
    { icon: MapPin, label: "Based in", value: brand.location },
  ];
  const faq = [
    {
      q: "How far ahead can I book?",
      a: `Up to ${plural(rules.cateringBookingWindowMonths, "month")} ahead, and at least ${plural(rules.cateringMinNoticeDays, "day")} before your event.`,
    },
    {
      q: "What happens after I send a request?",
      a: `We hold your date for ${plural(rules.cateringHoldExpiryDays, "day")} while we call you to agree the menu and the quote.`,
    },
    {
      q: "Can I cancel?",
      a: `Yes, from your booking page until ${plural(rules.cateringCancelCutoffDays, "day")} before the event. After that, message us.`,
    },
    { q: "Where are your prices?", a: packagesCopy.quote },
  ];

  return (
    <>
      <Hero copy={contactHero} action={<Button href={bookCta.href}>{bookCta.label}</Button>} />

      <Band tight className="pb-[clamp(56px,7vw,96px)] pt-[clamp(56px,7vw,96px)]">
        <Container className="grid gap-4 md:grid-cols-3">
          {info.map(({ icon: Icon, label, value, href }, i) => {
            const body = (
              <>
                <Icon aria-hidden size={20} strokeWidth={1.75} className="text-ember" />
                <span className="grid gap-1">
                  <span className="type-eyebrow text-cream-faint">{label}</span>
                  <span className="font-display text-[28px] font-extrabold uppercase leading-none [font-stretch:80%]">
                    {value}
                  </span>
                </span>
              </>
            );
            const box = "flex min-h-11 items-start gap-4 rounded-card-md bg-ink-raised p-6 text-cream no-underline";
            return (
              <Reveal key={label} index={i}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={`${box} transition-shadow hover:shadow-[inset_0_0_0_1px_theme(colors.cream.faint)]`}>
                    {body}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <div className={box}>{body}</div>
                )}
              </Reveal>
            );
          })}
        </Container>
      </Band>

      <Band tone="raised">
        <Container className="grid gap-14 min-[1000px]:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <SectionHead eyebrow={contactCopy.formEyebrow} size="lg">
              {contactCopy.formHeadline}
            </SectionHead>
            <p className="type-body-lg -mt-6 mb-8 max-w-[52ch] text-cream-muted">{contactCopy.formIntro}</p>
            <ContactForm />
          </div>
          <aside className="grid content-start gap-6">
            <Eyebrow as="h2">Good to know</Eyebrow>
            <div>
              {faq.map((f) => (
                <AccordionItem key={f.q} question={f.q}>
                  <p className="m-0">{f.a}</p>
                </AccordionItem>
              ))}
            </div>
            <TipCard title="A tip">
              <p>{contactCopy.tip}</p>
            </TipCard>
          </aside>
        </Container>
      </Band>

      <Band>
        <Container>
          <CtaBand />
        </Container>
      </Band>
    </>
  );
}
