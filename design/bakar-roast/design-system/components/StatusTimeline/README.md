The booking status page block at `/booking/[token]`: status chip, headline, reference, a short timeline and one action.

| Status | Headline | Body | Action |
|---|---|---|---|
| Pending | "We have your request." | Date held until a stated day. | Cancel request |
| Approved | "Your date is confirmed." | Event summary. | Cancel, if still before the cutoff |
| Declined | "We cannot take this one." | A kind line, then the owner's reason if given. | Pick another date |
| Cancelled | "Your booking is cancelled." | The date is open again. | Book again |
| Expired | "We could not confirm in time." | The hold has ended. | Book again |
| Completed | "Thank you for having us." | Nothing more to do. | None |

- Timeline dots: done is solid `ember`, current is an `ember` ring, ahead is a hollow faint ring, and a stopped step (declined, cancelled, expired) is a struck cream ring. State reads from shape as well as colour.
- "Held until" and the cancel cutoff are computed from the owner's settings. Write the actual day.
- After the cutoff, replace the cancel button with "The cancellation deadline has passed. Contact us." and a WhatsApp action to `+60 14-685 6433`.
- Cancel opens the Dialog. A bad link shows a not-found page: "We cannot find that booking." with "Check a date" and "Message us".
- Calm motion only.
