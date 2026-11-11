A rounded photo frame that sits over an ember gradient, so an empty slot still looks intentional.

- Every photo on the site uses this frame. The gradient runs `ember` to `ember-heat` to `ink-raised` from the lower left and stays behind the real photo as its loading state.
- Radii: `radius-lg` for hero and package photos, `radius-md` for gallery and chapter photos, `radius-sm` for thumbnails.
- Photos are placeholders for now. Until a real photo lands, show `br-photo__note` saying what the photo should show ("Photo: whole chickens over the wood fire"). Remove the note when the photo arrives and write the same sentence as its alt text.
- Only the hero photo carries chips, top left.
- Motion: the frame wipes open from the bottom while the photo settles from 1.4x, then drifts 8% against the scroll. The hero photo starts inset and grows to full bleed.
