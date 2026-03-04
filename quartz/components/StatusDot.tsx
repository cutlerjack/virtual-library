import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const StatusDot: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const status = fileData.frontmatter?.status as string | undefined
  const confidence = fileData.frontmatter?.confidence as string | undefined

  if (!status && !confidence) return null

  const dotColor = status === "in-progress" ? "#c47a45" : status === "finished" ? "#5a8a5a" : undefined

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
.post-meta-cluster {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 0.6rem;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--gray);
  letter-spacing: 0.01em;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-label,
.confidence-tag {
  text-transform: lowercase;
  color: var(--gray);
}
`

export default (() => StatusDot) satisfies QuartzComponentConstructor
