Bakar & Roast is a wood-fire food brand in Petaling Jaya, Kuala Lumpur. **Fire. Feast. Family.** Build it as a wood-fire steakhouse crossed with a craft catering brand: cinematic, moody, warm.

## Brand facts

- Founders are John Zachariah and Grace Sheila. Catering is the flagship.
- The brand also owns The Bun Theory (fried chicken burgers) and The Weekend Grill (apple-wood smoked roast chicken). Present them as a proven track record. Never call them experiments or side projects.
- WhatsApp is `+60 14-685 6433`. Every public page offers it as "Message us" or "Prefer to chat first?".
- No prices appear anywhere. The quote is agreed by call.

## Voice

Sparse, confident, sensory. Short lines. Write like a menu, not a brochure.

- Lines to stay close to: "We bring the fire to you." "Tell us about your table." "Four steps to a full table."
- Use separate sentences or a comma. Never a statement, a dash, then an elaboration.
- Say "we" and "you". Buttons are two or three words: "Check a date", "Book this", "Send request", "Message us".
- Write dates in words ("Saturday 12 December 2026") and references in capitals (`BR-7K2M9Q`).
- Errors say what happened and what to do next, in the same calm voice: "That date was just taken. Pick another."
- No emoji. No exclamation marks.
- The booking numbers are owner settings: 7 days minimum notice, 6 months booking window, 3 day hold, 7 day cancellation cutoff. Print the current value inside the sentence. Never hard-code the sentence.

## Colour

Three families: ink for surfaces, cream for text, ember for the one accent.

- Ground is `ink-base`. Alternate full-width bands of `ink-base` and `ink-raised`, with an occasional `cream` band (text in `ink-base`) for contrast. `ink-soft` is for quiet insets such as the footer and the admin sidebar.
- Text is `cream`, then `cream-muted`, then `cream-faint`. Never pure white.
- `ember` is used sparingly: one word per headline, the primary button, the eyebrow dot, focus rings, the selected day. `ember-bright` is ember's own bright step, not a second accent. No other hue enters the system, including for statuses.
- Labels on `ember`, `ember-bright` and `cream` fills are `ink-base`. Cream on ember fails contrast.
- On cream bands the accent word is `ember-heat`, because `ember` on `cream` is 2.8:1.
- `ember-heat` marks errors as a border or icon. Set the error wording in `cream`, since `ember-heat` text on ink is only 3.5:1.
- `ink-line` is a decorative hairline. Anything a person must see to use a control gets a `cream-faint` edge.
- Package panels cycle `ember`, `ember-bright`, `cream`.

## Type

- Display is Bricolage Grotesque at width 80 (`font-stretch: 80%`, range 75 to 85), weight 800, uppercase, line height 0.84, tracking -0.025em. Use the `display-*` styles. One word per headline in ember.
- Body and UI is Figtree at 16 to 17px: `body-lg` on public pages, `body` in forms.
- Eyebrows use `eyebrow`: 13px, 600, uppercase, 0.16em tracking, with an 8px ember dot in front.
- Hero headline is fluid: `clamp(64px, 12.4vw, 210px)`.
- Admin uses the `admin-*` styles only. No display face in tables, forms or emails.
- Both faces load from Google Fonts. The Bricolage Grotesque request must include the `wdth` axis (75 to 100) or the condensed width will not render.

## Shape and space

- Radii are `radius-sm` 16, `radius-md` 24 and `radius-lg` 36 on cards and photos. Buttons, pills, chips and the stamp are `radius-pill`.
- Section padding is `section-desktop` (176px) down to `section-phone` (88px). Side gutter is `gutter-desktop` (56px) down to `gutter-phone` (18px).
- Controls are `control-height` (56px). Nothing tappable is smaller than `tap-min` (44px).
- Design every screen at 390 first, then 1440.

## Texture, decor and photos

- Public pages carry a fixed film grain overlay and `glow-ember` radial glows behind key sections.
- Decor is the spinning Stamp and the tilted Marquee ribbons. No polaroids, tickets or scribbles.
- Every photo sits in a PhotoSlot over the ember gradient, so an empty slot looks intentional. Photos are placeholders for now: label each slot with what the real photo should show.
- Gallery and testimonials are owner-managed. When there is nothing to show, the section does not render at all.

## Admin

Same palette and type families, plainer and denser. No grain, glows, parallax or decor. Smaller type, tables and forms that scan fast. Phone first, laptop sometimes. Statuses use StatusChip: ember, cream and ink weights plus an icon and a label.

## Accessibility

- Focus ring is 3px solid `ember` with a 3px offset on ink surfaces, and `ink-base` on cream bands.
- Calendar days and statuses differ by strike, hatch, dot, outline or icon, never by colour alone.
- The calendar is keyboard navigable, and every day announces its state.
- Every motion effect switches off under reduced motion.
- `cream-faint` is the smallest-contrast text allowed (4.5:1 on `ink-raised`). Do not use it on cream.

## Iconography

No icon set was supplied. The previews draw a small set of 16px line glyphs at 1.75px stroke: the diagonal arrow, check, cross, clock, hourglass, slashed circle. Treat them as placeholders in that style and pick one line icon set for the build. No emoji as icons. There is no logo file either: the wordmark is the name in the display face with an ember ampersand until a real mark is provided.
