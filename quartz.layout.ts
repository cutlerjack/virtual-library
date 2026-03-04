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
    Component.PageTransitions(),
    Component.CursorTrail(),
    Component.FootnoteLink(),
    Component.InProgressAnimation(),
    Component.WeatheredNote(),
    Component.PostIndex(),
    Component.Archive(),
    Component.ArticleTitle(),
    Component.StatusDot(),
    Component.ContentMeta(),
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
    Component.PageTransitions(),
    Component.CursorTrail(),
    Component.FootnoteLink(),
    Component.InProgressAnimation(),
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
