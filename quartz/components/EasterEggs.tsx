import { QuartzComponent, QuartzComponentConstructor } from "./types"

const EasterEggs: QuartzComponent = () => {
  return null
}

EasterEggs.afterDOMLoaded = `
  // === EASTER EGGS ===

  // 1. Konami code — topo background pulses to full opacity
  document.addEventListener('nav', function() {
    var seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    var pos = 0;
    function onKey(e) {
      if (e.key.toLowerCase() === seq[pos]) {
        pos++;
        if (pos === seq.length) {
          pos = 0;
          // Pulse topo background
          document.body.style.setProperty('--topo-pulse', '1');
          document.body.classList.add('topo-pulse');
          setTimeout(function() {
            document.body.classList.remove('topo-pulse');
          }, 1500);
        }
      } else {
        pos = 0;
      }
    }
    document.addEventListener('keydown', onKey);
    window.addCleanup(function() {
      document.removeEventListener('keydown', onKey);
    });
  });

  // 2. Triple-click site title — coordinate label cycles rapidly
  document.addEventListener('nav', function() {
    var titleEl = document.querySelector('.site-title');
    if (!titleEl) return;
    var cycleTimer = null;
    function onClick(e) {
      if (e.detail !== 3) return;
      e.preventDefault();
      var coord = document.querySelector('.site-coordinates');
      if (!coord) return;
      var labels = ['48\\u00b052\\u2032N','basecamp','catalog','drift','terra incognita','field notes','specimen','survey','here','elsewhere','lost'];
      var i = 0;
      var orig = coord.textContent;
      if (cycleTimer) clearInterval(cycleTimer);
      cycleTimer = setInterval(function() {
        coord.textContent = labels[i % labels.length];
        coord.style.opacity = '0.9';
        i++;
        if (i > 18) {
          clearInterval(cycleTimer);
          cycleTimer = null;
          coord.textContent = orig;
          coord.style.opacity = '';
        }
      }, 80);
    }
    titleEl.addEventListener('click', onClick);
    window.addCleanup(function() {
      titleEl.removeEventListener('click', onClick);
      if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    });
  });

  // 3. Bottom-drawer message — appears after lingering at the very bottom
  document.addEventListener('nav', function() {
    var existing = document.querySelector('.bottom-drawer-msg');
    if (existing) existing.remove();
    var footer = document.querySelector('footer');
    if (!footer) return;
    var msg = document.createElement('div');
    msg.className = 'bottom-drawer-msg';
    msg.textContent = "You\\u2019ve reached the bottom of the drawer.";
    footer.parentNode.insertBefore(msg, footer.nextSibling);
    var timer = null;
    function checkBottom() {
      var atBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 10);
      if (atBottom && !msg.classList.contains('visible')) {
        timer = setTimeout(function() {
          msg.classList.add('visible');
        }, 3000);
      } else if (!atBottom) {
        if (timer) { clearTimeout(timer); timer = null; }
        msg.classList.remove('visible');
      }
    }
    window.addEventListener('scroll', checkBottom, { passive: true });
    window.addCleanup(function() {
      window.removeEventListener('scroll', checkBottom);
      if (timer) clearTimeout(timer);
    });
  });
`

export default (() => EasterEggs) satisfies QuartzComponentConstructor
