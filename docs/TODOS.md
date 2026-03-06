# Deferred Technical Debt

Items identified during the Phase 4 Mega Plan Review but deferred for later.

## 1. Extract component CSS strings to SCSS files
Component CSS lives in static `.css` string properties (e.g., `Archive.tsx`, `PostIndex.tsx`). These cannot use SCSS variables or mixins. Extracting to dedicated `.scss` files would unify the stylesheet pipeline.
**Why deferred**: Working fine with `var()` tokens. Migration is mechanical but touches every component.

## 2. Add a test framework
No automated tests exist. A lightweight visual regression setup (e.g., Playwright screenshots) would catch CSS cascade regressions.
**Why deferred**: Static site with manual verification. ROI unclear until the component count grows.

## 3. Unify frontispiece and shelf placeholder art
`Frontispiece.tsx` generates SVG patterns; `PostIndex.tsx` uses CSS-only layered gradients. Both use `hashTitle()` for seeding. Could share a single generative-art pipeline.
**Why deferred**: Both work independently. Unification is a design decision, not a bug.

## 4. Visible season indicator
`PageTransitions.tsx` sets `data-season` on `:root` and adjusts accent colors, but there's no visible UI indicating the current season. A small leaf/snowflake icon in the footer or header would make the feature discoverable.
**Why deferred**: Subtle by design. May not need to be visible.

## 5. Parallax margin shift on post pages
`--margin-shift` is computed in the scroll handler but only used for margin decorations. Could extend to sidenotes and footnotes for a three-layer depth effect.
**Why deferred**: Requires careful performance testing. Transform-only approach needed.
