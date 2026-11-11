A soft filled text field, 56px tall with a 16px radius, with every form state.

- Fill `ink-raised`, 1px `cream-faint` border (the border is what makes the field visible, so never swap it for `ink-line`). Label above in 14px semibold cream. Placeholder in `cream-faint`.
- Focus: `ember` border plus `ring-focus`.
- Invalid: 2px `ember-heat` border, and a message in cream with the round "!" mark. The border is thicker and the mark is a shape, so the error never relies on red alone. Link the message with `aria-describedby`.
- Error messages say what to do: "Enter a full phone number so we can call you."
- Mark optional fields "(optional)" instead of starring required ones.
- Booking step 3 order: serving time, event address, occasion (Pill), dietary notes, anything else, then name, phone, email.
- Admin uses the same field at 44px height with 14px text.
- You provide label, value, help or error text, and the right `type`, `inputmode` and `autocomplete`.
