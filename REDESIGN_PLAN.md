# REDESIGN PLAN: jackcutler.net

## 1. Architecture Overview

```
quartz.config.ts          Site identity, fonts, colors, plugins
quartz.layout.ts          Page composition — which components render where
                          (content pages vs list pages vs special pages)

quartz/styles/
  variables.scss          Breakpoints ($phone: 640, $mobile: 800, $desktop: 1200)
  base.scss               Quartz grid skeleton, link defaults, code blocks
  custom.scss             THE FILE. 1533 lines. All tokens, all overrides,
                          all page-specific styles. The real stylesheet.

quartz/components/
  CustomHeader.tsx         Nav bar + coordinate label
  WeatheredNote.tsx        Homepage torn-paper note with daily text + pin variants
  PostIndex.tsx            Homepage book-shelf grid (3-col, cover images)
  Archive.tsx              1094 lines. Dual-view catalogue + timeline. Search.
  TagGarden.tsx            570 lines. Canvas-based botanical visualization
  Frontispiece.tsx         Generative SVG margin ornaments (5 pattern families)
  Footer.tsx               Colophon card (provenance, typefaces, word count)
  NewsletterSignup.tsx     "Field Dispatch" placeholder card (NO functional form)
  RandomRedirect.tsx       Compass rose animation + redirect
  PageTransitions.tsx      SPA animations, parallax, seasonal palette, easter egg
  CursorTrail.tsx          Canvas dot trail on desktop
  ReadingProgress.tsx      Scroll tracking → margin vine fill
  InProgressAnimation.tsx  "permanently in progress" word breathing
  StatusDot.tsx            Post status indicator (amber/green dot)
  pages/404.tsx            "Terra Incognita" error page with compass

quartz/util/
  hash.ts                 Deterministic title → integer hash for seeded art

content/
  index.md                Empty (components handle rendering)
  about.md                Structured categories, mostly unfilled
  archive.md              Empty (component handles rendering)
  random.md               Empty (component handles rendering)
  posts/ (14 essays)      "On [Subject]" format. Natural history + philosophy.
                          Cover images sourced from public domain illustrations.

scripts/
  validate-tokens.sh      Checks var(--) references against :root definitions

docs/
  plans/                  8 design documents from phases 1-4
  TODOS.md                5 deferred tech debt items
  screenshots/            Empty baseline directory
```

**Data flow:** Quartz reads markdown from `content/`, processes through plugins (syntax highlighting, footnotes, OG images, RSS), and renders pages using the component tree defined in `quartz.layout.ts`. Components use Preact JSX for server-side rendering and `.afterDOMLoaded` script strings for client-side interactivity. Styles come from SCSS files (compiled at build) plus CSS string properties on components (inlined). SPA navigation via micromorph fires `prenav`/`nav` events that components listen to.

**What depends on what:** `custom.scss` is the spine — everything references its tokens. `PostIndex.tsx` and `Archive.tsx` both import `hashTitle` from the shared util. `PageTransitions.tsx` sets CSS custom properties (`--topo-y`, `--margin-shift`, `data-season`) that other styles consume. The TagGarden reads from a JSON script tag embedded by the component's server render. Footer reads all file metadata at build time for word count.

---

## 2. Design Critique

### Where this site is boring

**The homepage doesn't arrest you.** You land and see: a nav bar, a small tilted note, a grid of book covers. It's pleasant. It's also what every personal site looks like if you replaced "blog cards" with "book covers." The weathered note is charming but small — it occupies maybe 15% of the viewport. The real content (the shelf) starts below the fold on most screens. There's no moment where the page grabs you by the collar and says "look at this."

**The layout is a tube.** 780px centered column, top to bottom, every page. The reading experience is fine — the measure is correct, the line height is good — but the site never breaks free. No element bleeds to the edge. No image runs full-width. No pull quote escapes the column. No asymmetry. No surprise. Every page is a vertical scroll through a narrow pipe. This is the single biggest thing making the site feel "like a website" instead of "like a place."

**Scroll is passive.** You scroll, content exists, you keep scrolling. Nothing reveals. Nothing transforms. Nothing sticks. The parallax (0.12x background drift) is so subtle it's invisible without comparison. The margin vine fills as you scroll, but only on desktop wide screens — most visitors never see it. The page transitions are nice but they're entrance/exit only — there's no mid-page choreography.

**Every post looks identical.** Same drop cap. Same spacing. Same rhythm. Same density. An essay about tides and an essay about typewriters have zero visual differentiation. The covers are different, but once you're inside a post, you're in a uniform container. There are no pull quotes, no full-bleed images, no oversized numbers, no moments where the typography responds to the content.

**Interactive feedback is turned to 2/10.** The cursor trail is 0.15 opacity — essentially invisible. Archive ruled lines appear at 0.35 opacity. The frontispiece is 0.5 opacity at 60px wide — you have to hunt for it. The topo hover overlay on shelf covers is 0.15 opacity. Every interesting interaction is hidden behind a whisper. The site is polite to the point of invisibility.

**The color palette is safe.** Rust (#a0522d) is sienna — it's in the CSS named colors list. It's warm and appropriate but it's the exact color that "warm personal site" defaults to. There's no surprise, no edge, no color that makes you pause. The seasonal shifts are clever but invisible (10-degree hue rotations that nobody will notice).

**The footer is a footnote.** The colophon card is lovely — ruled lines, specimen labels, word count. But it's 320px wide, centered, floating in whitespace. The bottom of the page should be a destination, not an afterthought. When you reach the end of a great magazine, the back cover matters.

### Where this site is actually excellent

**The metaphor is genuinely original.** "Field Station / Naturalist's Notebook" isn't something I've seen on any other personal site. It's threaded consistently through vocabulary (catalogue, specimen, accession, survey, coordinates, terra incognita), through interactions (compass rose, margin vine, tag garden, daily pins), and through visual treatment (torn paper, ruled lines, specimen labels). This is the site's strongest asset and must be preserved.

**The TagGarden is exceptional.** A canvas-based botanical visualization with seeded RNG, deterministic plant layouts, particle drift, and theme-aware color systems. This is the kind of component that makes other developers ask "how did they do that?" It should be more prominent.

**The writing is outstanding.** "A bridge is an argument against gravity." "Every map is a lie agreed upon." "Fermentation is controlled decay." These opening lines are punchy, aphoristic, and memorable. The voice is confident without arrogance — a naturalist who finds the extraordinary in the ordinary. The writing deserves a presentation layer that matches its quality.

**Dark mode is genuinely designed.** Blue-black (#141822) instead of charcoal. Warm text instead of white. Different accent tones. Different shadow depths. This isn't auto-inversion — someone made choices. This should be preserved and deepened.

**Accessibility is real.** Skip link, focus-visible styles, reduced-motion fallbacks on every animation, ARIA labels on canvas elements, semantic HTML. This isn't checkbox accessibility — it's considered. Must be maintained throughout.

**The daily variant system is delightful.** Seven note texts, four pin icons, seasonal palettes — all deterministic per day. Return visitors get a different page without any user state. This is the kind of detail that separates craft from templates.

### Where the design has opportunities nobody has taken

1. **The torn-paper edge could be the site's signature.** Currently only on the WeatheredNote. What if section dividers, card edges, image frames all used variations of the torn edge? It would create a tactile paper-craft feeling throughout.

2. **The margin is wasted territory.** On wide screens, there's 200+px of margin on each side. Currently: one thin vine and some barely-visible tick marks. This could be annotation space — ghost text, decorative specimens, section numbers, pull quotes that escape the column.

3. **The book-shelf metaphor could go further.** The homepage shows "books on a shelf" but they sit in a flat grid. What if the shelf had actual depth — a slight perspective transform, shadow beneath, a visible shelf edge? What if pulling a book (clicking) animated the book sliding out?

4. **Scroll could tell a story.** The about page has a structured biography (obsessions, influences, beliefs, questions, fears). Each section could enter the viewport differently — fears from below, beliefs from the left, influences fading in from ghost text to solid.

5. **The 404 page is already great but could be memorable.** "Terra Incognita" with a compass rose is good. But what if the entire page was a map — topographic lines, a "you are here" pin, and the compass needle actually pointed toward the homepage?

---

## 3. The Vision

When someone lands on jackcutler.net, they should feel like they've walked into a private study — the kind of room where old maps cover the walls, glass specimen jars line the shelves, and a notebook lies open on the desk, mid-sentence. The first thing they notice is that this place has texture. Not flat-design texture — real texture. Paper grain they can almost feel. Ink that looks wet. Shadows that suggest lamplight. The typography should feel like it was set by hand, letter by letter, in a foundry attached to the room.

The second thing they notice is that the room is alive. Something moves — not urgently, but with the patient rhythm of a naturalist's day. A note sways on its pin. The topographic lines drift almost imperceptibly. A dot traces the cursor like an ink drop following a pen. And when they click to read an essay, the page doesn't just appear — it slides out like a specimen drawer, the previous view receding into the desk. The reading experience should be the best they've ever had on the web: perfect measure, perfect rhythm, with moments of surprise — a pull quote that breaks the column, an image that bleeds to the edge, a decorative annotation ghosting in the margin.

The third thing — and this is what makes them bookmark it, share it, come back — is that the site rewards attention. The person who glances at the homepage sees a nice personal site. The person who stays ten minutes discovers the tag garden, the compass on /random, the daily variant text, the accession numbers, the seasonal palette shift, the console easter egg. There are layers. The site should feel like it was made by someone who cares about things most people don't even notice — and that caring should be visible at every level, from the pixel spacing to the footnote markers to the way the page says goodbye when you leave.

---

## 4. Change Manifest

### Phase 2: Typography & Rhythm

**custom.scss — Modular type scale**
Replace ad-hoc font sizes with a proper minor third (1.2) scale anchored at 1.15rem body. Current sizes are close but not mathematically derived. This gives: 0.56, 0.67, 0.8, 0.96, 1.15, 1.38, 1.66, 1.99, 2.39rem. Map existing tokens to nearest scale values.

**custom.scss — `text-wrap: balance` on all headings**
h1-h4 should use `text-wrap: balance` to prevent orphaned words on short headings. CSS-only, zero risk.

**custom.scss — Blockquote elevation**
Current blockquotes are body-size with a left border. Elevate them: larger font (1.38rem), italicized, wider left margin (2rem), with the border becoming a decorative vertical rule. They should feel like a voice change in the text.

**custom.scss — Pull quote class**
Add `.pull-quote` styling: break out of the 65ch column, center at full 780px width, 2.39rem size, centered, with subtle quotation marks as pseudo-elements. This gives posts a tool for creating typographic drama.

**custom.scss — Improved paragraph spacing**
First paragraph after headings should have zero top margin (tight coupling). Subsequent paragraphs should have 1.5em spacing (current is fine). But add a specific rule: first paragraph after a full-bleed image gets extra top margin (visual breathing room).

**custom.scss — Footnote marker styling**
Footnote superscripts are currently default browser sizing. Style them explicitly: smaller (0.75em), slightly bolder, accent color, with a subtle hover effect (background highlight).

**base.scss — Proper em dashes**
Add `hyphens: auto` on body text for better line breaks. Ensure `font-variant-numeric: oldstyle-nums` is applied globally (it's currently in the config but verify it's rendering).

### Phase 3: Color, Light & Texture

**custom.scss — Push accent saturation**
Change primary accent from `#a0522d` (sienna) to `#8b3a1f` — deeper, more saturated, more authority. This is still warm but has more presence. Adjust tertiary to `#c47040`. Test all states in both themes.

**custom.scss — Paper texture upgrade**
The existing grain is at 0.025 opacity — invisible to most. Push to 0.045 in light mode, 0.06 in dark mode. Add a second grain layer with different frequency for more organic feel.

**custom.scss — Topographic background as design feature**
Currently at 0.04 opacity with a heavy mask. Increase to 0.07 opacity and adjust the mask to let topo lines be visible across more of the page — not just margins. The contour lines should be part of the experience, not hidden.

**custom.scss — Shadow system enrichment**
Current shadows are grayscale. Add subtle warm tint: `rgba(140, 100, 60, 0.06)` base in light mode. Shadows should feel like lamplight, not fluorescent overhead. In dark mode, use cooler tint: `rgba(20, 30, 50, 0.35)`.

**custom.scss — Selection color**
Current amber selection is good but could be bolder. Push from `rgba(196,122,69,0.2)` to `rgba(180,100,40,0.25)` — more visible, more intentional.

**custom.scss — Dark mode depth**
Dark mode background is `#141822` — good. Add a very subtle warm gradient overlay: `radial-gradient(ellipse at 50% 0%, rgba(140,100,60,0.03) 0%, transparent 70%)`. This simulates desk-lamp light falling on the dark page. Barely visible but felt.

### Phase 4: Layout & Spatial Design

**custom.scss — Full-bleed images**
Add a `.full-bleed` class that breaks out of the 65ch column to the full 780px container width. Also add `.full-bleed-edge` that extends to viewport edge with negative margins. Posts should be able to include images that escape the text column.

**custom.scss — Pull quote column break**
`.pull-quote` elements should have `margin-left: -2rem; margin-right: -2rem; padding: 2rem` to break out of the text column while remaining within the page container. Oversized italic serif text.

**custom.scss — Homepage hero redesign**
The weathered note should be larger. Currently `max-width: 48ch` — expand to `56ch`. Increase font size from `--text-base` (0.95rem) to `--text-body` (1.15rem). The note is the first thing visitors see; it should command more of the viewport.

**custom.scss — Footer as full-width band**
The colophon card is currently 320px centered. Instead: make the footer a full-width section with the colophon content arranged in a horizontal layout at wider screens. Add the topographic SVG as a footer background (visible this time, 0.06 opacity). This makes the footer feel like the bottom of the desk — a surface, not a floating card.

**custom.scss — Archive entry density**
Archive entries have generous padding. Tighten the vertical rhythm: reduce `--space-s` gap between entries, increase the hover expansion. Entries should feel stacked like cards in a catalog drawer — tight at rest, spreading when you touch them.

**PostIndex.tsx — Shelf perspective**
Add a subtle `perspective` transform to the shelf container and a slight `rotateX` on each item. Books should feel like they're sitting on a real shelf with minimal 3D depth. CSS only, no JS. 2-3 degrees maximum — felt, not seen.

### Phase 5: Motion & Interaction

**custom.scss — Scroll-triggered entry animations**
Add `@keyframes content-enter` with `opacity: 0; transform: translateY(20px)` → `opacity: 1; transform: translateY(0)`. Apply to major sections (`.post-shelf`, `.archive-section`, `.tag-garden-wrap`) using `animation-timeline: view()` where supported, with IntersectionObserver fallback in a new script.

**PageTransitions.tsx — Richer page transitions**
The current puff-out/settle-in is good. Enhance: post pages should slide in from the right (already partially implemented as "specimen slide"). Add `scale(0.98)` to the exit animation for more physicality.

**CursorTrail.tsx — Increase visibility**
Push dot opacity from 0.15 to 0.22. Increase dot radius from 1.5px to 2px. The trail should be visible without squinting. Also: add a very subtle connecting line between recent dots (1px, 0.08 opacity) — the trail of a pen, not disconnected drops.

**custom.scss — Link hover enrichment**
Current ink-well link is good but the reveal is slow. Speed up the underline draw from 0.4s to 0.25s. Add a slight `translateY(-1px)` on hover — links should lift microscopically, as if the ink is still wet and the paper buckled.

**PostIndex.tsx — Book pull interaction**
When hovering a shelf item, instead of just `-3px translateY`, add a `rotateY(-2deg)` — the book tilts toward you as if being pulled from the shelf. Combine with the existing topo overlay fade-in.

**custom.scss — Sticky header transform**
On scroll past 100px, the header should condense: reduce padding, shrink the title slightly, fade in a bottom border. The header transforms from "entrance" to "wayfinding" as you read. Use `position: sticky` + scroll-driven styles via a small afterDOMLoaded script.

**PageTransitions.tsx — Easter eggs (3 hidden)**
1. **Konami code** (up up down down left right left right B A): Triggers the topographic background to briefly pulse to full opacity and then fade back.
2. **Triple-click the site title**: The coordinate label cycles through all values rapidly, then settles.
3. **Scroll to the very bottom and wait 3 seconds**: A faint message appears below the footer: "You've reached the bottom of the drawer."

### Phase 6: Content Presentation

**custom.scss — Drop cap enhancement**
Current drop cap is 3.8em. Push to 4.2em. Add accent color (secondary) instead of default text color. Add a very subtle text-shadow. The first letter should feel illuminated, like a medieval manuscript.

**custom.scss — Image figure treatment**
Wrap all post images in `figure` with `figcaption` support. Images should have a subtle border (1px lightgray), slight border-radius (2px), and on hover: a very faint shadow expansion + the topo overlay (reusing the shelf hover pattern). Captions should be centered, small monospace, muted color.

**custom.scss — List marker styling**
Unordered lists in posts should use `list-style: none` with custom `::marker` — a small circle (current em-dash on about page is fine, but regular posts should use a filled dot matching the accent color). Ordered lists should have large, styled numbers (accent color, slightly oversized).

**custom.scss — Horizontal rule as section break**
Current `hr` is a thin line. Replace with a centered ornament — reuse the fleuron (&#10087;) or a small topo contour snippet. Section breaks should feel intentional, not default.

**custom.scss — Code block character**
If code blocks appear (they don't in current content, but the system should be ready): custom syntax theme matching the palette (warm background, no harsh colors), rounded corners matching `--radius-md`, subtle left border in accent color. Language indicator as a small monospace label.

### Phase 7: The Invisible Layer

**custom.scss — Print stylesheet**
Add `@media print` rules: hide nav, hide floating buttons, hide cursor trail, hide footer links. Show only article content with proper margins. Use `@page` to set margins. This is a 20-line addition that signals extreme care.

**custom.scss — Focus rings as design**
Current focus-visible uses a 2px amber outline. Good. Enhance: add a subtle background-color shift on focused elements (`rgba(var(--secondary), 0.06)`) so focus feels warm, not clinical.

**custom.scss — Reduced motion deep audit**
Verify every `@keyframes`, every `transition`, every `animation` has a `prefers-reduced-motion: reduce` counterpart. Current coverage is good but verify after all Phase 5 additions.

**base.scss — Semantic HTML audit**
Ensure all component output uses `<article>`, `<nav>`, `<header>`, `<footer>`, `<figure>`, `<figcaption>`, `<time>`, `<aside>` appropriately. Current usage is mostly good but verify.

**Performance — Image optimization**
All cover images in `/static/covers/` should be served as WebP where possible. Add `loading="lazy"` to all below-fold images (mostly done). Add `decoding="async"` to all images.

**Performance — Font preloading**
Ensure EB Garamond and IBM Plex Mono are preloaded via `<link rel="preload">` in the head. Currently handled by Quartz's font config but verify the actual HTML output.

### Phase 8: Final Pass

After all phases: build, serve, and check every page at 375px, 768px, 1024px, 1440px in both themes. Tab through every page. Run Lighthouse. Check with color blindness simulator. Take baseline screenshots for `docs/screenshots/`.

Write `REDESIGN_CHANGELOG.md` documenting every change.

---

## Priority Sequence

1. Typography scale + text-wrap: balance (low risk, high impact)
2. Color saturation push + shadow warmth (low risk, medium impact)
3. Full-bleed image support + pull quotes (medium risk, high impact)
4. Homepage hero size increase (low risk, medium impact)
5. Scroll-triggered entry animations (medium risk, high impact)
6. Drop cap enhancement + image figures (low risk, medium impact)
7. Footer full-width redesign (medium risk, medium impact)
8. Cursor trail visibility + link hover enrichment (low risk, low-medium impact)
9. Book pull interaction on shelf (low risk, medium impact)
10. Easter eggs (low risk, pure delight)
11. Print stylesheet + focus ring enhancement (low risk, low impact but signals care)
12. Final pass + screenshots + changelog
