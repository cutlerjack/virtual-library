export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function toSvgUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function downloadSvg(svg, filename) {
  const link = document.createElement('a')
  link.href = toSvgUrl(svg)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function buildChronicleSvg({ year, books, pages, streak, level, palette, theme }) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
    <defs>
      <linearGradient id="bg" x1="0" x2="1">
        <stop offset="0%" stop-color="${palette.bg}"/>
        <stop offset="100%" stop-color="${theme === 'scifi' ? '#0f141c' : '#efe7dc'}"/>
      </linearGradient>
    </defs>
    <rect width="900" height="520" rx="28" fill="url(#bg)"/>
    <rect x="40" y="40" width="820" height="440" rx="22" fill="none" stroke="${palette.accent}" stroke-opacity="0.2"/>
    <text x="60" y="90" font-size="18" fill="${palette.muted}" letter-spacing="4" font-family="Space Grotesk, Inter, sans-serif">YEARLY CHRONICLE</text>
    <text x="60" y="140" font-size="44" fill="${palette.fg}" letter-spacing="6" font-family="Space Grotesk, Inter, sans-serif">${year}</text>

    <text x="60" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">BOOKS READ</text>
    <text x="60" y="265" font-size="36" fill="${palette.fg}">${books}</text>

    <text x="260" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">PAGES</text>
    <text x="260" y="265" font-size="36" fill="${palette.fg}">${pages.toLocaleString()}</text>

    <text x="460" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">STREAK</text>
    <text x="460" y="265" font-size="36" fill="${palette.fg}">${streak} days</text>

    <text x="660" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">LEVEL</text>
    <text x="660" y="265" font-size="36" fill="${palette.fg}">${level}</text>

    <rect x="60" y="320" width="780" height="8" rx="4" fill="${theme === 'scifi' ? '#1b2430' : '#e7ddd1'}"/>
    <rect x="60" y="320" width="${Math.min(780, 120 + books * 8)}" height="8" rx="4" fill="${palette.accent}"/>
    <text x="60" y="370" font-size="16" fill="${palette.muted}">A private archive of your reading year.</text>
  </svg>
  `
}

export function buildShelfSvg({ year, titles, palette, theme }) {
  const rows = titles.slice(0, 6).map((title, index) => {
    const y = 150 + index * 40
    return `<text x="80" y="${y}" font-size="20" fill="${palette.fg}" font-family="Space Grotesk, Inter, sans-serif">${escapeXml(title)}</text>`
  }).join('')

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
    <rect width="900" height="520" rx="28" fill="${palette.bg}"/>
    <text x="60" y="90" font-size="18" fill="${palette.muted}" letter-spacing="4" font-family="Space Grotesk, Inter, sans-serif">SHELF SNAPSHOT</text>
    <text x="60" y="130" font-size="28" fill="${palette.fg}" letter-spacing="3" font-family="Space Grotesk, Inter, sans-serif">${year}</text>
    <rect x="60" y="160" width="780" height="1" fill="${theme === 'scifi' ? '#1e2834' : '#d8cbbd'}"/>
    ${rows || `<text x="80" y="220" font-size="20" fill="${palette.muted}">No titles yet.</text>`}
    <text x="60" y="470" font-size="14" fill="${palette.muted}">private archive • virtual library</text>
  </svg>
  `
}
