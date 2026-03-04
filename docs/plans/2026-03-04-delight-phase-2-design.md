# Delight Phase 2 — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Overview

Push the site design into genuinely surprising and delightful territory across three fronts: tactile richness, content/structure depth, and signature moments.

## 1. Tags Page — The Garden

Canvas-based visualization replacing the default Quartz tag listing. A living garden where tags are organic plant-like forms growing upward, and posts are colored buds on stems.

**Visual language:**
- Dark background (`#141822`) regardless of site theme — the garden is its own world
- Plants grow bottom-up: taller stems = more posts under that tag
- Each stem terminates in a small colored dot (rust/amber palette)
- Tag names float near their plant as small monospace labels
- Subtle particle drift in background (pollen/firefly effect)
- Tags sharing posts have intertwined root systems / spatial clustering

**Interaction:**
- Hovering a plant highlights it, reveals tooltip with clickable post titles
- Mobile fallback: styled flat list (canvas interactions are poor on touch)

**At current scale (2 tags, 1 post):** Two small shoots in open space. A line: *"Two seedlings so far."* Emptiness is part of the story.

**Future:** Time scrubber to watch the garden grow chronologically. Data model will carry post dates so filtering by time range is trivial to add later.

## 2. Page Transitions — Puff & Settle

Asymmetric transitions hooked into Quartz SPA navigation events (`nav` event).

**Leaving (puff):** ~200ms
- Opacity 1 → 0
- Scale 1.0 → 1.02 (slight expansion, like dispersing)
- Blur 0 → 2px
- Content dissipates like a puff of smoke

**Arriving (settle):** ~350ms
- Opacity 0 → 1
- TranslateY -8px → 0 (drifts down, settles onto desk)
- Ease-out timing
- No blur on entry

## 3. Cursor Ink Trail (Desktop Only)

3-4 small dots (2-3px) following the cursor with increasing delay. Each fades out over ~400ms. Color: `var(--secondary)` at 0.15 opacity. Uses `requestAnimationFrame`. Disabled on touch devices and when `prefers-reduced-motion` is set.

## 4. Ambient Grain Drift

Existing SVG grain texture gets a slow CSS animation on `background-position`. 20-second linear infinite loop, ~30px total movement. Barely perceptible — the page breathes.

## 5. Footnote Hover Connection

Hovering a superscript footnote number highlights the corresponding sidenote in the margin. Brief background flash: amber at 0.1 opacity, fades over 600ms. No pulsing — just a single "there it is" moment.

## 6. Random Page Experience (~2 seconds)

- Page loads showing centered italic line: *"Let me find you something..."*
- Text fades in over 300ms, holds ~1.2s
- Puff exit transition, then redirect to random post
- EB Garamond italic, vertically centered
- Quick and intentional, not utilitarian

## 7. "Permanently in Progress" Animation (About Page)

The italic line at the bottom of the about page gets staggered word-level opacity cycling. Each word on its own slow independent cycle (8-12 seconds per word, staggered). Opacity range: 0.6 to 1.0. Text that is itself unsettled, never quite still. Reinforces the meaning.

## 8. Colophon Expansion

On hover, footer expands to reveal a second line: total word count across all posts — *"11,847 words and counting."* Slides down with 300ms ease, slides back up on leave. Grows with the site, connects to the writing metaphor.

## 9. Weathered Note Cycling Pin

The pushpin icon on the weathered note cycles through a set of fastener icons daily: pushpin, paperclip, thumbtack, tape. Uses a hash of the current date so everyone sees the same one on the same day, but it changes daily. Rewards repeat visitors.
