
'use strict';


/* =========================================================
   1. SETTINGS
   ========================================================= */

// Must match --transition-time in style.css (700ms)
const TRANSITION_MS = 700;

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---- EDITABLE CONTENT ----
const HEART_MESSAGES = [
  "Have I told you how cute and pogi you are? Kasi if not, let me remind you.",
  "I love listening to you yap. I love listening to you talk about anything and everything.",
  "Kinikilig pa din me everytime nag ily ikaw!"
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
  minigame: { onEnter() { enterMiniGame(); }, onLeave() { leaveMiniGame(); } },
  purple:   { onEnter() {}, onLeave() {} },
  memory:   { onEnter() { resetMemoryRoom(); }, onLeave() {} },   // fresh room on every visit
  letter:   { onEnter() { resetLetter(); }, onLeave() { clearLetterTimers(); } },   // envelope is closed on every visit
  finale:   { onEnter() { startFinale(); }, onLeave() { stopFinale(); } }   // effects only run while visible
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
  },

  // ---- Memory room (Screen 6) ----
  bubble: {
    grid: [
      '..xxxxxxx..',
      '.xxxxxxxxx.',
      'xxxdxxdxxdx',
      'xxxxxxxxxxx',
      '.xxxxxxxxx.',
      '..xxxxxxx..',
      '...xxx.....',
      '..xx.......'
    ],
    palette: { x: '#f6f1ff', d: '#9b5de5' }
  },
  note: {
    grid: [
      '....xxxxx',
      '....xxxxx',
      '....x...x',
      '....x...x',
      '..xxx.xxx',
      '.xxxx.xxx',
      '..xx...xx'
    ],
    palette: { x: '#f6f1ff' }
  },
  moon: {
    grid: [
      '...xxxx.',
      '..xxx...',
      '.xxx....',
      '.xxx....',
      '.xxx....',
      '.xxx....',
      '..xxx...',
      '...xxxx.'
    ],
    palette: { x: '#ffe9a8' }
  },
  gift: {
    grid: [
      '..bb.bb..',
      '...bbb...',
      'llllrllll',
      'llllrllll',
      '.xxxrxxx.',
      '.xxxrxxx.',
      '.xxxrxxx.',
      '.xxxrxxx.',
      '.xxxrxxx.'
    ],
    palette: { b: '#ff9db0', l: '#c9a8ff', r: '#ff3b5c', x: '#9b5de5' }
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
  fillSprites();                 // also fills the sprite icons used on the mini-game HUD
  buildStars('hunt-stars', 35);
  buildHuntCity();
  buildHuntItems();
  document.getElementById('hunt-dialog-close').addEventListener('click', closeHeartDialog);
  resetHunt();
}


/* =========================================================
   5. SCREEN 4 — MINI-GAME
   A short side-scrolling run drawn on a <canvas>.
   - Hold your finger down: Spidey swings UP on a web.
   - Let go: he falls.
   - Fly through hearts, webs and stars to collect them.
   - There is no way to lose. Touching the ground or the sky
     just slides you along. Reach the birthday building to win.
   ========================================================= */

/* ---- 5a. Settings you can tweak ---- */
const GAME = {
  lengthUnits: 5600,     // how long the run is (bigger = longer)
  speed: 240,            // how fast the city scrolls (units per second)
  gravity: 1100,         // pull down while NOT holding
  swingForce: 1900,      // pull up while holding
  maxFall: 520,
  maxRise: 430,
  heightUnits: 640,      // the game is always 640 units tall, whatever the phone
  groundY: 590,
  ceilingY: 50,
  pickupRadius: 36,
  buildingWidth: 230,    // the birthday building at the end (must fit a phone: screen is ~300 units wide)
  startY: 470            // where the hero waits before the run starts
};

/* ---- 5b. Pixel art for the canvas ----
   Same letter-grid idea as the web hunt. The heart, web and star
   reuse the grids defined for Screen 3 (SPRITES). */
const GAME_SPRITES = {
  // Same cute hero as on the opening screen, in pixels
  hero: {
    grid: [
      '....h....',
      '..hhhhh..',
      '.hhhhhhh.',
      '.hsssssh.',
      '.ppepepp.',
      '.ksssssk.',
      '..rrrrr..',
      '.hhhkhhh.',
      'whhhhhhhw',
      '..hh.hh..',
      '..rr.rr..'
    ],
    palette: { h: '#7a3fd0', p: '#c9a8ff', s: '#ffe2cf', e: '#1a0f2e', k: '#ff9db0', r: '#e62429', w: '#f6f1ff' }
  },
  heart: SPRITES.heart,
  web:   SPRITES.web,
  star:  SPRITES.star
};

const SPRITE_PIXEL = 3;     // each grid square is drawn 3 game-units wide
const spriteCache = {};     // name -> small offscreen canvas (drawn once, reused every frame)

// Custom mini-game character image
const miniHeroImage = new Image();
miniHeroImage.src = 'assets/images/custom-character.png';
const MINI_HERO_HEIGHT = 58;     // how tall the hero is in the mini-game

// Draws a letter-grid onto a tiny canvas once, so each frame is just a fast image copy
function buildSpriteCanvas(name) {
  const { grid, palette } = GAME_SPRITES[name];
  const c = document.createElement('canvas');
  c.width = grid[0].length;
  c.height = grid.length;
  const g = c.getContext('2d');
  grid.forEach((row, y) => {
    [...row].forEach((letter, x) => {
      if (letter === '.') return;
      g.fillStyle = palette[letter];
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

/* ---- 5c. Game state ---- */
const mini = {
  canvas: null,
  ctx: null,
  scale: 1,              // device pixels per game unit
  widthUnits: 360,       // visible width in game units (depends on phone shape)
  playerX: 100,          // where the hero sits on screen, in units
  state: 'ready',        // 'ready' | 'playing' | 'done'
  holding: false,
  running: false,        // is the animation loop on?
  lastTime: 0,
  rafId: 0,
  finishTimer: null,
  distance: 0,           // how far we have scrolled
  heroDx: 0,             // extra sideways offset used when the hero runs into the door
  y: 470,
  vy: 0,
  items: [],
  particles: [],
  counts: { heart: 0, web: 0, star: 0 },
  bgStars: [],
  farCity: [],
  nearCity: [],
  eventsAttached: false
};

/* ---- 5d. Build the level: a wavy trail of collectibles ---- */
function buildMiniItems() {
  const types = ['heart', 'star', 'web', 'heart', 'star', 'heart', 'web'];
  const items = [];
  let n = 0;
  for (let x = 520; x < GAME.lengthUnits - 380; x += 170) {
    const wave = Math.sin(x / 520) * 150 + Math.sin(x / 190) * 40;
    items.push({
      type: types[n % types.length],
      x,
      y: Math.max(120, Math.min(520, 330 + wave)),
      taken: false
    });
    n++;
  }
  return items;
}

function buildMiniBackground() {
  mini.bgStars = Array.from({ length: 45 }, () => ({
    x: random(0, 1000), y: random(20, 380), r: random(1, 2.6), tw: random(0, 6)
  }));

  // Two layers of skyline that scroll at different speeds (parallax)
  const makeCity = (minW, maxW, minH, maxH) => {
    const out = [];
    let x = 0;
    while (x < 2000) {
      const w = random(minW, maxW);
      out.push({ x, w, h: random(minH, maxH) });
      x += w + random(0, 8);
    }
    return out;
  };
  mini.farCity = makeCity(60, 110, 120, 260);
  mini.nearCity = makeCity(70, 130, 60, 170);
}

/* ---- 5e. Setup, sizing and input ---- */
function resizeMiniCanvas() {
  const canvas = mini.canvas;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);     // cap at 2 to keep phones fast
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  mini.scale = canvas.height / GAME.heightUnits;
  mini.widthUnits = canvas.width / mini.scale;
  mini.playerX = Math.max(70, mini.widthUnits * 0.26);
  mini.ctx.imageSmoothingEnabled = false;                    // keep the pixel art crisp
}

function setHolding(value) {
  mini.holding = value;
}

function attachMiniEvents() {
  if (mini.eventsAttached) return;
  mini.eventsAttached = true;

  const canvas = mini.canvas;
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); setHolding(true); });
  canvas.addEventListener('pointerup', () => setHolding(false));
  canvas.addEventListener('pointercancel', () => setHolding(false));
  canvas.addEventListener('pointerleave', () => setHolding(false));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Space bar works too, handy for testing on a computer
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && currentScreen === 'minigame') { e.preventDefault(); setHolding(true); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') setHolding(false);
  });

  window.addEventListener('resize', () => { if (currentScreen === 'minigame') resizeMiniCanvas(); });
  document.getElementById('mini-start').addEventListener('click', startMiniGame);
}

function initMiniGame() {
  mini.canvas = document.getElementById('mini-canvas');
  mini.ctx = mini.canvas.getContext('2d');
  Object.keys(GAME_SPRITES).forEach((name) => { spriteCache[name] = buildSpriteCanvas(name); });
  buildMiniBackground();
  attachMiniEvents();
}

/* ---- 5f. Start / stop / reset ---- */
function updateMiniHud() {
  document.getElementById('mini-hearts').textContent = mini.counts.heart;
  document.getElementById('mini-webs').textContent = mini.counts.web;
  document.getElementById('mini-stars').textContent = mini.counts.star;
  const progress = Math.min(1, mini.distance / (GAME.lengthUnits - 40));
  document.getElementById('mini-progress-fill').style.width = `${(progress * 100).toFixed(1)}%`;
}

function resetMiniGame() {
  clearTimeout(mini.finishTimer);
  mini.state = 'ready';
  mini.holding = false;
  mini.distance = 0;
  mini.y = GAME.startY;
  mini.vy = 0;
  mini.heroDx = 0;
  mini.items = buildMiniItems();
  mini.particles = [];
  mini.counts = { heart: 0, web: 0, star: 0 };
  document.getElementById('mini-start').classList.add('is-open');
  document.getElementById('mini-finish').classList.remove('is-open');
  updateMiniHud();
}

function startMiniGame() {
  if (mini.state !== 'ready') return;
  mini.state = 'playing';
  document.getElementById('mini-start').classList.remove('is-open');
}

function enterMiniGame() {
  resizeMiniCanvas();
  resetMiniGame();
  mini.running = true;
  mini.lastTime = performance.now();
  mini.rafId = requestAnimationFrame(miniLoop);
}

function leaveMiniGame() {
  mini.running = false;                    // the loop stops itself: nothing runs off-screen
  cancelAnimationFrame(mini.rafId);
  clearTimeout(mini.finishTimer);
  mini.holding = false;
}

/* ---- 5g. The game loop: update, then draw, every frame ---- */
function miniLoop(now) {
  if (!mini.running) return;
  const dt = Math.min(0.05, (now - mini.lastTime) / 1000);   // cap so a lag spike can't teleport things
  mini.lastTime = now;

  updateMini(dt);
  drawMini(now / 1000);

  mini.rafId = requestAnimationFrame(miniLoop);
}

function updateMini(dt) {
  updateParticles(dt);
  if (mini.state === 'ready') {
    // gentle hover while waiting to start
    mini.y = GAME.startY + Math.sin(performance.now() / 400) * 10;
    return;
  }

  // After the finish, the hero runs into the party building's door
  if (mini.state === 'done') {
    const doorDx = (destinationWidth() / 2) + 40;      // building edge sat 40 units ahead of the hero
    mini.heroDx = Math.min(doorDx, mini.heroDx + 150 * dt);
  }

  // Scroll forward (keeps drifting a little after the finish line)
  if (mini.state === 'playing') mini.distance += GAME.speed * dt;

  // Swing up while holding, fall otherwise
  const accel = mini.holding && mini.state === 'playing' ? -GAME.swingForce : GAME.gravity;
  mini.vy += accel * dt;
  mini.vy = Math.max(-GAME.maxRise, Math.min(GAME.maxFall, mini.vy));
  mini.y += mini.vy * dt;

  // Floor and sky: just stop, never game over
  if (mini.y > GAME.groundY) { mini.y = GAME.groundY; mini.vy = 0; }
  if (mini.y < GAME.ceilingY) { mini.y = GAME.ceilingY; mini.vy = 0; }

  collectItems();

  if (mini.state === 'playing') {
    updateMiniHud();
    if (mini.distance >= GAME.lengthUnits - 40) finishMiniGame();
  }
}

function collectItems() {
  mini.items.forEach((item) => {
    if (item.taken) return;
    const screenX = item.x - mini.distance + mini.playerX;
    const dx = screenX - mini.playerX;
    const dy = item.y - mini.y;
    if (dx * dx + dy * dy < GAME.pickupRadius * GAME.pickupRadius) {
      item.taken = true;
      mini.counts[item.type]++;
      burst(screenX, item.y, item.type === 'heart' ? '#ff3b5c' : item.type === 'star' ? '#ffd98a' : '#f6f1ff', 10);
    }
  });
}

function finishMiniGame() {
  mini.state = 'done';
  mini.holding = false;
  for (let i = 0; i < 4; i++) {
    setTimeout(() => burst(mini.playerX + random(-30, 80), random(150, 420), pick(PARTICLE_COLORS), 14), i * 180);
  }
  mini.finishTimer = setTimeout(() => {
    document.getElementById('mini-finish').classList.add('is-open');
  }, 1200);
}

/* ---- 5h. Sparkle particles ---- */
function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const speed = random(60, 220);
    mini.particles.push({
      x, y, color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: random(0.4, 0.8),
      age: 0
    });
  }
}

function updateParticles(dt) {
  mini.particles.forEach((p) => {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt;
  });
  mini.particles = mini.particles.filter((p) => p.age < p.life);
}

/* ---- 5i. Drawing ---- */
function drawSprite(name, cx, cy, pixel = SPRITE_PIXEL) {
  const img = spriteCache[name];
  const w = img.width * pixel;
  const h = img.height * pixel;
  mini.ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawMiniBackground(time) {
  const ctx = mini.ctx;
  const W = mini.widthUnits;
  const H = GAME.heightUnits;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#05030d');
  sky.addColorStop(0.6, '#150a2b');
  sky.addColorStop(1, '#3a1240');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars (slow parallax, wrap around)
  mini.bgStars.forEach((s) => {
    const x = ((s.x - mini.distance * 0.05) % 1000 + 1000) % 1000 % (W + 40);
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(time * 1.5 + s.tw));
    ctx.fillStyle = '#f6f1ff';
    ctx.fillRect(x, s.y, s.r, s.r);
  });
  ctx.globalAlpha = 1;

  // Moon
  ctx.fillStyle = '#d9c6ff';
  ctx.beginPath();
  ctx.arc(W * 0.78, 90, 26, 0, Math.PI * 2);
  ctx.fill();

  // Skyline layers
  drawCityLayer(mini.farCity, 0.15, '#1a0f33', H - 40);
  drawCityLayer(mini.nearCity, 0.4, '#0b0618', H - 20);
}

function drawCityLayer(buildings, parallax, color, baseY) {
  const ctx = mini.ctx;
  const total = 2000;
  const offset = (mini.distance * parallax) % total;
  ctx.fillStyle = color;
  buildings.forEach((b) => {
    for (let tile = -1; tile <= 1; tile++) {
      const x = b.x - offset + tile * total;
      if (x > mini.widthUnits || x + b.w < 0) continue;
      ctx.fillRect(x, baseY - b.h, b.w, b.h + 40);
    }
  });
}

function drawGround() {
  const ctx = mini.ctx;
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, GAME.groundY + 24, mini.widthUnits, GAME.heightUnits - GAME.groundY);
  ctx.fillStyle = 'rgba(155, 93, 229, 0.45)';
  ctx.fillRect(0, GAME.groundY + 24, mini.widthUnits, 3);
}

// Width of the birthday building: the setting, but shrunk if needed so it fits on narrow phones
function destinationWidth() {
  return Math.min(GAME.buildingWidth, mini.widthUnits - mini.playerX - 50);
}

// The birthday building at the end of the run
function drawDestination(time) {
  const ctx = mini.ctx;
  const x = GAME.lengthUnits - mini.distance + mini.playerX;
  if (x > mini.widthUnits + 20) return;

  const bw = destinationWidth(), top = 190, base = GAME.groundY + 24;

  ctx.fillStyle = '#12082a';
  ctx.fillRect(x, top, bw, base - top);
  ctx.fillStyle = 'rgba(155, 93, 229, 0.6)';
  ctx.fillRect(x, top, bw, 4);

  // Glowing windows
  for (let wy = top + 28; wy < base - 120; wy += 46) {
    for (let wx = x + 24; wx < x + bw - 40; wx += 50) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 2 + wx + wy);
      ctx.fillStyle = (wx + wy) % 3 < 1 ? '#c9a8ff' : '#ffd98a';
      ctx.fillRect(wx, wy, 26, 26);
    }
  }
  ctx.globalAlpha = 1;

  // Door
  ctx.fillStyle = '#ff3b5c';
  ctx.fillRect(x + bw / 2 - 28, base - 84, 56, 84);

  // Banner
  ctx.fillStyle = '#e62429';
  ctx.fillRect(x + 20, top - 56, bw - 40, 46);
  ctx.fillStyle = '#f6f1ff';
  ctx.font = '16px "PixelFont", "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PARTY HERE', x + bw / 2, top - 32);

  // Balloons
  const balloons = ['#ff3b5c', '#9b5de5', '#ffd98a', '#c9a8ff'];
  balloons.forEach((c, i) => {
    const bx = x + bw * (0.15 + i * 0.23);              // spread across whatever width the building has
    const by = top - 110 + Math.sin(time * 2 + i) * 6;
    ctx.strokeStyle = 'rgba(246, 241, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by + 16);
    ctx.lineTo(bx, top - 56);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(bx, by, 13, 17, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawMiniItems(time) {
  mini.items.forEach((item) => {
    if (item.taken) return;
    const x = item.x - mini.distance + mini.playerX;
    if (x < -30 || x > mini.widthUnits + 30) return;
    const bob = Math.sin(time * 3 + item.x) * 5;
    mini.ctx.shadowColor = item.type === 'heart' ? '#ff3b5c' : item.type === 'star' ? '#ffd98a' : '#ffffff';
    mini.ctx.shadowBlur = 14;
    drawSprite(item.type, x, item.y + bob, item.type === 'web' ? 3 : 4);
  });
  mini.ctx.shadowBlur = 0;
}


function drawHero() {
  const ctx = mini.ctx;
  const x = mini.playerX + mini.heroDx;

  // Web line up to the sky while swinging
  if (mini.holding && mini.state === 'playing') {
    ctx.strokeStyle = 'rgba(246, 241, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, mini.y - 10);
    ctx.lineTo(x + 70, -10);
    ctx.stroke();
  }

  // Lean forward when rising, back when falling
  ctx.save();
  ctx.translate(x, mini.y);
  ctx.rotate(Math.max(-0.35, Math.min(0.35, mini.vy / 1400)));
  ctx.shadowColor = '#c9a8ff';
  ctx.shadowBlur = 12;

  // Draw custom character if loaded; otherwise use pixel hero
  if (miniHeroImage.complete && miniHeroImage.naturalWidth > 0) {
    // Keep the picture's shape; MINI_HERO_HEIGHT is its height in game units (smaller number = smaller hero)
    const h = MINI_HERO_HEIGHT;
    const w = h * (miniHeroImage.naturalWidth / miniHeroImage.naturalHeight);
    ctx.drawImage(miniHeroImage, -w / 2, -h * 0.6, w, h);
  } else {
    drawSprite('hero', 0, 0, 4);
  }

  ctx.restore();
}

function drawParticles() {
  const ctx = mini.ctx;
  mini.particles.forEach((p) => {
    ctx.globalAlpha = 1 - p.age / p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 5, 5);
  });
  ctx.globalAlpha = 1;
}

function drawMini(time) {
  const ctx = mini.ctx;
  ctx.setTransform(mini.scale, 0, 0, mini.scale, 0, 0);     // from here on we draw in game units
  ctx.imageSmoothingEnabled = false;

  drawMiniBackground(time);
  drawGround();
  drawDestination(time);
  drawMiniItems(time);
  drawHero();
  drawParticles();
}


/* =========================================================
   6. SCREEN 5 — PURPLE TRANSITION
   Only decoration is built here: stars, glow dots and little
   hearts drifting upward. The text lives in index.html.
   ========================================================= */
const PURPLE_GLOW_COLORS = ['#9b5de5', '#c9a8ff', '#f6f1ff', '#d98bff'];

function buildPurpleFloaters(containerId = 'purple-floaters', heartCount = 9, glowCount = 24) {
  const container = document.getElementById(containerId);

  // Little pixel hearts, using the same sprite as the web hunt
  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('span');
    heart.className = 'purple-heart';
    heart.style.left = `${random(4, 92)}%`;
    heart.style.width = `${random(0.9, 1.7).toFixed(2)}rem`;
    heart.style.animationDuration = `${random(9, 17).toFixed(1)}s`;
    heart.style.animationDelay = `${random(0, 12).toFixed(1)}s`;
    heart.style.setProperty('--drift', `${random(-30, 30).toFixed(0)}px`);
    heart.appendChild(makeSprite('heart'));
    container.appendChild(heart);
  }

  // Soft glowing dots
  for (let i = 0; i < glowCount; i++) {
    const dot = document.createElement('span');
    const size = random(3, 8);
    const color = pick(PURPLE_GLOW_COLORS);
    dot.className = 'purple-dot';
    dot.style.left = `${random(0, 100)}%`;
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.background = color;
    dot.style.boxShadow = `0 0 ${size * 3}px ${color}`;
    dot.style.animationDuration = `${random(7, 15).toFixed(1)}s`;
    dot.style.animationDelay = `${random(0, 10).toFixed(1)}s`;
    dot.style.setProperty('--drift', `${random(-40, 40).toFixed(0)}px`);
    container.appendChild(dot);
  }
}

function initPurpleScreen() {
  buildStars('purple-stars', 60);
  buildPurpleFloaters();
}


/* =========================================================
   7. SCREEN 6 — PURPLE MEMORY ROOM
   Four floating objects, each opens a memory. A gift box
   leads to the letter.
   ★ EDIT THE MEMORIES HERE — this is the only place you
     need to change their text. ★
   ========================================================= */

// If true, the gift box stays locked until all memories have been opened.
// Set to false if you want the gift box usable right away.
const REQUIRE_ALL_MEMORIES = true;

// x / y = position in % of the room, size = width in rem.
// sprite names: 'bubble', 'note', 'heart', 'moon' (see SPRITES)
const MEMORIES = [
  {
    id: 'talk',  sprite: 'bubble', x: 24, y: 25, size: 2.6,
    title: 'WHERE IT ALL STARTED',
    text: 'Who would've thought that meeting through Minecraft would lead me here? HIHI.'
  },
  {
    id: 'song',  sprite: 'note',   x: 76, y: 31, size: 2.1,
    title: 'YOUR VOICE',
    text: 'Is one of my favorite sounds. I still remember our calls, especially those nights when ikaw lang halos nagsasalita.'
  },
  {
    id: 'heart', sprite: 'heart',  x: 25, y: 52, size: 2.4,
    title: 'THE LITTLE THINGS YOU DO',
    text: 'Your random messages, the things you share about your day, the way you check up on me, and even the little things you probably think I dont notice.'
  },
  {
    id: 'moon',  sprite: 'moon',   x: 75, y: 56, size: 2.3,
    title: 'SOMETHING I AM GRATEFUL FOR',
    text: 'You brought me closer to God.'
  }
];

const memoryState = {
  seen: new Set(),
  unlocked: false
};

let memoryToastTimer = null;

/* ---- 7a. Build the room's objects ---- */
function buildMemoryItems() {
  const container = document.getElementById('memory-items');

  MEMORIES.forEach((memory) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'memory-item';
    btn.dataset.id = memory.id;
    btn.setAttribute('aria-label', memory.title);
    btn.style.left = `${memory.x}%`;
    btn.style.top = `${memory.y}%`;
    btn.style.setProperty('--s', `${memory.size}rem`);
    btn.style.setProperty('--delay', `${random(0, 2).toFixed(2)}s`);   // so they don't all bob together
    btn.appendChild(makeSprite(memory.sprite));
    container.appendChild(btn);
  });

  // One listener for all four
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('.memory-item');
    if (!btn) return;
    openMemory(MEMORIES.find((m) => m.id === btn.dataset.id), btn);
  });
}

/* ---- 7b. Opening and closing a memory ---- */
function openMemory(memory, btn) {
  memoryState.seen.add(memory.id);
  btn.classList.add('is-seen');

  const box = document.getElementById('memory-dialog');
  box.querySelector('.memory__dialog-sprite').replaceChildren(makeSprite(memory.sprite));
  document.getElementById('memory-dialog-title').textContent = memory.title;
  document.getElementById('memory-dialog-text').textContent = memory.text;
  box.classList.add('is-open');
  updateMemoryHud();
}

function closeMemory() {
  document.getElementById('memory-dialog').classList.remove('is-open');
  checkGiftUnlock();
}

/* ---- 7c. Counter, hint and gift box ---- */
function updateMemoryHud() {
  document.getElementById('memory-count').textContent = `${memoryState.seen.size}/${MEMORIES.length}`;
}

function setGiftUnlocked(unlocked) {
  memoryState.unlocked = unlocked;
  const gift = document.getElementById('memory-gift');
  gift.classList.toggle('is-unlocked', unlocked);
  gift.setAttribute('aria-label', unlocked ? 'Open the gift' : 'Gift (locked)');
  document.getElementById('memory-hint').textContent = unlocked
    ? 'There is one more thing... open the gift.'
    : 'Tap the floating things to remember.';
}

function checkGiftUnlock() {
  if (!memoryState.unlocked && memoryState.seen.size === MEMORIES.length) {
    setGiftUnlocked(true);
  }
}

function onGiftTap() {
  if (!memoryState.unlocked) {
    const left = MEMORIES.length - memoryState.seen.size;
    showMemoryToast(`${left} more ${left === 1 ? 'memory' : 'memories'} to open first.`);
    return;
  }
  goTo('letter');
}

function showMemoryToast(text) {
  const toast = document.getElementById('memory-toast');
  toast.textContent = text;
  toast.classList.add('is-open');
  clearTimeout(memoryToastTimer);
  memoryToastTimer = setTimeout(() => toast.classList.remove('is-open'), 1800);
}

/* ---- 7d. Fresh start on every visit ---- */
function resetMemoryRoom() {
  memoryState.seen.clear();
  clearTimeout(memoryToastTimer);
  document.querySelectorAll('.memory-item').forEach((btn) => btn.classList.remove('is-seen'));
  document.getElementById('memory-dialog').classList.remove('is-open');
  document.getElementById('memory-toast').classList.remove('is-open');
  setGiftUnlocked(!REQUIRE_ALL_MEMORIES);
  updateMemoryHud();
}

function initMemoryRoom() {
  buildStars('memory-stars', 50);
  buildMemoryItems();
  document.getElementById('memory-gift').querySelector('.memory__gift-sprite').appendChild(makeSprite('gift'));
  document.getElementById('memory-gift').addEventListener('click', onGiftTap);
  document.getElementById('memory-dialog-close').addEventListener('click', closeMemory);
  resetMemoryRoom();
}


/* =========================================================
   8. SCREEN 7 — BIRTHDAY LETTER
   Tap the envelope -> it opens -> the letter appears.
   ★ THE LETTER TEXT LIVES HERE, IN ONE PLACE. ★
   Edit the LETTER object below and nothing else.
   ========================================================= */

const LETTER = {
  greeting: `To my sweetest answered prayer,`,

  // One `...` block = one paragraph. Keep the backticks (`) around each one, and put a comma after every
  // paragraph except the last. Apostrophes (') and quotes (") are safe to type inside backticks.
  paragraphs: [
    `Happiest birthday, my babyyy!`,

    `I hope you get to enjoy every bit of itt and I hope you allow yourself to be celebrated as much as you deserve. I wish I could put into words just how glad I am that you were born, that you exist, and that I get to know someone like you. Out of all the people I could've crossed paths with, somehow, I got to meet you.`,

    `One of the things I admire most about you is the way your mind works. You're genuinely one of the smartest people I've come to know, especially when it comes to mathematics and physics. It's so interesting to me how differently you approach things and how you can understand concepts that would probably make my brain stop functioning lmao pero parang mahimatay yan sya pag oral or reporting na, ay. But seriously, I admire how smart my baby is and I hope you never stop being curious and learning new things. I also love na you don't just let me get away with things when I'm wrong. You point them out instead of letting me walk around thinking I'm right. You challenge me to think differently and I luv it.`,

    `I also love how respectful you are towards me, baby. It's something I notice in the way you speak and the way you consider my feelings. I also somehow adapted your vocabulary, especially your "ay." Now look at me using it everywhere. It's Ed's "ay" against the world, apparently lol. And how you sometimes forget that you've already told me something minutes or hours ago, only to tell me the exact same thing again. Ang cute.`,

    `I love seeing you get excited about the things you love, too. Even though I haven't gotten to see you physically yet, I notice how your way of talking changes whenever you share something you're interested in. You get excited, your words come faster, and I can tell that you're genuinely enjoying yourself. I hope you never lose that part of you. Keep learning to play piano, keep exploring your interests, and keep improving at cubing! I hope you get to discover even more things that make you excited to wake up every day. And someday, when I have enough money, I really want to get you a piano of your own. I hope I get to make that happen, baby.`,

    `I know there are times when you send me messages, share stories, or tell me about things that happened, and because of school and everything else going on, I don't always get to read them immediately. Sometimes ma miss ko certain details or don't get to respond to everything you've said. I’m sorry po, baby. I appreciate every little thing you choose to share with me, and I hope you never think that your efforts go unnoticed just because I don't always get to respond the way I want to.`,

    `I notice how even when you're already sleepy or don't have much time left, you still try to spend some of it with me. How you still want to talk, how you try to understand me, reassure me, communicate with me, and find ways to make things work even when circumstances aren't always convenient. I also looveee the websites na ginagawa mo for me hihi. The time, thought, and effort you put into creating something specifically for me mean so much. I don't think you should ever underestimate how special those things are.`,

    `I hope you give yourself more credit, baby. I hope you learn to recognize your own efforts instead of constantly focusing on what you could've done better or what you haven't managed to do yet. You don't always have to do something grand for your efforts to matter. You don't have to exhaust yourself just to prove that you're trying. I see you, baby. I see the little things, the attempts, the adjustments, and the ways you try even when you're tired. I hope you learn to appreciate yourself the way I appreciate you.`,

    `And as you grow older, I hope you continue becoming the person you envision yourself to be. I think you've started having a clearer picture of what you want your future to look like, and I love that you're slowly building that vision for yourself (with me ofcc 😼). I hope you continue pursuing them. I remember na nagmention ikaw na you want become an engineer during the first few months we talked and di ko nakalimutan yun. I hope you get to wear that title someday. I hope you get to look back at all the work you've put in and realize that every difficult day brought you a little closer to where you wanted to be. I believe you're capable of so much more than you probably realize.`,

    `I also know that not every day is easy for you. I know there are nights when sadness suddenly finds its way to you, when your thoughts get a little too loud and you start questioning yourself, your worth, your place in other people's lives, and even whether the people you love will stay. I might not always know exactly what's going through your mind and I won't pretend that I can understand every single thing you feel, but I want you to know that you don't have to face those moments alone.`,

    `Please don't be too hard on yourself during those nights, baby. You don't have to figure out every uncertainty before you can rest. You don't have to find answers to every thought that crosses your mind. And please don't measure your worth based on how much you accomplish, how much attention you receive, or how well you think you're doing in life. You're still worthy of love and kindness even on the days when you don't feel particularly lovable or accomplished.`,

    `I hope you also remember that you have people who care about you. Your family is there, the people close to you are there, and I'm here, too. You can always run to me when things get difficult. You can tell me when something is bothering you, when you're overthinking, when you're disappointed, or when you simply don't feel okay. You don't have to filter everything just because you're afraid of being too much. You can lean on me, baby. Let me listen, let me understand, and let me be there for you. I might not always have the perfect words or know exactly what to do, but I'll always want to understand what you're going through.`,

    `And if there's one thing I wish I could tell you while looking directly into your eyes, it's that you're never going to be too much. You're just... a lot of love and a lot of hurt in one body. That's not too much of anything. That's just who you are, and I love you for you. You don't have to hide the softer parts of yourself, the uncertain parts, or the parts that you think are difficult to understand. You are allowed to be a person who feels deeply, who gets confused, who has bad days, and who sometimes needs a little reassurance, too. I hope you never feel like you have to make yourself smaller to be loved.`,

    `For this new chapter of your life, I pray for more blessings to come your way and to your family. I hope God continues to guide you, protect you, and give you strength through everything you'll encounter. I hope you get opportunities that bring you closer to your dreams, meet people who genuinely want the best for you, and experience things that make you appreciate life a little more. I hope you get to experience the kind of love you've always wanted, the kind that makes you feel secure, understood, appreciated, and never uncertain of your place. I hope you get to enjoy the things you've been wanting to try, accomplish the things you've been working towards, and have more reasons to be proud of yourself.`,

    `And huey, I've noticed those sad videos you've been liking on your other TikTok account haa. I'm watching you grrr. But seriously, baby, you're allowed to be sad naman. I'm not asking you to be happy all the time or pretend that nothing bothers you. I just hope na you don't make a habit of surrounding yourself with more negativity whenever you're already feeling down. Give yourself a little kindness, oki? Find things that make you feel lighter, take a break when you need one, and don’t feed yourself with mga ganon na vids.`,

    `I hope you never lose your spark. I hope you always have something to look forward to, something to be curious about, something to laugh at, and something that makes your eyes light up. Keep being the person who gets excited about his interests, who thinks differently, who makes little websites, who plays piano, who tries new things, and who sometimes repeats the same story because he forgot he already told me. Please don't ever think that you have to become someone entirely different to be someone worth admiring. There's already so much about the person you are today that I love and appreciate.`,

    `And lastly, I hope you know that I'm excited to witness more of your life. Someday, I’ll be dyan na sa tabi mo. I want to hear about the random things that happen to you, the things you learned, the things that frustrated you, the things you're excited about, and all those little stories you might think aren't worth telling. I hope you get to experience so many beautiful things, and I hope you give yourself the chance to enjoy them when they come.`,

    `Thank you for existing, babyy. Thank you for being the person that you are. I'm so glad I got to know you and I'm even happier that I get to love you. I hope this year brings you closer to the life you've been dreaming of, and I hope you find countless reasons to smile along the way.`,

    `Happiest birthday, my baby!! I love you so so much. I'm always rooting for you, and I'll always be proud of you.`
  ],

  closing: `With so much love,`,
  signature: `Mia`
};

const LETTER_TIMING = {
  openToReadingMs: 1900     // how long the envelope animation plays before the letter appears
};

let letterTimer = null;

/* ---- 8a. Put the LETTER text into the page ---- */
function renderLetter() {
  document.getElementById('letter-greeting').textContent = LETTER.greeting;
  document.getElementById('letter-closing').textContent = LETTER.closing;
  document.getElementById('letter-signature').textContent = LETTER.signature;

  const body = document.getElementById('letter-body');
  body.replaceChildren();
  LETTER.paragraphs.forEach((text, i) => {
    const p = document.createElement('p');
    p.className = 'letter__paragraph';
    p.style.setProperty('--i', i);               // used for the one-after-another fade-in
    p.textContent = text;
    body.appendChild(p);
  });
}

/* ---- 8b. Envelope -> letter ---- */
function openEnvelope() {
  const screen = screenElements.letter;
  if (screen.classList.contains('is-open')) return;      // ignore extra taps

  screen.classList.add('is-open');                       // flap opens, card slides out
  letterTimer = setTimeout(showLetter, LETTER_TIMING.openToReadingMs);
}

function showLetter() {
  screenElements.letter.classList.add('is-reading');
  document.getElementById('letter-paper').scrollTop = 0;
  requestAnimationFrame(updateLetterFade);
}

// The soft fade at the bottom of the paper tells you there is more to scroll.
// It disappears once you reach the end (or if the whole letter already fits).
function updateLetterFade() {
  const paper = document.getElementById('letter-paper');
  const atEnd = paper.scrollTop + paper.clientHeight >= paper.scrollHeight - 8;
  paper.parentElement.classList.toggle('is-end', atEnd);
}

function clearLetterTimers() {
  clearTimeout(letterTimer);
}

function resetLetter() {
  clearLetterTimers();
  screenElements.letter.classList.remove('is-open', 'is-reading');
  document.getElementById('letter-paper').scrollTop = 0;
}

function initLetterScreen() {
  buildStars('letter-stars', 50);
  renderLetter();
  document.querySelector('.envelope__seal').appendChild(makeSprite('heart'));
  document.getElementById('envelope').addEventListener('click', openEnvelope);
  document.getElementById('letter-paper').addEventListener('scroll', updateLetterFade, { passive: true });
  window.addEventListener('resize', updateLetterFade);
}


/* =========================================================
   9. SCREEN 8 — FINAL CELEBRATION
   The payoff. The text is in index.html; this section only adds
   the moving decorations:
     - the cute hero (copied from the opening screen)
     - floating hearts + purple glow dots
     - falling confetti
     - fireworks every second or two, and wherever you tap
   Everything stops when you leave the screen.
   ========================================================= */
const FINALE = {
  confettiBurst: 70,        // pieces dropped when the screen opens
  confettiTrickleMs: 450,   // then a few more every this many ms
  fireworkEveryMs: 1700,    // a firework every this many ms
  sparksPerFirework: 14,
  colors: ['#ff3b5c', '#ff9db0', '#c9a8ff', '#9b5de5', '#ffe9a8', '#f6f1ff']
};

let finaleIntervals = [];
let finaleTimeouts = [];

/* ---- 9a. One-time setup (stars, hearts, hero, tap-to-celebrate) ---- */
function initFinaleScreen() {
  buildStars('finale-stars', 70);
  buildPurpleFloaters('finale-floaters', 14, 30);
  document.getElementById('finale-heart').appendChild(makeSprite('heart'));

  // Reuse the hero drawing from the opening screen instead of copying its markup
  const hero = document.querySelector('.screen--opening .hero').cloneNode(true);
  document.getElementById('finale-hero-slot').appendChild(hero);

  // Tap anywhere (except buttons) for a firework
  screenElements.finale.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    const rect = document.getElementById('finale-fx').getBoundingClientRect();
    fireworkAt(
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100
    );
  });
}

/* ---- 9b. Confetti ---- */
function addConfetti(count, spreadSeconds = 0) {
  const fx = document.getElementById('finale-fx');
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.left = `${random(0, 100)}%`;
    piece.style.setProperty('--w', `${random(5, 9).toFixed(1)}px`);
    piece.style.setProperty('--h', `${random(8, 14).toFixed(1)}px`);
    piece.style.setProperty('--dur', `${random(3.2, 6).toFixed(2)}s`);
    piece.style.setProperty('--sway', `${random(-60, 60).toFixed(0)}px`);
    piece.style.setProperty('--spin', `${random(360, 1080).toFixed(0)}deg`);
    piece.style.background = pick(FINALE.colors);
    piece.style.animationDelay = `${random(0, spreadSeconds).toFixed(2)}s`;
    piece.addEventListener('animationend', () => piece.remove());   // keep the page light
    fx.appendChild(piece);
  }
}

/* ---- 9c. Fireworks (x, y are % of the screen) ---- */
function fireworkAt(xPercent, yPercent) {
  const fx = document.getElementById('finale-fx');
  const color = pick(FINALE.colors);

  for (let i = 0; i < FINALE.sparksPerFirework; i++) {
    const angle = (i / FINALE.sparksPerFirework) * Math.PI * 2 + random(-0.15, 0.15);
    const distance = random(45, 105);
    const spark = document.createElement('span');
    spark.className = 'spark';
    spark.style.left = `${xPercent}%`;
    spark.style.top = `${yPercent}%`;
    spark.style.background = color;
    spark.style.boxShadow = `0 0 8px ${color}`;
    spark.style.setProperty('--dx', `${(Math.cos(angle) * distance).toFixed(0)}px`);
    spark.style.setProperty('--dy', `${(Math.sin(angle) * distance).toFixed(0)}px`);
    spark.addEventListener('animationend', () => spark.remove());
    fx.appendChild(spark);
  }
}

function randomFirework() {
  fireworkAt(random(15, 85), random(14, 55));
}

/* ---- 9d. Start / stop (called by screenHooks) ---- */
function startFinale() {
  stopFinale();
  addConfetti(FINALE.confettiBurst, 1.4);
  finaleTimeouts.push(setTimeout(randomFirework, 500));
  finaleTimeouts.push(setTimeout(randomFirework, 1000));
  finaleIntervals.push(setInterval(() => addConfetti(4), FINALE.confettiTrickleMs));
  finaleIntervals.push(setInterval(randomFirework, FINALE.fireworkEveryMs));
}

function stopFinale() {
  finaleIntervals.forEach(clearInterval);
  finaleTimeouts.forEach(clearTimeout);
  finaleIntervals = [];
  finaleTimeouts = [];
  const fx = document.getElementById('finale-fx');
  if (fx) fx.replaceChildren();
}


/* =========================================================
   10. START-UP
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
  initMiniGame();
  initPurpleScreen();
  initMemoryRoom();
  initLetterScreen();
  initFinaleScreen();
  setupNavigationButtons();
  jumpToScreenFromHash();
}

document.addEventListener('DOMContentLoaded', init);
