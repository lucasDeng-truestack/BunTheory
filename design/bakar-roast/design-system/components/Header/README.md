The site header with the wordmark, links and "Check a date", and the phone menu that opens as a full-screen panel with numbered links.

- No logo file was supplied, so the wordmark is the name set in the display face with the ampersand in `ember`. Replace it with the real mark when one exists; do not draw one.
- Desktop: wordmark left, links centre, the `ember` button right (48px tall in the header).
- Phone: wordmark and a round cream burger button, 48px. The menu fills the screen in `ink-raised` with numbered links in `display-md`, and the burger becomes a close button with `aria-expanded`.
- Motion: the header hides when scrolling down, returns when scrolling up, and gets a solid `ink-base` backing after 50px. The phone menu wipes down from the top over 0.9s. In the booking flow the header stays put.
- The link names in the preview are an assumption; confirm the real site map.
