import type { ReactNode } from "react";

/** "Some *accent* words" to text with the starred part in <em> (the headline's ember word). */
export function accent(text: string): ReactNode {
  return text.split(/(\*[^*]+\*)/).map((part, i) =>
    part.startsWith("*") ? <em key={i}>{part.slice(1, -1)}</em> : part,
  );
}
