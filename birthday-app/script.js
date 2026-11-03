/* =========================================================
   BIRTHDAY MISSION — script.js
   Sections:
     1. Settings
     2. Screen manager (switching between screens)
     3. Screen 1 — Opening (skyline, stars, particles, webs)
     4. Screen 3 — Web hunt (sprites, items, city, game logic)
     5. Start-up
   (Screen 2, the briefing, is plain HTML/CSS and needs no code.)
   Each screen gets its own section so they can be built
   one at a time without touching each other.
   ========================================================= */

'use strict';


/* =========================================================
   1. SETTINGS
   ========================================================= */

// Must match --transition-time in style.css (700ms)
const TRANSITION_MS = 700;

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---- EDITABLE CONTENT ----
// The messages shown when each hidden heart is found (in the order they are found).
const HEART_MESSAGES = [
  "You make my ordinary days a little happier.",
  "I still love listening to you yap.",
  "And yes, you're stuck with me."
];


/* =========================================================
   2. SCREEN MANAGER
   - Finds every <section data-screen="name"> in index.html.
   - goTo('name') plays the wipe and swaps the active screen.
   - Buttons with data-goto="name" call goTo automatically.
   - To add a new screen: add its <section> in index.html and
     (optionally) register hooks in `screenHooks` below.
   ========================================================= */

const screenElements = {};   // name -> element
let currentScreen = 'opening';
let isTransitioning = false;

// Optional per-screen hooks. Future screens add themselves here.
//   onEnter: runs right after the screen becomes visible
//   onLeave: runs right before it is hidden
const screenHooks = {
  opening:  { onEnter() {}, onLeave() {} },
  briefing: { onEnter() {}, onLeave() {} },
  hunt:     { onEnter() { resetHunt(); }, onLeave() {} },   // every visit starts a fresh hunt
  minigame: { onEnter() {}, onLeave() {} }                  // placeholder for now
};

function collectScreens() {
  document.querySelectorAll('[data-screen]').forEach((el) => {
    screenElements[el.dataset.screen] = el;
  });
}

// Swap the visible screen (no animation — used at the midpoint of goTo)
function swapScreen(name) {
  const hooksOut = screenHooks[currentScreen];
  if (hooksOut && hooksOut.onLeave) hooksOut.onLeave();

  screenElements[currentScreen].classList.remove('is-active');
  screenElements[name].classList.add('is-active');
  currentScreen = name;

  const hooksIn = screenHooks[name];
  if (hooksIn && hooksIn.onEnter) hooksIn.onEnter();
}

// Go to another screen with the wipe animation
function goTo(name) {
  if (isTransitioning || name === currentScreen) return;

  if (!screenElements[name]) {
    console.warn(`No screen named "${name}". Check data-screen in index.html.`);
    return;
  }

  const wipe = document.getElementById('transition');
  isTransitioning = true;
  wipe.classList.add('is-playing');

  // Swap while the wipe fully covers the screen (halfway through)
  setTimeout(() => swapScreen(name), TRANSITION_MS / 2);

  // Clean up when the wipe finishes
  setTimeout(() => {
    wipe.classList.remove('is-playing');
    isTransitioning = false;
  }, TRANSITION_MS);
}

// Wire up every button that has data-goto="screenName"
function setupNavigationButtons() {
  document.querySelectorAll('[data-goto]').forEach((button) => {
    button.addEventListener('click', () => goTo(button.dataset.goto));
  });
}


/* =========================================================
   3. SCREEN 1 — OPENING
   Everything here only builds decoration. Text lives in
   index.html so it is easy to edit.
   ========================================================= */

/* ---- 3a. Small helpers ---- */
function random(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

/* ---- 3b. Skyline ----
   Edit these lists to change the city. Each building is
   { x, w, h } inside a 400 x 200 drawing; ground is at y = 200. */
const CITY_BACK = [
  { x: 0,   w: 50, h: 110 }, { x: 40,  w: 45, h: 140 }, { x: 90,  w: 40, h: 100 },
  { x: 125, w: 55, h: 150 }, { x: 185, w: 40, h: 120 }, { x: 220, w: 50, h: 135 },
  { x: 275, w: 45, h: 105 }, { x: 315, w: 45, h: 145 }, { x: 355, w: 50, h: 115 }
];

const CITY_FRONT = [
  { x: 0,   w: 35, h: 80  }, { x: 30,  w: 50, h: 100 }, { x: 85,  w: 40, h: 70  },
  { x: 130, w: 45, h: 120 }, { x: 180, w: 35, h: 85  }, { x: 220, w: 55, h: 105 },
  { x: 280, w: 40, h: 75  }, { x: 325, w: 35, h: 110 }, { x: 365, w: 40, h: 90  }
];

const WINDOW_COLORS = ['#ffd98a', '#ff6b6e', '#c9a8ff', '#ffd98a'];   // mostly warm, some red/purple

function drawBuildings(groupId, buildings, cssClass) {
  const group = document.getElementById(groupId);
  buildings.forEach((b) => {
    group.appendChild(svgEl('rect', {
      x: b.x, y: 200 - b.h, width: b.w, height: b.h, class: cssClass
    }));
  });
}

function drawWindows(buildings) {
  const group = document.getElementById('city-windows');
  const size = 3, gap = 5;

  buildings.forEach((b) => {
    for (let wx = b.x + 5; wx < b.x + b.w - size - 2; wx += size + gap) {
      for (let wy = 200 - b.h + 6; wy < 194; wy += size + gap + 1) {
        if (Math.random() > 0.3) continue;            // only ~30% of windows are lit
        const win = svgEl('rect', {
          x: wx, y: wy, width: size, height: size,
          fill: pick(WINDOW_COLORS), class: 'window'
        });
        win.style.animationDelay = `${random(0, 4).toFixed(2)}s`;
        win.style.animationDuration = `${random(3, 7).toFixed(2)}s`;
        group.appendChild(win);
      }
    }
  });
}

function drawBeacon() {
  // Blinking red aircraft light on the tallest back building
  const tallest = CITY_BACK.reduce((a, b) => (b.h > a.h ? b : a));
  document.getElementById('city-back').appendChild(svgEl('circle', {
    cx: tallest.x + tallest.w / 2, cy: 200 - tallest.h - 3, r: 1.8, class: 'beacon'
  }));
}

function buildSkyline() {
  drawBuildings('city-back', CITY_BACK, 'building-back');
  drawBuildings('city-front', CITY_FRONT, 'building-front');
  drawWindows(CITY_FRONT);
  drawBeacon();
}

/* ---- 3c. Stars ---- */
function buildStars(containerId = 'stars', count = 40) {
  const container = document.getElementById(containerId);
  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'star' + (Math.random() > 0.8 ? ' star--purple' : '');
    star.style.left = `${random(0, 100)}%`;
    star.style.top = `${random(0, 55)}%`;
    star.style.animationDelay = `${random(0, 3).toFixed(2)}s`;
    star.style.animationDuration = `${random(2, 5).toFixed(2)}s`;
    container.appendChild(star);
  }
}

/* ---- 3d. Floating particles (embers / glow dots) ---- */
const PARTICLE_COLORS = ['#e62429', '#ff6b6e', '#9b5de5', '#c9a8ff', '#f6f1ff'];

function buildParticles(count = 22) {
  const container = document.getElementById('particles');
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const size = random(2, 5);
    const color = pick(PARTICLE_COLORS);

    p.className = 'particle';
    p.style.left = `${random(0, 100)}%`;
    p.style.width = p.style.height = `${size}px`;
    p.style.background = color;
    p.style.boxShadow = `0 0 ${size * 2}px ${color}`;
    p.style.setProperty('--drift', `${random(-40, 40).toFixed(0)}px`);
    p.style.animationDuration = `${random(8, 16).toFixed(1)}s`;
    p.style.animationDelay = `${random(0, 12).toFixed(1)}s`;
    container.appendChild(p);
  }
}

/* ---- 3e. Web corners ----
   Draws a spider web in the top-left of a 100x100 box:
   straight "spokes" plus curved rings between them. */
function buildWebCorner(svg) {
  const spokeAngles = [0, 22.5, 45, 67.5, 90];          // degrees
  const ringRadii = [22, 42, 62, 84];
  const toPoint = (r, deg) => {
    const rad = (deg * Math.PI) / 180;
    return [r * Math.cos(rad), r * Math.sin(rad)];
  };

  // Spokes
  spokeAngles.forEach((deg) => {
    const [x, y] = toPoint(100, deg);
    svg.appendChild(svgEl('path', { d: `M0 0 L${x.toFixed(1)} ${y.toFixed(1)}` }));
  });

  // Rings: little inward-curving arcs between neighbouring spokes
  ringRadii.forEach((r) => {
    let d = '';
    for (let i = 0; i < spokeAngles.length - 1; i++) {
      const [x1, y1] = toPoint(r, spokeAngles[i]);
      const [x2, y2] = toPoint(r, spokeAngles[i + 1]);
      const [cx, cy] = toPoint(r * 0.88, (spokeAngles[i] + spokeAngles[i + 1]) / 2);
      if (i === 0) d += `M${x1.toFixed(1)} ${y1.toFixed(1)} `;
      d += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    svg.appendChild(svgEl('path', { d }));
  });
}

function buildWebCorners() {
  document.querySelectorAll('.web-corner').forEach(buildWebCorner);
}

/* ---- 3f. Put it all together ---- */
function initOpeningScreen() {
  buildSkyline();
  buildStars();
  buildParticles();
  buildWebCorners();
}


/* =========================================================
   4. SCREEN 3 — WEB HUNT
   The player taps around a night-city scene. Six objects are
   "real" (3 webs, 3 hearts): they shimmer. Everything else is
   a fake or a harmless decoy that just shows a funny line.
   ========================================================= */

/* ---- 4a. Pixel sprites ----
   Each sprite is a small grid of letters. "." is empty; any other
   letter is looked up in that sprite's palette. Easy to redraw! */
const HEART_GRID = [
  '.xx.xx.',
  'xhxxxxx',
  'xxxxxxx',
  '.xxxxxd',
  '..xxxd.',
  '...xd..'
];

const WEB_GRID = [
  'x...x...x',
  '.x.xxx.x.',
  '..xx.xx..',
  '.xx.x.xx.',
  'xxxxxxxxx',
  '.xx.x.xx.',
  '..xx.xx..',
  '.x.xxx.x.',
  'x...x...x'
];

const SPRITES = {
  heart:     { grid: HEART_GRID, palette: { x: '#ff3b5c', h: '#ff9db0', d: '#b3123a' } },
  heartFake: { grid: HEART_GRID, palette: { x: '#6b6678', h: '#8a859a', d: '#4a4558' } },
  web:       { grid: WEB_GRID,   palette: { x: '#f6f1ff' } },
  webFake:   { grid: WEB_GRID,   palette: { x: '#6b6678' } },
  pigeon: {
    grid: ['..xxx...', '.xxdxy..', '.xxxx...', 'xxxxxx..', 'xxxxxxx.', '.xxxxxx.', '..y..y..'],
    palette: { x: '#8a90a6', d: '#000000', y: '#e0a030' }
  },
  cat: {
    grid: ['xx....xx', 'xxxxxxxx', 'xgxxxxgx', 'xxxxxxxx', '.xxxxxx.'],
    palette: { x: '#4a4060', g: '#7cfc9a' }
  },
  trash: {
    grid: ['hhhhhh', '.xxxx.', '.xdxd.', '.xxxx.', '.xdxd.', '.xxxx.'],
    palette: { x: '#5a5470', d: '#2a2540', h: '#7a7490' }
  },
  star: {
    grid: ['...x...', '...x...', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', 'xx...xx'],
    palette: { x: '#ffd98a' }
  },
  bat: {
    grid: ['x.......x', 'xx.x.x.xx', 'xxxxxxxxx', '.xx.x.xx.', '..x...x..'],
    palette: { x: '#6a4a9a' }
  }
};

// Turns a sprite name into an <svg> made of tiny squares
function makeSprite(name) {
  const { grid, palette } = SPRITES[name];
  const svg = svgEl('svg', {
    viewBox: `0 0 ${grid[0].length} ${grid.length}`,
    'shape-rendering': 'crispEdges',
    'aria-hidden': 'true'
  });
  grid.forEach((row, y) => {
    [...row].forEach((letter, x) => {
      if (letter === '.') return;
      svg.appendChild(svgEl('rect', { x, y, width: 1, height: 1, fill: palette[letter] }));
    });
  });
  return svg;
}

// Fills any <span class="sprite" data-sprite="name"> in the HTML
function fillSprites() {
  document.querySelectorAll('[data-sprite]').forEach((el) => {
    el.appendChild(makeSprite(el.dataset.sprite));
  });
}

/* ---- 4b. The objects in the scene ----
   x / y = position in % of the scene, size = width in rem.
   real: true  -> one of the 6 things to find (shimmers)
   real: false -> fake or decoy; "msg" is shown when tapped.
   To move or add objects, just edit this list. */
const HUNT_ITEMS = [
  // --- REAL webs ---
  { id: 'web1', kind: 'web', real: true, sprite: 'web', x: 91, y: 17, size: 1.7 },
  { id: 'web2', kind: 'web', real: true, sprite: 'web', x: 5,  y: 41, size: 1.7 },
  { id: 'web3', kind: 'web', real: true, sprite: 'web', x: 82, y: 56, size: 1.7 },

  // --- REAL hearts ---
  { id: 'heart1', kind: 'heart', real: true, sprite: 'heart', x: 12, y: 50, size: 1.6 },
  { id: 'heart2', kind: 'heart', real: true, sprite: 'heart', x: 85, y: 88, size: 1.6 },
  { id: 'heart3', kind: 'heart', real: true, sprite: 'heart', x: 62, y: 31, size: 1.6 },

  // --- FAKE hearts (grey) ---
  { id: 'fh1', kind: 'fake', real: false, sprite: 'heartFake', x: 40, y: 56, size: 1.6, msg: 'That heart is fake. Suspicious.' },
  { id: 'fh2', kind: 'fake', real: false, sprite: 'heartFake', x: 22, y: 72, size: 1.6, msg: 'Cold. Not a real one.' },
  { id: 'fh3', kind: 'fake', real: false, sprite: 'heartFake', x: 90, y: 74, size: 1.6, msg: "Nope. That's just a sticker." },
  { id: 'fh4', kind: 'fake', real: false, sprite: 'heartFake', x: 30, y: 88, size: 1.6, msg: 'Close, but no.' },

  // --- FAKE webs (grey) ---
  { id: 'fw1', kind: 'fake', real: false, sprite: 'webFake', x: 62, y: 45, size: 1.7, msg: 'Just a dusty cobweb. Next.' },
  { id: 'fw2', kind: 'fake', real: false, sprite: 'webFake', x: 46, y: 80, size: 1.7, msg: 'A fake web. Spider-Man would know.' },
  { id: 'fw3', kind: 'fake', real: false, sprite: 'webFake', x: 10, y: 64, size: 1.7, msg: 'Nothing but lint.' },

  // --- Harmless decoys ---
  { id: 'pigeon', kind: 'decoy', real: false, sprite: 'pigeon', x: 76, y: 42, size: 1.9, msg: 'Just a pigeon. Judging you.' },
  { id: 'cat',    kind: 'decoy', real: false, sprite: 'cat',    x: 22, y: 36, size: 1.9, msg: 'A cat. Not your sidekick.' },
  { id: 'trash',  kind: 'decoy', real: false, sprite: 'trash',  x: 62, y: 88, size: 1.5, msg: 'Ew. Just trash.' },
  { id: 'star',   kind: 'decoy', real: false, sprite: 'star',   x: 66, y: 16, size: 1.3, msg: 'A star. Pretty, but no.' },
  { id: 'bat',    kind: 'decoy', real: false, sprite: 'bat',    x: 38, y: 21, size: 2.2, msg: 'A bat. Wrong hero.' }
];

const HUNT_TOTALS = {
  web:   HUNT_ITEMS.filter((i) => i.real && i.kind === 'web').length,
  heart: HUNT_ITEMS.filter((i) => i.real && i.kind === 'heart').length
};

/* ---- 4c. The city backdrop ----
   Buildings are positioned in % so the scene fits any phone.
   "far" ones are plain silhouettes; "near" ones have a grid of windows. */
const HUNT_FAR_BUILDINGS = [
  { left: 6,  width: 28, height: 70 },
  { left: 38, width: 26, height: 74 },
  { left: 70, width: 30, height: 66 }
];

// No red here on purpose: red is reserved for the hearts you need to find
const HUNT_WINDOW_COLORS = ['#ffd98a', '#ffd98a', '#c9a8ff'];

const HUNT_NEAR_BUILDINGS = [
  { left: 0,  width: 34, height: 62, cols: 4, rows: 9 },
  { left: 33, width: 36, height: 78, cols: 5, rows: 11, tall: true },   // tall = has an antenna
  { left: 68, width: 32, height: 55, cols: 4, rows: 8 }
];

function placeBox(el, b) {
  el.style.left = `${b.left}%`;
  el.style.width = `${b.width}%`;
  el.style.height = `${b.height}%`;
}

function buildHuntCity() {
  const city = document.getElementById('hunt-city');

  HUNT_FAR_BUILDINGS.forEach((b) => {
    const el = document.createElement('div');
    el.className = 'hunt-far';
    placeBox(el, b);
    city.appendChild(el);
  });

  HUNT_NEAR_BUILDINGS.forEach((b) => {
    const el = document.createElement('div');
    el.className = 'hunt-building' + (b.tall ? ' hunt-building--tall' : '');
    placeBox(el, b);
    el.style.gridTemplateColumns = `repeat(${b.cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${b.rows}, 1fr)`;

    for (let i = 0; i < b.cols * b.rows; i++) {
      const win = document.createElement('span');
      win.className = 'hunt-window';
      if (Math.random() < 0.28) {                    // ~28% of windows are lit
        win.classList.add('is-lit');
        win.style.setProperty('--c', pick(HUNT_WINDOW_COLORS));
        win.style.animationDelay = `${random(0, 5).toFixed(2)}s`;
      }
      el.appendChild(win);
    }
    city.appendChild(el);
  });
}

/* ---- 4d. Building the tappable objects ---- */
function buildHuntItems() {
  const container = document.getElementById('hunt-items');

  HUNT_ITEMS.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `hunt-item hunt-item--${item.real ? 'real' : item.kind}`;
    if (item.real && item.kind === 'heart') btn.classList.add('hunt-item--heart');   // found hearts stay tappable
    btn.dataset.id = item.id;
    btn.setAttribute('aria-label', 'Something to tap');
    btn.style.left = `${item.x}%`;
    btn.style.top = `${item.y}%`;
    btn.style.setProperty('--s', `${item.size}rem`);
    btn.style.setProperty('--delay', `${random(0, 2.5).toFixed(2)}s`);   // so shimmers aren't in sync
    btn.appendChild(makeSprite(item.sprite));
    container.appendChild(btn);
  });

  // One listener for all objects
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('.hunt-item');
    if (!btn) return;
    onHuntItemTap(HUNT_ITEMS.find((i) => i.id === btn.dataset.id), btn);
  });
}

/* ---- 4e. Game state + logic ---- */
const huntState = {
  found: new Set(),    // ids of real items already found
  webs: 0,
  hearts: 0,
  heartNumbers: {}     // heart id -> which heart it was (1, 2 or 3), so its message can be replayed
};

let toastTimer = null;
let completeTimer = null;

function onHuntItemTap(item, btn) {
  // Already found: a heart shows its message again, a web does nothing
  if (huntState.found.has(item.id)) {
    if (item.kind === 'heart') openHeartDialog(huntState.heartNumbers[item.id]);
    return;
  }

  // Fake or decoy: wiggle + funny line
  if (!item.real) {
    showHuntToast(item.msg);
    btn.classList.remove('is-shake');
    void btn.offsetWidth;                        // lets the animation restart
    btn.classList.add('is-shake');
    clearTimeout(btn.shakeTimer);
    btn.shakeTimer = setTimeout(() => btn.classList.remove('is-shake'), 400);   // so it goes back to shimmering
    return;
  }

  // Real: mark as found
  huntState.found.add(item.id);
  btn.classList.add('is-found');

  if (item.kind === 'web') {
    huntState.webs++;
    showHuntToast(`WEB FOUND ${huntState.webs}/${HUNT_TOTALS.web}`);
  } else {
    huntState.hearts++;
    huntState.heartNumbers[item.id] = huntState.hearts;
    openHeartDialog(huntState.hearts);
  }

  updateHuntHud();
  if (item.kind === 'web') checkHuntComplete();     // for hearts, we check after the message closes
}

function updateHuntHud() {
  document.getElementById('hunt-webs').textContent = `${huntState.webs}/${HUNT_TOTALS.web}`;
  document.getElementById('hunt-hearts').textContent = `${huntState.hearts}/${HUNT_TOTALS.heart}`;
  document.getElementById('hunt-webs-counter')
    .classList.toggle('is-done', huntState.webs === HUNT_TOTALS.web);
  document.getElementById('hunt-hearts-counter')
    .classList.toggle('is-done', huntState.hearts === HUNT_TOTALS.heart);
}

function showHuntToast(text) {
  const toast = document.getElementById('hunt-toast');
  toast.textContent = text;
  toast.classList.add('is-open');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-open'), 1900);
}

function openHeartDialog(number) {
  document.getElementById('hunt-dialog-tag').textContent =
    `HEART FOUND ${number}/${HUNT_TOTALS.heart}`;
  document.getElementById('hunt-dialog-text').textContent = HEART_MESSAGES[number - 1] || '';
  document.getElementById('hunt-toast').classList.remove('is-open');
  document.getElementById('hunt-dialog').classList.add('is-open');
}

function closeHeartDialog() {
  document.getElementById('hunt-dialog').classList.remove('is-open');
  checkHuntComplete();
}

// When all 6 are found, show MISSION COMPLETE after a short pause
function checkHuntComplete() {
  const total = HUNT_TOTALS.web + HUNT_TOTALS.heart;
  if (huntState.webs + huntState.hearts < total) return;
  if (document.getElementById('hunt-complete').classList.contains('is-open')) return;
  clearTimeout(completeTimer);
  completeTimer = setTimeout(() => {
    document.getElementById('hunt-complete').classList.add('is-open');
  }, 900);
}

// Start a fresh hunt (runs every time the screen is entered)
function resetHunt() {
  huntState.found.clear();
  huntState.webs = 0;
  huntState.hearts = 0;
  huntState.heartNumbers = {};
  clearTimeout(toastTimer);
  clearTimeout(completeTimer);

  document.querySelectorAll('.hunt-item').forEach((btn) => {
    btn.classList.remove('is-found', 'is-shake');
  });
  document.getElementById('hunt-toast').classList.remove('is-open');
  document.getElementById('hunt-dialog').classList.remove('is-open');
  document.getElementById('hunt-complete').classList.remove('is-open');
  updateHuntHud();
}

/* ---- 4f. Put it all together ---- */
function initHuntScreen() {
  fillSprites();
  buildStars('hunt-stars', 35);
  buildHuntCity();
  buildHuntItems();
  document.getElementById('hunt-dialog-close').addEventListener('click', closeHeartDialog);
  resetHunt();
}


/* =========================================================
   5. START-UP
   ========================================================= */

// Dev shortcut: opening index.html#hunt jumps straight to that screen,
// so you can test a later screen without replaying the earlier ones.
function jumpToScreenFromHash() {
  const name = window.location.hash.slice(1);
  if (name && screenElements[name] && name !== currentScreen) swapScreen(name);
}

function init() {
  collectScreens();
  initOpeningScreen();
  initHuntScreen();
  setupNavigationButtons();
  jumpToScreenFromHash();
}

document.addEventListener('DOMContentLoaded', init);
