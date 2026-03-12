import { QuartzComponent, QuartzComponentConstructor } from "./types"

const ConsoleGreeting: QuartzComponent = () => {
  return null
}

ConsoleGreeting.afterDOMLoaded = `
  // Console easter egg — a small greeting for the curious
  if (!window.__fieldStationGreeted) {
    window.__fieldStationGreeted = true;
    console.log(
      '%c' +
      '       N       \\n' +
      '       |       \\n' +
      '  W ---+--- E  \\n' +
      '       |       \\n' +
      '       S       \\n',
      'font-family: monospace; color: #a0522d; font-size: 12px; line-height: 1.4;'
    );
    console.log(
      '%cField Station // jackcutler.net',
      'font-family: Georgia, serif; color: #a0522d; font-size: 14px; font-style: italic;'
    );
    console.log(
      '%cYou found the workshop. View source at github.com/jackrcutler.',
      'font-family: monospace; color: #888; font-size: 11px;'
    );
  }
`

export default (() => ConsoleGreeting) satisfies QuartzComponentConstructor
