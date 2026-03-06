import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const StatusDot: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const status = fileData.frontmatter?.status as string | undefined
  const confidence = fileData.frontmatter?.confidence as string | undefined

  if (!status && !confidence) return null

  const dotColor = status === "in-progress" ? "var(--color-status-active)" : status === "finished" ? "var(--color-status-complete)" : undefined

  return (
    <div class="post-meta-cluster">
      {status && (
        <span class="status-indicator">
          {dotColor && <span class="status-dot" style={{ backgroundColor: dotColor }} />}
          <span class="status-label">{status}</span>
        </span>
      )}
      {confidence && <span class="confidence-tag">{confidence}</span>}
    </div>
  )
}

StatusDot.css = `
/* .post-meta-cluster lives in custom.scss — single source of truth */
`

export default (() => StatusDot) satisfies QuartzComponentConstructor
