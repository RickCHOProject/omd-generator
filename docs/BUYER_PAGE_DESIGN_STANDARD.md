# OMD Buyer Page Design Standard

Status: APPROVED AND LOCKED

Approved by Rick Vasquez on August 26, 2026.

Reference preview:
https://omd-generator-31vzsugay-ricks-projects-ae2941ad.vercel.app/d/2202-van-wert-st-hc0j

Approved implementation commit:
`739c98ecfc6aa414f001e5ffa662ab9c357bd969`

## Source of truth

The buyer-facing `/d/[slug]` page must use the responsive behavior documented here. Do not replace it with a centered fixed-width page, a single oversized full-width hero, blurred image extensions, or a page that leaves gray gutters on wide screens without Rick's explicit approval.

## Approved responsive structure

1. The complete buyer page fills the available browser width.
2. The header, property gallery, thumbnail strip, price band, property facts, Deal Terms, Property Condition, contact area, and disclosures all expand with the page.
3. The page must not use an outer `max-width` wrapper that creates empty left and right gutters on wide monitors.
4. Desktop property photos use a responsive tile grid instead of stretching one photograph across the entire screen:
   - one larger primary photo;
   - two supporting photos stacked beside it;
   - a four-pixel gap between tiles;
   - every tile uses `object-fit: cover` and keeps the source image proportional;
   - widening the screen changes the tile sizes and crop, never the image's proportions.
5. At 900px and below, the supporting tiles disappear and the existing 240px swipeable primary photo remains.
6. The thumbnail strip and full-screen photo viewer remain available.
7. The lower content uses responsive page padding but no separate maximum-width cap.

## Locked buyer experience

- Asking Price remains the primary price.
- Estimated ARV remains beneath Asking Price.
- Gross spread remains excluded.
- Text Now and Call remain the direct contact actions.
- The duplicate manual Interested button remains removed.
- The delayed buyer-identification form remains separate from the direct contact actions.
- Public deal pages remain accessible without a staff login.

## General rule for future OMD design work

When a page must work from phone width through an extra-wide desktop, make the layout absorb the width. Use responsive grids, flexible columns, and proportional media tiles. Do not solve wide screens by enlarging one low-resolution asset or by adding a fixed outer wrapper that leaves unused space.

## Verification requirement

Before changing this design:

1. Compare the result at phone, ordinary desktop, and extra-wide desktop widths.
2. Confirm there is no horizontal overflow.
3. Confirm photographs remain proportional.
4. Confirm the full page reaches the browser edges where intended.
5. Run the complete test suite and production build.
6. Use a preview deployment and obtain Rick's explicit approval before Production.
