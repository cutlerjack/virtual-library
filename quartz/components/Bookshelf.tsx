import { resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface BookMeta {
  title: string
  author: string
  rating: number
  category: string
  cover: string
  spineColor: string
  textColor: string
  href: string
  slug: string
  excerpt: string
}

const Bookshelf: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const slug = fileData.slug ?? ""
  const isReadingIndex =
    slug === "reading" || slug === "reading/" || slug === "reading/index"
  if (!isReadingIndex) return null

  // Find all book files (in reading/ folder, not the index itself)
  const bookFiles = allFiles.filter((f) => {
    const s = f.slug ?? ""
    return s.startsWith("reading/") && s !== "reading/" && s !== "reading/index"
  })

  // Build book metadata
  const books: BookMeta[] = bookFiles
    .map((f) => {
      const fm = f.frontmatter ?? {}
      return {
        title: (fm.title as string) ?? "Untitled",
        author: (fm.author as string) ?? "",
        rating: (fm.rating as number) ?? 0,
        category: (fm.category as string) ?? "uncategorized",
        cover: (fm.cover as string) ?? "",
        spineColor: (fm.spineColor as string) ?? "#5a5a5a",
        textColor: (fm.textColor as string) ?? "#fff",
        href: resolveRelative(fileData.slug!, f.slug!),
        slug: f.slug!,
        excerpt: (f.description ?? "").slice(0, 200),
      }
    })
    .sort((a, b) => b.rating - a.rating)

  if (books.length === 0) return null

  // Group by category
  const categoryOrder: string[] = []
  const byCategory = new Map<string, BookMeta[]>()
  for (const book of books) {
    if (!byCategory.has(book.category)) {
      byCategory.set(book.category, [])
      categoryOrder.push(book.category)
    }
    byCategory.get(book.category)!.push(book)
  }

  return (
    <div class="bookshelf-wrap">
      {/* SVG paper texture filter */}
      <svg class="bookshelf-svg-defs" aria-hidden="true">
        <defs>
          <filter id="paper" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="8"
              result="noise"
            />
            <feDiffuseLighting
              in="noise"
              lightingColor="white"
              surfaceScale="1"
              result="diffLight"
            >
              <feDistantLight azimuth="45" elevation="35" />
            </feDiffuseLighting>
          </filter>
        </defs>
      </svg>

      {/* 3D Bookshelf */}
      <div class="bookshelf-container">
        <button class="bookshelf-arrow bookshelf-arrow-left" aria-label="Scroll left">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6L8 10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
        <div class="bookshelf-viewport">
          <div class="bookshelf-track">
            {books.map((book) => (
              <button
                class="bookshelf-book"
                data-slug={book.slug}
                data-href={book.href}
                aria-label={`Open ${book.title} by ${book.author}`}
              >
                <div
                  class="bookshelf-spine"
                  style={{
                    backgroundColor: book.spineColor,
                    color: book.textColor,
                  }}
                >
                  <span class="bookshelf-spine-texture" />
                  <span class="bookshelf-spine-title">{book.title}</span>
                </div>
                <div class="bookshelf-cover">
                  <span class="bookshelf-cover-texture" />
                  <span class="bookshelf-cover-edges" />
                  {book.cover && (
                    <img
                      src={book.cover}
                      alt={book.title}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <button class="bookshelf-arrow bookshelf-arrow-right" aria-label="Scroll right">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
      </div>

      {/* Book list grouped by category */}
      <hr class="bookshelf-divider" />
      <div class="bookshelf-list">
        {categoryOrder.map((cat) => (
          <div class="bookshelf-category">
            <h3 class="bookshelf-category-header">{cat}</h3>
            {byCategory.get(cat)!.map((book, i) => (
              <div class="bookshelf-entry">
                {i > 0 && <hr class="bookshelf-entry-rule" />}
                <a href={book.href} class="internal bookshelf-entry-link">
                  <div class="bookshelf-entry-cover">
                    {book.cover && (
                      <img
                        src={book.cover}
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div class="bookshelf-entry-meta">
                    <span class="bookshelf-entry-title">{book.title}</span>
                    <span class="bookshelf-entry-author">
                      {book.author} &middot; {book.rating}/10
                    </span>
                    {book.excerpt && (
                      <span class="bookshelf-entry-excerpt">{book.excerpt}</span>
                    )}
                  </div>
                </a>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Data for afterDOMLoaded script */}
      <script
        type="application/json"
        id="bookshelf-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(books) }}
      />
    </div>
  )
}

Bookshelf.afterDOMLoaded = `
document.addEventListener("nav", function() {
  var dataEl = document.getElementById("bookshelf-data");
  if (!dataEl) return;
  var viewport = document.querySelector(".bookshelf-viewport");
  if (!viewport) return;
  var track = document.querySelector(".bookshelf-track");
  if (!track) return;
  var arrowLeft = document.querySelector(".bookshelf-arrow-left");
  var arrowRight = document.querySelector(".bookshelf-arrow-right");
  if (!arrowLeft || !arrowRight) return;

  var books;
  try { books = JSON.parse(dataEl.textContent || "[]"); } catch(e) { return; }
  if (!books.length) return;

  var bookEls = track.querySelectorAll(".bookshelf-book");
  if (!bookEls.length) return;

  var SPINE_W = 42;
  var COVER_W = SPINE_W * 4;
  var BOOK_W_OPEN = SPINE_W * 5;
  var GAP = 4;
  var SCROLL_SPEED = 3;
  var SCROLL_INTERVAL = 10;

  var scrollX = 0;
  var openIndex = -1;
  var isScrolling = false;
  var scrollInterval = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getBooksInViewport() {
    return viewport.getBoundingClientRect().width / (SPINE_W + GAP);
  }

  function getMaxScroll() {
    var booksInView = getBooksInViewport();
    var extra = openIndex > -1 ? COVER_W : 0;
    return Math.max(0, (SPINE_W + GAP) * (books.length - booksInView) + extra + 5);
  }

  function clampScroll(val) {
    return Math.max(0, Math.min(getMaxScroll(), val));
  }

  function applyScroll() {
    for (var i = 0; i < bookEls.length; i++) {
      bookEls[i].style.transform = "translateX(-" + scrollX + "px)";
      bookEls[i].style.transition = isScrolling
        ? "transform 100ms linear"
        : "all 500ms ease";
      if (reducedMotion) bookEls[i].style.transition = "none";
    }
    arrowLeft.setAttribute("data-hidden", scrollX <= 0 ? "true" : "false");
    arrowRight.setAttribute("data-hidden", scrollX >= getMaxScroll() ? "true" : "false");
  }

  function openBook(index) {
    if (openIndex === index) {
      bookEls[index].classList.remove("open");
      openIndex = -1;
    } else {
      if (openIndex > -1) bookEls[openIndex].classList.remove("open");
      bookEls[index].classList.add("open");
      openIndex = index;
      var booksInView = getBooksInViewport();
      scrollX = clampScroll((index - (booksInView - 4.5) / 2) * (SPINE_W + GAP));
    }
    applyScroll();
  }

  function onBookClick(e) {
    var btn = e.currentTarget;
    var idx = Array.prototype.indexOf.call(bookEls, btn);
    if (idx === -1) return;
    var wasOpen = (openIndex === idx);
    openBook(idx);

    if (wasOpen) {
      var href = btn.getAttribute("data-href");
      if (href) {
        var link = document.createElement("a");
        link.href = href;
        link.classList.add("internal");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  for (var i = 0; i < bookEls.length; i++) {
    bookEls[i].addEventListener("click", onBookClick);
  }

  var isMobile = "ontouchstart" in window;
  var startEvt = isMobile ? "touchstart" : "mouseenter";
  var stopEvt = isMobile ? "touchend" : "mouseleave";

  function startScrollRight() {
    isScrolling = true;
    scrollInterval = setInterval(function() {
      scrollX = clampScroll(scrollX + SCROLL_SPEED);
      applyScroll();
    }, SCROLL_INTERVAL);
  }

  function startScrollLeft() {
    isScrolling = true;
    scrollInterval = setInterval(function() {
      scrollX = clampScroll(scrollX - SCROLL_SPEED);
      applyScroll();
    }, SCROLL_INTERVAL);
  }

  function stopScroll() {
    isScrolling = false;
    if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
    applyScroll();
  }

  arrowRight.addEventListener(startEvt, startScrollRight);
  arrowRight.addEventListener(stopEvt, stopScroll);
  arrowLeft.addEventListener(startEvt, startScrollLeft);
  arrowLeft.addEventListener(stopEvt, stopScroll);
  document.addEventListener("mouseup", stopScroll);
  document.addEventListener("touchend", stopScroll);

  var currentPath = window.location.pathname.replace(/\\/$/, "");
  for (var j = 0; j < books.length; j++) {
    var bookPath = "/" + books[j].slug.replace(/\\/$/, "");
    if (currentPath === bookPath || currentPath.endsWith(bookPath)) {
      openBook(j);
      break;
    }
  }

  function onResize() {
    scrollX = clampScroll(scrollX);
    applyScroll();
  }
  window.addEventListener("resize", onResize);

  applyScroll();

  if (window.addCleanup) {
    window.addCleanup(function() {
      for (var k = 0; k < bookEls.length; k++) {
        bookEls[k].removeEventListener("click", onBookClick);
      }
      arrowRight.removeEventListener(startEvt, startScrollRight);
      arrowRight.removeEventListener(stopEvt, stopScroll);
      arrowLeft.removeEventListener(startEvt, startScrollLeft);
      arrowLeft.removeEventListener(stopEvt, stopScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mouseup", stopScroll);
      document.removeEventListener("touchend", stopScroll);
      stopScroll();
    });
  }
});
`

export default (() => Bookshelf) satisfies QuartzComponentConstructor
