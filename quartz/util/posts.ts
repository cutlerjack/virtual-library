import { QuartzPluginData } from "../plugins/vfile"

/**
 * Excluded slug prefixes and exact matches for non-content pages.
 * Used to filter the allFiles list down to actual posts/articles.
 */
const EXCLUDED_SLUGS = new Set(["index", "about", "random", "archive", "tags"])
const EXCLUDED_PREFIXES = ["tags/", "reading/"]

/** Returns true if the file represents a content post (not a special page). */
export function isContentPost(f: QuartzPluginData): boolean {
  const slug = f.slug ?? ""
  if (!slug) return false
  if (EXCLUDED_SLUGS.has(slug)) return false
  for (const prefix of EXCLUDED_PREFIXES) {
    if (slug.startsWith(prefix)) return false
  }
  return true
}

/** Returns true if the given slug is a content page (not a special page). */
export function isContentSlug(slug: string): boolean {
  if (EXCLUDED_SLUGS.has(slug)) return false
  for (const prefix of EXCLUDED_PREFIXES) {
    if (slug.startsWith(prefix)) return false
  }
  return true
}
