import { brand, chatCopy, waLink } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { Reveal } from "@/components/sections/motion";
import { accent } from "@/components/sections/accent";

/** "Prefer to chat first?" band with the WhatsApp number and one cream button. */
export function ChatBlock() {
  return (
    <Band tone="raised" tight className="py-[clamp(56px,7vw,96px)]">
      <Container className="grid items-end gap-6 min-[900px]:grid-cols-[1fr_auto]">
        <Reveal className="grid justify-items-start gap-4">
          <Eyebrow>{chatCopy.eyebrow}</Eyebrow>
          <h2 className="display-xl m-0 text-[length:clamp(44px,7vw,104px)]">{accent(chatCopy.headline)}</h2>
          <p className="m-0 max-w-[40ch] text-cream-muted">{chatCopy.body}</p>
        </Reveal>
        <Reveal index={1} className="grid justify-items-start gap-4">
          <span className="select-all whitespace-nowrap font-display text-[length:clamp(36px,5vw,64px)] font-extrabold leading-none [font-stretch:80%]">
            {brand.whatsappDisplay}
          </span>
          <Button href={waLink()} variant="cream" target="_blank" rel="noopener noreferrer">
            {chatCopy.action}
          </Button>
        </Reveal>
      </Container>
    </Band>
  );
}
