# jackcutler.net Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and deploy jackcutler.net — a deeply hand-crafted personal writing site on Quartz v4 with warm analog typography, a Gwern-style index, living documents, and a weathered "pinned note" homepage.

**Architecture:** Quartz v4 static site generator with a heavily customized visual theme and components. Content lives in `content/` (served as the Obsidian vault). Git push to main triggers Netlify auto-deploy. All customization lives in `quartz/styles/custom.scss` and `quartz/components/`.

**Tech Stack:** Quartz v4, TypeScript/Preact, SCSS, Netlify, Buttondown, EB Garamond + IBM Plex Mono (Google Fonts)

---

### Task 1: Bootstrap Quartz v4

**Files:**
- Scaffold: all Quartz v4 files into project root
- Preserve: `docs/`

**Step 1: Download Quartz v4 into the project**
```bash
cd "/Users/jack/projects/Personal Website"
curl -L https://github.com/jackyzha0/quartz/archive/refs/heads/v4.zip -o /tmp/quartz.zip
unzip -q /tmp/quartz.zip -d /tmp/
rsync -av --exclude='.git' --exclude='docs' /tmp/quartz-v4/ .
rm /tmp/quartz.zip
```

**Step 2: Install dependencies**
```bash
npm install
```

**Step 3: Start dev server and verify**
```bash
npx quartz build --serve
```
Open http://localhost:8080. Expected: Quartz default site running.

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: add Quartz v4 scaffold"
```

---

### Task 2: Configure Site Settings

**Files:**
- Modify: `quartz.config.ts`

**Step 1: Update quartz.config.ts configuration object**

Find the `configuration` object and update:
```typescript
configuration: {
  pageTitle: "Jack Cutler",
  pageTitleSuffix: "",
  enableSPA: true,
  enablePopovers: true,  // enables hover previews on internal links
  analytics: null,
  locale: "en-US",
  baseUrl: "jackcutler.net",
  ignorePatterns: ["private", "drafts", "templates", ".obsidian"],
  defaultDateType: "modified",
  theme: {
    fontOrigin: "googleFonts",
    cdnCaching: true,
    typography: {
      header: "EB Garamond",
      body: "EB Garamond",
      code: "IBM Plex Mono",
    },
    colors: {
      lightMode: {
        light: "#F8F6F3",
        lightgray: "#e8e4dc",
        gray: "#8a8075",
        darkgray: "#3a3530",
        dark: "#1a1a18",
        secondary: "#a0522d",
        tertiary: "#c47a45",
        highlight: "rgba(143, 84, 28, 0.08)",
        textHighlight: "#f5e6d3",
      },
      darkMode: {
        light: "#141822",
        lightgray: "#1e2535",
        gray: "#6b7591",
        darkgray: "#b8c0d4",
        dark: "#e8e4dd",
        secondary: "#c47a45",
        tertiary: "#d4895a",
        highlight: "rgba(196, 122, 69, 0.12)",
        textHighlight: "#2a3040",
      },
    },
  },
},
```

**Step 2: Verify colors in dev server**
```bash
npx quartz build --serve
```
Expected: Warm off-white background `#F8F6F3`, near-black text.

**Step 3: Commit**
```bash
git add quartz.config.ts
git commit -m "feat: configure site identity, color palette, and typography"
```

---

### Task 3: Set Up Netlify Deployment

**Files:**
- Create: `netlify.toml`

**Step 1: Create netlify.toml**
```toml
[build]
  command = "npx quartz build"
  publish = "public"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/random"
  to = "/random/index.html"
  status = 200
```

**Step 2: Create a GitHub repo (manual)**
- Go to github.com → New repository
- Name: `jackcutler-site`
- Private or public (your choice)
- Do NOT initialize with README (we already have commits)

**Step 3: Connect local repo to GitHub**
```bash
git remote add origin git@github.com:YOUR_USERNAME/jackcutler-site.git
git branch -M main
git push -u origin main
```

**Step 4: Connect to Netlify (manual)**
- Go to app.netlify.com → Add new site → Import from Git
- Select GitHub → select `jackcutler-site`
- Build command: `npx quartz build`
- Publish directory: `public`
- Click Deploy

**Step 5: Commit netlify.toml**
```bash
git add netlify.toml
git commit -m "feat: add Netlify build configuration"
git push
```

---

### Task 4: Typography Refinements

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Add to custom.scss**
```scss
// ============================================================
// TYPOGRAPHY
// ============================================================

body, p, li, blockquote {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.15rem;
  line-height: 1.7;
  font-feature-settings: "liga" 1, "kern" 1, "onum" 1;
}

// Optimal reading measure — Bringhurst's ~65-75 chars
article p {
  max-width: 68ch;
}

h1, h2, h3, h4, h5, h6 {
  font-family: "EB Garamond", Georgia, serif;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }

// Code and monospace elements
code, pre, kbd {
  font-family: "IBM Plex Mono", monospace;
  font-weight: 500;
  font-size: 0.875em;
}

// Page title uses same serif
.page-title, .page-header {
  font-family: "EB Garamond", Georgia, serif;
}
```

**Step 2: Verify in dev server**
```bash
npx quartz build --serve
```
Expected: EB Garamond throughout, IBM Plex Mono for code, proper reading measure.

**Step 3: Commit**
```bash
git add quartz/styles/custom.scss
git commit -m "feat: typography — EB Garamond body, IBM Plex Mono medium for code"
```

---

### Task 5: The Weathered Note Component

**Files:**
- Create: `quartz/components/WeatheredNote.tsx`
- Modify: `quartz/styles/custom.scss`
- Modify: `quartz.config.ts`

**Step 1: Create the component**
```tsx
// quartz/components/WeatheredNote.tsx
import { QuartzComponent, QuartzComponentProps } from "./types"

const WeatheredNote: QuartzComponent = (_props: QuartzComponentProps) => {
  return (
    <div class="weathered-note">
      <div class="weathered-note-pin" aria-hidden="true">
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
          <circle cx="5" cy="5" r="3.5" fill="currentColor" opacity="0.45"/>
          <line x1="5" y1="8.5" x2="5" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
        </svg>
      </div>
      <div class="weathered-note-content" id="site-note">
        {/* Content is set via quartz.config.ts siteNote or hardcoded here */}
      </div>
    </div>
  )
}

WeatheredNote.css = `
  .weathered-note {
    position: relative;
    transform: rotate(-0.7deg);
    background: var(--note-bg);
    border: 1px solid rgba(0,0,0,0.07);
    box-shadow: 2px 3px 14px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.05);
    padding: 1.25rem 1.5rem 1.15rem;
    margin: 1.5rem auto 3rem;
    max-width: 54ch;
    font-style: italic;
    font-family: "EB Garamond", Georgia, serif;
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--darkgray);
  }

  .weathered-note-pin {
    position: absolute;
    top: -11px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--gray);
  }

  .weathered-note-content p {
    margin: 0;
  }

  :root {
    --note-bg: #eee8d9;
  }

  [saved-theme="dark"] .weathered-note {
    --note-bg: #1c2232;
    background: #1c2232;
    border-color: rgba(255,255,255,0.07);
    box-shadow: 2px 3px 14px rgba(0,0,0,0.35);
  }
`

export default WeatheredNote
```

**Step 2: Edit the component to include the actual note text**
Replace the empty `<div class="weathered-note-content">` with the note text directly in JSX. Jack writes his own words here — 3-5 sentences, honest, a little strange. Example placeholder:
```tsx
<div class="weathered-note-content">
  <p>
    This is a place I'm building as I go. Everything here is subject to change,
    revision, and second-guessing. I write about whatever I cannot stop thinking about.
    You're welcome to look around.
  </p>
</div>
```

**Step 3: Add WeatheredNote to quartz.config.ts layout**
In `quartz.config.ts`, find the `Component` imports at the top. Add:
```typescript
import WeatheredNote from "./quartz/components/WeatheredNote"
```
Then in the layout configuration, find the `beforeBody` array for the index/home page and add `WeatheredNote()` as the first element.

**Step 4: Verify in dev server**
```bash
npx quartz build --serve
```
Expected: Italic note, slightly rotated, parchment background, pin detail at top, floating above the page.

**Step 5: Commit**
```bash
git add quartz/components/WeatheredNote.tsx quartz/styles/custom.scss quartz.config.ts
git commit -m "feat: weathered pinned note component on index page"
```

---

### Task 6: Gwern-Style Index Layout

**Files:**
- Create: `content/index.md`
- Modify: `quartz/styles/custom.scss`

**Step 1: Create content/index.md**
```markdown
---
title: Jack Cutler
---
```
The index listing is rendered by Quartz components — the markdown file just provides the title.

**Step 2: Style the index listing in custom.scss**
```scss
// ============================================================
// INDEX PAGE — Gwern-style annotated list
// ============================================================

.page-listing {
  margin-top: 1rem;
}

// Tag/section heading in the index
.page-listing h3,
.section-header {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gray);
  border-bottom: 1px solid var(--lightgray);
  padding-bottom: 0.35rem;
  margin-bottom: 0.9rem;
  margin-top: 2.5rem;
  font-family: "IBM Plex Mono", monospace;
}

// Entry list
.page-listing ul {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
}

.page-listing li {
  padding: 0.22rem 0;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  line-height: 1.4;
}

// Title link
.page-listing li a.internal {
  font-size: 1rem;
  font-family: "EB Garamond", serif;
  color: var(--dark);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.12s, color 0.12s;
  flex-shrink: 0;
}

.page-listing li a.internal:hover {
  border-bottom-color: var(--secondary);
  color: var(--secondary);
}

// Optional one-line description
.entry-description {
  font-size: 0.88rem;
  color: var(--gray);
  font-style: italic;
  font-family: "EB Garamond", serif;
}

// Tag filter bar — unobtrusive, sits above the list
.tag-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
  margin-top: 0.5rem;
}

.tag-filter-btn {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--lightgray);
  color: var(--gray);
  background: transparent;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.12s, color 0.12s;
}

.tag-filter-btn:hover,
.tag-filter-btn.active {
  border-color: var(--secondary);
  color: var(--secondary);
}
```

**Step 3: Preview**
```bash
npx quartz build --serve
```
Expected: Titles listed cleanly under section headings. No bullet points. Reads like a document, not a table.

**Step 4: Commit**
```bash
git add content/index.md quartz/styles/custom.scss
git commit -m "feat: Gwern-style index page layout"
```

---

### Task 7: Status Dot + Post Metadata Component

**Files:**
- Create: `quartz/components/StatusDot.tsx`
- Modify: `quartz/styles/custom.scss`
- Modify: `quartz.config.ts`

**Step 1: Create StatusDot.tsx**
```tsx
// quartz/components/StatusDot.tsx
import { QuartzComponent, QuartzComponentProps } from "./types"

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  "finished": { color: "#5a8a5a", label: "finished" },
  "in-progress": { color: "#c47a45", label: "in progress" },
  "in progress": { color: "#c47a45", label: "in progress" },
}

const StatusDot: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const status = (fm.status as string | undefined)?.toLowerCase()
  const confidence = fm.confidence as string | undefined
  const currentStatus = status ? STATUS_CONFIG[status] : null

  if (!currentStatus && !confidence) return null

  return (
    <div class="post-meta-cluster">
      {currentStatus && (
        <span class="status-indicator" title={currentStatus.label}>
          <span class="status-dot" style={{ background: currentStatus.color }} />
          <span class="status-label">{currentStatus.label}</span>
        </span>
      )}
      {confidence && (
        <span class="confidence-tag">
          confidence: {confidence}
        </span>
      )}
    </div>
  )
}

StatusDot.css = `
  .post-meta-cluster {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 0.6rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--gray);
    letter-spacing: 0.01em;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .status-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-label,
  .confidence-tag {
    text-transform: lowercase;
    color: var(--gray);
  }
`

export default StatusDot
```

**Step 2: Style reading time display in custom.scss**
```scss
// Reading time — raw data
.reading-time {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--gray);
  letter-spacing: 0.01em;
  margin-bottom: 1.5rem;
  display: block;
}
```

**Step 3: Register StatusDot in quartz.config.ts**
In `quartz.config.ts`, import StatusDot and add it to the `beforeBody` array for content pages (after the title, before the article body).

**Step 4: Test with a sample post**
Create `content/posts/test.md`:
```markdown
---
title: Test Post
status: in-progress
confidence: likely
tags: [test]
---

This is a test post to verify metadata rendering.
```

```bash
npx quartz build --serve
```
Expected: Status dot (amber), "in progress" label, "confidence: likely" — all in small monospace above the article.

**Step 5: Delete test, commit**
```bash
rm content/posts/test.md
git add quartz/components/StatusDot.tsx quartz/styles/custom.scss quartz.config.ts
git commit -m "feat: status dot and post metadata cluster"
```

---

### Task 8: Sidenotes (Tufte-Style)

**Files:**
- Modify: `quartz/styles/custom.scss`

The approach: standard markdown footnotes (`[^1]`) are repositioned to the margin on wide screens via CSS. On narrow screens they fall back to the bottom. This is the Tufte CSS approach — elegant, uses standard markdown syntax, no custom plugins.

**Step 1: Add sidenote CSS to custom.scss**
```scss
// ============================================================
// SIDENOTES — Tufte-style margin footnotes
// ============================================================

// Wide screen: pull footnotes into the right margin
@media (min-width: 1200px) {
  // Give article a grid with a margin column
  article.popover-hint {
    display: grid;
    grid-template-columns: 1fr min(68ch, 100%) 280px;
    column-gap: 2rem;
  }

  article.popover-hint > * {
    grid-column: 2;
  }

  // Footnote section floats into column 3
  article.popover-hint .footnotes {
    grid-column: 3;
    grid-row: 1 / 999;
    align-self: start;
    padding-left: 0;
    border-top: none;
    margin-top: 0;
  }

  article.popover-hint .footnotes ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  article.popover-hint .footnotes li {
    font-family: "EB Garamond", serif;
    font-style: italic;
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--darkgray);
    border-left: 2px solid var(--secondary);
    padding-left: 0.65rem;
    margin-bottom: 1.25rem;
    opacity: 0.85;
  }

  // Footnote reference in text
  sup a[href^="#user-content-fn"] {
    font-size: 0.7em;
    color: var(--secondary);
    text-decoration: none;
    vertical-align: super;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 500;
  }
}

// Narrow screen: footnotes at bottom, styled consistently
@media (max-width: 1199px) {
  .footnotes {
    border-top: 1px solid var(--lightgray);
    margin-top: 2.5rem;
    padding-top: 1rem;
  }

  .footnotes ol {
    padding-left: 1rem;
  }

  .footnotes li {
    font-family: "EB Garamond", serif;
    font-style: italic;
    font-size: 0.9rem;
    line-height: 1.55;
    color: var(--gray);
    margin-bottom: 0.75rem;
    border-left: 2px solid var(--secondary);
    padding-left: 0.65rem;
  }
}
```

**Step 2: Test with a sidenote-heavy post**
Create `content/posts/sidenote-test.md`:
```markdown
---
title: Sidenote Test
status: in-progress
---

The armadillo is one of the most unusual mammals alive today.[^1] Their ancestors,
the glyptodonts, were the size of a small car.[^2] This is both terrifying
and wonderful to contemplate.

[^1]: They are the only living mammals with a true bony shell, called the osteoderm.
[^2]: Doedicurus, for example, reached up to 1,500 kg. It roamed South America until roughly 10,000 years ago.
```

```bash
npx quartz build --serve
```
On wide screen: footnotes appear in right margin beside their paragraph, italic serif, clay left border. On narrow screen: footnotes appear at bottom with same styling.

**Step 3: Delete test, commit**
```bash
rm content/posts/sidenote-test.md
git add quartz/styles/custom.scss
git commit -m "feat: Tufte-style sidenotes in right margin on wide screens"
```

---

### Task 9: Minimal Navigation Header

**Files:**
- Create: `quartz/components/CustomHeader.tsx`
- Modify: `quartz.config.ts`

**Step 1: Create CustomHeader.tsx**
```tsx
// quartz/components/CustomHeader.tsx
import { QuartzComponent, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

const CustomHeader: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  const base = pathToRoot(fileData.slug!)

  return (
    <header class="site-header">
      <a href={base} class="site-title">{cfg.pageTitle}</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href={`${base}about`}>about</a>
        <a href={`${base}tags`}>tags</a>
        <a href={`${base}graph`}>graph</a>
        <a href={`${base}random`}>random</a>
      </nav>
    </header>
  )
}

CustomHeader.css = `
  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 1.75rem 0 1.1rem;
    border-bottom: 1px solid var(--lightgray);
    margin-bottom: 3rem;
  }

  .site-title {
    font-family: "EB Garamond", Georgia, serif;
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--dark);
    text-decoration: none;
    letter-spacing: -0.01em;
  }

  .site-title:hover {
    color: var(--secondary);
  }

  .site-nav {
    display: flex;
    gap: 1.75rem;
    align-items: baseline;
  }

  .site-nav a {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    color: var(--gray);
    text-decoration: none;
    transition: color 0.12s;
  }

  .site-nav a:hover {
    color: var(--secondary);
  }

  /* Mobile — no hamburger, just smaller and stacked */
  @media (max-width: 640px) {
    .site-header {
      flex-direction: column;
      gap: 0.9rem;
      padding: 1.25rem 0 0.9rem;
    }

    .site-nav {
      gap: 1.1rem;
      flex-wrap: wrap;
    }

    .site-nav a {
      font-size: 0.8rem;
    }
  }
`

export default CustomHeader
```

**Step 2: Replace default header in quartz.config.ts**
In `quartz.config.ts`, import `CustomHeader` and replace whatever is in the header component slot with `CustomHeader()`.

**Step 3: Also ensure Quartz's built-in Search is accessible**
Keep `Component.Search()` in the layout — Quartz handles search via a modal. The search can be triggered by keyboard shortcut (Cmd/Ctrl+K) even without a visible nav link.

**Step 4: Preview**
```bash
npx quartz build --serve
```
Expected: Site name left, nav links right in small monospace. No hamburger on desktop. On mobile, stacks cleanly.

**Step 5: Commit**
```bash
git add quartz/components/CustomHeader.tsx quartz.config.ts
git commit -m "feat: minimal custom header — EB Garamond title, monospace nav"
```

---

### Task 10: Cookbook-Style Tags Page

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Add tags page CSS**
```scss
// ============================================================
// TAGS PAGE — cookbook / book index style
// ============================================================

.tags-page .tag-list {
  column-count: 2;
  column-gap: 3rem;
  margin-top: 1.5rem;

  @media (max-width: 640px) {
    column-count: 1;
  }
}

// Alphabetical divider
.tags-page .tag-section-letter {
  break-before: column;
  font-family: "EB Garamond", serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--secondary);
  margin-top: 1.5rem;
  margin-bottom: 0.3rem;
  border-bottom: 1px solid var(--secondary);
  padding-bottom: 0.15rem;
}

// Individual tag entry row
.tags-page .tag-entry {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.18rem 0;
  border-bottom: 1px dotted var(--lightgray);
  break-inside: avoid;
}

.tags-page .tag-entry a {
  font-family: "EB Garamond", serif;
  font-size: 0.95rem;
  color: var(--dark);
  text-decoration: none;
}

.tags-page .tag-entry a:hover {
  color: var(--secondary);
}

.tags-page .tag-count {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--gray);
}
```

**Step 2: Preview**
```bash
npx quartz build --serve
```
Navigate to /tags. Expected: Two-column list with dotted rules, alphabetical section letters in rust, post counts in monospace on the right.

**Step 3: Commit**
```bash
git add quartz/styles/custom.scss
git commit -m "feat: cookbook-index style tags page"
```

---

### Task 11: Random Post Feature

**Files:**
- Create: `quartz/components/RandomRedirect.tsx`
- Create: `content/random.md`
- Modify: `quartz.config.ts`

**Step 1: Create RandomRedirect.tsx**
```tsx
// quartz/components/RandomRedirect.tsx
import { QuartzComponent, QuartzComponentProps } from "./types"

const RandomRedirect: QuartzComponent = ({ allFiles }: QuartzComponentProps) => {
  const posts = (allFiles ?? [])
    .filter(f =>
      f.slug &&
      f.slug !== "index" &&
      f.slug !== "about" &&
      f.slug !== "random" &&
      !String(f.slug).startsWith("tags/")
    )
    .map(f => `/${f.slug}`)

  return (
    <div class="random-redirect">
      <p>Taking you somewhere unexpected...</p>
      <noscript>
        <p>JavaScript is required for random post navigation. <a href="/">Return home.</a></p>
      </noscript>
      <script dangerouslySetInnerHTML={{
        __html: `
          ;(function() {
            var posts = ${JSON.stringify(posts)};
            if (posts.length > 0) {
              window.location.replace(posts[Math.floor(Math.random() * posts.length)]);
            } else {
              window.location.replace('/');
            }
          })();
        `
      }} />
    </div>
  )
}

RandomRedirect.css = `
  .random-redirect {
    font-style: italic;
    color: var(--gray);
    font-family: "EB Garamond", serif;
    margin-top: 3rem;
  }
`

export default RandomRedirect
```

**Step 2: Create content/random.md**
```markdown
---
title: Random
---
```

**Step 3: Add RandomRedirect to the /random page layout in quartz.config.ts**
Import `RandomRedirect` and add it to the content body for the `/random` page specifically, or as the page body component.

**Step 4: Test**
Add a couple of posts under `content/posts/`, then:
```bash
npx quartz build --serve
```
Navigate to /random. Expected: Brief italic message, then immediate redirect to a random post.

**Step 5: Commit**
```bash
git add quartz/components/RandomRedirect.tsx content/random.md quartz.config.ts
git commit -m "feat: random post redirect"
```

---

### Task 12: About Page

**Files:**
- Create: `content/about.md`
- Modify: `quartz/styles/custom.scss`

**Step 1: Create content/about.md**
```markdown
---
title: About
status: in-progress
---

## Obsessions

Things I cannot stop thinking about.

-
-
-

## Influences

Writers, thinkers, books, and strange sources.

-
-
-

## Things I Believe

Stated plainly, held loosely.

-
-

## Questions I'm Sitting With

Not rhetorical. Genuinely unresolved.

-
-

## Fears

-
-

---

*This page is permanently in progress.*

[jack@jackcutler.net](mailto:jack@jackcutler.net)
```

**Step 2: Style the about page**
```scss
// ============================================================
// ABOUT PAGE
// ============================================================

// About page section headings — small caps style
.about-content h2 {
  font-size: 0.78rem;
  font-family: "IBM Plex Mono", monospace;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gray);
  border-bottom: 1px solid var(--lightgray);
  padding-bottom: 0.3rem;
  margin-top: 2.5rem;
  margin-bottom: 0.8rem;
}

.about-content ul {
  padding-left: 1.2rem;
}

.about-content li {
  margin-bottom: 0.45rem;
  line-height: 1.55;
}

// Contact link
.about-content a[href^="mailto:"] {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--secondary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.12s;
}

.about-content a[href^="mailto:"]:hover {
  border-bottom-color: var(--secondary);
}
```

**Step 3: Preview**
```bash
npx quartz build --serve
```
Navigate to /about. Expected: Section headings in small monospace caps, list format, mailto link at bottom.

**Step 4: Jack fills in actual content**
This is the time to write real content for the obsessions, influences, beliefs, questions, and fears sections.

**Step 5: Commit**
```bash
git add content/about.md quartz/styles/custom.scss
git commit -m "feat: about page — fragment self-portrait"
```

---

### Task 13: Buttondown Newsletter Embed

**Files:**
- Create: `quartz/components/NewsletterSignup.tsx`
- Modify: `quartz.config.ts`

**Step 1: Sign up for Buttondown (manual)**
- Go to buttondown.email → Create account
- Your username will be used in the form action URL below
- Confirm: `https://buttondown.email/api/emails/embed-subscribe/YOUR_USERNAME`

**Step 2: Create NewsletterSignup.tsx**
Replace `YOUR_USERNAME` with actual Buttondown username.
```tsx
// quartz/components/NewsletterSignup.tsx
import { QuartzComponent } from "./types"

const BUTTONDOWN_USERNAME = "YOUR_USERNAME" // replace this

const NewsletterSignup: QuartzComponent = () => {
  return (
    <div class="newsletter-signup">
      <p class="newsletter-prompt">
        If you'd like to know when I write something new:
      </p>
      <form
        action={`https://buttondown.email/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`}
        method="post"
        target="popupwindow"
        onsubmit={`window.open('https://buttondown.email/${BUTTONDOWN_USERNAME}', 'popupwindow')`}
        class="newsletter-form"
      >
        <input
          type="email"
          name="email"
          placeholder="your@email.com"
          required
          class="newsletter-input"
        />
        <button type="submit" class="newsletter-btn">subscribe</button>
      </form>
    </div>
  )
}

NewsletterSignup.css = `
  .newsletter-signup {
    border-top: 1px solid var(--lightgray);
    margin-top: 3.5rem;
    padding-top: 1.5rem;
  }

  .newsletter-prompt {
    font-style: italic;
    color: var(--gray);
    font-size: 0.95rem;
    margin-bottom: 0.8rem;
    font-family: "EB Garamond", serif;
  }

  .newsletter-form {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .newsletter-input {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.4rem 0.8rem;
    background: var(--light);
    border: 1px solid var(--lightgray);
    color: var(--dark);
    flex: 1;
    min-width: 200px;
    outline: none;
    transition: border-color 0.12s;

    &:focus {
      border-color: var(--secondary);
    }
  }

  .newsletter-btn {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    padding: 0.4rem 1rem;
    background: transparent;
    border: 1px solid var(--secondary);
    color: var(--secondary);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .newsletter-btn:hover {
    background: var(--secondary);
    color: var(--light);
  }
`

export default NewsletterSignup
```

**Step 3: Add to layout in quartz.config.ts**
Add `NewsletterSignup()` to the `afterBody` array so it appears at the bottom of all content pages and the index.

**Step 4: Verify**
```bash
npx quartz build --serve
```
Expected: Quiet newsletter signup at page bottom — one italic prompt, email input, subscribe button. No popups.

**Step 5: Commit**
```bash
git add quartz/components/NewsletterSignup.tsx quartz.config.ts
git commit -m "feat: Buttondown newsletter embed at bottom of pages"
```

---

### Task 14: Dark Mode Polish

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Verify dark mode toggle is in the layout**
In `quartz.config.ts`, confirm `Component.Darkmode()` is in the header or nav. Quartz includes this built-in.

**Step 2: Add dark mode refinements to custom.scss**
```scss
// ============================================================
// DARK MODE REFINEMENTS
// ============================================================

[saved-theme="dark"] {
  // Warm the code blocks slightly
  pre, code {
    background: #1e2535;
  }

  // Tone down any harsh white elements
  img {
    opacity: 0.92;
  }

  // Horizontal rules
  hr {
    border-color: var(--lightgray);
    opacity: 0.5;
  }

  // The weathered note in dark mode
  .weathered-note {
    background: #1c2232;
    border-color: rgba(255,255,255,0.06);
  }
}
```

**Step 3: Check both modes thoroughly**
```bash
npx quartz build --serve
```
Toggle dark mode. Check: index page, a post, about page, tags page. Look for anything too harsh or too flat.

**Step 4: Commit**
```bash
git add quartz/styles/custom.scss
git commit -m "feat: dark mode polish — warm, not harsh"
```

---

### Task 15: Mobile Refinements

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Add mobile CSS passes**
```scss
// ============================================================
// MOBILE
// ============================================================

@media (max-width: 640px) {
  // Slightly smaller body text on small screens
  body {
    font-size: 1.05rem;
  }

  h1 { font-size: 1.6rem; }
  h2 { font-size: 1.3rem; }

  // Weathered note: full width, less rotation on mobile
  .weathered-note {
    transform: rotate(-0.3deg);
    margin: 1rem 0 2rem;
    padding: 1rem 1.1rem;
    max-width: 100%;
  }

  // Index: single column
  .page-listing li {
    flex-direction: column;
    gap: 0.1rem;
  }

  // Post meta: wrap gracefully
  .post-meta-cluster {
    flex-wrap: wrap;
    gap: 0.6rem;
  }
}

@media (max-width: 480px) {
  // Newsletter form stacks
  .newsletter-form {
    flex-direction: column;
  }
  .newsletter-input {
    min-width: unset;
    width: 100%;
  }
  .newsletter-btn {
    width: 100%;
    text-align: center;
  }
}
```

**Step 2: Test on mobile viewport**
In browser dev tools, set viewport to 375px (iPhone SE) and 390px (iPhone 14).
Expected: All elements readable and usable. No overflow. Note rotates less. Nav wraps cleanly.

**Step 3: Commit**
```bash
git add quartz/styles/custom.scss
git commit -m "feat: mobile refinements — readable, no overflow"
```

---

### Task 16: Obsidian Vault Setup

**Files:**
- Modify: `.gitignore`

**Step 1: Update .gitignore**
```bash
cat >> .gitignore << 'EOF'
.obsidian/
node_modules/
public/
.DS_Store
*.swp
EOF
```

**Step 2: Open Obsidian and add vault**
- Open Obsidian
- "Open folder as vault"
- Select: `/Users/jack/projects/Personal Website/content`

**Step 3: Configure Obsidian settings for Quartz compatibility**
In Obsidian Settings:
- **Files & Links → New link format:** Shortest path
- **Files & Links → Use [[Wikilinks]]:** ON
- **Files & Links → Default location for new notes:** In the folder specified below → `posts`

**Step 4: Create folder structure**
Inside Obsidian (i.e., inside `content/`), create:
- `posts/` — all published writing goes here

**Step 5: Commit .gitignore**
```bash
git add .gitignore
git commit -m "chore: gitignore for Obsidian, node_modules, build output"
```

---

### Task 17: First Real Content + Full Site Verification

**Step 1: Write The Note**
In `quartz/components/WeatheredNote.tsx`, replace the placeholder text with Jack's actual words — 3-5 sentences, honest, a little strange. This is the voice of the whole site. Take the time to write it carefully.

**Step 2: Fill in the About page**
Open `content/about.md` in Obsidian. Add real content to each section. Minimum: 3 items per section. This is permanent "in progress" — it just needs to feel alive.

**Step 3: Write the first post**
Create `content/posts/first-post.md` in Obsidian:
```markdown
---
title: [Your Title]
date: 2026-03-04
status: in-progress
tags: [firsttag, secondtag]
---

Your writing here. Even one paragraph is fine. This is the first entry in the index.
```

**Step 4: Full site walkthrough**
```bash
npx quartz build --serve
```
Walk through every page:
- [ ] Index: weathered note visible, first post in listing
- [ ] Post page: status dot, metadata cluster, sidenotes if used
- [ ] About: sections visible, mailto link works
- [ ] Tags: first post's tags appear
- [ ] Graph: sparse but visible
- [ ] Random: redirects to the first post
- [ ] Dark mode toggle: works, no harsh elements
- [ ] Mobile viewport (375px): everything readable

**Step 5: Commit**
```bash
git add content/
git commit -m "content: initial note, about page, and first post"
```

---

### Task 18: Deploy to Production

**Step 1: Final build check**
```bash
npx quartz build
```
Expected: No errors, `public/` folder generated.

**Step 2: Push to GitHub**
```bash
git push origin main
```

**Step 3: Watch Netlify deploy**
- Go to app.netlify.com → your site → Deploys tab
- Expected: Build succeeds in ~60 seconds
- Note the temporary URL (e.g., `amazing-site-abc123.netlify.app`) and verify it works

**Step 4: Register jackcutler.net (manual)**
- Go to namecheap.com (or porkbun.com — slightly cheaper)
- Search `jackcutler.net`, purchase (~$12/year)

**Step 5: Connect custom domain in Netlify**
- Netlify → Site settings → Domain management → Add custom domain → `jackcutler.net`
- Follow Netlify's DNS instructions (either point nameservers to Netlify, or add an A record)
- Netlify provisions SSL automatically — wait ~10 minutes

**Step 6: Verify live site**
- Open https://jackcutler.net
- Check: fonts loaded, colors correct, weathered note, dark mode
- Check on phone

**Step 7: Final commit if any tweaks needed**
```bash
git add -A
git commit -m "fix: post-deploy adjustments"
git push
```

---

## Deferred (Post-Launch)

Revisit these when you have 10+ posts:

- **Start Here section** — add to index once you have enough posts to curate a reading path
- **Graph view custom styling** — nodes/edges are fine as default; customize once graph has substance
- **Hover preview refinements** — Quartz's default popovers work; tweak after seeing them in real use
- **Semantic / AI-powered search** — revisit at 50+ posts
- **Multi-column Whole Earth Catalog layouts** — possible for specific long posts; explore once core is solid
- **Revision count display** — surface "updated N times" from git history; useful once posts have real history
