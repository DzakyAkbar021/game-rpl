/* ==========================================================
   main.js
   Penghubung semuanya: input keyboard & tombol layar, menu,
   pilih karakter, pilih arena, settings, pause, dan alur layar.
   ========================================================== */
'use strict';

/* ---------- Input ----------
   Keyboard dan tombol di layar sama-sama mengisi Input.keys.
   Game membaca lewat Input.read() setiap frame. */
const Input = {
  keys: {},
  tapped: {},          // tap singkat (< 1 frame) tetap terbaca selama 150 ms agar tidak "hilang"
  // Nama tombol "alias" -> tombol utama
  alias: { arrowleft: 'a', arrowright: 'd', arrowup: 'w' },
  norm(k) { k = k.length === 1 ? k.toLowerCase() : k.toLowerCase(); return this.alias[k] || k; },
  press(k) { this.keys[k] = true; this.tapped[k] = performance.now(); },
  read() {
    const k = this.keys, now = performance.now();
    const on = n => !!(k[n] || (this.tapped[n] && now - this.tapped[n] < 150));
    return { left: on('a'), right: on('d'), jump: on('w'), attack: on('j'), skill1: on('k'), skill2: on('l'), skill3: on('u'), ult: on('i'), guard: on(' ') };
  },
  clear() { this.keys = {}; this.tapped = {}; document.querySelectorAll('[data-key].down').forEach(b => b.classList.remove('down')); }
};

/* ---------- Pilihan pemain (disimpan di localStorage) ---------- */
const App = {
  p1: 'flamerex', opp: 'random', arena: 'forest',
  screen: 'menu', flow: 'menu',     // flow: 'menu' (pilih dari menu) | 'chain' (karakter -> arena -> main)
  load() {
    try { Object.assign(this, JSON.parse(localStorage.getItem('dma_sel_v1') || '{}')); } catch (e) { /* abaikan */ }
    if (!CHARACTERS.some(c => c.id === this.p1)) this.p1 = 'flamerex';
    if (this.opp !== 'random' && !CHARACTERS.some(c => c.id === this.opp)) this.opp = 'random';
    if (!Arena.list.some(a => a.id === this.arena)) this.arena = 'forest';
  },
  save() {
    try { localStorage.setItem('dma_sel_v1', JSON.stringify({ p1: this.p1, opp: this.opp, arena: this.arena })); } catch (e) { /* abaikan */ }
  }
};

const $ = id => document.getElementById(id);
const screens = ['menu', 'characters', 'arenas', 'settings', 'game'];

/* ==========================================================
   Navigasi layar
   ========================================================== */
function showScreen(name) {
  App.screen = name;
  screens.forEach(s => $('screen-' + s).classList.toggle('active', s === name));
  if (name === 'menu') { Sound.startMusic('menu'); refreshMenuInfo(); }
  if (name === 'characters') refreshCharScreen();
  if (name === 'arenas') refreshArenaScreen();
}

function refreshMenuInfo() {
  $('menu-char-name').textContent = getCharacter(App.p1).name;
  $('menu-arena-name').textContent = Arena.get(App.arena).name;
}

function startMatch() {
  App.save();
  showScreen('game');
  Input.clear();
  Game.start({ p1: App.p1, p2: App.opp, arena: App.arena });
}

function leaveGame() {
  Game.stop();
  Input.clear();
  showScreen('menu');
}

/* ==========================================================
   Latar menu: dua monster saling berhadapan di arena
   ========================================================== */
const MenuScene = {
  ctx: null, t: 0, last: 0, fighters: null,
  init() { this.ctx = $('menu-bg').getContext('2d'); },
  setup() {
    const a = getCharacter(App.p1);
    const others = CHARACTERS.filter(c => c.id !== a.id);
    const b = others[Math.floor(Date.now() / 20000) % others.length];
    this.fighters = [new Fighter(a, 0), new Fighter(b, 1)];
    this.fighters[0].x = GAME_W * 0.58; this.fighters[1].x = GAME_W * 0.86;
    this.fighters[1].facing = -1;
    this.arena = Arena.get(App.arena);
  },
  frame(now) {
    if (App.screen !== 'menu') { this.running = false; return; }
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016); this.last = now; this.t += dt;
    const ctx = this.ctx;
    this.arena.update(dt);
    this.arena.drawBack(ctx, this.t, Math.sin(this.t * 0.3) * 40);
    for (const f of this.fighters) { f.animT += dt; renderFighter(ctx, f); }
    this.arena.drawFront(ctx, this.t, Math.sin(this.t * 0.3) * 40);
    requestAnimationFrame(n => this.frame(n));
  },
  run() {
    this.setup();
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(n => this.frame(n)); }
  }
};

/* ==========================================================
   Pilih karakter
   ========================================================== */
const portraits = [];        // { def, ctx, w, h }

function buildCharScreen() {
  const grid = $('char-grid');
  CHARACTERS.forEach(def => {
    const card = document.createElement('div');
    card.className = 'char-card'; card.dataset.id = def.id;
    card.innerHTML = `<canvas width="300" height="240"></canvas><div class="c-name">${def.name}</div><div class="c-elem" style="color:${def.color}">${def.element}</div>`;
    card.addEventListener('click', () => { App.p1 = def.id; Sound.play('select'); refreshCharScreen(); });
    grid.appendChild(card);
    portraits.push({ def, ctx: card.querySelector('canvas').getContext('2d'), w: 300, h: 240 });
  });

  // Pilihan lawan CPU: acak atau monster tertentu
  const seg = $('opp-seg');
  const opts = [{ id: 'random', label: 'ACAK' }, ...CHARACTERS.map(c => ({ id: c.id, label: c.name.toUpperCase() }))];
  opts.forEach(o => {
    const b = document.createElement('button'); b.dataset.value = o.id; b.textContent = o.label;
    b.addEventListener('click', () => { App.opp = o.id; Sound.play('select'); refreshCharScreen(); });
    seg.appendChild(b);
  });
}

function refreshCharScreen() {
  document.querySelectorAll('.char-card').forEach(c => c.classList.toggle('selected', c.dataset.id === App.p1));
  document.querySelectorAll('#opp-seg button').forEach(b => b.classList.toggle('active', b.dataset.value === App.opp));
  const d = getCharacter(App.p1), s = d.stats;
  const stat = (label, v, max) => `<div class="stat-row"><span>${label}</span><div class="stat-track"><div class="stat-fill" style="width:${Math.min(100, v / max * 100)}%"></div></div><span>${v}</span></div>`;
  const keys = [['attack', 'J'], ['skill1', 'K'], ['skill2', 'L'], ['skill3', 'U'], ['ult', 'I']];
  $('char-detail').innerHTML =
    `<h3 style="color:${d.color};text-shadow:0 0 12px ${d.color}">${d.name}</h3>` +
    `<div class="d-title">${d.title} · ${d.element}</div>` +
    `<p class="d-desc">${d.desc}</p>` +
    stat('HP', s.hp, 1300) + stat('ATTACK', s.attack, 120) + stat('DEFENSE', s.defense, 90) + stat('SPEED', s.speed, 140) +
    `<div class="skill-list">` +
    keys.map(([k, key]) => { const sk = d.skills[k]; return `<div class="skill-item${k === 'ult' ? ' ult' : ''}"><b>${key}</b><span>${sk.name}<small>${sk.desc}</small></span></div>`; }).join('') +
    `</div>`;
}

let uiLoopOn = false, uiLast = 0, uiT = 0;
function uiLoop(now) {
  if (App.screen !== 'characters' && App.screen !== 'arenas') { uiLoopOn = false; return; }
  const dt = Math.min(0.05, (now - uiLast) / 1000 || 0.016); uiLast = now; uiT += dt;
  if (App.screen === 'characters') portraits.forEach(p => drawPortrait(p.ctx, p.def, p.w, p.h, uiT));
  else arenaPreviews.forEach(p => { p.arena.update(dt); Arena.drawPreview(p.ctx, p.arena, p.w, p.h, uiT); });
  requestAnimationFrame(uiLoop);
}
function startUiLoop() { if (!uiLoopOn) { uiLoopOn = true; uiLast = performance.now(); requestAnimationFrame(uiLoop); } }

/* ==========================================================
   Pilih arena
   ========================================================== */
const arenaPreviews = [];

function buildArenaScreen() {
  const grid = $('arena-grid');
  Arena.list.forEach(a => {
    const card = document.createElement('div');
    card.className = 'arena-card'; card.dataset.id = a.id;
    card.innerHTML = `<canvas width="420" height="210"></canvas><h4>${a.name}</h4><p>${a.desc}</p>`;
    card.addEventListener('click', () => { App.arena = a.id; Sound.play('select'); refreshArenaScreen(); });
    grid.appendChild(card);
    arenaPreviews.push({ arena: a, ctx: card.querySelector('canvas').getContext('2d'), w: 420, h: 210 });
  });
}
function refreshArenaScreen() {
  document.querySelectorAll('.arena-card').forEach(c => c.classList.toggle('selected', c.dataset.id === App.arena));
}

/* ==========================================================
   Settings
   ========================================================== */
function syncSettingsUI() {
  const setToggle = (id, v) => { $(id).dataset.on = String(v); $(id).textContent = v ? 'ON' : 'OFF'; };
  setToggle('set-music', Settings.music); setToggle('set-sfx', Settings.sfx); setToggle('set-shake', Settings.shake);
  $('set-music-vol').value = Math.round(Settings.musicVol * 100);
  $('set-sfx-vol').value = Math.round(Settings.sfxVol * 100);
  document.querySelectorAll('#set-difficulty button').forEach(b => b.classList.toggle('active', b.dataset.value === Settings.difficulty));
  document.querySelectorAll('#set-time button').forEach(b => b.classList.toggle('active', Number(b.dataset.value) === Settings.roundTime));
}
function applySettings() { Sound.refresh(); Settings.save(); syncSettingsUI(); }

function bindSettings() {
  $('set-music').onclick = () => { Settings.music = !Settings.music; applySettings(); Sound.play('select'); };
  $('set-sfx').onclick = () => { Settings.sfx = !Settings.sfx; applySettings(); Sound.play('select'); };
  $('set-shake').onclick = () => { Settings.shake = !Settings.shake; applySettings(); Sound.play('select'); };
  $('set-music-vol').oninput = e => { Settings.musicVol = e.target.value / 100; applySettings(); };
  $('set-sfx-vol').oninput = e => { Settings.sfxVol = e.target.value / 100; Sound.refresh(); Settings.save(); };
  $('set-sfx-vol').onchange = () => Sound.play('hit');
  document.querySelectorAll('#set-difficulty button').forEach(b => b.onclick = () => { Settings.difficulty = b.dataset.value; applySettings(); Sound.play('select'); });
  document.querySelectorAll('#set-time button').forEach(b => b.onclick = () => { Settings.roundTime = Number(b.dataset.value); applySettings(); Sound.play('select'); });
}

/* ==========================================================
   Tombol & keyboard
   ========================================================== */
function handleAction(action) {
  Sound.init();
  switch (action) {
    case 'play': Sound.play('confirm'); startMatch(); break;
    case 'characters': Sound.play('select'); App.flow = 'chain'; showScreen('characters'); startUiLoop(); break;
    case 'arenas': Sound.play('select'); App.flow = 'menu'; showScreen('arenas'); startUiLoop(); break;
    case 'settings': Sound.play('select'); showScreen('settings'); break;
    case 'back': Sound.play('back'); showScreen('menu'); MenuScene.run(); break;
    case 'confirm-char': Sound.play('confirm'); App.save(); App.flow = 'chain'; showScreen('arenas'); break;
    case 'confirm-arena':
      Sound.play('confirm'); App.save();
      if (App.flow === 'chain') startMatch(); else { showScreen('menu'); MenuScene.run(); }
      break;
    case 'resume': Game.setPaused(false); break;
    case 'restart': Sound.play('confirm'); Input.clear(); Game.restart(); break;
    case 'rematch': Sound.play('confirm'); Input.clear(); Game.restart(); break;
    case 'quit': Sound.play('back'); leaveGame(); MenuScene.run(); break;
    case 'characters-from-game': Sound.play('select'); Game.stop(); Input.clear(); App.flow = 'chain'; showScreen('characters'); startUiLoop(); break;
  }
}

function bindEvents() {
  // semua tombol bertanda data-action
  document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => handleAction(b.dataset.action)));
  $('btn-pause').addEventListener('click', () => Game.setPaused(!Game.paused));

  // Keyboard
  const gameKeys = ['a', 'd', 'w', 'j', 'k', 'l', 'u', 'i', ' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'];
  window.addEventListener('keydown', e => {
    Sound.init();
    const k = e.key.toLowerCase();
    if (App.screen === 'game') {
      if (gameKeys.includes(k)) e.preventDefault();
      if ((k === 'p' || k === 'escape') && !e.repeat) { Game.setPaused(!Game.paused); return; }
      Input.press(Input.norm(e.key));
    }
  });
  window.addEventListener('keyup', e => { Input.keys[Input.norm(e.key)] = false; });
  window.addEventListener('blur', () => { Input.clear(); if (App.screen === 'game') Game.setPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && App.screen === 'game') Game.setPaused(true); });
  window.addEventListener('pointerdown', () => Sound.init(), { once: false });

  // Tombol di layar (mouse / sentuh)
  document.querySelectorAll('[data-key]').forEach(btn => {
    const key = btn.dataset.key;
    const down = e => { e.preventDefault(); Sound.init(); Input.press(key); btn.classList.add('down'); try { btn.setPointerCapture(e.pointerId); } catch (_) { /* abaikan */ } };
    const up = () => { Input.keys[key] = false; btn.classList.remove('down'); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });
}

/* ==========================================================
   Mulai
   ========================================================== */
window.addEventListener('DOMContentLoaded', () => {
  Settings.load();
  Arena.init();
  App.load();
  Game.init();
  MenuScene.init();
  buildCharScreen();
  buildArenaScreen();
  bindSettings();
  syncSettingsUI();
  bindEvents();
  Sound.startMusic('menu');        // mulai otomatis begitu ada interaksi pertama
  showScreen('menu');
  MenuScene.run();

  // Tombol bantuan untuk pengembang: ?demo=1 di URL = CPU melawan CPU
  if (location.search.includes('demo=1')) { Game.demo = true; startMatch(); }
});
