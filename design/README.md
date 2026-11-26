# Design

Every design file and handoff, one folder per brand. Code lives in the app folders at the repo
root; nothing here is built or deployed.

| Folder | Brand / app | What is in it |
|---|---|---|
| [`bakar-roast/`](bakar-roast/) | Bakar & Roast site (`bakar-roast/`) and its admin (`bakar-roast-admin/`) | `design-system/` (tokens, components, motion, screens), `prototype/`, `HANDOFF.md`, `design-brief.md` |
| [`bun-theory/`](bun-theory/) | The Bun Theory storefront (`frontend/`) | `screens/` mockups, `icons/`, `preview/` full-page views, `references/` for admin layout references |
| [`weekend-grill/`](weekend-grill/) | Weekend Grill POS (`weekend-grills-pos/`) | POS screen and component mockups |

Notes:

- `bakar-roast/HANDOFF.md` and `bakar-roast/design-brief.md` were written for the earlier catering
  booking site. The design system (tokens, components, motion) is still the source of truth, but
  the screens they describe (catering booking, story page, customer accounts, catering admin) have
  been replaced by the `/order` flow. See `AGENTS.md` for how the site works now.
- Brand colours and type for The Bun Theory are in [`docs/branding.md`](../docs/branding.md).
