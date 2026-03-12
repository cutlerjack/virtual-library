import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { isContentPost } from "../util/posts"
import style from "./styles/footer.scss"

export default (() => {
  const Footer: QuartzComponent = ({ displayClass, allFiles }: QuartzComponentProps) => {
    // Count total words across all posts
    const totalWords = (allFiles ?? [])
      .filter(isContentPost)
      .reduce((sum, f) => {
        // Use full text content, not the truncated description excerpt
        const text = (f as any).text ?? f.description ?? ""
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
        <div class="colophon-card">
          <div class="colophon-ruled-line" aria-hidden="true" />
          <div class="colophon-fields">
            <div class="colophon-field">
              <span class="colophon-label">Provenance</span>
              <span class="colophon-value">Built by hand</span>
            </div>
            <div class="colophon-field">
              <span class="colophon-label">Typefaces</span>
              <span class="colophon-value">EB Garamond &amp; IBM Plex Mono</span>
            </div>
            <div class="colophon-field">
              <span class="colophon-label">Corpus</span>
              <span class="colophon-value">{wordLabel}</span>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
