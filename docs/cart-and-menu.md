# Cart & menu contract (Bun Theory)

This document explains how the **customer cart** stays aligned with the **backend menu**, so items are not removed unexpectedly after “Add to cart”.

## Principles

1. **Stable identifier: `slug`**  
   Each `Menu` row has a unique `slug` in the database (see Prisma schema). Slugs are **stable across re-seeds** when you use `upsert` by slug (see `backend/src/database/seed.ts`).  
   **Do not rely on `menuId` (UUID) in the customer cart** for the long term: IDs change when rows are recreated.

2. **Customer cart stores slugs**  
   The storefront cart persists lines with **`slug` only** (Zustand + `localStorage`). Legacy `menuId`-only lines were dropped in persist version `bun-theory-cart-v5`.

3. **Same API data for UI and validation**  
   - The menu page loads from the backend on the server, then **refetches `/menu` in the browser** so cards and the global cart validator use the same JSON.  
   - API calls use **`fetch` with `cache: "no-store"`** (see `frontend/lib/api.ts`) to avoid stale cached responses.

4. **Slug normalization**  
   All slugs are normalized with **`normalizeMenuSlug()`** (`trim` + lowercase) when reading from the API and when writing to the cart. That prevents mismatches from whitespace or casing.

5. **Order placement**  
   The backend resolves order lines by **`slug` first**, then `menuId` (see `backend/src/modules/orders/orders.service.ts`). Availability is still enforced at order time.

6. **Cart sync component**  
   `CartValidator` (mounted via `CartSync` in the root layout) removes lines whose slug no longer exists on the current menu (e.g. item deleted). It does not remove lines solely because an item is sold out; checkout handles that.

## What used to go wrong

- **Stale UUIDs** in `localStorage` after DB resets.  
- **Server-rendered menu** vs **client-fetched menu** or **cached `fetch`** showing different data than the validator.  
- **Strict validation** that treated only “available” rows as valid IDs (fixed earlier).  
- **Slug vs `menuId` priority** on the server (slug is now preferred).

## Operational checklist

- After changing the database, run **migrations** and, if needed, **seed** so every menu item has the expected `slug`.  
- Ensure **`NEXT_PUBLIC_API_URL`** in the frontend points at the same API you use for local dev (see `docs/setup.md`).  
- If you bump cart persist shape again, increment the `name` in `frontend/store/cart.store.ts` persist config.

## Related code

| Area | Location |
| --- | --- |
| Menu fetch + slug normalization | `frontend/services/menu.service.ts`, `frontend/lib/menu-slug.ts` |
| Cart persist | `frontend/store/cart.store.ts` |
| Live menu refresh on `/menu` | `frontend/components/menu/menu-page-view.tsx` |
| Cart validation | `frontend/components/order/cart-validator.tsx`, `frontend/lib/cart-menu-validation.ts` |
| Add to cart | `frontend/components/menu/food-card.tsx` |
| Order resolution | `backend/src/modules/orders/orders.service.ts` |
