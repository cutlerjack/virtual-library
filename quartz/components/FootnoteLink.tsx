import { QuartzComponent, QuartzComponentConstructor } from "./types"

const FootnoteLink: QuartzComponent = () => {
  return null
}

FootnoteLink.afterDOMLoaded = `
document.addEventListener("nav", function() {
  document.querySelectorAll('a[href^="#user-content-fn-"]').forEach(function(link) {
    var fnId = link.getAttribute('href').replace('#user-content-fn-', '');
    var sidenote = document.querySelector('.sidenote[data-fn="' + fnId + '"]');
    var footnoteLi = document.getElementById('user-content-fn-' + fnId);

    function onEnter() {
      if (sidenote) sidenote.classList.add('sidenote-highlight');
      if (footnoteLi) footnoteLi.classList.add('sidenote-highlight');
    }
    function onLeave() {
      if (sidenote) sidenote.classList.remove('sidenote-highlight');
      if (footnoteLi) footnoteLi.classList.remove('sidenote-highlight');
    }
    link.addEventListener('mouseenter', onEnter);
    link.addEventListener('mouseleave', onLeave);
    link.addEventListener('focusin', onEnter);
    link.addEventListener('focusout', onLeave);
    window.addCleanup(function() {
      link.removeEventListener('mouseenter', onEnter);
      link.removeEventListener('mouseleave', onLeave);
      link.removeEventListener('focusin', onEnter);
      link.removeEventListener('focusout', onLeave);
    });
  });
});
`

export default (() => FootnoteLink) satisfies QuartzComponentConstructor
