/** Compute accession number from a date: SC-{year}-{day-of-year} */
export function accessionNumber(date: Date): string {
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1
  return `SC-${year}-${String(dayOfYear).padStart(3, "0")}`
}
