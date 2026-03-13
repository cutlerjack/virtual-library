import { QuartzComponent, QuartzComponentConstructor } from "./types"

const FootnoteLink: QuartzComponent = () => {
  return null
}

FootnoteLink.afterDOMLoaded = `
document.addEventListener("nav", function() {
  // Clean up any existing popovers from previous navigation
  document.querySelectorAll('.fn-popover').forEach(function(el) { el.remove(); });

  var fnLinks = document.querySelectorAll('a[href^="#user-content-fn-"]');
  if (!fnLinks.length) return;

  fnLinks.forEach(function(link) {
    var fnId = link.getAttribute('href').replace('#user-content-fn-', '');
    // Prevent the default Quartz page popover from firing on footnote links
    link.dataset.noPopover = 'true';

    var footnoteLi = document.getElementById('user-content-fn-' + fnId);
    if (!footnoteLi) return;

    // Clone footnote content (without the back-reference link)
    var clone = footnoteLi.cloneNode(true);
    var backRef = clone.querySelector('a[data-footnote-backref]');
    if (backRef) backRef.remove();

    // Create popover element
    var popover = document.createElement('div');
    popover.className = 'fn-popover';
    popover.innerHTML = clone.innerHTML;

    // Attach popover to the sup element (parent of the link)
    var sup = link.closest('sup') || link.parentElement;
    sup.style.position = 'relative';
    sup.appendChild(popover);

    var showTimer = null;
    var hideTimer = null;

    function show() {
      clearTimeout(hideTimer);
      showTimer = setTimeout(function() {
        // Position: above the footnote number by default
        var supRect = sup.getBoundingClientRect();
        var popRect = popover.getBoundingClientRect();

        // Reset position to measure
        popover.style.left = '0px';
        popover.style.bottom = '100%';
        popover.style.top = 'auto';
        popover.style.marginBottom = '8px';

        popover.classList.add('visible');

        // Check if it goes off the right edge
        var realRect = popover.getBoundingClientRect();
        if (realRect.right > window.innerWidth - 16) {
          popover.style.left = (window.innerWidth - 16 - realRect.right) + 'px';
        }
        // If it goes off the left edge
        if (realRect.left < 16) {
          popover.style.left = (16 - supRect.left) + 'px';
        }
        // If it goes above the viewport, show below instead
        if (realRect.top < 16) {
          popover.style.bottom = 'auto';
          popover.style.top = '100%';
          popover.style.marginBottom = '0';
          popover.style.marginTop = '8px';
        }
      }, 150);
    }

    function hide() {
      clearTimeout(showTimer);
      hideTimer = setTimeout(function() {
        popover.classList.remove('visible');
      }, 100);
    }

    sup.addEventListener('mouseenter', show);
    sup.addEventListener('mouseleave', hide);
    popover.addEventListener('mouseenter', function() { clearTimeout(hideTimer); });
    popover.addEventListener('mouseleave', hide);

    // Prevent clicking the footnote link from scrolling to the hidden section
    link.addEventListener('click', function(e) {
      e.preventDefault();
    });

    window.addCleanup(function() {
      sup.removeEventListener('mouseenter', show);
      sup.removeEventListener('mouseleave', hide);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    });
  });
});
`

export default (() => FootnoteLink) satisfies QuartzComponentConstructor
