The big stacked catering package card: photo on the left, tinted panel on the right with a number, title, tagline, "what is included" list, guest range and "Book this".

- The centre of `/catering`, and the selectable option in booking step 2 (add `is-selected`, `role="radio"`, and change the button label to "Choose this").
- Panels cycle `br-package--ember`, `br-package--bright`, `br-package--cream`, in that order. All panel text is `ink-base`. The button is always `br-btn--ink`.
- You provide: photo, name, one-line tagline, included items (four to eight, shown in two columns, one on phone), minimum and maximum guests. The preview's package names and items are sample content; the owner manages the real ones.
- Never show a price. Keep the line "No price list. We agree the quote with you by call."
- One package: a single card, full width, no stacking motion. Three: stacked. Five: the panel cycle repeats (ember, bright, cream, ember, bright) and the numbers run 01 to 05.
- Phone: photo on top, panel below, list in one column.
- Motion (landing only): each card sticks, shrinks to 88%, tilts 1.5 degrees and dims as the next slides over it. Its photo settles from 1.3x and list items slide in from the right. In the booking flow cards only fade.
