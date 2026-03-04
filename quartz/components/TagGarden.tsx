import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"

interface TagData {
  tagName: string
  posts: Array<{ title: string; slug: string; date: string }>
}

const TagGarden: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const slug = fileData.slug ?? ""
  const isTagsIndex = slug === "tags" || slug === "tags/" || slug === "tags/index"
  if (!isTagsIndex) return null

  // Filter to real content posts
  const contentFiles = allFiles.filter((f) => {
    const slug = f.slug ?? ""
    return (
      slug &&
      slug !== "index" &&
      slug !== "about" &&
      slug !== "random" &&
      !slug.startsWith("tags/")
    )
  })

  // Build tag -> posts map
  const tagMap = new Map<string, TagData["posts"]>()
  for (const f of contentFiles) {
    const tags = f.frontmatter?.tags as string[] | undefined
    if (!tags) continue
    for (const tag of tags) {
      const t = tag.toLowerCase().trim()
      if (!t) continue
      if (!tagMap.has(t)) tagMap.set(t, [])
      tagMap.get(t)!.push({
        title: (f.frontmatter?.title as string) ?? f.slug ?? "Untitled",
        slug: f.slug!,
        date: (f.frontmatter?.date as string) ?? "",
      })
    }
  }

  // Sort tags alphabetically, sort posts within each tag by date desc
  const tagData: TagData[] = Array.from(tagMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tagName, posts]) => ({
      tagName,
      posts: posts.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime()
        return 0
      }),
    }))

  const totalPosts = contentFiles.filter((f) => f.frontmatter?.tags).length
  const baseUrl = fileData.slug!

  // Resolve post slugs to relative hrefs for tooltip links
  const tagDataWithHrefs = tagData.map((td) => ({
    tagName: td.tagName,
    posts: td.posts.map((p) => ({
      title: p.title,
      href: resolveRelative(baseUrl, p.slug as any),
      date: p.date,
    })),
  }))

  return (
    <div class="tag-garden-container">
      <canvas class="tag-garden-canvas" />
      <span class="tag-garden-count">{totalPosts} {totalPosts === 1 ? "seedling" : "seedlings"} so far.</span>
      <div class="tag-garden-tooltip">
        <div class="tag-garden-tooltip-title" />
        <div class="tag-garden-tooltip-links" />
      </div>
      <div class="tag-garden-mobile">
        <span class="tag-garden-count" style={{ position: "static", transform: "none", textAlign: "center", display: "block", marginBottom: "1.5rem" }}>
          {totalPosts} {totalPosts === 1 ? "seedling" : "seedlings"} so far.
        </span>
        <ul class="tag-garden-mobile-list">
          {tagData.map((td) => {
            const tagHref = resolveRelative(baseUrl, `tags/${td.tagName}` as any)
            return (
              <li>
                <a href={tagHref} class="internal">
                  {td.tagName}
                </a>
                <span class="tag-garden-mobile-count">({td.posts.length})</span>
              </li>
            )
          })}
        </ul>
      </div>
      <script
        type="application/json"
        id="tag-garden-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(tagDataWithHrefs) }}
      />
    </div>
  )
}

TagGarden.afterDOMLoaded = `
(function() {
  var dataEl = document.getElementById("tag-garden-data");
  if (!dataEl) return;
  var canvas = document.querySelector(".tag-garden-canvas");
  if (!canvas) return;
  var container = document.querySelector(".tag-garden-container");
  if (!container) return;
  var tooltip = document.querySelector(".tag-garden-tooltip");
  if (!tooltip) return;

  var tagData;
  try {
    tagData = JSON.parse(dataEl.textContent || "[]");
  } catch(e) { return; }
  if (!tagData.length) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Seeded random from string hash
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h;
  }

  function seededRandom(seed) {
    var s = seed;
    return function() {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  var BUD_COLORS = ["#c47a45", "#8a7e6b", "#5a8a5a", "#6b7e8a"];
  var STEM_COLOR = "rgba(232, 228, 220, 0.3)";
  var STEM_HIGHLIGHT = "rgba(232, 228, 220, 0.7)";
  var BUD_HIGHLIGHT_ALPHA = 1.0;
  var PARTICLE_COLOR = "rgba(232, 228, 220, 0.08)";
  var LABEL_COLOR = "rgba(232, 228, 220, 0.6)";
  var BG = "#141822";

  // Plant data structures
  var plants = [];
  var particles = [];
  var hoveredPlantIdx = -1;
  var animFrame = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    var rect = container.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 500 * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = "500px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutPlants(rect.width, 500);
    draw();
  }

  function layoutPlants(w, h) {
    plants = [];
    var n = tagData.length;
    if (n === 0) return;

    var padding = 60;
    // For few tags, don't spread across the full width — cluster more centrally
    var maxSpread = Math.min(w - padding * 2, n * 120);
    var startX = (w - maxSpread) / 2;
    var baseY = h - 30; // ground line

    for (var i = 0; i < n; i++) {
      var td = tagData[i];
      var rng = seededRandom(hashStr(td.tagName));

      // Distribute plants across available spread
      var baseX;
      if (n === 1) {
        baseX = w / 2;
      } else {
        baseX = startX + (maxSpread / (n - 1)) * i;
      }
      // Add slight horizontal jitter
      baseX += (rng() - 0.5) * Math.min(maxSpread / n * 0.3, 20);
      baseX = Math.max(padding, Math.min(w - padding, baseX));

      var postCount = td.posts.length;
      // Stem height: proportional to post count, with minimum
      var minH = 60;
      var maxH = h - 100;
      var stemH = Math.min(maxH, minH + postCount * 35 + rng() * 20);

      // Build stem segments with slight wobble
      var segments = [];
      var numSegs = Math.max(postCount, 3);
      var segH = stemH / numSegs;
      var cx = baseX;
      var cy = baseY;
      segments.push({ x: cx, y: cy });

      for (var s = 0; s < numSegs; s++) {
        var wobble = (rng() - 0.5) * 6;
        cx += wobble;
        cy -= segH;
        segments.push({ x: cx, y: cy });
      }

      // Position buds along the stem (one per post)
      var buds = [];
      for (var p = 0; p < postCount; p++) {
        // Place buds evenly along the upper portion of the stem
        var t = (p + 1) / (postCount + 1);
        var segIdx = Math.floor(t * (segments.length - 1));
        var segT = (t * (segments.length - 1)) - segIdx;
        if (segIdx >= segments.length - 1) { segIdx = segments.length - 2; segT = 1; }

        var sx = segments[segIdx].x + (segments[segIdx + 1].x - segments[segIdx].x) * segT;
        var sy = segments[segIdx].y + (segments[segIdx + 1].y - segments[segIdx].y) * segT;

        // Branch direction (alternating sides with randomness)
        var side = (p % 2 === 0) ? 1 : -1;
        var branchLen = 12 + rng() * 10;
        var branchAngle = (-Math.PI / 4 + rng() * Math.PI / 6) * side;
        var bx = sx + Math.cos(branchAngle) * branchLen * side;
        var by = sy + Math.sin(branchAngle) * branchLen;

        buds.push({
          stemX: sx, stemY: sy,
          x: bx, y: by,
          color: BUD_COLORS[(hashStr(td.tagName) + p) & 3],
          radius: 3 + rng() * 1.5,
          post: td.posts[p]
        });
      }

      plants.push({
        tagName: td.tagName,
        baseX: baseX,
        baseY: baseY,
        segments: segments,
        buds: buds,
        hitRadius: Math.max(25, stemH * 0.15)
      });
    }
  }

  // Particles
  function initParticles(w, h) {
    particles = [];
    if (reducedMotion) return;
    var count = Math.min(25, Math.floor(w / 40));
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.1 - 0.02,
        size: 1 + Math.random() * 1.5,
        alpha: 0.03 + Math.random() * 0.05
      });
    }
  }

  function updateParticles(w, h) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    }
  }

  function draw() {
    var w = canvas.style.width ? parseFloat(canvas.style.width) : canvas.width;
    var h = 500;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    // Draw particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232, 228, 220, " + p.alpha + ")";
      ctx.fill();
    }

    // Draw plants
    for (var i = 0; i < plants.length; i++) {
      var plant = plants[i];
      var hovered = (i === hoveredPlantIdx);

      // Stem
      ctx.beginPath();
      ctx.moveTo(plant.segments[0].x, plant.segments[0].y);
      for (var s = 1; s < plant.segments.length; s++) {
        ctx.lineTo(plant.segments[s].x, plant.segments[s].y);
      }
      ctx.strokeStyle = hovered ? STEM_HIGHLIGHT : STEM_COLOR;
      ctx.lineWidth = hovered ? 1.5 : 1;
      ctx.stroke();

      // Branches and buds
      for (var b = 0; b < plant.buds.length; b++) {
        var bud = plant.buds[b];

        // Branch line
        ctx.beginPath();
        ctx.moveTo(bud.stemX, bud.stemY);
        ctx.lineTo(bud.x, bud.y);
        ctx.strokeStyle = hovered ? STEM_HIGHLIGHT : STEM_COLOR;
        ctx.lineWidth = hovered ? 1 : 0.7;
        ctx.stroke();

        // Bud circle
        ctx.beginPath();
        ctx.arc(bud.x, bud.y, bud.radius, 0, Math.PI * 2);
        if (hovered) {
          ctx.fillStyle = bud.color;
          ctx.globalAlpha = BUD_HIGHLIGHT_ALPHA;
        } else {
          ctx.fillStyle = bud.color;
          ctx.globalAlpha = 0.6;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Label below stem
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = hovered ? "rgba(232, 228, 220, 0.85)" : LABEL_COLOR;
      ctx.fillText(plant.tagName, plant.baseX, plant.baseY + 16);
    }
  }

  // Hit detection: find closest plant to mouse
  function findPlant(mx, my) {
    var closest = -1;
    var closestDist = Infinity;
    for (var i = 0; i < plants.length; i++) {
      var plant = plants[i];
      // Check distance to stem segments
      for (var s = 0; s < plant.segments.length - 1; s++) {
        var d = distToSegment(mx, my, plant.segments[s], plant.segments[s+1]);
        if (d < closestDist) {
          closestDist = d;
          closest = i;
        }
      }
      // Check distance to buds
      for (var b = 0; b < plant.buds.length; b++) {
        var bud = plant.buds[b];
        var dx = mx - bud.x;
        var dy = my - bud.y;
        var d = Math.sqrt(dx*dx + dy*dy);
        if (d < closestDist) {
          closestDist = d;
          closest = i;
        }
      }
    }
    return closestDist < 30 ? closest : -1;
  }

  function distToSegment(px, py, a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var lenSq = dx*dx + dy*dy;
    if (lenSq === 0) return Math.sqrt((px-a.x)*(px-a.x) + (py-a.y)*(py-a.y));
    var t = Math.max(0, Math.min(1, ((px-a.x)*dx + (py-a.y)*dy) / lenSq));
    var projX = a.x + t * dx;
    var projY = a.y + t * dy;
    return Math.sqrt((px-projX)*(px-projX) + (py-projY)*(py-projY));
  }

  // Tooltip
  function showTooltip(plantIdx, mx, my) {
    var plant = plants[plantIdx];
    var td = tagData[plantIdx];

    var titleEl = tooltip.querySelector(".tag-garden-tooltip-title");
    var linksEl = tooltip.querySelector(".tag-garden-tooltip-links");
    titleEl.textContent = "#" + plant.tagName + " (" + td.posts.length + ")";
    linksEl.innerHTML = "";

    for (var i = 0; i < td.posts.length; i++) {
      var a = document.createElement("a");
      a.href = td.posts[i].href;
      a.textContent = td.posts[i].title;
      a.className = "internal";
      a.setAttribute("data-spa", "true");
      linksEl.appendChild(a);
    }

    tooltip.classList.add("visible");

    // Position tooltip near mouse but keep in bounds
    var containerRect = container.getBoundingClientRect();
    var tooltipW = 220;
    var left = mx + 15;
    if (left + tooltipW > containerRect.width - 10) {
      left = mx - tooltipW - 15;
    }
    left = Math.max(10, left);

    var top = my - 20;
    top = Math.max(10, Math.min(450, top));

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    tooltip.classList.remove("visible");
  }

  // Mouse events
  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var idx = findPlant(mx, my);

    if (idx !== hoveredPlantIdx) {
      hoveredPlantIdx = idx;
      draw();
      if (idx >= 0) {
        showTooltip(idx, mx, my);
      } else {
        hideTooltip();
      }
    } else if (idx >= 0) {
      // Update tooltip position
      var containerRect = container.getBoundingClientRect();
      var tooltipW = 220;
      var left = mx + 15;
      if (left + tooltipW > containerRect.width - 10) left = mx - tooltipW - 15;
      left = Math.max(10, left);
      var top = my - 20;
      top = Math.max(10, Math.min(450, top));
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }
  }

  function onMouseLeave() {
    hoveredPlantIdx = -1;
    hideTooltip();
    draw();
  }

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);

  // Animation loop for particles
  function animate() {
    if (reducedMotion) return;
    var w = parseFloat(canvas.style.width) || 800;
    updateParticles(w, 500);
    draw();
    animFrame = requestAnimationFrame(animate);
  }

  // Resize handler
  function onResize() {
    resize();
    initParticles(parseFloat(canvas.style.width) || 800, 500);
  }

  window.addEventListener("resize", onResize);

  // Initial setup
  resize();
  initParticles(parseFloat(canvas.style.width) || 800, 500);
  if (!reducedMotion) {
    animate();
  }

  // SPA cleanup
  if (window.addCleanup) {
    window.addCleanup(function() {
      if (animFrame) cancelAnimationFrame(animFrame);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      hoveredPlantIdx = -1;
      plants = [];
      particles = [];
    });
  }
})();
`

export default (() => TagGarden) satisfies QuartzComponentConstructor
