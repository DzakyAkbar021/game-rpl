/* ==========================================================
   effects.js
   Isi: konstanta global, pengaturan (Settings), helper kecil,
        sistem partikel, teks melayang, layar bergetar, dan
        suara + musik (dibuat langsung dengan WebAudio, tanpa file).
   File ini harus dimuat PALING PERTAMA.
   ========================================================== */
'use strict';

// ---------- Konstanta dunia game ----------
const GAME_W = 1280;      // lebar canvas
const GAME_H = 640;       // tinggi canvas
const GROUND_Y = 565;     // posisi kaki karakter (permukaan lantai)
const GRAVITY = 2600;     // gravitasi (px/detik^2)
const WALL_L = 60;        // batas kiri arena
const WALL_R = GAME_W - 60; // batas kanan arena

// ---------- Helper matematika sederhana ----------
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;

// ---------- Pengaturan (disimpan di localStorage) ----------
const Settings = {
  music: true, musicVol: 0.5,
  sfx: true, sfxVol: 0.8,
  shake: true,
  difficulty: 'normal',   // easy | normal | hard
  roundTime: 60,          // detik per ronde
  roundsToWin: 2,         // best of 3
  load() {
    try {
      const raw = localStorage.getItem('dma_settings_v1');
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { /* localStorage bisa saja diblokir, abaikan */ }
  },
  save() {
    try {
      const { music, musicVol, sfx, sfxVol, shake, difficulty, roundTime } = this;
      localStorage.setItem('dma_settings_v1', JSON.stringify({ music, musicVol, sfx, sfxVol, shake, difficulty, roundTime }));
    } catch (e) { /* abaikan */ }
  }
};

// ---------- Lingkaran cahaya (dipakai banyak efek) ----------
function glowDot(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ==========================================================
   EFFECTS: partikel, ring, teks melayang, shake, flash
   ========================================================== */
const Effects = {
  particles: [],
  rings: [],
  texts: [],
  flashAlpha: 0,
  flashColor: '#ffffff',
  shakeTime: 0,
  shakeDur: 1,
  shakePower: 0,

  clear() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
    this.flashAlpha = 0;
    this.shakeTime = 0;
  },

  // Membuat satu partikel dengan nilai default
  spawn(p) {
    if (this.particles.length > 1400) return; // batasi jumlah agar tetap ringan
    const o = Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, life: 0.6, size: 4, color: '#fff',
      grav: 0, drag: 0, shrink: true, shape: 'circle', rot: 0, vr: 0, add: true
    }, p);
    o.max = o.life;
    this.particles.push(o);
  },

  // Ledakan partikel ke segala arah
  burst(x, y, color, count = 14, speed = 320, size = 5, o = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = rand(speed * 0.25, speed);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.25, 0.7), size: rand(size * 0.5, size * 1.3), color,
        drag: 2.5, grav: o.grav !== undefined ? o.grav : 300, shape: o.shape || 'circle'
      });
    }
  },

  // Percikan garis ke satu arah (dir = 1 kanan, -1 kiri)
  sparks(x, y, color, count = 10, dir = 1) {
    for (let i = 0; i < count; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + rand(-0.9, 0.9);
      const s = rand(250, 750);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
        life: rand(0.15, 0.4), size: rand(2, 4), color, drag: 3, grav: 500, shape: 'line'
      });
    }
  },

  // Cincin yang membesar. squash < 1 membuatnya gepeng (gelombang di lantai)
  ring(x, y, color, maxR = 120, life = 0.4, width = 6, squash = 1) {
    this.rings.push({ x, y, color, maxR, life, max: life, width, squash });
  },

  // Teks melayang (angka damage, CRITICAL HIT, dll.)
  text(x, y, str, color = '#fff', size = 28, life = 0.9, vy = -70) {
    this.texts.push({ x, y, str, color, size, life, max: life, vy });
  },

  shake(power, dur = 0.3) {
    if (power >= this.shakePower * (this.shakeTime / this.shakeDur) || this.shakeTime <= 0) {
      this.shakePower = power; this.shakeDur = dur; this.shakeTime = dur;
    }
  },

  flash(color = '#fff', alpha = 0.6) {
    this.flashColor = color; this.flashAlpha = alpha;
  },

  getShake() {
    if (!Settings.shake || this.shakeTime <= 0) return { x: 0, y: 0 };
    const k = this.shakeTime / this.shakeDur;
    return { x: rand(-1, 1) * this.shakePower * k, y: rand(-1, 1) * this.shakePower * k };
  },

  update(dt) {
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2);

    let w = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      this.particles[w++] = p;
    }
    this.particles.length = w;

    this.rings = this.rings.filter(r => (r.life -= dt) > 0);
    for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= 0.96; }
    this.texts = this.texts.filter(t => t.life > 0);
  },

  draw(ctx) {
    ctx.save();
    // Partikel
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      const s = p.shrink ? p.size * (0.3 + 0.7 * k) : p.size;
      ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      if (p.shape === 'line') {
        ctx.lineWidth = Math.max(1.5, s * 0.6);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
      } else if (p.shape === 'square') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
      }
    }
    // Ring
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - k * 0.7);
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.maxR * Math.sqrt(k), r.maxR * Math.sqrt(k) * r.squash, 0, 0, TAU); ctx.stroke();
    }
    // Teks melayang
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const t of this.texts) {
      const k = t.life / t.max;
      const pop = k > 0.85 ? 1 + (k - 0.85) * 5 : 1;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `900 ${Math.round(t.size * pop)}px Orbitron, Impact, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
  },

  drawFlash(ctx) {
    if (this.flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.flashAlpha; ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.restore();
  }
};

/* ==========================================================
   SOUND: efek suara & musik latar memakai WebAudio.
   Semua suara dibuat dari osilator + noise, jadi tidak butuh file.
   Browser baru mengizinkan suara setelah pengguna klik/menekan tombol.
   ========================================================== */
const MUSIC_THEMES = {
  menu:    { bpm: 108, root: 57, prog: [[0,'m'],[-4,'M'],[3,'M'],[-2,'M']], arp: [0,1,2,3,2,1,2,1], bass: [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0], kick: [0,8], snare: [], hat: [4,12], wave: 'triangle' },
  forest:  { bpm: 100, root: 57, prog: [[0,'m'],[-4,'M'],[3,'M'],[-2,'M']], arp: [0,1,2,3,2,1,2,1], bass: [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0], kick: [0,8], snare: [], hat: [4,12], wave: 'triangle' },
  city:    { bpm: 126, root: 50, prog: [[0,'m'],[-2,'M'],[-4,'M'],[-7,'M']], arp: [0,2,1,3,0,2,1,3], bass: [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1], kick: [0,4,8,12], snare: [4,12], hat: [2,6,10,14], wave: 'square' },
  volcano: { bpm: 138, root: 52, prog: [[0,'m'],[1,'M'],[0,'m'],[-2,'M']], arp: [0,0,2,0,1,0,3,0], bass: [1,1,0,1,1,0,1,1,1,1,0,1,1,0,1,0], kick: [0,6,8,11], snare: [4,12], hat: [0,2,4,6,8,10,12,14], wave: 'sawtooth' }
};

const Sound = {
  ctx: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
  theme: null, themeName: '', timer: null, step: 0, nextTime: 0,

  // Dipanggil saat ada interaksi pengguna pertama
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      // buffer noise 1 detik untuk efek ledakan / desis
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.refresh();
      if (this.themeName) this.startMusic(this.themeName);
    } catch (e) { this.ctx = null; }
  },

  // Terapkan ulang volume / on-off dari Settings
  refresh() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = Settings.sfx ? Settings.sfxVol : 0;
    this.musicBus.gain.value = Settings.music ? Settings.musicVol * 0.9 : 0;
  },

  tone(freq, dur, type = 'square', vol = 0.2, o = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = o.at !== undefined ? o.at : c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (o.lowpass) {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lowpass;
      osc.connect(f); f.connect(g);
    } else osc.connect(g);
    g.connect(o.bus || this.sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  },

  noise(dur, vol = 0.2, o = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = o.at !== undefined ? o.at : c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.freqTo), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  },

  // Daftar efek suara. Panggil: Sound.play('hit')
  play(name) {
    if (!this.ctx || !Settings.sfx) return;
    const T = (f, d, ty, v, o) => this.tone(f, d, ty, v, o);
    const N = (d, v, o) => this.noise(d, v, o);
    switch (name) {
      case 'select':  T(660, .06, 'square', .12); T(880, .08, 'square', .12, { delay: .05 }); break;
      case 'confirm': T(520, .08, 'square', .14); T(780, .1, 'square', .14, { delay: .07 }); T(1040, .18, 'square', .14, { delay: .14 }); break;
      case 'back':    T(400, .12, 'square', .13, { slideTo: 240 }); break;
      case 'jump':    T(300, .18, 'square', .09, { slideTo: 720 }); break;
      case 'whoosh':  N(.14, .16, { type: 'bandpass', freq: 1200, freqTo: 3200 }); break;
      case 'hit':     N(.1, .32, { freq: 3000, freqTo: 300 }); T(170, .1, 'square', .25, { slideTo: 60 }); break;
      case 'heavy':   N(.28, .5, { freq: 2200, freqTo: 120 }); T(110, .28, 'sawtooth', .35, { slideTo: 40 }); break;
      case 'crit':    N(.28, .5, { freq: 2600, freqTo: 120 }); T(110, .25, 'sawtooth', .35, { slideTo: 40 }); T(1200, .14, 'square', .16, { slideTo: 2400 }); break;
      case 'block':   T(900, .05, 'square', .18); T(500, .09, 'triangle', .25, { delay: .02 }); N(.06, .14, { type: 'highpass', freq: 3000 }); break;
      case 'guardbreak': N(.45, .45, { freq: 3000, freqTo: 100 }); T(220, .45, 'sawtooth', .3, { slideTo: 50 }); break;
      case 'fire':    N(.45, .32, { type: 'bandpass', freq: 700, freqTo: 220 }); T(230, .4, 'sawtooth', .16, { slideTo: 90 }); break;
      case 'bolt':    N(.22, .3, { type: 'highpass', freq: 2000 }); T(1800, .16, 'sawtooth', .16, { slideTo: 200 }); break;
      case 'water':   N(.5, .3, { type: 'bandpass', freq: 500, freqTo: 1600 }); T(400, .3, 'sine', .2, { slideTo: 760 }); break;
      case 'dark':    T(190, .45, 'sawtooth', .22, { slideTo: 60, lowpass: 800 }); T(200, .4, 'square', .1, { slideTo: 70 }); N(.3, .12, { type: 'bandpass', freq: 400 }); break;
      case 'rock':    N(.32, .5, { freq: 900, freqTo: 100 }); T(95, .3, 'square', .28, { slideTo: 40 }); break;
      case 'slash':   N(.16, .28, { type: 'highpass', freq: 2500, freqTo: 6000 }); T(900, .12, 'sawtooth', .1, { slideTo: 300 }); break;
      case 'buff':    [523, 659, 784, 1047].forEach((f, i) => T(f, .15, 'triangle', .18, { delay: i * .07 })); break;
      case 'teleport':T(1200, .2, 'sine', .2, { slideTo: 200 }); T(200, .2, 'sine', .2, { slideTo: 1200, delay: .15 }); break;
      case 'explosion': N(.65, .6, { freq: 1600, freqTo: 60 }); T(75, .5, 'sawtooth', .4, { slideTo: 30 }); break;
      case 'ult':     T(100, .9, 'sawtooth', .28, { slideTo: 700 }); N(.9, .3, { type: 'bandpass', freq: 300, freqTo: 3000 }); T(1500, .5, 'square', .08, { slideTo: 3000, delay: .3 }); break;
      case 'ko':      T(420, .9, 'sawtooth', .3, { slideTo: 45 }); N(.8, .5, { freq: 1600, freqTo: 60 }); break;
      case 'round':   T(440, .16, 'square', .16); T(440, .16, 'square', .16, { delay: .22 }); break;
      case 'fight':   T(330, .1, 'square', .2); T(660, .35, 'sawtooth', .2, { delay: .1 }); N(.3, .3, { type: 'bandpass', freq: 800, freqTo: 3000, delay: .1 }); break;
      case 'tick':    T(1000, .05, 'square', .1); break;
      case 'win':     [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, .25, 'square', .16, { delay: i * .12 })); break;
      case 'lose':    [440, 392, 330, 262, 196].forEach((f, i) => T(f, .3, 'sawtooth', .16, { delay: i * .16, lowpass: 1200 })); break;
    }
  },

  /* ---------- Musik latar: sequencer sederhana (bass + arpeggio + drum) ---------- */
  startMusic(name) {
    this.themeName = name;
    if (!this.ctx) return;       // akan dimulai ulang dari init()
    this.stopMusic(true);
    this.theme = MUSIC_THEMES[name] || MUSIC_THEMES.menu;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 30);
  },

  stopMusic(keepName) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (!keepName) this.themeName = '';
  },

  schedule() {
    if (!this.ctx || !this.theme) return;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.musicStep(this.step, this.nextTime);
      this.nextTime += 60 / this.theme.bpm / 4;  // 16th note
      this.step++;
    }
  },

  musicStep(step, t) {
    const th = this.theme, bus = this.musicBus;
    const bar = Math.floor(step / 16) % th.prog.length, s = step % 16;
    const [off, kind] = th.prog[bar];
    const chord = kind === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12];
    const midi = m => 440 * Math.pow(2, (m - 69) / 12);
    const base = th.root + off;

    if (th.kick.includes(s)) this.tone(150, .16, 'sine', .35, { at: t, slideTo: 40, bus });
    if (th.snare.includes(s)) this.noise(.12, .14, { at: t, type: 'bandpass', freq: 1800, bus });
    if (th.hat.includes(s)) this.noise(.04, .05, { at: t, type: 'highpass', freq: 7000, bus });
    if (th.bass[s]) this.tone(midi(base - 12), .2, 'sawtooth', .13, { at: t, lowpass: 500, bus });
    // arpeggio
    const idx = th.arp[s % th.arp.length];
    this.tone(midi(base + 12 + chord[idx]), .13, th.wave, .045, { at: t, bus });
    // melodi sesekali
    if (s % 8 === 0 && Math.random() < 0.55) {
      const scale = [0, 2, 3, 5, 7, 8, 10, 12];
      this.tone(midi(base + 24 + scale[Math.floor(Math.random() * scale.length)]), .5, 'triangle', .05, { at: t, bus });
    }
  }
};
