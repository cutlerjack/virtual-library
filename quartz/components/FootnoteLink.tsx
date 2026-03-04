import { QuartzComponent, QuartzComponentConstructor } from "./types"

const FootnoteLink: QuartzComponent = () => {
  return null
}

FootnoteLink.afterDOMLoaded = `
  document.querySelectorAll('a[href^="#user-content-fn-"]').forEach(function(link) {
    var fnId = link.getAttribute('href').replace('#user-content-fn-', '');
    var sidenote = document.querySelector('.sidenote[data-fn="' + fnId + '"]');
    var footnoteLi = document.getElementById('user-content-fn-' + fnId);

    link.addEventListener('mouseenter', function() {
      if (sidenote) sidenote.classList.add('sidenote-highlight');
      if (footnoteLi) footnoteLi.classList.add('sidenote-highlight');
    });
    link.addEventListener('mouseleave', function() {
      if (sidenote) sidenote.classList.remove('sidenote-highlight');
      if (footnoteLi) footnoteLi.classList.remove('sidenote-highlight');
    });
  });
`

export default (() => FootnoteLink) satisfies QuartzComponentConstructor
