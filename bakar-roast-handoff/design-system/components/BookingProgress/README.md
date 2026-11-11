The four-step progress indicator for `/catering/book`, with the back action that sits above it.

- Steps are fixed: 1. Date, 2. Package, 3. Details, 4. Review. Numbers are part of the label so order reads without colour.
- Current step: `ember` bar and cream label, with `aria-current="step"`. Done: `cream-muted`. Ahead: `cream-faint` label on an `ink-line` bar.
- Every step has a back action, at least 44px tall, naming where it goes ("Back to date"). Going back never clears answers.
- Sticks under the header on phone. Changes with a short fade.
