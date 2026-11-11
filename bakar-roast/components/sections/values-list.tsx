import { Reveal } from "@/components/sections/motion";

/** "What we stand for": rows with the word on the left, a bold line and one sentence. */
export function ValuesList({ items }: { items: { word: string; title: string; line: string }[] }) {
  return (
    <ul className="m-0 grid list-none p-0">
      {items.map((v, i) => (
        <Reveal
          key={v.word}
          as="li"
          index={i}
          className="grid grid-cols-[72px_1fr] gap-x-4 gap-y-2 border-t border-ink-line py-6 sm:grid-cols-[96px_1fr]"
        >
          <span className="type-eyebrow pt-1.5 text-cream-faint">{v.word}</span>
          <div>
            <b className="block text-[22px]">{v.title}</b>
            <p className="m-0 mt-1 text-cream-muted">{v.line}</p>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}
