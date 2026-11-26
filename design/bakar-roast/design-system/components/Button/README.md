The 56px pill with the label on the left and a round arrow chip on the right.

- `br-btn--ember` is the primary action, one per view. Its label is `ink-base`, never cream (cream on ember is 2.8:1).
- `br-btn--cream` is the secondary action on ink bands. `br-btn--ink` is the action on cream, ember and amber panels.
- `br-btn--ghost` has no chip and is for the quiet choice in dialogs. `br-btn--sm` (44px, no chip) is admin only.
- You provide the label and the destination. Labels are two or three words: "Check a date", "Book this", "Send request".
- Submitting: add `is-loading` and `aria-busy`; the arrow becomes a spinner and the label changes ("Sending"). Never disable without saying why nearby.
- Motion: on fine pointers the pill is pulled toward the cursor and springs back, and the arrow nudges up-right on hover. Booking and admin buttons get the arrow nudge only.
