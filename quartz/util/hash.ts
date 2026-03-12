/** Deterministic string → integer hash for seeding generative art */
export function hashTitle(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Deterministic hue from tag name (warm range 25°–75°) */
export function tagHue(tag: string): number {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = ((h << 5) - h + tag.charCodeAt(i)) | 0
  return 25 + (Math.abs(h) % 50)
}
