const SPINE_WIDTHS = [22, 28, 34, 42, 52]
const COVER_WIDTHS = [84, 98, 112, 128, 148]

function getWidthIndex(pageCount) {
  if (pageCount <= 160) return 0
  if (pageCount <= 260) return 1
  if (pageCount <= 360) return 2
  if (pageCount <= 500) return 3
  return 4
}

export function getSpineWidth(pageCount) {
  return SPINE_WIDTHS[getWidthIndex(pageCount)]
}

export function getCoverWidth(pageCount) {
  return COVER_WIDTHS[getWidthIndex(pageCount)]
}
