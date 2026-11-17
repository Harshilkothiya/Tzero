"use strict";

/* ============================================================
   TZERO — js/script.js
   ============================================================ */

/* ---------- Constants ---------- */
const KEY     = "tzero.v1";
const OLD_KEY = "deadlineos.v1";
const WORD_LIMIT = 5;
const MAX_MS  = 7;

const DEVICE_PRESETS = {
  "android-916":  { label: "Android · 9:16",           W: 1080, H: 1920 },
  "android-tall": { label: "Pixel / tall Android · 20:9", W: 1080, H: 2400 },
  "iphone":       { label: "iPhone · 19.5:9",           W: 1170, H: 2532 },
  "iphone-max":   { label: "iPhone Pro Max",             W: 1290, H: 2796 },
};

const DEFAULT_MILESTONES = [
  { offset: 28, t: "Lock scope and metric",  icon: "scope", done: false },
  { offset: 21, t: "Baseline model working", icon: "base",  done: false },
  { offset: 14, t: "Train and evaluate",     icon: "train", done: false },
  { offset:  7, t: "Build app and UI",       icon: "app",   done: false },
  { offset:  3, t: "Test and write docs",    icon: "test",  done: false },
  { offset:  0, t: "Launch and demo",        icon: "go",    done: false },
];

const ICONS = {
  scope: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z M12 1v4 M12 19v4 M1 12h4 M19 12h4",
  base:  "M12 2 3 7l9 5 9-5-9-5Z M3 12l9 5 9-5 M3 17l9 5 9-5",
  train: "M3 3v18h18 M7 15l4-5 3 3 5-7",
  app:   "M3 5h18v14H3Z M3 9h18 M6.5 7h.01 M9 7h.01",
  test:  "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3Z M8.5 12l2.5 2.5 4.5-5",
  go:    "M12 2c3 2.5 4.5 6 4.5 10l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-10Z M12 9a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3Z M7.5 13l-3 4 3.5-1 M16.5 13l3 4-3.5-1 M10.5 18.5c.3 1.5.9 2.5 1.5 3 .6-.5 1.2-1.5 1.5-3",
};
const ICON_KEYS = Object.keys(ICONS);

/* ---------- Helpers ---------- */
const pad       = n  => String(n).padStart(2, "0");
const todayKey  = () => new Date().toDateString();
const esc       = s  => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const wordCount = s  => s.trim() === "" ? 0 : s.trim().split(/\s+/).length;

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "tzero";
}

/* ---------- Defaults ---------- */
function defaults() {
  return {
    goal:       "Build My AI Project",
    deadline:   "2026-12-15T23:59",
    start:      Date.now(),
    theme:      0,
    device:     "android-916",
    day:        todayKey(),
    milestones: DEFAULT_MILESTONES.map(m => ({ ...m })),
    tasks: [
      { t: "2 hours of focused deep work",  done: false },
      { t: "Run or review one experiment",  done: false },
      { t: "Write a short progress note",   done: false },
      { t: "Plan tomorrow's top task",       done: false },
    ],
  };
}

/* ---------- State load + migration ---------- */
let S = defaults();
try {
  let saved = JSON.parse(localStorage.getItem(KEY));
  if (!saved) {
    // Try migrating from old key
    const old = JSON.parse(localStorage.getItem(OLD_KEY));
    if (old && old.goal) {
      saved = { goal: old.goal, deadline: old.deadline, start: old.start, tasks: old.tasks };
    }
  }
  if (saved && saved.goal) {
    S = Object.assign(S, saved);
    // If milestones lack numeric offset, replace with defaults
    if (!S.milestones || !S.milestones.length || typeof S.milestones[0].offset !== "number") {
      S.milestones = DEFAULT_MILESTONES.map(m => ({ ...m }));
    }
  }
} catch (e) {}

// Daily reset
if (S.day !== todayKey()) {
  S.tasks.forEach(t => t.done = false);
  S.day = todayKey();
}

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- Device / canvas sizing ---------- */
let W = 1080, H = 1920;

function applyDevice(id) {
  const p = DEVICE_PRESETS[id] || DEVICE_PRESETS["android-916"];
  W = p.W; H = p.H;
  cv.width  = W;
  cv.height = H;
  // Update screen aspect ratio
  document.getElementById("screen").style.aspectRatio = `${W} / ${H}`;
}

/* ---------- Milestone helpers ---------- */
function sortMilestones() {
  S.milestones.sort((a, b) => b.offset - a.offset);
}

function msDate(offset) {
  const dl = new Date(S.deadline);
  if (isNaN(dl)) return "";
  const d = new Date(dl);
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(offset) {
  const dl = new Date(S.deadline);
  if (isNaN(dl)) return false;
  const d = new Date(dl);
  d.setDate(d.getDate() - offset);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

/* ---------- DOM refs ---------- */
const $ = id => document.getElementById(id);
const cv  = $("cv");
const ctx = cv.getContext("2d");

/* ---------- Font loading gate ---------- */
let fontsReady = false;
const fontGate = document.fonts
  ? Promise.all([
      document.fonts.load('800 100px "Big Shoulders Display"'),
      document.fonts.load('700 100px "Big Shoulders Display"'),
      document.fonts.load('italic 600 100px "Fraunces"'),
      document.fonts.load('600 40px "Manrope"'),
      document.fonts.load('800 40px "Manrope"'),
    ]).then(() => document.fonts.ready)
  : Promise.resolve();

fontGate.then(() => {
  fontsReady = true;
  $("download").disabled = false;
  draw();
}).catch(() => {
  fontsReady = true;
  $("download").disabled = false;
  draw();
});

/* ================================================================
   CANVAS DRAWING
   ================================================================ */

/* --- Canvas helpers --- */
function rrPath(c2d, x, y, w, h, r) {
  c2d.beginPath();
  if (c2d.roundRect) {
    c2d.roundRect(x, y, w, h, r);
  } else {
    c2d.moveTo(x + r, y);
    c2d.lineTo(x + w - r, y);
    c2d.quadraticCurveTo(x + w, y, x + w, y + r);
    c2d.lineTo(x + w, y + h - r);
    c2d.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c2d.lineTo(x + r, y + h);
    c2d.quadraticCurveTo(x, y + h, x, y + h - r);
    c2d.lineTo(x, y + r);
    c2d.quadraticCurveTo(x, y, x + r, y);
    c2d.closePath();
  }
}
function rr(x, y, w, h, r) { rrPath(ctx, x, y, w, h, r); }

function spacing(v) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = v + "px";
}

function fitText(text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text + "…").width > maxW)
    text = text.slice(0, -1);
  return text.trimEnd() + "…";
}

/* --- Draw background into an offscreen canvas so we can blur it into the card --- */
function drawBackground(c2d, w, h) {
  const k = w / 1080;
  // 1. Main linear gradient (180deg, top to bottom)
  const bg = c2d.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0,    "#06121A");
  bg.addColorStop(0.38, "#0A2230");
  bg.addColorStop(0.72, "#0F3B4C");
  bg.addColorStop(1,    "#1B3340");
  c2d.fillStyle = bg;
  c2d.fillRect(0, 0, w, h);

  // 2. Ember glow (radial-gradient(1100px 800px at 50% 112%, rgba(255,107,61,.8), transparent 70%))
  c2d.save();
  c2d.translate(0.5 * w, 1.12 * h);
  c2d.scale(1100 / 800, 1);
  const ember = c2d.createRadialGradient(0, 0, 0, 0, 0, 800 * (h / 1920));
  ember.addColorStop(0,   "rgba(255,107,61,.8)");
  ember.addColorStop(0.7, "rgba(255,107,61,0)");
  ember.addColorStop(1,   "rgba(255,107,61,0)");
  c2d.fillStyle = ember;
  c2d.beginPath();
  c2d.arc(0, 0, 800 * (h / 1920), 0, Math.PI * 2);
  c2d.fill();
  c2d.restore();

  // 3. Faint gold glow (radial-gradient(700px 500px at 100% 40%, rgba(255,193,90,.10), transparent 70%))
  c2d.save();
  c2d.translate(w, 0.40 * h);
  c2d.scale(700 / 500, 1);
  const gold = c2d.createRadialGradient(0, 0, 0, 0, 0, 500 * (h / 1920));
  gold.addColorStop(0,   "rgba(255,193,90,.10)");
  gold.addColorStop(0.7, "rgba(255,193,90,0)");
  gold.addColorStop(1,   "rgba(255,193,90,0)");
  c2d.fillStyle = gold;
  c2d.beginPath();
  c2d.arc(0, 0, 500 * (h / 1920), 0, Math.PI * 2);
  c2d.fill();
  c2d.restore();

  // 4. Bokeh blobs with 38px blur
  const blobs = [
    { x:  90*k, y:  270*k, r: 210*k, col: "rgba(53,200,255,.10)" },
    { x: 910*k, y:  450*k, r: 150*k, col: "rgba(255,193,90,.10)" },
    { x: 230*k, y: 1690*k, r: 190*k, col: "rgba(255,107,61,.22)" },
    { x: 860*k, y: 1720*k, r: 160*k, col: "rgba(255,193,90,.18)" },
  ];
  blobs.forEach(({ x, y, r, col }) => {
    c2d.save();
    if ("filter" in c2d) {
      c2d.filter = `blur(${Math.round(38 * k)}px)`;
      c2d.fillStyle = col;
      c2d.beginPath();
      c2d.arc(x, y, r, 0, Math.PI * 2);
      c2d.fill();
    } else {
      const rg = c2d.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
      c2d.fillStyle = rg;
      c2d.fillRect(0, 0, w, h);
    }
    c2d.restore();
  });
}

/* --- Checkbox tick: exact translation of .cb.on::after --- */
function drawTick(x, y, k) {
  ctx.save();
  ctx.translate(x + 14 * k, y + 6 * k);
  ctx.rotate(45 * Math.PI / 180);
  ctx.strokeStyle = "#08161F";
  ctx.lineWidth   = 5 * k;
  ctx.lineCap     = "square";
  ctx.lineJoin    = "miter";
  ctx.beginPath();
  ctx.moveTo(11 * k, 0);
  ctx.lineTo(11 * k, 22 * k);
  ctx.lineTo(0, 22 * k);
  ctx.stroke();
  ctx.restore();
}

/* --- Main draw function --- */
function draw() {
  const k = W / 1080;

  /* ---- Draw background to an offscreen canvas ---- */
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width  = W;
  bgCanvas.height = H;
  const bgCtx = bgCanvas.getContext("2d");
  drawBackground(bgCtx, W, H);

  /* ---- Draw to main canvas ---- */
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // Paint background from offscreen
  ctx.drawImage(bgCanvas, 0, 0);

  /* ---- GLASS CARD ---- */
  const cardX      = 75 * k;
  const cardY      = 634 * (H / 1920);
  const cardW      = 930 * k;
  const cardH      = 1068 * (H / 1920);
  const cardR      = 56 * k;
  const cardBottom = cardY + cardH;

  // (a) Drop shadow: 0 30px 80px rgba(0,0,0,.35)
  ctx.save();
  ctx.shadowColor   = "rgba(0,0,0,.35)";
  ctx.shadowBlur    = 80 * k;
  ctx.shadowOffsetY = 30 * k;
  rrPath(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // (b) Re-draw clean background inside card area before blur
  ctx.save();
  rrPath(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.clip();
  ctx.drawImage(bgCanvas, 0, 0);
  // Frosted backdrop blur (26px)
  if ("filter" in ctx) {
    ctx.filter = `blur(${Math.round(26 * k)}px)`;
  }
  ctx.drawImage(bgCanvas, 0, 0, W, H);
  if ("filter" in ctx) ctx.filter = "none";

  // (c) Glass fill: rgba(234,246,245,.09)
  ctx.fillStyle = "rgba(234,246,245,.09)";
  ctx.fill();

  // (d) Glass border: 1.5px solid rgba(234,246,245,.22)
  ctx.strokeStyle = "rgba(234,246,245,.22)";
  ctx.lineWidth   = 1.5 * k;
  ctx.stroke();
  ctx.restore();

  /* ---- TITLE BLOCK ---- */
  const leftPad = 66 * k;
  const innerW  = cardW - 132 * k;
  const titleX  = cardX + leftPad;

  ctx.textBaseline = "top";
  ctx.textAlign    = "left";

  // Line 1: T-MINUS (Big Shoulders Display 800, 176k, ember→gold gradient)
  const tmSize = Math.round(176 * k);
  ctx.font = `800 ${tmSize}px "Big Shoulders Display", BSD, sans-serif`;
  spacing(2 * k);
  const tminusTxt = "T-MINUS";
  const tminusW   = ctx.measureText(tminusTxt).width;
  const tmGrad    = ctx.createLinearGradient(titleX, 0, titleX + tminusW, 0);
  tmGrad.addColorStop(0, "#FF6B3D");
  tmGrad.addColorStop(1, "#FFC15A");
  ctx.fillStyle = tmGrad;
  ctx.fillText(tminusTxt, titleX, cardY + 30 * k);
  spacing(0);

  // Line 2: COUNTDOWN: (Big Shoulders Display 700, 84k, frost)
  const cdSize = Math.round(84 * k);
  ctx.font      = `700 ${cdSize}px "Big Shoulders Display", BSD, sans-serif`;
  spacing(6 * k);
  ctx.fillStyle = "#EAF6F5";
  ctx.fillText("COUNTDOWN:", cardX + 68 * k, cardY + 196 * k);
  spacing(0);

  // Line 3: goal title (Fraunces italic 600, 82k, gold — auto-fit / wrap)
  let goalFontSize = 82 * k;
  const minGoalSize = 52 * k;
  ctx.font = `italic 600 ${Math.round(goalFontSize)}px "Fraunces", FR, serif`;
  let goalLines  = [S.goal];
  let extraShift = 0;

  while (ctx.measureText(S.goal).width > innerW && goalFontSize > minGoalSize) {
    goalFontSize -= 2 * k;
    ctx.font = `italic 600 ${Math.round(goalFontSize)}px "Fraunces", FR, serif`;
  }
  if (ctx.measureText(S.goal).width > innerW) {
    // Wrap to 2 lines at min size
    const words = S.goal.split(/\s+/);
    let line1 = "", line2 = "";
    for (const w of words) {
      const test = line1 ? line1 + " " + w : w;
      if (ctx.measureText(test).width <= innerW) line1 = test;
      else line2 = line2 ? line2 + " " + w : w;
    }
    goalLines  = line2 ? [line1, line2] : [line1];
    extraShift = goalLines.length > 1 ? Math.round(goalFontSize * 1.1) : 0;
  }
  ctx.fillStyle = "#FFC15A";
  goalLines.forEach((line, i) => {
    ctx.fillText(line, titleX, cardY + 282 * k + i * Math.round(goalFontSize * 1.15));
  });

  /* ---- MILESTONE ROWS ---- */
  const rowsTop  = cardY + 424 * k + extraShift;
  const n        = S.milestones.length;
  const rowH     = 96 * k;
  const pitch    = n > 1
    ? (n === 6 ? 104 * k : Math.min(120 * k, Math.max(84 * k, (cardBottom - 30 * k - rowsTop - rowH) / (n - 1))))
    : rowH;

  const cbLeft    = cardX + leftPad;
  const cbSize    = 46 * k;
  const textLeft  = cardX + 144 * k;
  const iconRight = cardX + cardW - leftPad;

  if (n === 0) {
    ctx.font         = `600 ${Math.round(40 * k)}px "Manrope", MR, sans-serif`;
    ctx.fillStyle    = "rgba(234,246,245,.55)";
    ctx.textBaseline = "top";
    ctx.fillText("No milestones yet", cbLeft, rowsTop + 20 * k);
  } else {
    S.milestones.forEach((ms, i) => {
      const ry = rowsTop + i * pitch;

      /* ---- Checkbox ---- */
      const cbY = ry + 14 * k;
      rrPath(ctx, cbLeft, cbY, cbSize, cbSize, 13 * k);
      if (ms.done) {
        ctx.fillStyle   = "#FFC15A";
        ctx.fill();
        ctx.strokeStyle = "#FFC15A";
        ctx.lineWidth   = 3 * k;
        ctx.stroke();
        drawTick(cbLeft, cbY, k);
      } else {
        ctx.strokeStyle = "rgba(234,246,245,.6)";
        ctx.lineWidth   = 3 * k;
        ctx.stroke();
      }

      /* ---- Label line: "T-28 · Nov 17" ---- */
      ctx.textBaseline = "top";
      ctx.font         = `800 ${Math.round(33 * k)}px "Manrope", MR, sans-serif`;
      ctx.fillStyle    = "#FF8A5C";
      const tLabel     = `T-${ms.offset}`;
      ctx.fillText(tLabel, textLeft, ry);
      const labelW     = ctx.measureText(tLabel).width;
      const dateTxt    = " · " + msDate(ms.offset);
      ctx.fillStyle    = "#FFC15A";
      ctx.fillText(dateTxt, textLeft + labelW, ry);

      /* ---- Title line ---- */
      const titleY = ry + 44 * k;
      ctx.font = `600 ${Math.round(40 * k)}px "Manrope", MR, sans-serif`;
      if (ms.done) {
        ctx.globalAlpha  = 0.55;
        ctx.fillStyle    = "#EAF6F5";
        ctx.fillText(ms.t, textLeft, titleY);
        // Strikethrough
        const tw = ctx.measureText(ms.t).width;
        ctx.fillRect(textLeft, titleY + Math.round(40 * k * 0.5), tw, Math.round(3 * k));
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "#EAF6F5";
        ctx.fillText(ms.t, textLeft, titleY);
      }

      /* ---- Icon (72k × 72k, Path2D on 24-unit grid scaled by 3k) ---- */
      const iconSize = 72 * k;
      const iconX    = iconRight - iconSize;
      const iconY    = ry + 6 * k;
      const iScale   = 3 * k;
      ctx.save();
      ctx.translate(iconX, iconY);
      ctx.scale(iScale, iScale);
      ctx.fillStyle   = "transparent";
      ctx.strokeStyle = "#FFC15A";
      ctx.lineWidth   = 1.6;   // 1.6 in 24-unit grid scales to 4.8k px (exact match to SVG stroke-width="1.6")
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.beginPath();
      const iconPath = new Path2D(ICONS[ms.icon] || ICONS.scope);
      ctx.stroke(iconPath);
      ctx.restore();
    });
  }

  ctx.restore();
}

/* ================================================================
   WEB UI RENDERING
   ================================================================ */

function renderMilestones() {
  const ul = $("ms");
  sortMilestones();
  const firstOpen = S.milestones.findIndex(m => !m.done);

  ul.innerHTML = S.milestones.map((ms, i) => {
    const date     = msDate(ms.offset);
    const over     = isOverdue(ms.offset) && !ms.done;
    const isNext   = i === firstOpen && !over;
    const label    = ms.offset === 0 ? "T-0" : `T-${ms.offset}`;
    return `<li class="item ${ms.done ? "done" : ""}" data-ms-i="${i}">
      <input type="checkbox" data-k="ms" data-i="${i}" ${ms.done ? "checked" : ""}
        aria-label="Mark '${esc(ms.t)}' done">
      <div class="item-body">
        <div class="item-label ${over ? "overdue" : ""}">
          ${esc(label)} <span class="date-part">· ${esc(date)}</span>
          ${isNext  ? '<span class="tag">Next</span>' : ""}
          ${over    ? '<span class="tag-overdue">Overdue</span>' : ""}
        </div>
        <div class="item-title">${esc(ms.t)}</div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-icon-pick="${i}" aria-label="Change icon for '${esc(ms.t)}'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="${esc(ICONS[ms.icon] || ICONS.scope)}"/>
          </svg>
        </button>
        <button class="icon-btn" data-edit="${i}" aria-label="Edit '${esc(ms.t)}'">✎</button>
        <button class="icon-btn del" data-del-ms="${i}" aria-label="Delete '${esc(ms.t)}'">×</button>
      </div>
    </li>`;
  }).join("");

  const done = S.milestones.filter(m => m.done).length;
  $("msCount").textContent = `${done}/${S.milestones.length} done`;
  $("msAdd").disabled  = S.milestones.length >= MAX_MS;
  $("msMaxMsg").style.display = S.milestones.length >= MAX_MS ? "block" : "none";
}

function renderTasks() {
  const ul  = $("tk");
  ul.innerHTML = S.tasks.map((t, i) =>
    `<li class="item task-item ${t.done ? "done" : ""}">
       <input type="checkbox" data-k="tk" data-i="${i}" ${t.done ? "checked" : ""}
         aria-label="Mark task done">
       <p>${esc(t.t)}</p>
       <button class="icon-btn del" data-del-tk="${i}" aria-label="Delete task">×</button>
     </li>`
  ).join("");
  const done = S.tasks.filter(t => t.done).length;
  $("tkCount").textContent = `${done}/${S.tasks.length} done`;
}

function tick() {
  const end = new Date(S.deadline).getTime();
  const now = Date.now();
  let ms  = isNaN(end) ? 0 : end - now;
  const over = ms <= 0; if (over) ms = 0;
  const secs = Math.floor(ms / 1000);
  let start = S.start;
  if (!(start < end)) start = end - 30 * 864e5;
  const pct = over ? 100 : Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
  const c = {
    d: Math.floor(secs / 86400),
    h: Math.floor(secs % 86400 / 3600),
    m: Math.floor(secs % 3600 / 60),
    s: secs % 60,
    over, pct, end,
  };

  $("d").textContent = c.d;
  $("h").textContent = pad(c.h);
  $("m").textContent = pad(c.m);
  $("s").textContent = pad(c.s);
  $("bar").style.width = c.pct.toFixed(1) + "%";
  $("pct").textContent  = c.pct.toFixed(1) + "% of time elapsed";
  $("dlText").textContent = isNaN(c.end)
    ? "Pick a valid deadline"
    : "Deadline: " + new Date(c.end).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
  $("banner").style.display = c.over ? "block" : "none";

  // Phone clock overlay
  const n = new Date();
  $("cTime").textContent = (n.getHours() % 12 || 12) + ":" + pad(n.getMinutes());
  $("cDate").textContent = n.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  draw();
}

function renderAll() {
  $("goal").value  = S.goal;
  $("dead").value  = S.deadline;
  $("device").value = S.device || "android-916";
  $("goalView").textContent = S.goal;

  // Update canvas ARIA label
  cv.setAttribute("aria-label",
    `Wallpaper preview: ${S.goal}, ${S.milestones.length} milestones`);

  applyDevice(S.device || "android-916");
  renderMilestones();
  renderTasks();
  tick();
}

/* ================================================================
   ICON PICKER POPUP
   ================================================================ */
let pickerTarget = null;  // milestone index

function showIconPicker(msIndex, anchorEl) {
  // Remove any existing picker
  const old = document.getElementById("iconPicker");
  if (old) old.remove();
  if (pickerTarget === msIndex) { pickerTarget = null; return; }
  pickerTarget = msIndex;

  const div = document.createElement("div");
  div.id = "iconPicker";
  div.className = "edit-wrap icon-picker";
  div.style.marginTop = "8px";
  div.setAttribute("role", "group");
  div.setAttribute("aria-label", "Choose icon");
  div.innerHTML = ICON_KEYS.map(key =>
    `<button class="icon-opt ${S.milestones[msIndex].icon === key ? "on" : ""}"
       data-pick-icon="${key}" data-pick-mi="${msIndex}"
       aria-label="${key}" aria-pressed="${S.milestones[msIndex].icon === key}">
       <svg viewBox="0 0 24 24"><path d="${esc(ICONS[key])}"/></svg>
     </button>`
  ).join("");
  anchorEl.closest("li").after(div);
}

/* ================================================================
   EDIT FORM
   ================================================================ */
let editIndex = null;

function openEdit(i) {
  editIndex = i;
  const ms = S.milestones[i];
  $("msEditOffset").value = ms.offset;
  $("msEditIn").value     = ms.t;
  updateWordCounter($("msEditIn"), $("msEditWordCount"));
  $("msEditWrap").style.display = "block";
  $("msEditIn").focus();
  // Hide add picker if visible
  const p = $("iconPicker"); if (p) p.remove(); pickerTarget = null;
}

function closeEdit() {
  editIndex = null;
  $("msEditWrap").style.display = "none";
  $("msEditErr").textContent   = "";
}

function updateWordCounter(input, counter) {
  const wc = wordCount(input.value);
  counter.textContent = `${wc}/${WORD_LIMIT} words`;
  counter.classList.toggle("over", wc > WORD_LIMIT);
}

/* ================================================================
   EVENTS
   ================================================================ */

// Goal input
$("goal").addEventListener("input", e => {
  S.goal = e.target.value.trim() || "My Goal";
  $("goalView").textContent = S.goal;
  cv.setAttribute("aria-label", `Wallpaper preview: ${S.goal}, ${S.milestones.length} milestones`);
  save(); draw();
});

// Deadline
$("dead").addEventListener("input", e => {
  if (e.target.value) { S.deadline = e.target.value; save(); tick(); renderMilestones(); }
});

// Device
$("device").addEventListener("change", e => {
  S.device = e.target.value; save(); applyDevice(S.device); draw();
});

// Word counter on add form
$("msIn").addEventListener("input", () => {
  updateWordCounter($("msIn"), $("msWordCount"));
  $("msErr").textContent = "";
});

// Word counter on edit form
$("msEditIn").addEventListener("input", () => {
  updateWordCounter($("msEditIn"), $("msEditWordCount"));
  $("msEditErr").textContent = "";
});

// Add milestone
$("msForm").addEventListener("submit", e => {
  e.preventDefault();
  if ($("msAdd").disabled) return;

  const rawOffset = $("msOffset").value;
  const rawTitle  = $("msIn").value.trim();
  const offset    = parseInt(rawOffset, 10);

  // Validation
  if (isNaN(offset) || offset < 0 || offset > 365) {
    $("msErr").textContent = "Enter a day offset between 0 and 365."; return;
  }
  if (!rawTitle) {
    $("msErr").textContent = "Please enter a milestone title."; return;
  }
  const wc = wordCount(rawTitle);
  if (wc > WORD_LIMIT) {
    $("msErr").textContent = `Title must be ${WORD_LIMIT} words or fewer (you have ${wc}).`; return;
  }
  const charCount = rawTitle.length;
  if (charCount > 28) {
    $("msErr").textContent = `Title must be 28 characters or fewer.`; return;
  }
  if (S.milestones.some(m => m.offset === offset)) {
    $("msErr").textContent = `A milestone for T-${offset} already exists.`; return;
  }
  if (S.milestones.length >= MAX_MS) {
    $("msErr").textContent = "7 milestones max so the wallpaper stays readable."; return;
  }

  S.milestones.push({ offset, t: rawTitle, icon: "scope", done: false });
  $("msOffset").value = "";
  $("msIn").value     = "";
  $("msWordCount").textContent = "0/5 words";
  $("msWordCount").classList.remove("over");
  $("msErr").textContent = "";
  save(); renderMilestones(); draw();
});

// Edit save
$("msEditSave").addEventListener("click", () => {
  if (editIndex === null) return;
  const rawOffset = $("msEditOffset").value;
  const rawTitle  = $("msEditIn").value.trim();
  const offset    = parseInt(rawOffset, 10);

  if (isNaN(offset) || offset < 0 || offset > 365) {
    $("msEditErr").textContent = "Enter a day offset between 0 and 365."; return;
  }
  if (!rawTitle) {
    $("msEditErr").textContent = "Please enter a milestone title."; return;
  }
  const wc = wordCount(rawTitle);
  if (wc > WORD_LIMIT) {
    $("msEditErr").textContent = `Title must be ${WORD_LIMIT} words or fewer (you have ${wc}).`; return;
  }
  if (rawTitle.length > 28) {
    $("msEditErr").textContent = "Title must be 28 characters or fewer."; return;
  }
  const dupIdx = S.milestones.findIndex((m, i) => m.offset === offset && i !== editIndex);
  if (dupIdx !== -1) {
    $("msEditErr").textContent = `A milestone for T-${offset} already exists.`; return;
  }

  S.milestones[editIndex].offset = offset;
  S.milestones[editIndex].t      = rawTitle;
  closeEdit();
  save(); renderMilestones(); draw();
});

$("msEditCancel").addEventListener("click", closeEdit);

// Milestone list events (checkbox, delete, edit, icon)
$("ms").addEventListener("click", e => {
  // Checkbox
  const cb = e.target.closest("input[type=checkbox][data-k=ms]");
  if (cb) {
    S.milestones[+cb.dataset.i].done = cb.checked;
    save(); renderMilestones(); draw(); return;
  }
  // Delete
  const del = e.target.closest("[data-del-ms]");
  if (del) {
    S.milestones.splice(+del.dataset.delMs, 1);
    const p = $("iconPicker"); if (p) p.remove(); pickerTarget = null;
    closeEdit();
    save(); renderMilestones(); draw(); return;
  }
  // Edit
  const edit = e.target.closest("[data-edit]");
  if (edit) { openEdit(+edit.dataset.edit); return; }
  // Icon picker toggle
  const iconPickBtn = e.target.closest("[data-icon-pick]");
  if (iconPickBtn) { showIconPicker(+iconPickBtn.dataset.iconPick, iconPickBtn); return; }
});

// Icon picker selection
document.addEventListener("click", e => {
  const opt = e.target.closest("[data-pick-icon]");
  if (opt) {
    const mi   = +opt.dataset.pickMi;
    const icon = opt.dataset.pickIcon;
    S.milestones[mi].icon = icon;
    save(); renderMilestones(); draw();
    const p = $("iconPicker"); if (p) p.remove(); pickerTarget = null;
    return;
  }
  // Close picker when clicking outside
  const picker = $("iconPicker");
  if (picker && !picker.contains(e.target) && !e.target.closest("[data-icon-pick]")) {
    picker.remove(); pickerTarget = null;
  }
});

// Task list
$("tk").addEventListener("click", e => {
  const cb = e.target.closest("input[type=checkbox][data-k=tk]");
  if (cb) { S.tasks[+cb.dataset.i].done = cb.checked; save(); renderTasks(); return; }
  const del = e.target.closest("[data-del-tk]");
  if (del) { S.tasks.splice(+del.dataset.delTk, 1); save(); renderTasks(); return; }
});

$("tkForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("tkIn").value.trim(); if (!v) return;
  S.tasks.push({ t: v, done: false });
  $("tkIn").value = "";
  save(); renderTasks();
});

// Download
$("download").addEventListener("click", () => {
  draw();
  const preset = DEVICE_PRESETS[S.device] || DEVICE_PRESETS["android-916"];
  const slug   = slugify(S.goal);
  const fname  = `tzero-${slug}-${preset.W}x${preset.H}.png`;
  cv.toBlob(blob => {
    const a  = document.createElement("a");
    a.href   = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
});

/* ================================================================
   BOOT
   ================================================================ */
renderAll();
setInterval(tick, 1000);
