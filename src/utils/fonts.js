export function resolveShelfFont(fontKey) {
  switch (fontKey) {
    case 'playfair':
      return "'Playfair Display', serif"
    case 'fell':
      return "'IM Fell English', serif"
    case 'baskerville':
      return "'Libre Baskerville', serif"
    case 'cinzel':
    default:
      return "'Cinzel', serif"
  }
}
