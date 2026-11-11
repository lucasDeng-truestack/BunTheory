An eyebrow with an ember dot above a condensed, uppercase display headline with exactly one word in ember.

- Wrap the accent word in `<em>`. One per headline. On cream bands the accent switches to `ember-heat` because `ember` on `cream` is only 2.8:1.
- Hero: three stacked lines, the last one in the accent, sized `clamp(64px, 12.4vw, 210px)`. Section headlines use `display-xl` on desktop and `display-md` on phone.
- Always width 80 (`font-stretch: 80%`), weight 800, line height 0.84, tracking -0.025em. Never sentence case, never italic.
- Keep it short enough to break into two or three lines. You provide the text and which word carries the accent.
- Motion: hero letters rise and rotate up one by one, 0.025s apart. Section headline words slide up from behind a mask with a slight tilt, 0.05s apart.
