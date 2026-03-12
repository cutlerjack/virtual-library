import { QuartzComponent, QuartzComponentConstructor } from "./types"

const SeasonalPalette: QuartzComponent = () => {
  return null
}

SeasonalPalette.afterDOMLoaded = `
  // Seasonal palette — accent color shifts subtly across seasons
  var m = new Date().getMonth();
  var season = m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  document.documentElement.setAttribute('data-season', season);
`

export default (() => SeasonalPalette) satisfies QuartzComponentConstructor
