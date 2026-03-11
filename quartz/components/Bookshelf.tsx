import { resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface BookMeta {
  title: string
  author: string
  rating: number
  category: string
  cover: string
  spineColor: string
  textColor: string
  href: string
  slug: string
  excerpt: string
}

const Bookshelf: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const slug = fileData.slug ?? ""
  const isReadingIndex =
    slug === "reading" || slug === "reading/" || slug === "reading/index"
  if (!isReadingIndex) return null

  // Find all book files (in reading/ folder, not the index itself)
  const bookFiles = allFiles.filter((f) => {
    const s = f.slug ?? ""
    return s.startsWith("reading/") && s !== "reading/" && s !== "reading/index"
  })

  // Build book metadata
  const books: BookMeta[] = bookFiles
    .map((f) => {
      const fm = f.frontmatter ?? {}
      return {
        title: (fm.title as string) ?? "Untitled",
        author: (fm.author as string) ?? "",
        rating: (fm.rating as number) ?? 0,
        category: (fm.category as string) ?? "uncategorized",
        cover: (fm.cover as string) ?? "",
        spineColor: (fm.spineColor as string) ?? "#5a5a5a",
        textColor: (fm.textColor as string) ?? "#fff",
        href: resolveRelative(fileData.slug!, f.slug!),
        slug: f.slug!,
        excerpt: (f.description ?? "").slice(0, 200),
      }
    })
    .sort((a, b) => b.rating - a.rating)

  if (books.length === 0) return null

  // Group by category
  const categoryOrder: string[] = []
  const byCategory = new Map<string, BookMeta[]>()
  for (const book of books) {
    if (!byCategory.has(book.category)) {
      byCategory.set(book.category, [])
      categoryOrder.push(book.category)
    }
    byCategory.get(book.category)!.push(book)
  }

  return (
    <div class="bookshelf-wrap">
      {/* SVG paper texture filter */}
      <svg class="bookshelf-svg-defs" aria-hidden="true">
        <defs>
          <filter id="paper" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="8"
              result="noise"
            />
            <feDiffuseLighting
              in="noise"
              lightingColor="white"
              surfaceScale="1"
              result="diffLight"
            >
              <feDistantLight azimuth="45" elevation="35" />
            </feDiffuseLighting>
          </filter>
        </defs>
      </svg>

      {/* 3D Bookshelf */}
      <div class="bookshelf-container">
        <div class="bookshelf-arrow bookshelf-arrow-left" aria-label="Scroll left">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6L8 10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>
        <div class="bookshelf-viewport">
          <div class="bookshelf-track">
            {books.map((book) => (
              <button
                class="bookshelf-book"
                data-slug={book.slug}
                data-href={book.href}
              >
                <div
                  class="bookshelf-spine"
                  style={{
                    backgroundColor: book.spineColor,
                    color: book.textColor,
                  }}
                >
                  <span class="bookshelf-spine-texture" />
                  <span class="bookshelf-spine-title">{book.title}</span>
                </div>
                <div class="bookshelf-cover">
                  <span class="bookshelf-cover-texture" />
                  <span class="bookshelf-cover-edges" />
                  {book.cover && (
                    <img
                      src={book.cover}
                      alt={book.title}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div class="bookshelf-arrow bookshelf-arrow-right" aria-label="Scroll right">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>
      </div>

      {/* Book list grouped by category */}
      <hr class="bookshelf-divider" />
      <div class="bookshelf-list">
        {categoryOrder.map((cat) => (
          <div class="bookshelf-category">
            <h3 class="bookshelf-category-header">{cat}</h3>
            {byCategory.get(cat)!.map((book, i) => (
              <div class="bookshelf-entry">
                {i > 0 && <hr class="bookshelf-entry-rule" />}
                <a href={book.href} class="internal bookshelf-entry-link">
                  <div class="bookshelf-entry-cover">
                    {book.cover && (
                      <img
                        src={book.cover}
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div class="bookshelf-entry-meta">
                    <span class="bookshelf-entry-title">{book.title}</span>
                    <span class="bookshelf-entry-author">
                      {book.author} &middot; {book.rating}/10
                    </span>
                    {book.excerpt && (
                      <span class="bookshelf-entry-excerpt">{book.excerpt}</span>
                    )}
                  </div>
                </a>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Data for afterDOMLoaded script */}
      <script
        type="application/json"
        id="bookshelf-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(books) }}
      />
    </div>
  )
}

export default (() => Bookshelf) satisfies QuartzComponentConstructor
