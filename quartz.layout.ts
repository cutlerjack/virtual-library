import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.CustomHeader()],
  afterBody: [
    Component.RandomRedirect(),
    Component.TagList(),
    Component.NewsletterSignup(),
  ],
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ReadingProgress(),
    Component.ConsoleGreeting(),
    Component.SeasonalPalette(),
    Component.PageTransitions(),
    Component.TerrainParallax(),
    Component.ScrollReveal(),
    Component.PageSound(),
    Component.EasterEggs(),
    Component.CursorTrail(),
    Component.FootnoteLink(),
    Component.InProgressAnimation(),
    Component.WeatheredNote(),
    Component.PostIndex(),
    Component.Archive(),
    Component.Bookshelf(),
    Component.ArticleTitle(),
    Component.StatusDot(),
    Component.ContentMeta(),
    Component.Frontispiece(),
  ],
  left: [
    Component.Search(),
    Component.Darkmode(),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.ConsoleGreeting(),
    Component.SeasonalPalette(),
    Component.PageTransitions(),
    Component.TerrainParallax(),
    Component.ScrollReveal(),
    Component.PageSound(),
    Component.EasterEggs(),
    Component.CursorTrail(),
    Component.FootnoteLink(),
    Component.InProgressAnimation(),
    Component.Bookshelf(),
    Component.TagGarden(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.Search(),
    Component.Darkmode(),
  ],
  right: [],
}
