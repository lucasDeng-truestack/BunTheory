One email template for all seven messages: dark header with the wordmark, cream body, one ember button.

| Message | To | Subject line | Button |
|---|---|---|---|
| Request received | Customer | We have your request, BR-7K2M9Q | See your booking |
| New request | Owner | New request for Sat 12 Dec | Open request |
| Approved | Customer | Your date is confirmed | See your booking |
| Declined | Customer | About your request | Pick another date |
| Cancelled | Customer | Your booking is cancelled | Book again |
| Expired | Customer | We could not confirm in time | Book again |
| Customer cancelled | Owner | BR-7K2M9Q was cancelled | Open calendar |

- Header `#0B0908`, body `#F4ECE1` with `#0B0908` text, button `#E86A1C` with `#0B0908` label. Emails need literal hex values and inline styles; CSS variables do not work there.
- One button per email, no arrow chip, 16px radius fallback where pills are not supported.
- Body font is Figtree with a system sans fallback. The wordmark falls back to bold Arial Narrow.
- Body: a headline, two or three short sentences, the facts block (reference, date in words, package and guests), the button. No prices.
- Held-until dates and cutoffs come from settings. Owner emails add the customer's phone as a tap-to-call link.
