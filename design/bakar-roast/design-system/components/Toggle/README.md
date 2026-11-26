An on/off switch for the admin: deposit paid, balance paid, and show or hide for packages, photos and testimonials.

- On: `ember` track with an `ink-base` knob on the right. Off: outlined track with a faint knob on the left. A word beside it states the value ("Yes", "No", "Shown", "Hidden"), so it never depends on colour or position alone.
- Saves at once and confirms with an `ok` Banner or inline "Saved". If the save fails, flip it back and show an error Banner.
- Use `role="switch"` on a real checkbox. The label is the full 44px tap target.
- Admin only. Customer forms use Pills and Fields.
