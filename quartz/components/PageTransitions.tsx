import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const PageTransitions: QuartzComponent = () => {
  return null
}

PageTransitions.afterDOMLoaded = `
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

  // Seasonal palette — accent color shifts subtly across seasons
  var m = new Date().getMonth();
  var season = m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  document.documentElement.setAttribute('data-season', season);

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reducedMotion) {
    var transitioning = false;

    document.addEventListener('prenav', () => {
      const center = document.querySelector('.center');
      if (!center || transitioning) return;
      transitioning = true;
      center.classList.remove('settle-in');
      center.classList.add('puff-out');
    });

    document.addEventListener('nav', () => {
      const center = document.querySelector('.center');
      if (!center) return;
      transitioning = false;
      center.classList.remove('puff-out');
      void center.offsetWidth;
      center.classList.add('settle-in');
      setTimeout(() => {
        center.classList.remove('settle-in');
      }, 400);
      // Reset fixed header on navigation (page scrolls to top)
      var sh = document.querySelector('.site-header');
      var sp = document.querySelector('.header-spacer');
      if (sh) sh.classList.remove('header-fixed');
      if (sp) sp.classList.remove('active');
    });
  }

  // Terrain parallax — topographic background drifts on scroll
  if (!reducedMotion) {
    var ticking = false;
    function updateTopo() {
      var sy = window.scrollY;
      document.body.style.setProperty('--topo-y', (sy * 0.12) + 'px');
      // Field-depth parallax — margin decorations on post pages drift slightly
      var slug = document.body.getAttribute('data-slug') || '';
      if (slug.indexOf('posts/') === 0) {
        document.documentElement.style.setProperty('--margin-y', (sy * -0.015) + 'px');
      } else {
        document.documentElement.style.setProperty('--margin-y', '0px');
      }
      // Sticky header — switch to fixed positioning when scrolled
      var siteHeader = document.querySelector('.site-header');
      var spacer = document.querySelector('.header-spacer');
      if (siteHeader && spacer) {
        if (sy > 80) {
          if (!siteHeader.classList.contains('header-fixed')) {
            spacer.style.height = siteHeader.offsetHeight + 'px';
            spacer.classList.add('active');
            siteHeader.classList.add('header-fixed');
          }
        } else {
          siteHeader.classList.remove('header-fixed');
          spacer.classList.remove('active');
        }
      }
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateTopo);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addCleanup(function() {
      window.removeEventListener('scroll', onScroll);
    });
  }

  // Scroll-reveal — fade sections in as they enter the viewport
  document.addEventListener('nav', function() {
    if (reducedMotion) return;
    var targets = document.querySelectorAll('.post-shelf, .archive-section, .tag-garden-wrap, .newsletter-card, .about-dossier');
    if (targets.length === 0) return;
    targets.forEach(function(el) { el.classList.add('scroll-reveal'); });
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function(el) { observer.observe(el); });
    window.addCleanup(function() { observer.disconnect(); });
  });

  // === PAGE-TURN SOUND (opt-in) ===
  (function() {
    var audioCtx = null;
    var soundBuffer = null;

    function initAudio() {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Generate a ~200ms filtered-noise buffer shaped like a soft page turn
        var sr = audioCtx.sampleRate;
        var len = Math.floor(sr * 0.2); // 200ms
        var buf = audioCtx.createBuffer(1, len, sr);
        var data = buf.getChannelData(0);
        // White noise with exponential decay envelope + simple lowpass
        var prev = 0;
        var alpha = 0.35; // lowpass coefficient (~2kHz feel)
        for (var i = 0; i < len; i++) {
          var t = i / len;
          var envelope = Math.exp(-t * 8); // fast decay
          var noise = (Math.random() * 2 - 1) * envelope;
          // One-pole lowpass filter
          prev = prev + alpha * (noise - prev);
          data[i] = prev;
        }
        soundBuffer = buf;
      } catch(e) { /* Web Audio not supported */ }
    }

    function playPageTurn() {
      if (!audioCtx || !soundBuffer) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var source = audioCtx.createBufferSource();
      source.buffer = soundBuffer;
      var gain = audioCtx.createGain();
      gain.gain.value = 0.10;
      source.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(0);
    }

    // Inject toggle button into the floating controls sidebar
    var sidebar = document.querySelector('.page > #quartz-body > .left.sidebar');
    if (sidebar) {
      var existing = sidebar.querySelector('.sound-toggle');
      if (!existing) {
        var btn = document.createElement('button');
        btn.className = 'sound-toggle';
        var enabled = localStorage.getItem('sound-enabled') === 'true';
        btn.setAttribute('aria-label', 'Toggle page sound');
        btn.setAttribute('aria-pressed', String(enabled));
        btn.innerHTML = enabled
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
        btn.addEventListener('click', function() {
          // Lazily create AudioContext on first user gesture
          initAudio();
          var on = localStorage.getItem('sound-enabled') === 'true';
          on = !on;
          if (on) {
            localStorage.setItem('sound-enabled', 'true');
          } else {
            localStorage.removeItem('sound-enabled');
          }
          btn.setAttribute('aria-pressed', String(on));
          btn.innerHTML = on
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
          // Play a preview when enabling so user hears what it sounds like
          if (on) playPageTurn();
        });
        sidebar.appendChild(btn);
        // If sound was previously enabled, lazily init audio on first interaction
        if (enabled) {
          var lazyInit = function() {
            initAudio();
            document.removeEventListener('click', lazyInit);
            document.removeEventListener('keydown', lazyInit);
          };
          document.addEventListener('click', lazyInit, { once: true });
          document.addEventListener('keydown', lazyInit, { once: true });
        }
      }
    }

    // Play page-turn sound on prenav if enabled
    document.addEventListener('prenav', function() {
      if (localStorage.getItem('sound-enabled') !== 'true') return;
      initAudio();
      playPageTurn();
    });

    // Clean up AudioContext on SPA navigation teardown
    window.addCleanup(function() {
      if (audioCtx) {
        audioCtx.close().catch(function() {});
        audioCtx = null;
        soundBuffer = null;
      }
    });
  })();

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

export default (() => PageTransitions) satisfies QuartzComponentConstructor
