import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

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

export default (() => RandomRedirect) satisfies QuartzComponentConstructor
