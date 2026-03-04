# jackcutler.net — Design Document

**Date:** 2026-03-04
**Status:** Approved

---

## Vision

A personal writing site that feels alive, textured, and personal — like stumbling into someone's study. A place for poetry, animals, weather, foreign conflicts, history, book reviews, AI, predictions, fears, food opinions, public markets, and anything else that demands to be written about. A personal Whole Earth Catalog of one mind ranging freely.

The site should feel *built by hand*. Something that would impress someone in the 1930s, the 1960s, the 1990s, or 2050, because the craft transcends any era. A passion project someone has poured their whole being into.

Posts are living documents — revised, updated, always in progress. The site openly embraces imperfection and the act of figuring things out in public.

---

## Identity

- **Name:** Jack Cutler
- **Domain:** jackcutler.net
- **Real name, no pen name** — owning the work, embracing imperfection rather than hiding behind anonymity
- **Site title:** "Jack Cutler" in a good typeface. No logo. The name is the brand.

---

## Aesthetic Inspirations

- **Gwern.net** — dense, intellectual, living documents, status tags, sidenotes, interconnected
- **Whole Earth Catalog** — eclectic, encyclopedic, dense but alive, a catalog of everything
- **The Elements of Typographic Style (Bringhurst)** — precision in letters, respect for the craft of typography
- **Colossus magazine / WW2-era print** — the feel of the 1940s, things that are *made*
- **British upland hunting aesthetic** — rugged, traditional, earthy
- **Eva Applegate's gallery** — clean presentation with character
- **Making Software** — editorial quality on the web
- **Medieval illustrated manuscripts** — rich, layered, handcrafted

---

## Color Palette

### Light Mode (Default)
- **Background:** `#F8F6F3` — warm off-white, aged paper
- **Text:** `#1a1a1a` — near-black
- **Secondary text:** Muted warm grays
- **Accent:** Rust/clay — earthy, warm (e.g. `#a0522d` range, to be refined)
- **Links:** Accent color, understated

### Dark Mode
- **Background:** Midnight sky-blue/black (deep navy-black, not warm charcoal — e.g. `#141822` range)
- **Text:** `#e8e4dd` — warm off-white
- **Secondary/accent:** Same rust/clay, adjusted for contrast
- **Toggle:** Available in header

### Principles
- No pure black or pure white anywhere
- Warm tones throughout — nothing sterile or clinical
- Flat, typographic, editorial — no drop shadows, rounded cards, or gradients
- Thin, quiet horizontal rules to separate sections

---

## Typography

### Body Text
- **EB Garamond** or **Freight Text** — high-quality serif with real personality
- Old-style, literary, like reading a good magazine
- Line length: 65-75 characters (Bringhurst's measure)
- Generous but not excessive line-height
- The text should be a pleasure to read

### Headings
- Same serif family, heavier weight
- No sans-serif anywhere in the content

### Monospace (code/diagrams only)
- **IBM Plex Mono Medium** (weight 500)
- Used sparingly, only where needed

### Sidenotes
- Same serif family, ~85% of body size, italic
- Thin clay/rust left border
- Slightly muted text color
- Feels like a margin annotation, the same voice but quieter

---

## Homepage: The Index

### The Note
- 3-5 sentences at the top of the index. Honest, slightly strange, inviting, curious. Sets tone without over-explaining.
- **Visual treatment:** Sits in its own space, subtle rotation (1-2 degrees), faintly weathered edges, thin shadow implying it's *pinned on top of* the page. A pin/nail detail at the top. Warm parchment tone slightly different from the page background. Text in italic serif. Should feel like a physical note fluttering in the wind, nailed to a door. Weathered.

### Start Here
- Curated section of 3-5 pieces to point a stranger to
- Hidden at launch until there's enough content to curate
- Appears below the note once populated

### The Full Index
- Every piece listed below, Gwern-style: titles grouped under loose tag/topic headings
- Each entry: title (as a link), brief one-line description, status dot
- Reads like a *document* — flowing top-to-bottom — not a sortable table or dashboard
- Filtering is available but unobtrusive: a tag list or search bar tucked somewhere quiet, not baked into the layout

---

## Post Layout & Reading Experience

### Structure
- Single centered column, well-measured (65-75 chars)
- Desktop: margins become usable space for sidenotes
- Mobile: sidenotes collapse to expandable inline notes

### Sidenotes & Footnotes
- **Sidenotes:** Commentary, asides, tangential thoughts — sit in the margin, italic serif, clay left border, ~85% body size
- **Footnotes:** Citations, sources, technical details — numbered, at the bottom
- **Hover previews:** Internal links show a preview card on hover, Gwern-style

### Post Metadata (quiet cluster near the title)
- **Status dot:** Small colored circle (Gwern-style) — In Progress or Finished (no "Draft")
- **Confidence tag:** Optional per post — possible / likely / highly likely / certain. Only for posts making claims or predictions.
- **Last updated:** Visible date
- **Word count & reading time:** Displayed small, like raw data, not a badge
- **Tags:** Listed, linked

### Media
- Diagrams, charts, images, illustrations — yes
- No personal photos
- No hero images, no stock photos

---

## Navigation & Exploration

### Header
- Minimal. Name on the left (home link), small links on the right: About, Tags, Graph, Random, Search
- No hamburger menu on desktop. On mobile, collapses to a simple menu.

### Tags
- Dedicated `/tags` page — clean list with post counts, styled like a cookbook index or book index with footnotes
- Each tag page: posts with that tag in the same index style
- Posts can have multiple tags, loosely applied, no rigid taxonomy

### Graph View
- Dedicated `/graph` page — full network visualization (Quartz built-in)
- Shown from day one, even while sparse — embraces the in-progress philosophy
- Each post: local graph at the bottom showing immediate connections

### Random Post
- `/random` — drops you into a random piece. Simple, delightful.

### Search
- Full-text keyword search across all posts (Quartz/Flexsearch built-in)
- Triggered from header or keyboard shortcut
- Semantic search deferred until 50+ posts justify the investment

### Related Posts
- Bottom of every post: 3-5 related posts based on shared tags or links

### Backlinks
- Bottom of every post: all posts that link *to* this one (Quartz automatic)

---

## The About Page

- Reached from header link, not prominently featured on homepage
- Not a bio. A self-portrait in fragments:
  - **Obsessions** — things you can't stop thinking about
  - **Influences** — writers, books, thinkers, sources
  - **Beliefs** — stated plainly
  - **Questions** — things you're sitting with, unresolved
  - **Fears** — honest, striking
- Living document — permanently "In Progress"
- Contact (mailto link) and newsletter signup at the bottom

---

## Reader Interaction

### No Comments
- No comment system. Writing to be read, not to generate engagement. The site stays clean.

### Newsletter
- **Buttondown** (free up to 100 subscribers, $9/month after)
- Signup in two places only: bottom of the index page, bottom of each post
- A quiet invitation, not a demand. One line of text, one email field. No popups, no floating bars.

### Contact
- Simple `mailto:` link on the About page — e.g. "If you want to say something: jack@jackcutler.net"
- Direct, human, no contact form

---

## Technical Architecture

### Stack
- **Quartz v4** — static site generator, Obsidian-native
- **Obsidian** — writing environment
- **Git** — version control, deployment trigger, revision history
- **Netlify** — free hosting, automatic deploys on push
- **Buttondown** — newsletter
- **Domain:** jackcutler.net (~$12/year)

### Obsidian Vault Structure
```
/vault
  /published          ← only this folder becomes the site
    /posts
    /about.md
    /index.md
  /drafts             ← private, never published
  /private            ← private, never published
  /everything else    ← normal vault, untouched
```

### Publishing Workflow
1. Write in Obsidian, anywhere in vault
2. When presentable, move to `/published`
3. `git add . && git commit && git push`
4. Netlify rebuilds in ~30 seconds
5. Live

### What Quartz Handles Automatically
- `[[wikilinks]]` → working hover-preview links
- Tags from frontmatter → tag system
- Backlinks computed automatically
- Graph view computed automatically
- Search index rebuilt on deploy
- Footnotes rendered from markdown
- Dark mode toggle

### What We Build Custom
- Full visual theme (typography, palette, spacing, texture)
- The weathered pinned note component
- Sidenote styling (italic serif, clay border)
- Status dots and metadata cluster
- Index page layout (Gwern-style annotated list)
- Cookbook-style tag index
- About page structure
- Newsletter signup embed (Buttondown)
- Random post feature
- Mobile refinements

### Cost
- Hosting: $0 (Netlify free tier)
- Domain: ~$12/year
- Newsletter: $0 to start, $9/month after 100 subscribers
- **Total: ~$1/month to start**

---

## What's Deferred
- Semantic/AI-powered search (revisit at 50+ posts)
- "Start Here" section (appears once there's enough content)
- Multi-column Whole Earth Catalog-style layouts (explore once core is solid)

---

## Design Principles
1. **Timeless craft** — should look good in any decade
2. **Honest imperfection** — embrace being in-progress
3. **Dense but not cramped** — eclectic, not sterile
4. **The writing is the point** — everything serves readability
5. **Built by hand** — every detail intentional, nothing default
6. **Living documents** — nothing is ever truly finished
7. **No engagement metrics** — no likes, no comments, no social buttons
