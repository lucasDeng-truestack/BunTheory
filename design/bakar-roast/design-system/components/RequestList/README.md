The admin requests list: tabs, a dense table on laptop and one card per request on phone.

- Tabs: Pending, Approved, Past, All. Pending carries the count badge. The selected tab has a 2px `ember` underline.
- Row: reference, event date, customer, package, guests, status chip, time left on the hold. The whole row opens the request detail.
- Hold time turns `ember` and bold under 24 hours; the wording ("5 hours left") carries the meaning. Non-pending rows show a dash.
- Phone is the main device: use `br-reqcard`, with date and customer on the bold line. The table is for 768px and up.
- Empty state per tab, with its own line: "No pending requests." "Nothing approved yet." "No past events yet." "No requests yet."
- Admin type only (`admin-body`, `admin-meta`). No display face, grain, glows or decor. Sample names are placeholders.
- Request detail, built from these parts: customer block with **Call** and **WhatsApp** buttons (`br-btn--sm`), event block, package block, actions (Approve, Decline, Cancel, Mark completed), payment block (quote, deposit, two Toggles), private notes (Field).
