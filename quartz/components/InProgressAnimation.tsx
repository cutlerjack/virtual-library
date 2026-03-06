import { QuartzComponent, QuartzComponentConstructor } from "./types"

const InProgressAnimation: QuartzComponent = () => {
  return null
}

InProgressAnimation.afterDOMLoaded = `
document.addEventListener("nav", function() {
  if (document.body.getAttribute('data-slug') !== 'about') return;

  var emElements = document.querySelectorAll('article em');
  var target = null;
  for (var i = 0; i < emElements.length; i++) {
    if (emElements[i].textContent.indexOf('permanently in progress') !== -1) {
      target = emElements[i];
      break;
    }
  }
  if (!target) return;
  if (target.classList.contains('in-progress-text')) return;

  var words = target.textContent.split(' ');
  target.innerHTML = '';
  target.classList.add('in-progress-text');
  words.forEach(function(word, idx) {
    var span = document.createElement('span');
    span.textContent = word + ' ';
    span.className = 'in-progress-word';
    span.style.animationDelay = (idx * 1.6) + 's';
    target.appendChild(span);
  });
});
`

InProgressAnimation.css = `
.in-progress-text {
  display: inline;
}

.in-progress-word {
  display: inline;
  animation: word-breathe 10s ease-in-out infinite;
}

@keyframes word-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .in-progress-word {
    animation: none;
    opacity: 1;
  }
}
`

export default (() => InProgressAnimation) satisfies QuartzComponentConstructor
