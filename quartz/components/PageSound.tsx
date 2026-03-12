import { QuartzComponent, QuartzComponentConstructor } from "./types"

const PageSound: QuartzComponent = () => {
  return null
}

PageSound.afterDOMLoaded = `
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

    function createSoundButton(sidebar) {
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

    // Re-query sidebar on each navigation to survive micromorph DOM patches.
    // AudioContext persists across navigations (expensive to recreate).
    document.addEventListener('nav', function() {
      var sidebar = document.querySelector('.page > #quartz-body > .left.sidebar');
      if (sidebar && !sidebar.querySelector('.sound-toggle')) {
        createSoundButton(sidebar);
      }

      // Play page-turn sound on prenav if enabled
      function onPrenav() {
        if (localStorage.getItem('sound-enabled') !== 'true') return;
        initAudio();
        playPageTurn();
      }
      document.addEventListener('prenav', onPrenav);
      window.addCleanup(function() {
        document.removeEventListener('prenav', onPrenav);
      });
    });
  })();
`

export default (() => PageSound) satisfies QuartzComponentConstructor
