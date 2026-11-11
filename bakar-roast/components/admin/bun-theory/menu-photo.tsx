import { imageSrc } from "@/lib/catering-api";
import { localUploadPath } from "@/lib/bun-theory";
import { cn } from "@/lib/utils";
import { PhotoSlot } from "@/components/ui/photo-slot";

/** A menu item's photo in a PhotoSlot. Old local upload URLs are pointed at today's API for display. */
export function MenuPhoto({
  url,
  alt,
  note,
  sizes,
  className,
}: {
  url: string | null | undefined;
  alt: string;
  note?: string;
  sizes: string;
  className?: string;
}) {
  return (
    <PhotoSlot
      src={imageSrc(localUploadPath(url)) || null}
      alt={alt}
      note={note}
      radius="none"
      sizes={sizes}
      className={cn("min-h-0 p-0", className)}
    />
  );
}
