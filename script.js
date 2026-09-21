/* Theme toggle: persists nothing (no storage available offline), just
   flips a data-theme attribute on the root element for this session.
   Checks the attribute first, falling back to system preference, so a
   dark-system visitor's first click correctly switches to light rather
   than re-applying dark. */
function toggleTheme() {
  const root = document.documentElement;
  const explicit = root.getAttribute("data-theme");
  const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const currentlyDark = explicit ? explicit === "dark" : systemDark;
  const goingDark = !currentlyDark;
  root.setAttribute("data-theme", goingDark ? "dark" : "light");
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.textContent = goingDark ? "light mode" : "dark mode";
}

/* =========================================================
   DATA: sourced from Batist's published research (see SOURCES
   object below). Every scenario, quote and field-note excerpt
   traces to a specific paper and, where marked, a direct or
   lightly paraphrased elicitation from that paper.
   ========================================================= */

const REAL_IMAGES = {
  trench_surroundings_top: "images/trench_surroundings_top.jpg",
  rod_clean: "images/rod_clean.jpg",
  spatial_recording_top: "images/spatial_recording_top.jpg",
  nail_photo: "images/nail_photo.jpg",
  spatial_recording: "images/spatial_recording.jpg",
  context_annotated: "images/context_annotated.jpg",
  context_discussion: "images/context_discussion.jpg",
  context_report: "images/context_report.jpg",
  recording_sheet: "images/recording_sheet.jpg",
  journal_bouldery: "images/journal_bouldery.jpg",
  crossedout: "images/crossedout.jpg",
  shorthand: "images/shorthand.jpg",
  sketch: "images/sketch.jpg",
};

/* Router state */
let STATE = { screen: "menu", scenario: null, node: null, history: [] };

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  if (STATE.screen === "menu") app.appendChild(renderMenu());
  else if (STATE.screen === "about") app.appendChild(renderAbout());
  else if (STATE.screen === "scenario") app.appendChild(renderScenarioNode());
  else if (STATE.screen === "roleplay") app.appendChild(renderRoleplay());
  window.scrollTo(0,0);
}

function goto(screen, opts) {
  STATE.screen = screen;
  Object.assign(STATE, opts || {});
  render();
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/* Renders a diagram object: either {svg, caption} for one figure,
   {pair: [{label, svg}, {label, svg}], caption} for a side-by-side
   plan/section pair, or {photo, caption} for a real archival image. */
/* An interactive, mouse-reactive colour-blending patch: demonstrates
   that the soil's colour reads differently depending on where you
   look and how close you get, rather than being a fixed, nameable
   value. Built with layered radial gradients whose centres drift
   toward the pointer, blended over a base "wet mud" canvas. */
function renderSoilBlend() {
  const wrap = el("div");
  wrap.style.cssText = "position:relative;width:100%;aspect-ratio:16/7;overflow:hidden;border:1px solid var(--line);cursor:crosshair;background:#3a2a1f;";

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  wrap.appendChild(canvas);

  const hint = el("div", null, "move your pointer across the soil");
  hint.style.cssText = "position:absolute;bottom:8px;right:10px;font-family:'Courier New',monospace;font-size:0.62rem;letter-spacing:0.03em;color:rgba(242,237,227,0.7);pointer-events:none;text-transform:uppercase;";
  wrap.appendChild(hint);

  const ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) {
    wrap.style.background = "linear-gradient(120deg, #3a2a1f 0%, #6B3720 30%, #8C4A2F 55%, #4A3626 80%, #2B2016 100%)";
    return wrap;
  }
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let pointer = {x: 0.5, y: 0.5, active: false};
  let t = 0;
  let raf = null;
  let destroyed = false;

  // Fixed, seeded grain so the texture doesn't re-randomize (and
  // therefore flicker) every frame \u2014 it just sits there quietly.
  const grain = [];
  for (let i = 0; i < 90; i++) {
    grain.push({x: (i * 0.6180339887) % 1, y: (i * 0.3819660113) % 1, a: 0.02 + (i % 5) * 0.006});
  }

  // One continuous gradient sweep across the soil, warm brown fading
  // toward near-black in one corner \u2014 not a multi-hue diagonal spin,
  // just a soft directional vignette that shifts gently with the pointer.
  const stops = [
    {t: 0,    color: [107, 66, 38]},   // warm brown
    {t: 0.55, color: [63, 40, 24]},    // mid brown
    {t: 1,    color: [20, 13, 8]}      // near-black
  ];

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    if (destroyed) return;
    t += 0.0016;

    // Shallow, mostly horizontal angle, plus a position offset that follows
    // the pointer directly \u2014 this is what actually reads as \"dynamic\":
    // rotation alone barely moves a near-horizontal gradient, so the pointer
    // also shifts where the gradient is centred, which is clearly visible.
    const baseAngle = -0.08; // radians, close to horizontal
    const drift = Math.sin(t * 0.25) * 0.015;
    const pull = pointer.active ? (pointer.x - 0.5) * 0.12 + (pointer.y - 0.5) * 0.08 : 0;
    const angle = baseAngle + drift + pull;

    const offsetX = pointer.active ? (pointer.x - 0.5) * 0.35 : 0;
    const offsetY = pointer.active ? (pointer.y - 0.5) * 0.35 : 0;
    const cx = W / 2 + offsetX * W, cy = H / 2 + offsetY * H;
    const len = Math.max(W, H) * 0.75;
    const dx = Math.cos(angle) * len, dy = Math.sin(angle) * len;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    stops.forEach(s => {
      const [rr, gg, bb] = s.color;
      g.addColorStop(s.t, `rgb(${rr},${gg},${bb})`);
    });
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // static, seeded grain \u2014 no per-frame randomness, so nothing flickers
    ctx.fillStyle = "rgba(0,0,0,1)";
    grain.forEach(g => {
      ctx.globalAlpha = g.a;
      ctx.fillRect(g.x * W, g.y * H, 1.2, 1.2);
    });
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(draw);
  }

  function setPointer(clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    pointer.x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    pointer.y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    pointer.active = true;
  }

  wrap.addEventListener("pointermove", (e) => setPointer(e.clientX, e.clientY));
  wrap.addEventListener("pointerleave", () => { pointer.active = false; });
  wrap.addEventListener("pointerdown", (e) => setPointer(e.clientX, e.clientY));

  window.addEventListener("resize", resize);
  // wrap isn't attached to the document yet at this point (this function's
  // return value gets appended by the caller afterward), so an immediate
  // getBoundingClientRect() here would read 0x0 and permanently lock the
  // canvas at its 1x1 fallback size. requestAnimationFrame defers resize()
  // to just after layout, once the element is actually in the DOM.
  requestAnimationFrame(() => { resize(); draw(); });

  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrap)) {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById("app"), {childList: true, subtree: true});

  return wrap;
}

function renderFigure(diagram) {
  const fig = el("div", "figure");
  if (diagram.photo) {
    const img = document.createElement("img");
    img.className = "figure-photo";
    img.src = diagram.photo;
    img.alt = diagram.alt || "Archival photograph from the source research.";
    fig.appendChild(img);
  } else if (diagram.interactive === "soil-blend") {
    try {
      fig.appendChild(renderSoilBlend());
    } catch (e) {
      fig.appendChild(el("div", null, ""));
    }
  } else if (diagram.pair) {
    const row = el("div", "figure-pair");
    diagram.pair.forEach(half => {
      const h = el("div", "figure-half");
      h.appendChild(el("div", "fh-label", half.label));
      const svgWrap = el("div");
      svgWrap.innerHTML = half.svg;
      h.appendChild(svgWrap);
      row.appendChild(h);
    });
    fig.appendChild(row);
  } else if (diagram.svg) {
    const svgWrap = el("div");
    svgWrap.innerHTML = diagram.svg;
    fig.appendChild(svgWrap);
  }
  if (diagram.caption) {
    fig.appendChild(el("div", "figure-caption", diagram.caption));
  }

  if (diagram.foldable) {
    const details = document.createElement("details");
    details.className = "fold";
    const summary = document.createElement("summary");
    summary.textContent = diagram.foldLabel || "show the image";
    details.appendChild(summary);
    const body = el("div", "fold-body");
    body.appendChild(fig);
    details.appendChild(body);
    return details;
  }

  return fig;
}



/* ---------------- MENU ---------------- */
function renderMenu() {
  const wrap = el("div");

  const head = el("div", "masthead");
  head.innerHTML = `
    <div class="masthead-row"><span>a set of role-playing scenes</span><span>Zack Batist</span></div>
    <h1>Decisions and Actions at the Trowel's Edge</h1>
  `;
  wrap.appendChild(head);

  const lede = el("p", "lede", `Data are usually imagined as concise, discrete, and inherently truthful records, but in practice they are messy, incomplete, and contingent on historical and material circumstances. When working at a distance from the moments when data first take shape, the fundamental scientific decisions and actions that produce data are not so apparent.`);
  wrap.appendChild(lede);
  const lede2 = el("p", "lede", `These role-playing scenes, which are drawn from my ethnographic study of archaeological data work, reconstruct some of the pragmatic challenges that scientific researchers regularly face. Play along to learn about the messy reality of scientific observation and recording practices at the trowel's edge!`);
  wrap.appendChild(lede2);

  const menu = el("div", "menu-grid");

  const items = [
    {id:"context", tag:"Solo scene \u00b7 5 min", title:"Is This a New Stratigraphic Unit?", desc:"You're helping excavate a trench. The soil in front of you looks different, or maybe it doesn't. Your supervisor asks what you're seeing, and how you say it shapes what happens next.", meta:"branching \u00b7 3 endings", src:SOURCES.fuz},
    {id:"database", tag:"Solo scene \u00b7 6 min", title:"What Goes in the Database?", desc:"A stack of recording sheets, written by hand in the field, lands on your desk. Crossed-out lines, shorthand, a sketch that doesn't fit any field. You decide how they get entered into the record.", meta:"branching \u00b7 4 endings", src:SOURCES.inf},
    {id:"weathering", tag:"Solo scene \u00b7 5 min", title:"Different Material, or Weathering?", desc:"You're sorting stone tools with a colleague. This piece could be a different kind of stone, or just weathered. You have to sort it anyway.", meta:"branching \u00b7 2 endings", src:SOURCES.dtp},
    {id:"hearth", tag:"Solo scene \u00b7 5 min", title:"An Informal Read from a Visiting Specialist", desc:"A visiting expert offers a confident, informal read of a confusing feature in five minutes flat, built on reasoning you can't check yourself. You decide what to do with it.", meta:"branching \u00b7 3 endings", src:SOURCES.dtp},
    {id:"journals", tag:"Role-play \u00b7 10\u201320 min \u00b7 4\u20138 players", title:"Publish the Field Journals?", desc:"A project's founding director has died. Her successor wants the field journals opened up for anyone to read. Former team members push back.", meta:"5 roles \u00b7 printable cards", src:SOURCES.inf},
    {id:"craft", tag:"Role-play \u00b7 10\u201320 min \u00b7 4\u20138 players", title:"Craft vs. Workflow", desc:"Two excavation projects, two philosophies: pen-and-paper &ldquo;slow archaeology&rdquo; against a fully digital, workflow-driven excavation.", meta:"6 roles \u00b7 printable cards", src:SOURCES.fig}
  ];

  items.forEach(it => {
    const card = el("div", "case-card");
    card.innerHTML = `
      <span class="case-tag">${it.tag}</span>
      <h3>${it.title}</h3>
      <p>${it.desc}</p>
      <div class="case-meta"><span>${it.meta}</span></div>
    `;
    card.onclick = () => {
      if (it.id === "journals" || it.id === "craft") goto("roleplay", {scenario: it.id});
      else goto("scenario", {scenario: it.id, node: SCENARIOS[it.id].start, history: []});
    };
    menu.appendChild(card);
  });
  wrap.appendChild(menu);

  const divider = el("div", "divider", "<span>&nbsp;</span>");
  wrap.appendChild(divider);

  const aboutBtn = el("button", "btn", "about this project");
  aboutBtn.onclick = () => goto("about");
  wrap.appendChild(aboutBtn);

  return wrap;
}

/* ---------------- ABOUT ---------------- */
function renderAbout() {
  const wrap = el("div");
  const back = el("div", "crumb");
  const b = el("button", null, "&larr; back to scenes");
  b.onclick = () => goto("menu");
  back.appendChild(b);
  wrap.appendChild(back);

  wrap.appendChild(el("h2", null, ABOUT.headings.main));
  wrap.appendChild(el("p", null, ABOUT.intro));

  wrap.appendChild(el("h3", null, ABOUT.headings.beyond_archaeology));
  ABOUT.beyond_archaeology.forEach(p => wrap.appendChild(el("p", null, p)));

  wrap.appendChild(el("h3", null, ABOUT.headings.bibliography));
  const srcList = el("div");
  srcList.innerHTML = ABOUT.bibliography.map(src =>
    `<p class="small">${src.html}</p>`
  ).join('\n');
  wrap.appendChild(srcList);

  const links = el("p", null, ABOUT.author_link);
  wrap.appendChild(links);

  return wrap;
}


/* =========================================================
   SCENARIO: Is This a New Stratigraphic Unit?
   Grounded in "Balancing Situated and Objective Representations"
   \u2014 the Jane/Basil context-change episode (A1, A2).
   ========================================================= */
/* Builds a section sketch showing the same ambiguous boundary
   drawn three different ways depending on the recording decision. */
function sectionDiagram(mode) {
  // Mirrors the interactive soil-blend opening, but each decision now
  // imposes a genuinely different colouration on the same ground \u2014
  // not just a different label over an identical fill.
  let soilFill, boundaryPath, boundaryLabel, extra;

  if (mode === "split") {
    // Splitting: the ground reads as two distinct, confidently
    // separated materials \u2014 sharp colour contrast either side
    // of the line, as if the boundary made the material change real.
    soilFill = `
<defs>
<linearGradient id="soil-split-l" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#5A3A26"/>
  <stop offset="100%" stop-color="#3A2A1F"/>
</linearGradient>
<linearGradient id="soil-split-r" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#9C4E2C"/>
  <stop offset="100%" stop-color="#6B3720"/>
</linearGradient>
</defs>
<rect x="15" y="15" width="135" height="125" fill="url(#soil-split-l)"/>
<rect x="150" y="15" width="135" height="125" fill="url(#soil-split-r)"/>
<rect x="15" y="15" width="270" height="125" fill="none" stroke="#2B2620" stroke-width="1"/>`;
    boundaryPath = `<path d="M 150 15 L 150 140" stroke="#F2EDE3" stroke-width="2.2" fill="none"/>`;
    boundaryLabel = `<text x="150" y="12" font-family="Courier New,monospace" font-size="8" fill="#F2EDE3" text-anchor="middle">BOUNDARY DRAWN: SOLID LINE</text>`;
    extra = `<text x="90" y="80" font-family="Courier New,monospace" font-size="9" fill="#F2EDE3" text-anchor="middle">unit A</text>
<text x="210" y="80" font-family="Courier New,monospace" font-size="9" fill="#F2EDE3" text-anchor="middle">unit B</text>`;
  } else if (mode === "hedge") {
    // Hedging: still the same blended, ambiguous ground as the
    // opening \u2014 but a translucent, uncertain wash is laid over
    // the half now being treated as "new," short of full commitment.
    soilFill = `
<defs>
<linearGradient id="soil-hedge-a" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#4A3626"/>
  <stop offset="45%" stop-color="#6B3720"/>
  <stop offset="100%" stop-color="#5E4530"/>
</linearGradient>
</defs>
<rect x="15" y="15" width="270" height="125" fill="url(#soil-hedge-a)"/>
<rect x="150" y="15" width="135" height="125" fill="#B4791F" opacity="0.16"/>
<rect x="15" y="15" width="270" height="125" fill="none" stroke="#2B2620" stroke-width="1"/>`;
    boundaryPath = `<path d="M 150 15 L 150 140" stroke="#F3E2C4" stroke-width="1.6" fill="none" stroke-dasharray="6 4"/>`;
    boundaryLabel = `<text x="150" y="12" font-family="Courier New,monospace" font-size="8" fill="#F3E2C4" text-anchor="middle">BOUNDARY DRAWN: DASHED, NUMBERED ANYWAY</text>`;
    extra = `<text x="90" y="80" font-family="Courier New,monospace" font-size="9" fill="#F2EDE3" text-anchor="middle">unit A</text>
<text x="210" y="80" font-family="Courier New,monospace" font-size="9" fill="#F2EDE3" text-anchor="middle">unit B?</text>
<text x="150" y="165" font-family="Courier New,monospace" font-size="7" fill="#B4791F" text-anchor="middle">&ldquo;possible differential lens&rdquo;, written in the margin</text>`;
  } else {
    // Lumping: the ground stays one continuous, unbroken field \u2014
    // the same blended ambiguity as the opening, with nothing
    // visually separated at all.
    soilFill = `
<defs>
<radialGradient id="soil-lump-a" cx="35%" cy="35%" r="75%">
  <stop offset="0%" stop-color="#6B3720"/>
  <stop offset="55%" stop-color="#4A3626"/>
  <stop offset="100%" stop-color="#3A2A1F"/>
</radialGradient>
</defs>
<rect x="15" y="15" width="270" height="125" fill="url(#soil-lump-a)"/>
<rect x="15" y="15" width="270" height="125" fill="none" stroke="#2B2620" stroke-width="1"/>`;
    boundaryPath = `<path d="M 150 15 Q 158 60 150 95 Q 145 120 155 140" stroke="#F2EDE3" stroke-width="1" fill="none" stroke-dasharray="1 5" opacity="0.4"/>`;
    boundaryLabel = `<text x="150" y="12" font-family="Courier New,monospace" font-size="8" fill="#F2EDE3" text-anchor="middle">NO BOUNDARY DRAWN: ONE UNIT</text>`;
    extra = `<text x="150" y="80" font-family="Courier New,monospace" font-size="9" fill="#F2EDE3" text-anchor="middle">unit A</text>
<text x="150" y="165" font-family="Courier New,monospace" font-size="7" fill="#6B655A" text-anchor="middle">variation noted only in the free-text description</text>`;
  }
  const common = `
<line x1="15" y1="140" x2="285" y2="140" stroke="#2B2620" stroke-width="1"/>
<text x="15" y="152" font-family="Courier New,monospace" font-size="7" fill="#6B655A">base of trench</text>`;
  return {
    svg: `<svg viewBox="0 0 300 ${mode === 'split' ? 160 : 180}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The same soil, now with the boundary the decision drew: ${mode === 'split' ? 'a solid, confident line splitting two visually distinct materials' : mode === 'hedge' ? 'a dashed, tentative line with a number assigned anyway, over ground that still reads the same on both sides' : 'no line at all, the ground reading as one continuous field'}.">
${soilFill}
${boundaryLabel}
${boundaryPath}
${extra}
${common}
</svg>`,
    caption: mode === "split"
      ? "Splitting makes the two sides look like genuinely different materials, where the ground itself only shaded gradually."
      : mode === "hedge"
      ? "Hedging still draws a line, since a form needs a number, but the ground underneath stays the same colour on both sides."
      : "Lumping leaves the ground exactly as blended as it actually was. The variation now exists only as prose."
  };
}

/* =========================================================
   SCENARIO: What Goes in the Database
   Grounded in "On the Value of Informal Communication" \u2014
   database manager "Jamie" and the transcription process (4.2.1).
   ========================================================= */
/* =========================================================
   SCENARIO: Different Material, or Weathering?
   Grounded in a lithics-sorting dialogue between two analysts
   trying to reconcile differing intuitions about raw material.
   ========================================================= */
/* =========================================================
   SCENARIO: An Informal Read from a Visiting Specialist
   Grounded in a visiting micromorphology specialist's ad-hoc
   assessment of an ambiguous hearth feature.
   ========================================================= */
/* ---------------- SCENARIO RENDERER ---------------- */
function renderScenarioNode() {
  const scn = SCENARIOS[STATE.scenario];
  const node = scn.nodes[STATE.node];
  const wrap = el("div");

  const crumb = el("div", "crumb");
  const backMenu = el("button", null, "&larr; all scenes");
  backMenu.onclick = () => goto("menu");
  crumb.appendChild(backMenu);
  if (STATE.history.length) {
    const span = el("span", null, "&middot;");
    crumb.appendChild(span);
    const backOne = el("button", null, "&larr; back one choice");
    backOne.onclick = () => {
      const prev = STATE.history.pop();
      STATE.node = prev;
      render();
    };
    crumb.appendChild(backOne);
  }
  wrap.appendChild(crumb);

  const head = el("div", "masthead");
  head.innerHTML = `
    <div class="masthead-row"><span>${node.label || ""}</span><span>${scn.title}</span></div>
  `;
  wrap.appendChild(head);

  const scene = el("div", "scene");
  const lbl = el("div", "scene-label", node.end ? "outcome" : "your move");
  scene.appendChild(lbl);
  const body = el("div", "scene-body", node.body);
  scene.appendChild(body);
  wrap.appendChild(scene);

  if (node.diagram) {
    wrap.appendChild(renderFigure(node.diagram));
  }
  if (node.diagram2) {
    wrap.appendChild(renderFigure(node.diagram2));
  }

  if (node.choices && node.choices.length) {
    const list = el("div", "choice-list");
    node.choices.forEach((c, i) => {
      const b = el("button", "choice-btn");
      b.innerHTML = `<span class="cprefix">${String.fromCharCode(65+i)}.</span>${c.text}`;
      b.onclick = () => {
        STATE.history.push(STATE.node);
        STATE.node = c.to;
        render();
      };
      list.appendChild(b);
    });
    wrap.appendChild(list);
  }

  if (node.end) {
    const again = el("button", "btn btn-primary", "play this scene again");
    again.style.marginRight = "0.6rem";
    again.onclick = () => goto("scenario", {node: scn.start, history: []});
    const toMenu = el("button", "btn", "back to all scenes");
    toMenu.onclick = () => goto("menu");
    const row = el("div");
    row.style.marginTop = "1.5rem";
    row.appendChild(again);
    row.appendChild(toMenu);
    wrap.appendChild(row);
  }

  return wrap;
}

/* =========================================================
   ROLE-PLAY MODULE: Publish the Field Journals?
   Grounded in Batist 2024, elicitation C2 (the litigation
   dispute over publishing a late director's field journals).
   ========================================================= */
/* =========================================================
   ROLE-PLAY MODULE: Craft vs. Workflow
   Grounded in Batist et al. 2021 (WARP vs PKAP, Caraher/
   Nakassis/Olson/Landvatter positions on slow archaeology,
   DIY, digital workflows).
   ========================================================= */
/* ---------------- ROLEPLAY RENDERER ---------------- */
function renderRoleplay() {
  const rp = ROLEPLAYS[STATE.scenario];
  const wrap = el("div");

  const crumb = el("div", "crumb no-print");
  const backMenu = el("button", null, "&larr; all scenes");
  backMenu.onclick = () => goto("menu");
  crumb.appendChild(backMenu);
  wrap.appendChild(crumb);

  const head = el("div", "masthead");
  head.innerHTML = `
    <div class="masthead-row"><span>facilitated role-play</span><span>${rp.roles.length} roles</span></div>
    <h1>${rp.title}</h1>
  `;
  wrap.appendChild(head);

  wrap.appendChild(el("h3", null, "the situation"));
  const premise = el("div");
  premise.innerHTML = rp.premise;
  wrap.appendChild(premise);

  if (rp.diagram) {
    wrap.appendChild(renderFigure(rp.diagram));
  }

  const qbox = el("div", "record-panel");
  qbox.innerHTML = `<div class="rp-label">the question on the table</div><p style="font-size:1.05rem;margin:0;">${rp.question}</p>`;
  wrap.appendChild(qbox);

  const runRow = el("div");
  runRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin:1.2rem 0 0.6rem;";
  const runText = el("p", null, `Assign one role per player. Double up if you have fewer than ${rp.roles.length} people, or drop a role or two for a shorter session. Give everyone two minutes to read their card, then open the floor: each person argues from their assigned position, even if it's not what they'd personally believe. Aim for 10&ndash;20 minutes of debate before the facilitator debrief.`);
  runText.style.cssText = "margin:0;flex:1;min-width:240px;";
  runRow.appendChild(runText);
  const printBtn = el("button", "btn no-print", "print role cards");
  printBtn.style.flexShrink = "0";
  printBtn.onclick = () => window.print();
  runRow.appendChild(printBtn);
  wrap.appendChild(runRow);

  const grid = el("div", "role-grid");
  rp.roles.forEach(r => {
    const card = el("div", "role-card");
    card.innerHTML = `
      <span class="crop-mark tl h"></span><span class="crop-mark tl v"></span>
      <span class="crop-mark tr h"></span><span class="crop-mark tr v"></span>
      <span class="crop-mark bl h"></span><span class="crop-mark bl v"></span>
      <span class="crop-mark br h"></span><span class="crop-mark br v"></span>
      <h4>${r.name}</h4>
      <p class="role-position mono" style="color:var(--string);font-weight:600;">${r.stance}</p>
      <p>${r.desc}</p>
      <p class="small"><strong>If you're stuck, ask the room:</strong></p>
      <ul class="small" style="margin:0 0 0 1.1rem;padding:0;">
        ${r.prompts.map(p => `<li>${p}</li>`).join("")}
      </ul>
    `;
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  wrap.appendChild(el("div", "divider no-print", "<span>&nbsp;</span>"));

  wrap.appendChild(el("h3", "no-print", "facilitator debrief"));
  const debrief = el("div", "no-print");
  debrief.innerHTML = rp.debrief;
  wrap.appendChild(debrief);

  if (rp.about) {
    wrap.appendChild(el("h3", "no-print", "about this module"));
    const about = el("div", "no-print");
    about.innerHTML = rp.about;
    wrap.appendChild(about);
  }

  const toMenu = el("button", "btn no-print", "back to all scenes");
  toMenu.style.marginTop = "1rem";
  toMenu.onclick = () => goto("menu");
  wrap.appendChild(toMenu);

  return wrap;
}

/* Content (scene text, quotes, choices, citations) lives in content.json,
   loaded here and assigned to the same names the render functions expect.
   This keeps all editable prose out of the code, in one plain data file. */
let SOURCES, SCENARIOS, ROLEPLAYS, ABOUT;

/* cache: "no-store" forces a fresh fetch every load. Without it, browsers
   can silently reuse a stale cached copy of content.json on refresh, so
   edits to that file wouldn't show up until a hard refresh or cache clear. */
fetch("content.json", { cache: "no-store" })
  .then(res => res.json())
  .then(data => {
    SOURCES = data.SOURCES;
    SCENARIOS = data.SCENARIOS;
    ROLEPLAYS = data.ROLEPLAYS;
    ABOUT = data.ABOUT;
    render();
  })
  .catch(err => {
    document.getElementById("app").innerHTML =
      "<p>Could not load content.json. If you're viewing this file directly from disk, " +
      "open it through a local server instead (browsers block loading local JSON files " +
      "for security reasons). If this is hosted online, check that content.json is " +
      "in the same folder as this page.</p>";
    console.error(err);
  });
