# Delight Phase 2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tactile richness, structural depth, and signature moments to jackcutler.net — making the site feel alive, physical, and surprising.

**Architecture:** Nine features implemented as modifications to existing Quartz components and CSS, plus one new canvas-based TagGarden component. All interactive features use `afterDOMLoaded` inline scripts. SPA navigation hooks use Quartz's custom `prenav` and `nav` DOM events.

**Tech Stack:** Preact JSX (Quartz component system), SCSS, vanilla JS (afterDOMLoaded scripts), HTML5 Canvas API

---

### Task 1: Ambient Grain Drift

CSS-only change. Animate the existing page grain texture so it slowly shifts position.

**Files:**
- Modify: `quartz/styles/custom.scss` (the `body::after` grain block, ~lines 112-130)

**Step 1: Add the keyframe animation and apply it**

In `custom.scss`, find the `body::after` block that creates the grain texture. Add a `@keyframes grain-drift` animation and apply it.

Add this keyframe before the `body::after` block:
```scss
@keyframes grain-drift {
  0% { background-position: 0 0; }
  50% { background-position: 15px -15px; }
  100% { background-position: 0 0; }
}
```

Then add to the existing `body::after` rule:
```scss
animation: grain-drift 20s linear infinite;
```

**Step 2: Respect reduced motion**

Add inside a `@media (prefers-reduced-motion: reduce)` block:
```scss
body::after {
  animation: none;
}
```

**Step 3: Rebuild and verify**

Run: `pkill -f quartz; npx quartz build --serve`
Open http://localhost:8080. Stare at the page for 10+ seconds — the grain should shift imperceptibly slowly. If you can't tell it's moving, that's correct. Take a screenshot to confirm no visual breakage.

**Step 4: Commit**

```bash
git add quartz/styles/custom.scss
git commit -m "feat: add ambient grain drift animation"
```

---

### Task 2: Weathered Note Cycling Pin

Replace the static pushpin SVG with a daily-rotating set of fastener icons.

**Files:**
- Modify: `quartz/components/WeatheredNote.tsx`

**Step 1: Create the pin icon set and date-hash selector**

Replace the entire SVG inside `.weathered-note-pin` with a script-driven approach. The component should embed 4 SVG icons and use `afterDOMLoaded` to show only the one matching today's date.

Replace the full `WeatheredNote` component body. Keep the CSS unchanged. The JSX return becomes:

```tsx
return (
  <div class="weathered-note">
    <div class="weathered-note-pin" aria-hidden="true">
      {/* Pushpin - circle with center dot */}
      <svg class="pin-icon pin-pushpin" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.2" opacity="0.4" />
        <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.35" />
      </svg>
      {/* Paperclip */}
      <svg class="pin-icon pin-paperclip" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path d="M3 12V4a3 3 0 0 1 6 0v6a1.5 1.5 0 0 1-3 0V5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.4" />
      </svg>
      {/* Thumbtack */}
      <svg class="pin-icon pin-thumbtack" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <circle cx="6" cy="4" r="3" stroke="currentColor" stroke-width="1.1" opacity="0.4" />
        <line x1="6" y1="7" x2="6" y2="13" stroke="currentColor" stroke-width="1.1" opacity="0.35" stroke-linecap="round" />
      </svg>
      {/* Tape strip */}
      <svg class="pin-icon pin-tape" width="20" height="8" viewBox="0 0 20 8" fill="none">
        <rect x="0.5" y="1" width="19" height="6" rx="0.5" stroke="currentColor" stroke-width="0.8" opacity="0.25" fill="currentColor" fill-opacity="0.06" />
      </svg>
    </div>
    <div class="weathered-note-text">
      This is a place I'm building as I go. Everything here is subject
      to change, revision, and second-guessing. I write about whatever
      I cannot stop thinking about. You're welcome to look around.
    </div>
  </div>
)
```

**Step 2: Add afterDOMLoaded script to select today's pin**

Add to the component:
```typescript
WeatheredNote.afterDOMLoaded = `
  const pins = document.querySelectorAll('.pin-icon');
  if (pins.length === 0) return;
  // Hash today's date to pick a pin
  const today = new Date();
  const dayHash = today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate();
  const idx = dayHash % pins.length;
  pins.forEach((p, i) => {
    p.style.display = i === idx ? 'block' : 'none';
  });
`
```

**Step 3: Add CSS to hide all pins by default**

Add to the existing `WeatheredNote.css` string, after the `.weathered-note-pin` rules:
```css
.pin-icon {
  display: none;
}
```

**Step 4: Rebuild and verify**

Rebuild and screenshot the homepage. Verify one pin icon is showing. Change your system date forward one day and reload to confirm it cycles. Reset date.

**Step 5: Commit**

```bash
git add quartz/components/WeatheredNote.tsx
git commit -m "feat: cycling daily pin icon on weathered note"
```

---

### Task 3: Random Page Experience

Transform the instant redirect into a brief "Let me find you something..." moment.

**Files:**
- Modify: `quartz/components/RandomRedirect.tsx`

**Step 1: Redesign the component with delay**

Replace the entire component. Keep the same post-filtering logic. Change the UI to a centered message with a delayed redirect:

```tsx
const RandomRedirect: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  if (fileData.slug !== "random") return null

  const baseDir = pathToRoot(fileData.slug!)

  const posts = (allFiles ?? [])
    .filter(
      (f) =>
        f.slug &&
        f.slug !== "index" &&
        f.slug !== "about" &&
        f.slug !== "random" &&
        !String(f.slug).startsWith("tags/"),
    )
    .filter((f) => f.frontmatter?.title)
    .map((f) => `${baseDir}/${f.slug}`)

  const fallback = baseDir || "/"
  const postsJson = JSON.stringify(posts)

  return (
    <div class="random-redirect">
      <p class="random-message">Let me find you something...</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var posts = ${postsJson};
              var target = posts.length > 0
                ? posts[Math.floor(Math.random() * posts.length)]
                : "${fallback}";
              setTimeout(function() {
                window.location.replace(target);
              }, 1500);
            })();
          `,
        }}
      />
    </div>
  )
}

RandomRedirect.css = `
.random-redirect {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}
.random-message {
  font-family: "EB Garamond", Georgia, serif;
  font-style: italic;
  font-size: 1.15rem;
  color: var(--gray);
  opacity: 0;
  animation: random-fade-in 0.3s ease 0.1s forwards;
}
@keyframes random-fade-in {
  to { opacity: 1; }
}
`
```

**Step 2: Hide other page elements on the random page**

In `custom.scss`, add:
```scss
// Random page: minimal chrome
body[data-slug="random"] article.popover-hint,
body[data-slug="random"] .center > hr,
body[data-slug="random"] .newsletter-signup {
  display: none;
}
```

**Step 3: Rebuild and verify**

Navigate to http://localhost:8080/random. Verify: italic text fades in, holds briefly, then redirects after ~1.5 seconds. The total experience should feel like about 2 seconds.

**Step 4: Commit**

```bash
git add quartz/components/RandomRedirect.tsx quartz/styles/custom.scss
git commit -m "feat: random page shows brief message before redirect"
```

---

### Task 4: Page Transitions — Puff & Settle

Hook into Quartz SPA navigation events for asymmetric page transitions.

**Files:**
- Modify: `quartz/styles/custom.scss` (add transition CSS)

**Step 1: Add transition CSS classes**

In `custom.scss`, add a new section:
```scss
// ============================================================
// PAGE TRANSITIONS — Puff (exit) & Settle (enter)
// ============================================================

.center {
  // Base state for transitions
  transition: opacity 0.35s ease-out, transform 0.35s ease-out, filter 0.2s ease-out;
}

.center.puff-out {
  opacity: 0;
  transform: scale(1.02);
  filter: blur(2px);
  transition: opacity 0.2s ease-in, transform 0.2s ease-in, filter 0.2s ease-in;
}

.center.settle-in {
  animation: settle 0.35s ease-out forwards;
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .center.puff-out {
    filter: none;
    transform: none;
    transition: opacity 0.15s ease;
  }
  .center.settle-in {
    animation: none;
    opacity: 1;
  }
}
```

**Step 2: Add the navigation hook script**

Create a new component to handle transition logic. This is cleaner than inlining in custom.scss.

Create `quartz/components/PageTransitions.tsx`:
```tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const PageTransitions: QuartzComponent = () => {
  return null
}

PageTransitions.afterDOMLoaded = `
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('prenav', () => {
    const center = document.querySelector('.center');
    if (!center) return;
    center.classList.remove('settle-in');
    center.classList.add('puff-out');
  });

  document.addEventListener('nav', () => {
    const center = document.querySelector('.center');
    if (!center) return;
    center.classList.remove('puff-out');
    // Force reflow so the animation restarts
    void center.offsetWidth;
    center.classList.add('settle-in');
    // Clean up class after animation
    setTimeout(() => {
      center.classList.remove('settle-in');
    }, 400);
  });
`

export default (() => PageTransitions) satisfies QuartzComponentConstructor
```

**Step 3: Register the component**

In `quartz/components/index.ts`, add:
```typescript
import PageTransitions from "./PageTransitions"
```
And add `PageTransitions,` to the exports.

In `quartz.layout.ts`, add `Component.PageTransitions()` to `beforeBody` in `defaultContentPageLayout` (after ReadingProgress). Also add it to `defaultListPageLayout.beforeBody`.

**Step 4: Rebuild and verify**

Navigate between pages. Verify: clicking a link causes a brief blur+scale+fade-out, then the new page fades in with a downward settle. The whole thing should feel like ~500ms total.

**Step 5: Commit**

```bash
git add quartz/components/PageTransitions.tsx quartz/components/index.ts quartz.layout.ts quartz/styles/custom.scss
git commit -m "feat: puff & settle page transitions on SPA navigation"
```

---

### Task 5: Cursor Ink Trail

A faint trail of dots following the cursor on desktop.

**Files:**
- Create: `quartz/components/CursorTrail.tsx`
- Modify: `quartz/components/index.ts`
- Modify: `quartz.layout.ts`

**Step 1: Create the CursorTrail component**

```tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const CursorTrail: QuartzComponent = () => {
  return null
}

CursorTrail.afterDOMLoaded = `
  // Skip on touch devices or reduced motion
  if ('ontouchstart' in window) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const NUM_DOTS = 4;
  const FADE_MS = 400;
  const dots = [];
  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let mouseX = -100, mouseY = -100;
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dots.push({ x: mouseX, y: mouseY, born: performance.now() });
    if (dots.length > 30) dots.splice(0, dots.length - 30);
  });

  // Get secondary color from CSS variable
  function getColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#c47a45';
  }

  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = getColor();
    for (let i = dots.length - 1; i >= 0; i--) {
      const dot = dots[i];
      const age = now - dot.born;
      if (age > FADE_MS) {
        dots.splice(i, 1);
        continue;
      }
      const alpha = 0.15 * (1 - age / FADE_MS);
      const radius = 1.5 * (1 - age / FADE_MS * 0.5);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  window.addCleanup?.(() => {
    canvas.remove();
  });
`

export default (() => CursorTrail) satisfies QuartzComponentConstructor
```

**Step 2: Register component**

Add to `index.ts` imports and exports: `CursorTrail`
Add to `quartz.layout.ts` in `defaultContentPageLayout.beforeBody` and `defaultListPageLayout.beforeBody`.

**Step 3: Rebuild and verify**

Move cursor around the page. Verify: faint dots trail behind cursor, fading quickly. They should be subtle — visible if you look for them, invisible if you don't. Test that they don't appear on mobile.

**Step 4: Commit**

```bash
git add quartz/components/CursorTrail.tsx quartz/components/index.ts quartz.layout.ts
git commit -m "feat: subtle cursor ink trail on desktop"
```

---

### Task 6: Footnote Hover Connection

Highlight sidenotes when hovering their reference numbers.

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Add the highlight CSS**

In `custom.scss`, add:
```scss
// ============================================================
// FOOTNOTE HOVER CONNECTION
// ============================================================

.sidenote-highlight {
  background-color: rgba(196, 122, 69, 0.1);
  transition: background-color 0.6s ease;
  border-radius: 2px;
}

[saved-theme="dark"] .sidenote-highlight {
  background-color: rgba(196, 122, 69, 0.12);
}
```

**Step 2: Add the interaction script**

Create `quartz/components/FootnoteLink.tsx`:
```tsx
import { QuartzComponent, QuartzComponentConstructor } from "./types"

const FootnoteLink: QuartzComponent = () => {
  return null
}

FootnoteLink.afterDOMLoaded = `
  document.querySelectorAll('a[href^="#user-content-fn-"]').forEach(function(link) {
    var fnId = link.getAttribute('href').replace('#user-content-fn-', '');
    var sidenote = document.querySelector('.sidenote[data-fn="' + fnId + '"]');
    // Also try the footnote li itself
    var footnoteLi = document.getElementById('user-content-fn-' + fnId);

    link.addEventListener('mouseenter', function() {
      if (sidenote) sidenote.classList.add('sidenote-highlight');
      if (footnoteLi) footnoteLi.classList.add('sidenote-highlight');
    });
    link.addEventListener('mouseleave', function() {
      if (sidenote) sidenote.classList.remove('sidenote-highlight');
      if (footnoteLi) footnoteLi.classList.remove('sidenote-highlight');
    });
  });
`

export default (() => FootnoteLink) satisfies QuartzComponentConstructor
```

**Step 3: Register component**

Add `FootnoteLink` to `index.ts` and to `defaultContentPageLayout.beforeBody` in `quartz.layout.ts`.

**Step 4: Rebuild and verify**

On the armadillos post, hover over the superscript ¹. The corresponding sidenote in the margin (or footnote at bottom) should get a brief amber background highlight.

**Step 5: Commit**

```bash
git add quartz/components/FootnoteLink.tsx quartz/components/index.ts quartz.layout.ts quartz/styles/custom.scss
git commit -m "feat: footnote hover highlights corresponding sidenote"
```

---

### Task 7: "Permanently in Progress" Animation

Staggered word-level opacity animation on the about page.

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Add the CSS and JS**

The target text is `<em>This page is permanently in progress.</em>` in the about page markdown. We need JS to wrap each word in a span and CSS to animate them.

Create `quartz/components/InProgressAnimation.tsx`:
```tsx
import { QuartzComponent, QuartzComponentConstructor } from "./types"

const InProgressAnimation: QuartzComponent = () => {
  return null
}

InProgressAnimation.afterDOMLoaded = `
  if (document.body.getAttribute('data-slug') !== 'about') return;

  // Find the "permanently in progress" em element
  var emElements = document.querySelectorAll('article em');
  var target = null;
  for (var i = 0; i < emElements.length; i++) {
    if (emElements[i].textContent.indexOf('permanently in progress') !== -1) {
      target = emElements[i];
      break;
    }
  }
  if (!target) return;

  var words = target.textContent.split(' ');
  target.innerHTML = '';
  target.classList.add('in-progress-text');
  words.forEach(function(word, idx) {
    var span = document.createElement('span');
    span.textContent = word + ' ';
    span.className = 'in-progress-word';
    span.style.animationDelay = (idx * 1.6) + 's';
    target.appendChild(span);
  });
`

InProgressAnimation.css = `
.in-progress-text {
  display: inline;
}

.in-progress-word {
  display: inline;
  animation: word-breathe 10s ease-in-out infinite;
}

@keyframes word-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .in-progress-word {
    animation: none;
    opacity: 1;
  }
}
`

export default (() => InProgressAnimation) satisfies QuartzComponentConstructor
```

**Step 2: Register component**

Add `InProgressAnimation` to `index.ts` and to `defaultContentPageLayout.beforeBody` in `quartz.layout.ts`.

**Step 3: Rebuild and verify**

Navigate to the about page, scroll to the bottom. The italic line should have each word gently cycling through opacity at different rates. The effect should feel like the text is breathing, unsettled, never quite still.

**Step 4: Commit**

```bash
git add quartz/components/InProgressAnimation.tsx quartz/components/index.ts quartz.layout.ts
git commit -m "feat: staggered breathing animation on 'permanently in progress'"
```

---

### Task 8: Colophon Expansion

Footer reveals word count on hover.

**Files:**
- Modify: `quartz/components/Footer.tsx`
- Modify: `quartz/components/styles/footer.scss`

**Step 1: Modify the Footer component**

The Footer needs access to `allFiles` to compute total word count. Update the component:

```tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, allFiles }: QuartzComponentProps) => {
    // Count total words across all posts
    const totalWords = (allFiles ?? [])
      .filter(
        (f) =>
          f.slug &&
          f.slug !== "index" &&
          f.slug !== "about" &&
          f.slug !== "random" &&
          !String(f.slug).startsWith("tags/"),
      )
      .reduce((sum, f) => {
        const text = f.description ?? ""
        return sum + text.split(/\s+/).filter(Boolean).length
      }, 0)

    // Round to nearest 100 for a nicer display if > 500
    const displayCount = totalWords > 500
      ? Math.round(totalWords / 100) * 100
      : totalWords

    const wordLabel = totalWords > 500
      ? `~${displayCount.toLocaleString()} words and counting.`
      : `${totalWords.toLocaleString()} words and counting.`

    return (
      <footer class={`${displayClass ?? ""}`}>
        <div class="colophon">
          <p class="colophon-main">Built by hand. Set in EB Garamond &amp; IBM Plex Mono.</p>
          <p class="colophon-detail">{wordLabel}</p>
        </div>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
```

**Step 2: Update footer.scss for the expansion animation**

```scss
footer {
  text-align: left;
  margin-bottom: 4rem;
  opacity: 0.7;

  & ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: row;
    gap: 1rem;
    margin-top: -1rem;
  }
}

.colophon-detail {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  margin: 0;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  color: var(--gray);
  transition: max-height 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease;
}

.colophon:hover .colophon-detail {
  max-height: 2rem;
  opacity: 1;
  margin-top: 0.3rem;
}
```

**Step 3: Rebuild and verify**

Hover over the footer text. The word count line should slide down smoothly beneath it. Move away and it slides back up.

**Step 4: Commit**

```bash
git add quartz/components/Footer.tsx quartz/components/styles/footer.scss
git commit -m "feat: colophon reveals word count on hover"
```

---

### Task 9: Tags Page — The Garden

The most complex feature. A canvas-based visualization replacing the default Quartz tag listing on the `/tags` index page.

**Files:**
- Create: `quartz/components/TagGarden.tsx` (new component)
- Modify: `quartz/components/index.ts`
- Modify: `quartz.layout.ts`
- Modify: `quartz/styles/custom.scss`

**Step 1: Create the TagGarden component**

This is a large component. It renders a `<canvas>` element and draws organic plant forms using the Canvas API. The component receives tag/post data at build time and embeds it as JSON for the client-side script.

Create `quartz/components/TagGarden.tsx`:

The component should:
1. Only render on the `/tags` page (slug check)
2. Extract all tags and their associated posts (with dates, titles, slugs)
3. Embed the data as a JSON script tag
4. Render a full-bleed canvas container with dark background
5. Use `afterDOMLoaded` to:
   - Parse the embedded data
   - Position each tag as a "plant" using deterministic seeded random placement
   - Draw stems (thin white/cream lines growing upward)
   - Draw buds (small colored dots at stem tips, one per post)
   - Animate subtle particle drift
   - Handle hover interactions (highlight plant, show tooltip with post links)
6. Show a seedling count label: *"N seedlings so far."*
7. On mobile (<768px), fall back to a styled flat list

The garden canvas should use colors from the site's warm palette:
- Background: `#141822` (always dark)
- Stems: `rgba(232, 228, 220, 0.3)` (cream, semi-transparent)
- Buds: cycle through `#c47a45`, `#8a7e6b`, `#5a8a5a`, `#6b7e8a` (rust, sage, green, slate)
- Particles: `rgba(232, 228, 220, 0.08)`
- Labels: `rgba(232, 228, 220, 0.6)`, IBM Plex Mono

Implement the component with the full canvas drawing logic, tooltip system, hover detection, and mobile fallback. The plant growth algorithm should use a simple L-system approach:
- Main stem: vertical line from bottom, height proportional to post count
- Branches: short angled lines at each post position along the stem
- Buds: 3-4px circles at branch tips
- Slight random wobble on stem angles (seeded by tag name hash)

**Step 2: Register component**

Add `TagGarden` to `index.ts` exports.

In `quartz.layout.ts`, add `Component.TagGarden()` to `defaultListPageLayout.beforeBody`.

**Step 3: Add supporting CSS in custom.scss**

```scss
// ============================================================
// TAG GARDEN — Full-bleed dark canvas
// ============================================================

body[data-slug="tags"] {
  // Hide the default tag content on the main tags index
  .page > #quartz-body > .center > .tag-cloud,
  .page > #quartz-body > .center > article {
    // Don't hide these if TagGarden falls back to flat list on mobile
  }
}

.tag-garden-container {
  position: relative;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  background: #141822;
  min-height: 500px;
  border-radius: 0;
}

.tag-garden-canvas {
  display: block;
  width: 100%;
  height: 500px;
  cursor: crosshair;
}

.tag-garden-count {
  position: absolute;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: "EB Garamond", Georgia, serif;
  font-style: italic;
  font-size: 0.9rem;
  color: rgba(232, 228, 220, 0.4);
}

.tag-garden-tooltip {
  position: absolute;
  background: rgba(30, 36, 51, 0.95);
  border: 1px solid rgba(232, 228, 220, 0.1);
  border-radius: 4px;
  padding: 0.6rem 0.8rem;
  pointer-events: auto;
  z-index: 10;
  max-width: 220px;
}

.tag-garden-tooltip-title {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.7rem;
  color: rgba(232, 228, 220, 0.6);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tag-garden-tooltip a {
  display: block;
  font-family: "EB Garamond", Georgia, serif;
  font-size: 0.85rem;
  color: #e8e4dd;
  text-decoration: none;
  padding: 0.15rem 0;
  border-bottom: 1px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.tag-garden-tooltip a:hover {
  color: #c47a45;
  border-bottom-color: #c47a45;
}

// Mobile fallback
.tag-garden-mobile {
  display: none;
  padding: 2rem 0;
}

@media (max-width: 768px) {
  .tag-garden-canvas {
    display: none;
  }
  .tag-garden-mobile {
    display: block;
  }
  .tag-garden-count {
    position: static;
    transform: none;
    text-align: center;
    margin-bottom: 1.5rem;
  }
}
```

**Step 4: Hide default tag content when garden is active**

In `custom.scss`, ensure the default Quartz TagContent rendering is hidden on the `/tags` index page (but NOT on individual tag pages like `/tags/animals`):

```scss
body[data-slug="tags"] .tag-cloud {
  display: none;
}
```

Note: Individual tag pages (`/tags/animals`) should still use the default listing.

**Step 5: Rebuild and verify**

Navigate to http://localhost:8080/tags. Verify:
- Dark background canvas fills the width
- Two small plant stems visible with buds
- "2 seedlings so far." text at top
- Hovering a plant shows a tooltip with "On Armadillos" link
- Clicking the link navigates to the post
- Resize to mobile: canvas hides, flat list shows

**Step 6: Commit**

```bash
git add quartz/components/TagGarden.tsx quartz/components/index.ts quartz.layout.ts quartz/styles/custom.scss
git commit -m "feat: tag garden canvas visualization on tags page"
```

---

### Task 10: Final Integration & Visual Review

**Step 1: Full rebuild**

```bash
pkill -f quartz; npx quartz build --serve
```

**Step 2: Visual review checklist**

Screenshot and verify each page in both light and dark mode:
- [ ] Homepage: grain drifts, pin icon shows, post hover effects work
- [ ] Post page: reading progress bar, footnote hover connection, drop cap
- [ ] About page: "permanently in progress" animation breathing
- [ ] Tags page: garden canvas renders, hover tooltips work
- [ ] Random page: "Let me find you something..." then redirect
- [ ] 404 page: clean, no breakage
- [ ] Page transitions: navigate between pages, verify puff & settle
- [ ] Cursor trail: move mouse on desktop, verify subtle dots
- [ ] Footer: hover colophon, verify word count slides in
- [ ] Mobile (375x812): all pages render correctly

**Step 3: Final commit**

If any fixes are needed, commit them. Then:
```bash
git add -A
git commit -m "chore: delight phase 2 — final polish pass"
```
