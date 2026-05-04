export function adjustBrightness(color, amount) {
  if (!color) return '#654321'

  let r
  let g
  let b

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match) [r, g, b] = match.map(Number)
  } else {
    return color
  }

  r = Math.max(0, Math.min(255, r + amount))
  g = Math.max(0, Math.min(255, g + amount))
  b = Math.max(0, Math.min(255, b + amount))

  return `rgb(${r}, ${g}, ${b})`
}

export function getContrastColor(color) {
  if (!color) return '#f5f0e1'

  let r
  let g
  let b

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match) [r, g, b] = match.map(Number)
  } else {
    return '#f5f0e1'
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1a1a' : '#f5f0e1'
}
