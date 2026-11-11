The booking status chip, told apart by fill weight, outline style, icon and label, with no hue outside the palette.

| Status | Look |
|---|---|
| Pending | `ember` outline, clock icon |
| Approved | Solid `ember`, `ink-base` text, check |
| Completed | Solid `cream`, `ink-base` text, double check |
| Declined | `cream` outline, cross |
| Cancelled | Faint outline, struck label, slashed circle |
| Expired | Dashed faint outline, hourglass |

- Never add green, red or blue for statuses. The label is always present; the icon alone is not enough.
- Used in admin lists, request detail and the customer status page. 28px tall and not interactive.
- You provide the status only. Do not reword the labels.
