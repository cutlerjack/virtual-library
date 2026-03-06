import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { hashTitle } from "../util/hash"

// Simple seeded PRNG (Lehmer generator)
function seededRandom(seed: number): () => number {
  let s = seed || 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

// Pattern 0: Branching / Dendritic
function branchPattern(seed: number, hue: number) {
  const rng = seededRandom(seed)
  const paths: string[] = []
  const buds: Array<{ cx: number; cy: number; r: number }> = []

  function branch(x: number, y: number, angle: number, len: number, depth: number) {
    if (depth > 4 || len < 6) {
      buds.push({ cx: x, cy: y, r: 1.2 + rng() * 0.8 })
      return
    }
    const endX = x + Math.cos(angle) * len
    const endY = y + Math.sin(angle) * len
    paths.push(`M${x.toFixed(1)},${y.toFixed(1)}L${endX.toFixed(1)},${endY.toFixed(1)}`)

    const spread = 0.3 + rng() * 0.5
    const shrink = 0.55 + rng() * 0.2
    branch(endX, endY, angle - spread, len * shrink, depth + 1)
    branch(endX, endY, angle + spread, len * shrink, depth + 1)
    // Occasional third branch
    if (rng() > 0.6) {
      branch(endX, endY, angle + (rng() - 0.5) * 0.3, len * shrink * 0.7, depth + 2)
    }
  }

  const startAngle = -Math.PI / 2 + (rng() - 0.5) * 0.3
  branch(30, 170, startAngle, 28 + rng() * 12, 0)

  return (
    <>
      {paths.map((d, i) => (
        <path
          key={`b${i}`}
          d={d}
          stroke={`hsla(${hue}, 30%, 40%, 0.6)`}
          stroke-width={1.2 - (i / paths.length) * 0.4}
          fill="none"
          stroke-linecap="round"
        />
      ))}
      {buds.map((b, i) => (
        <circle
          key={`c${i}`}
          cx={b.cx}
          cy={b.cy}
          r={b.r}
          fill={`hsla(${(hue + 15) % 360}, 35%, 50%, 0.55)`}
        />
      ))}
    </>
  )
}

// Pattern 1: Spiral / Shell
function spiralPattern(seed: number, hue: number) {
  const rng = seededRandom(seed)
  const points: Array<{ x: number; y: number }> = []
  const dots: Array<{ cx: number; cy: number; r: number }> = []
  const cx = 30
  const cy = 100
  const turns = 2.5 + rng() * 1.5
  const steps = 60 + Math.floor(rng() * 20)

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2
    const r = 3 + (i / steps) * (25 + rng() * 10)
    const x = cx + Math.cos(t) * r
    const y = cy + Math.sin(t) * r
    points.push({ x, y })
    // Scatter small dots along the spiral
    if (i > 10 && i % (5 + Math.floor(rng() * 4)) === 0) {
      dots.push({ cx: x + (rng() - 0.5) * 3, cy: y + (rng() - 0.5) * 3, r: 0.8 + rng() * 1 })
    }
  }

  const pathD =
    "M" +
    points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L")

  return (
    <>
      <path
        d={pathD}
        stroke={`hsla(${hue}, 30%, 40%, 0.5)`}
        stroke-width="1"
        fill="none"
        stroke-linecap="round"
      />
      {dots.map((d, i) => (
        <circle
          key={`d${i}`}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={`hsla(${(hue + 15) % 360}, 35%, 50%, 0.5)`}
        />
      ))}
    </>
  )
}

// Pattern 2: Contour / Topographic rings
function contourPattern(seed: number, hue: number) {
  const rng = seededRandom(seed)
  const rings: string[] = []
  const cx = 30
  const cy = 95
  const levels = 4 + Math.floor(rng() * 3)

  for (let i = 0; i < levels; i++) {
    const rx = 8 + i * (4 + rng() * 3)
    const ry = 6 + i * (3 + rng() * 2.5)
    const rot = (rng() - 0.5) * 15
    const wobble = rng() * 2

    // Create slightly wobbly ellipse via 8-point cubic bezier
    const pts: Array<{ x: number; y: number }> = []
    const numPts = 8
    for (let j = 0; j < numPts; j++) {
      const angle = (j / numPts) * Math.PI * 2
      const r = 1 + (rng() - 0.5) * wobble
      const radAngle = (rot * Math.PI) / 180
      const rawX = (rx + r) * Math.cos(angle)
      const rawY = (ry + r) * Math.sin(angle)
      pts.push({
        x: cx + rawX * Math.cos(radAngle) - rawY * Math.sin(radAngle),
        y: cy + rawX * Math.sin(radAngle) + rawY * Math.cos(radAngle),
      })
    }

    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
    for (let j = 0; j < numPts; j++) {
      const curr = pts[j]
      const next = pts[(j + 1) % numPts]
      const cp1x = curr.x + (next.x - pts[(j - 1 + numPts) % numPts].x) * 0.2
      const cp1y = curr.y + (next.y - pts[(j - 1 + numPts) % numPts].y) * 0.2
      const cp2x = next.x - (pts[(j + 2) % numPts].x - curr.x) * 0.2
      const cp2y = next.y - (pts[(j + 2) % numPts].y - curr.y) * 0.2
      d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`
    }
    d += "Z"
    rings.push(d)
  }

  return (
    <>
      {rings.map((d, i) => (
        <path
          key={`r${i}`}
          d={d}
          stroke={`hsla(${hue}, 25%, 42%, ${0.35 + (i / rings.length) * 0.25})`}
          stroke-width="0.9"
          fill="none"
        />
      ))}
      <circle
        cx={cx}
        cy={cy}
        r="1.5"
        fill={`hsla(${hue}, 30%, 42%, 0.55)`}
      />
    </>
  )
}

// Pattern 3: Wave / Oscillation
function wavePattern(seed: number, hue: number) {
  const rng = seededRandom(seed)
  const waves: string[] = []
  const numWaves = 4 + Math.floor(rng() * 3)

  for (let w = 0; w < numWaves; w++) {
    const baseY = 30 + w * (130 / numWaves)
    const amplitude = 4 + rng() * 8
    const frequency = 1.5 + rng() * 2
    const phase = rng() * Math.PI * 2
    const pts: string[] = []

    for (let x = 2; x <= 58; x += 2) {
      const y = baseY + Math.sin((x / 58) * Math.PI * frequency + phase) * amplitude
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    waves.push("M" + pts.join("L"))
  }

  return (
    <>
      {waves.map((d, i) => (
        <path
          key={`w${i}`}
          d={d}
          stroke={`hsla(${hue}, 28%, 40%, ${0.4 + (i / waves.length) * 0.25})`}
          stroke-width="1"
          fill="none"
          stroke-linecap="round"
        />
      ))}
    </>
  )
}

// Pattern 4: Lattice / Crystal
function latticePattern(seed: number, hue: number) {
  const rng = seededRandom(seed)
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const nodes: Array<{ cx: number; cy: number }> = []
  const angle = (rng() * 30 - 15) * (Math.PI / 180)
  const spacing = 8 + rng() * 4
  const cols = Math.floor(50 / spacing)
  const rows = Math.floor(150 / spacing)

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const baseX = 5 + c * spacing
      const baseY = 20 + r * spacing
      // Slight jitter
      const x = baseX + (rng() - 0.5) * 2
      const y = baseY + (rng() - 0.5) * 2
      // Rotate around center
      const cx = 30, cy = 95
      const dx = x - cx, dy = y - cy
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle) + cx
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle) + cy

      if (rx > 2 && rx < 58 && ry > 10 && ry < 185) {
        nodes.push({ cx: rx, cy: ry })
        // Connect to right neighbor
        if (c < cols) {
          const nx = (baseX + spacing) + (rng() - 0.5) * 2
          const ny = baseY + (rng() - 0.5) * 2
          const nrx = (nx - cx) * Math.cos(angle) - (ny - cy) * Math.sin(angle) + cx
          const nry = (nx - cx) * Math.sin(angle) + (ny - cy) * Math.cos(angle) + cy
          if (nrx > 2 && nrx < 58 && nry > 10 && nry < 185) {
            lines.push({ x1: rx, y1: ry, x2: nrx, y2: nry })
          }
        }
        // Connect to bottom neighbor
        if (r < rows) {
          const nx = baseX + (rng() - 0.5) * 2
          const ny = (baseY + spacing) + (rng() - 0.5) * 2
          const nrx = (nx - cx) * Math.cos(angle) - (ny - cy) * Math.sin(angle) + cx
          const nry = (nx - cx) * Math.sin(angle) + (ny - cy) * Math.cos(angle) + cy
          if (nrx > 2 && nrx < 58 && nry > 10 && nry < 185) {
            lines.push({ x1: rx, y1: ry, x2: nrx, y2: nry })
          }
        }
      }
    }
  }

  return (
    <>
      {lines.map((l, i) => (
        <line
          key={`l${i}`}
          x1={l.x1.toFixed(1)}
          y1={l.y1.toFixed(1)}
          x2={l.x2.toFixed(1)}
          y2={l.y2.toFixed(1)}
          stroke={`hsla(${hue}, 22%, 42%, 0.35)`}
          stroke-width="0.6"
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={`n${i}`}
          cx={n.cx.toFixed(1)}
          cy={n.cy.toFixed(1)}
          r="0.8"
          fill={`hsla(${hue}, 30%, 42%, 0.45)`}
        />
      ))}
    </>
  )
}

const patternGenerators = [branchPattern, spiralPattern, contourPattern, wavePattern, latticePattern]

const Frontispiece: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const slug = fileData.slug ?? ""

  // Only render on post pages
  if (
    slug === "index" ||
    slug === "about" ||
    slug === "random" ||
    slug === "archive" ||
    slug === "tags" ||
    slug.startsWith("tags/")
  ) {
    return null
  }

  const title = fileData.frontmatter?.title ?? slug
  const seed = hashTitle(title)
  const patternIndex = seed % patternGenerators.length
  const hue = 25 + (seed % 40) // Constrain to warm amber range (25°–65°)
  let pattern
  try {
    pattern = patternGenerators[patternIndex](seed, hue)
  } catch {
    return null // Graceful fallback if pattern generation fails
  }

  return (
    <div class="frontispiece" aria-hidden="true">
      <svg
        class="frontispiece-svg"
        viewBox="0 0 60 195"
        width="60"
        height="195"
        xmlns="http://www.w3.org/2000/svg"
      >
        {pattern}
      </svg>
    </div>
  )
}

// Move the frontispiece element from beforeBody into the article on each navigation
Frontispiece.afterDOMLoaded = `
document.addEventListener("nav", function() {
  var fp = document.querySelector('.frontispiece');
  if (!fp) return;
  var article = document.querySelector('article.popover-hint');
  if (!article) return;
  // Only move if not already inside the article
  if (!article.contains(fp)) {
    article.insertBefore(fp, article.firstChild);
  }
});
`

Frontispiece.css = `
.frontispiece {
  display: none;
}

/* Wide screens: position in the left margin */
@media (min-width: 1000px) {
  .frontispiece {
    display: block;
    position: absolute;
    left: -80px;
    top: 2rem;
    width: 60px;
    opacity: 0.5;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .frontispiece-svg {
    display: block;
  }

  [saved-theme="dark"] .frontispiece {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .frontispiece {
    transition: none;
  }
}
`

export default (() => Frontispiece) satisfies QuartzComponentConstructor
