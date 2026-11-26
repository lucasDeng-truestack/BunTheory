A confirmation dialog for actions that cannot be undone: the customer's cancel, and the owner's decline, cancel and block.

- `ink-raised` panel, `radius-md`, over a 72% `ink-base` scrim. Title in `display-sm`, one or two plain sentences, two actions.
- Name the consequence and the date in words. Button labels say what happens ("Yes, cancel it", "Keep my booking"), never "OK" or "Confirm".
- The destructive choice is `br-btn--cream` without the arrow chip, the safe one is `br-btn--ghost`. Ember is not used for destructive actions.
- Admin variants add one optional field: a reason on Decline and Block, quote and deposit amounts on Approve.
- Trap focus, close on Escape, return focus to the button that opened it. On phone it becomes a bottom sheet. Fades in over 0.2s.
