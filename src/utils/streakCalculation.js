export function calculateCadenceStreak(dates, maxGapDays) {
  if (dates.length === 0) {
    return { current: 0, best: 0 }
  }
  let current = 1
  let best = 1
  let run = 1
  for (let i = 1; i < dates.length; i += 1) {
    const gap = Math.floor((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
    if (gap <= maxGapDays) {
      run += 1
    } else {
      best = Math.max(best, run)
      run = 1
    }
  }
  best = Math.max(best, run)
  const lastGap = Math.floor((Date.now() - dates[dates.length - 1]) / (1000 * 60 * 60 * 24))
  current = lastGap <= maxGapDays ? run : 0
  return { current, best }
}
