# Motion

Build all of it with `motion` and `lenis` (scroll-linked transforms and sticky sections). Do not add GSAP.

## Shared feel

- Duration 0.8s on almost everything.
- Entrances ease `expo.out`: `cubic-bezier(.16, 1, .3, 1)`.
- Wipes and panels ease `expo.inOut`: `cubic-bezier(.76, 0, .24, 1)`.
- Stagger 0.05 to 0.1s.

## Rules

- Every effect switches off under `prefers-reduced-motion`. Content is then simply present.
- Cursor, magnetic, trail and hover-photo effects run only on fine pointers (`(pointer: fine)`).
- The booking calendar, forms, status page, emails and the admin stay calm: fades and short slides only.

## Effects

| Effect | Behaviour |
|---|---|
| Preloader, first visit only | Word plus a counter running 00 to 100 over 2.6s. A stack of photos wipes in one after another, the last scales up to fill the screen, then the loader wipes upward. |
| Page transition | Two panels (`ember`, then `ink-raised`) slide up over the page with the destination's name, then slide away on the new page. |
| Hero entrance | Headline letters rise from below and rotate up one by one, 0.025s apart. Header drops in. Paragraph and button fade up. Hero photo settles from 1.35x. |
| Hero on scroll | Photo starts inset with rounded corners and grows to full bleed. Headline drifts up slower than the page. |
| Section headlines | Words slide up from behind a mask with a slight tilt, 0.05s apart. |
| Scrubbed paragraph | Words go from 14% to full opacity as you scroll through. Inline pill photos grow from zero width. |
| General reveal | Blocks fade up 50px, batched with 0.1s stagger. |
| Photo reveal | Wipes open from the bottom while the photo settles from 1.4x. |
| Photo parallax | Photo drifts 8% against the scroll inside its frame. |
| Marquees | Loop forever, speed up with scroll speed, reverse with scroll direction. The two ribbons change tilt as you pass. |
| Step cards | Rise in from further down the later they are in the row. |
| Stacked package cards | Each sticks, shrinks to 88%, tilts 1.5 degrees and dims as the next slides over. Photo settles from 1.3x. List items slide in from the right. |
| List rows | A photo follows the cursor, swaps per row, tilts with pointer speed. |
| Hover photo trail | Moving across a section drops small tilted photos along the cursor path that fade and fall. |
| Counters | Count up from zero once, when first seen. |
| Sideways gallery, desktop | Section pins and vertical scroll moves the row sideways. Cards lean with scroll speed. A progress line fills. Plain swipe row on phone. |
| Timeline | The line draws downward as you scroll. Each year slides in from the left. |
| Call-to-action band | Grows from an inset rounded shape to full size while its photo settles from 1.3x. |
| Footer | Slides out from under the page. Giant brand letters rise one by one. |
| Header | Hides scrolling down, returns scrolling up, solid backing after 50px. |
| Buttons | Pulled toward the cursor with a springy snap back. Arrow chip animates on hover. |
| Cursor | Small `ember` dot that follows the pointer and grows into a labelled circle ("View") over cards. |
| Filters and option pills | Old items drop out in 0.35s, matching items rise in staggered. |
| Gallery thumbnails | New photo wipes in from the right while settling from 1.2x. |
| Accordion | Height animates over 0.6s. Plus turns to a cross. |
| Mobile menu | Wipes down from the top over 0.9s. |
| Spinning stamp | One turn every 16s. |
