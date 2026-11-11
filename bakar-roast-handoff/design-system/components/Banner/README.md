Inline messages for forms and lists: error, success, nothing-to-show and the loading skeleton.

- `br-banner--error`: 2px `ember-heat` edge and the "!" mark, wording in cream. Use `role="alert"`. Sits at the top of the step it concerns.
- Fixed wording for the two booking errors:
  - Date taken between picking and submitting: "That date was just taken. Pick another." Return the customer to step 1 with every other answer kept.
  - Already 2 requests waiting: "You have 2 requests waiting on us. We will call you about those first." Link to each status page's contact action. The "2" is a value, not fixed text.
- Server error: say nothing was sent and offer retry and "Message us".
- `br-banner--ok`: `ember` edge and dot, `role="status"`, for saves in the admin.
- `br-empty`: dashed box for a list with nothing to show. One bold line, one plain line. Each admin tab has its own wording.
- `br-skel`: the loading skeleton. Match the shape of what is loading and set `aria-busy` on the container.
- Every form and list covers: empty, focus, filled, invalid with message, submitting, success, server error, loading skeleton, nothing to show.
