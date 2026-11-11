"Good to know" accordion rows and the tinted tip card that sits beside them.

- Use native `details` and `summary`. The plus turns to a cross and fills `ember` when open. Summary rows are at least 64px tall.
- `br-tip` is the tinted tip card: `ember-bright` fill, `ink-base` text, `radius-md`. One per view.
- The numbers in answers (3 day hold, 7 days notice, 6 months ahead, 7 day cancel cutoff) are owner settings. Render them from the settings values, never as fixed sentences.
- You provide the questions and answers. Answers are one or two short sentences.
- Motion: height animates over 0.6s with `cubic-bezier(.76, 0, .24, 1)`.
