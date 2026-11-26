Round option pills for single choices and filters, plus the small status chip that sits on photos.

- Use `br-pill` for the occasion choice in booking step 3 (House gathering, Celebration, Community or church, Corporate, Something else) and for gallery filters.
- The chosen pill fills `cream` with `ink-base` text and heavier weight, so selection never depends on colour alone. Set `aria-checked` or `aria-pressed`.
- `br-chip` is not interactive. The hero photo carries two: "Now booking" and the next open date. The date is live data; hide the chip when there is none.
- Minimum height 44px. Let pills wrap to new lines on phone, never scroll sideways inside a form.
- Motion: when a filter changes, old items drop out in 0.35s and matches rise in staggered.
