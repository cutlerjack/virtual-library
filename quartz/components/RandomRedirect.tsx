import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

const RandomRedirect: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  // Only render on the /random page
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
    .map((f) => `${baseDir}/${f.slug}`)

  const fallback = baseDir || "/"
  const postsJson = JSON.stringify(posts)

  return (
    <div class="random-redirect">
      <p>Redirecting to a random post&hellip;</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var posts = ${postsJson};
              if (posts.length > 0) {
                var idx = Math.floor(Math.random() * posts.length);
                window.location.replace(posts[idx]);
              } else {
                window.location.replace("${fallback}");
              }
            })();
          `,
        }}
      />
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

export default (() => RandomRedirect) satisfies QuartzComponentConstructor
