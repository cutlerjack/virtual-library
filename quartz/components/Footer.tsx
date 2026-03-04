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
