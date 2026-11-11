The month calendar for picking an event date, and its admin twin for holds, bookings and blocks.

Customer day states. Each differs by shape or pattern as well as colour:

| State | Class | Look |
|---|---|---|
| Available | `br-day--available` | `ink-raised` tile, cream bold number. Can be picked. |
| Selected | `br-day--selected` | Solid `ember` tile, `ink-base` heavy number. |
| Unavailable | `br-day--unavailable` | No tile, faint number, diagonal strike. Held, booked and blocked all look like this to customers. |
| Too soon | `br-day--soon` | Hatched tile. Inside the minimum notice period. |
| Beyond window | `br-day--beyond` | Small hollow ring. Further ahead than bookings are open. |
| Today | `is-today` | Ember dot under the number. Marker only, combines with any state. |
| Other month | `br-day--other` | Leading and trailing days at 40% opacity, not interactive. |

Admin day states: `br-day--held` (dashed ember outline, pending request), `br-day--booked` (solid ember), `br-day--blocked` (cream hatch). Tap a free date to block it with a reason, a blocked date to unblock, a held or booked date to open the request.

- Always show the legend, and the selected date in words under the grid ("Saturday 12 December 2026").
- Days are at least 44px. Only pickable days are buttons. Arrow keys move by day and week, Page Up and Page Down by month, Enter selects. Each day has a full `aria-label` with its state.
- Previous month is disabled at the current month. Next is disabled past the booking window.
- Loading: the same grid with every tile as `br-skel`. A month with no open dates keeps the grid and adds the line "No open dates this month. Try the next one." with the next-month button.
- Motion stays calm: month changes are a short fade. No wipes, no parallax.
