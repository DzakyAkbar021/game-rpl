/* ==========================================================
   game.js
   Inti permainan:
     - class Fighter : satu petarung (gerak, lompat, serang, guard, KO)
     - Game          : aturan duel (ronde, timer, damage, combo, KO),
                       game loop, menggambar semua lapisan, dan update HUD.

   Alur satu frame:
     input pemain / AI  ->  Fighter.update  ->  proyektil & zona skill
     ->  efek partikel  ->  gambar (arena, petarung, efek, HUD)
   ========================================================== */
'use strict';

const MOVE_SPEED_K = 2.7;     // kecepatan jalan = stat speed * nilai ini (px/detik)
const JUMP_SPEED = 980;       // kecepatan awal lompat
const GUARD_MAX = 100;

/* ==========================================================
   FIGHTER
   ========================================================== */
class Fighter {
  constructor(char, side) {
    this.char = char;          // data karakter (characters.js)
    this.side = side;          // 0 = P1 (kiri), 1 = P2 (kanan)
    this.maxHp = char.stats.hp;
    // "Tombol virtual": pemain mengisinya dari keyboard, AI mengisinya dari keputusan
    this.ctrl = { left: false, right: false, guard: false, jump: false, attack: false, skill1: false, skill2: false, skill3: false, ult: false };
    this.stats = { damage: 0, maxCombo: 0 };
    this.reset();
  }

  // Mengembalikan petarung ke kondisi awal ronde
  reset() {
    this.x = this.side === 0 ? GAME_W / 2 - 230 : GAME_W / 2 + 230;
    this.y = GROUND_Y; this.vx = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = this.maxHp;
    this.energy = 0;
    this.guard = GUARD_MAX; this.guardLock = false; this.guardRegenT = 0;
    this.state = 'idle';       // idle | walk | jump | attack | block | hurt | ko
    this.action = null;        // { skill, key, t, fired } saat sedang menyerang
    this.hurtTimer = 0; this.invuln = 0; this.koT = 0;
    this.cooldowns = { attack: 0, skill1: 0, skill2: 0, skill3: 0, ult: 0 };
    this.buffs = [];
    this.combo = 0; this.comboTimer = 0;
    this.animT = 0; this.walkPhase = 0;
    this.win = false; this.winT = 0;
    for (const k in this.ctrl) this.ctrl[k] = false;
  }

  onGround() { return this.y >= GROUND_Y - 1; }
  mult(key) { return this.buffs.reduce((m, b) => m * (b[key] || 1), 1); }

  update(dt, game) {
    this.animT += dt;
    const foe = game.opponentOf(this);

    for (const k in this.cooldowns) if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    for (const b of this.buffs) b.t -= dt;
    this.buffs = this.buffs.filter(b => b.t > 0);

    if (this.state === 'ko') {                    // sudah kalah: hanya fisika
      this.koT += dt;
      this.physics(dt, true);
      return;
    }

    if (game.phase === 'fight') this.energy = Math.min(100, this.energy + 1.5 * dt);   // energi pasif

    // pemulihan guard
    if (this.state !== 'block') {
      this.guardRegenT -= dt;
      if (this.guardRegenT <= 0) this.guard = Math.min(GUARD_MAX, this.guard + 24 * dt);
      if (this.guardLock && this.guard >= 35) this.guardLock = false;
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt; this.state = 'hurt';
      if (this.hurtTimer <= 0) { this.state = 'idle'; this.invuln = 0.12; }
    } else if (this.action) {
      this.advanceAction(dt, game, foe);
    } else {
      this.control(dt, game, foe);
    }
    this.physics(dt, false);
  }

  // Sedang menjalankan serangan / skill
  advanceAction(dt, game, foe) {
    const a = this.action, s = a.skill;
    a.t += dt;
    this.state = 'attack';
    if (!a.fired && a.t >= s.fire * s.dur) { a.fired = true; Skills.fire(game, this, s, foe); }
    if (a.fired) Skills.update(game, this, s, dt, foe);
    if (a.t >= s.dur) { this.action = null; this.state = 'idle'; }
  }

  // Bebas bergerak: baca tombol virtual
  control(dt, game, foe) {
    const c = this.ctrl, onG = this.onGround();
    if (foe && foe.state !== 'ko') this.facing = foe.x >= this.x ? 1 : -1;   // selalu menghadap lawan

    if (this.win) {                                // pose kemenangan: melompat-lompat
      this.state = 'idle'; this.winT -= dt;
      if (onG && this.winT <= 0) { this.vy = -700; this.winT = 1.0; }
      return;
    }

    // Guard (bertahan) hanya di tanah dan tidak sedang "guard break"
    if (c.guard && onG && !this.guardLock) { this.state = 'block'; this.vx = 0; return; }

    // Serangan: ultimate > skill > serangan normal
    let key = null;
    if (c.ult && this.energy >= 100 && this.cooldowns.ult <= 0) key = 'ult';
    else if (c.skill1 && this.cooldowns.skill1 <= 0) key = 'skill1';
    else if (c.skill2 && this.cooldowns.skill2 <= 0) key = 'skill2';
    else if (c.skill3 && this.cooldowns.skill3 <= 0) key = 'skill3';
    else if (c.attack && this.cooldowns.attack <= 0) key = 'attack';
    if (key) { this.startAction(key, game); return; }

    // Bergerak
    const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    const spd = this.char.stats.speed * MOVE_SPEED_K * this.mult('spdMult');
    if (onG) {
      this.vx = dir * spd;
      this.state = dir ? 'walk' : 'idle';
      if (dir) this.walkPhase += dt * spd / 20;
      if (c.jump) {
        this.vy = -JUMP_SPEED; this.state = 'jump';
        Sound.play('jump'); Effects.burst(this.x, GROUND_Y, '#8fb4ff', 7, 180, 4, { grav: 120 });
      }
    } else {
      this.vx += (dir * spd - this.vx) * Math.min(1, dt * 6);   // kontrol di udara
      this.state = 'jump';
    }
  }

  startAction(key, game) {
    const s = this.char.skills[key];
    this.cooldowns[key] = s.cooldown;
    this.action = { skill: s, key, t: 0, fired: false };
    this.state = 'attack';
    if (key === 'ult') { this.energy = 0; game.startCinematic(this, s); }
    else if (key === 'attack') Sound.play('whoosh');
  }

  // Fisika: gravitasi, gesekan, batas arena
  physics(dt, dead) {
    const wasAir = this.y < GROUND_Y - 1;
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y >= GROUND_Y) {
      if (wasAir && this.vy > 650) { Effects.burst(this.x, GROUND_Y, '#8fb4ff', 8, 220, 4, { grav: 100 }); Effects.ring(this.x, GROUND_Y + 4, '#8fb4ff', 60, 0.3, 3, 0.25); }
      this.y = GROUND_Y; this.vy = 0;
    }
    // gesekan: saat tidak dikendalikan (terpukul / menyerang / guard / KO)
    const dashing = this.action && this.action.hitActive > 0 && this.action.skill.dash && !this.action.hitDone;
    if (!dashing && (dead || this.state === 'hurt' || this.state === 'attack' || this.state === 'block')) {
      this.vx *= Math.pow(this.onGround() ? 0.01 : 0.3, dt);
    }
    this.x = clamp(this.x, WALL_L, WALL_R);
  }
}

/* ==========================================================
   GAME
   ========================================================== */
const Game = {
  active: false, paused: false, demo: false,
  phase: 'idle',        // intro | fight | ko | timeup | result
  phaseT: 0, roundTime: 60, round: 1, wins: [0, 0],
  p1: null, p2: null, ai: null, ai1: null,
  projectiles: [], zones: [], visuals: [],
  hitStop: 0, cine: null, cam: 0, time: 0, lastT: 0, roundWinner: null, lastHud: {},
  opts: null, el: null, ctx: null,

  // Dipanggil sekali dari main.js setelah halaman siap
  init() {
    const $ = id => document.getElementById(id);
    this.canvas = $('game-canvas'); this.ctx = this.canvas.getContext('2d');
    this.el = {
      announce: $('announce'), timer: $('timer'), roundLabel: $('round-label'),
      pause: $('pause-overlay'), result: $('result-overlay'),
      resTitle: $('result-title'), resSub: $('result-sub'), resStats: $('result-stats'),
      side: [0, 1].map(i => ({
        name: $(`p${i + 1}-name`), tag: $(`p${i + 1}-tag`), hp: $(`p${i + 1}-hp`), ghost: $(`p${i + 1}-ghost`),
        hpText: $(`p${i + 1}-hp-text`), en: $(`p${i + 1}-en`), guard: $(`p${i + 1}-guard`), pips: $(`p${i + 1}-pips`), combo: $(`p${i + 1}-combo`)
      })),
      btn: { k: $('btn-k'), l: $('btn-l'), u: $('btn-u'), i: $('btn-i') }
    };
  },

  opponentOf(f) { return f === this.p1 ? this.p2 : this.p1; },

  /* ---------- Memulai pertandingan ---------- */
  // opts = { p1: id, p2: id atau 'random', arena: id }
  start(opts) {
    let p2 = opts.p2;
    if (!p2 || p2 === 'random') {
      const others = CHARACTERS.filter(c => c.id !== opts.p1);
      p2 = others[Math.floor(Math.random() * others.length)].id;
    }
    this.opts = { p1: opts.p1, p2, arena: opts.arena };
    this.p1 = new Fighter(getCharacter(opts.p1), 0);
    this.p2 = new Fighter(getCharacter(p2), 1);
    this.ai = new EnemyAI(Settings.difficulty);
    this.ai1 = new EnemyAI('hard');                  // dipakai hanya pada mode demo
    this.wins = [0, 0]; this.round = 1; this.paused = false;
    Arena.use(opts.arena);
    Sound.startMusic(Arena.current.theme);

    const E = this.el;
    [this.p1, this.p2].forEach((f, i) => { E.side[i].name.textContent = f.char.name.toUpperCase(); });
    E.side[0].tag.textContent = this.demo ? 'CPU' : 'PLAYER'; E.side[1].tag.textContent = 'CPU';
    ['skill1', 'skill2', 'skill3'].forEach((k, i) => { E.btn['klu'[i]].querySelector('.sname').textContent = this.p1.char.skills[k].name; });
    E.btn.i.querySelector('.sname').textContent = this.p1.char.skills.ult.name;
    E.pause.classList.add('hidden'); E.result.classList.add('hidden');
    this.buildPips();
    this.lastHud = {};
    this.startRound();

    this.active = true;
    this.lastT = performance.now();
    if (!this._looping) { this._looping = true; requestAnimationFrame(t => this.loop(t)); }
  },

  restart() { if (this.opts) this.start(this.opts); },       // rematch dengan monster & arena yang sama
  stop() { this.active = false; this.paused = false; this.cine = null; Effects.clear(); },

  startRound() {
    this.p1.reset(); this.p2.reset();
    this.projectiles.length = 0; this.zones.length = 0; this.visuals.length = 0;
    Effects.clear();
    this.cine = null; this.hitStop = 0; this.roundWinner = null;
    this.roundTime = Settings.roundTime;
    this.phase = 'intro'; this.phaseT = 0; this.introStep = 0;
    this.el.roundLabel.textContent = 'ROUND ' + this.round;
    this.announce('ROUND ' + this.round, '', 1.3);
    Sound.play('round');
  },

  buildPips() {
    this.el.side.forEach(s => { s.pips.innerHTML = ''; for (let i = 0; i < Settings.roundsToWin; i++) s.pips.appendChild(Object.assign(document.createElement('span'), { className: 'pip' })); });
  },
  updatePips() {
    this.el.side.forEach((s, i) => [...s.pips.children].forEach((p, k) => p.classList.toggle('won', k < this.wins[i])));
  },

  announce(text, cls, dur) {
    const a = this.el.announce;
    a.className = ''; void a.offsetWidth;                   // memicu ulang animasi CSS
    a.textContent = text; a.style.setProperty('--dur', dur + 's');
    a.className = 'show ' + (cls || '');
  },

  /* ---------- Pause ---------- */
  setPaused(v) {
    if (!this.active || this.phase === 'result') return;
    this.paused = v;
    this.el.pause.classList.toggle('hidden', !v);
    if (!v) this.lastT = performance.now();
  },

  /* ---------- Game loop ---------- */
  loop(now) {
    if (!this.active) { this._looping = false; return; }
    const dt = Math.min(0.033, (now - this.lastT) / 1000 || 0.016);
    this.lastT = now;
    if (!this.paused) { this.time += dt; this.update(dt); }
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  },

  update(dt) {
    // Cutscene ultimate: dunia berhenti sebentar
    if (this.cine) {
      this.cine.t += dt; Effects.update(dt);
      if (this.cine.t >= this.cine.dur) this.cine = null;
      return;
    }
    // Hit-stop: jeda singkat saat pukulan mengenai lawan (terasa lebih "berat")
    if (this.hitStop > 0) { this.hitStop -= dt; Effects.update(dt * 0.3); return; }

    this.phaseT += dt;
    let sdt = dt;
    if (this.phase === 'ko' && this.phaseT < 1.4) sdt = dt * 0.3;     // slow motion saat K.O.

    switch (this.phase) {
      case 'intro':
        if (this.introStep === 0 && this.phaseT >= 1.25) { this.introStep = 1; this.announce('FIGHT!', 'fight', 0.9); Sound.play('fight'); }
        if (this.phaseT >= 2.0) { this.phase = 'fight'; this.phaseT = 0; }
        break;
      case 'fight': {
        const before = Math.ceil(this.roundTime);
        this.roundTime -= dt;
        if (Math.ceil(this.roundTime) !== before && this.roundTime <= 10 && this.roundTime > 0) Sound.play('tick');
        if (this.roundTime <= 0) this.timeUp();
        break;
      }
      case 'ko': if (this.phaseT >= 3.0) this.finishRound(); break;
      case 'timeup': if (this.phaseT >= 2.4) this.finishRound(); break;
    }

    // Kendali: hanya aktif saat fase "fight"
    const fighting = this.phase === 'fight';
    if (fighting) {
      if (this.demo) this.ai1.update(sdt, this.p1, this.p2, this);
      else Object.assign(this.p1.ctrl, Input.read());
      this.ai.update(sdt, this.p2, this.p1, this);
    } else {
      for (const f of [this.p1, this.p2]) for (const k in f.ctrl) f.ctrl[k] = false;
    }

    this.p1.update(sdt, this); this.p2.update(sdt, this);
    this.separateFighters();

    for (const p of this.projectiles) Skills.updateProjectile(this, p, sdt);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    for (const z of this.zones) Skills.updateZone(this, z, sdt);
    this.zones = this.zones.filter(z => !z.dead);
    for (const v of this.visuals) v.t += sdt;
    this.visuals = this.visuals.filter(v => v.t < v.life);

    Arena.update(sdt);
    Effects.update(sdt);

    // kamera parallax mengikuti titik tengah kedua petarung
    const target = (this.p1.x + this.p2.x) / 2 - GAME_W / 2;
    this.cam += (target - this.cam) * Math.min(1, dt * 4);
    this.updateHud();
  },

  // Mencegah dua petarung saling menembus (kecuali salah satu melompat tinggi)
  separateFighters() {
    const a = this.p1, b = this.p2;
    if (a.state === 'ko' || b.state === 'ko') return;
    const dx = b.x - a.x, minD = 64;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 110) {
      const push = (minD - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      a.x = clamp(a.x - push, WALL_L, WALL_R); b.x = clamp(b.x + push, WALL_L, WALL_R);
    }
  },

  /* ---------- Damage ---------- */
  // Mengembalikan true jika serangan "terhitung" (kena atau tertahan guard).
  dealDamage(att, foe, o) {
    if (this.phase !== 'fight' || foe.state === 'ko' || att.state === 'ko') return false;
    if (foe.invuln > 0 && !o.ult) return false;
    const dir = o.dir || att.facing;
    const tick = o.energy === 0;                               // tick beam: tanpa hit-stop / suara berlebih
    const armor = !!(foe.action && foe.action.skill.ult);      // super-armor saat ultimate
    const cx = foe.x, cy = foe.y - 90;

    // damage dasar: power * attack * 100/(100+defense)
    let dmg = o.power * att.char.stats.attack * att.mult('atkMult') * 100 / (100 + foe.char.stats.defense * foe.mult('defMult')) * rand(0.95, 1.05);

    /* --- Tertahan guard --- */
    if (foe.state === 'block' && !armor) {
      foe.guard -= dmg * (o.ult ? 0.4 : 0.25);
      foe.guardRegenT = 1.2;
      dmg *= o.ult ? 0.35 : 0.1;                               // chip damage kecil
      foe.hp = Math.max(1, foe.hp - dmg);
      att.energy = Math.min(100, att.energy + 2);
      Effects.sparks(foe.x + dir * 40, cy, '#7ff3ff', 8, -dir);
      Effects.ring(foe.x + dir * 50, cy, '#7ff3ff', 50, 0.25, 4);
      if (!tick) { Sound.play('block'); Effects.text(foe.x, foe.y - 190, 'BLOCK', '#7ff3ff', 22, 0.6); }
      foe.vx = dir * (o.kb || 200) * 0.3;
      if (foe.guard <= 0) {                                    // guard pecah!
        foe.guard = 0; foe.guardLock = true; foe.hurtTimer = 1.0; foe.state = 'hurt'; foe.vx = dir * 320;
        Sound.play('guardbreak'); Effects.shake(8, 0.25);
        Effects.text(foe.x, foe.y - 210, 'GUARD BREAK!', '#ff2a5f', 30, 1.1);
      }
      return true;
    }

    /* --- Terkena serangan --- */
    att.combo = att.comboTimer > 0 ? att.combo + 1 : 1;
    att.comboTimer = 1.6;
    att.stats.maxCombo = Math.max(att.stats.maxCombo, att.combo);
    dmg *= 1 + Math.min(att.combo - 1, 10) * 0.03;             // bonus combo
    const crit = !o.ult && !tick && Math.random() < 0.1;
    if (crit) dmg *= 1.5;
    dmg = Math.max(1, Math.round(dmg));
    foe.hp = Math.max(0, foe.hp - dmg);
    att.stats.damage += dmg;
    foe.combo = 0;                                             // combo lawan terputus
    att.energy = Math.min(100, att.energy + (o.energy !== undefined ? o.energy : 6));
    foe.energy = Math.min(100, foe.energy + Math.min(8, dmg * 0.05));
    if (o.lifesteal) { const h = Math.round(dmg * o.lifesteal); att.hp = Math.min(att.maxHp, att.hp + h); Effects.text(att.x, att.y - 190, '+' + h, '#5bff9a', 24); }

    if (!armor) {                                              // terpukul: batal aksi, knockback
      foe.action = null; foe.state = 'hurt'; foe.hurtTimer = o.stun || 0.3;
      foe.vx = dir * (o.kb || 200);
      const lift = o.lift !== undefined ? o.lift : (o.power > 1 ? 180 : 0);
      if (lift) foe.vy = -lift;
    }

    // efek visual & suara
    const heavy = dmg >= 70 || o.ult;
    Effects.burst(cx, cy, o.color || '#fff', tick ? 4 : 10, 360, 5);
    Effects.sparks(cx, cy, '#fff', tick ? 3 : 8, dir);
    if (!tick) Effects.ring(cx, cy, o.color || '#fff', heavy ? 120 : 70, 0.3, 5);
    Effects.text(foe.x + rand(-14, 14), foe.y - 175, String(dmg), crit ? '#ffe45b' : '#ffffff', crit ? 40 : (heavy ? 32 : 26));
    if (crit) Effects.text(foe.x, foe.y - 215, 'CRITICAL HIT!', '#ffe45b', 28, 1.0);
    if (att.combo >= 3 && !tick) Effects.text(att.x, att.y - 215, att.combo + ' COMBO!', att.side === 0 ? '#19d3ff' : '#ff2a5f', 26, 0.8);
    if (!tick) {
      Sound.play(crit ? 'crit' : (heavy ? 'heavy' : 'hit'));
      this.hitStop = Math.max(this.hitStop, heavy ? 0.09 : 0.045);
      Effects.shake(heavy ? 7 : 3, 0.15);
    }

    if (foe.hp <= 0) this.knockOut(foe, att, dir);
    return true;
  },

  knockOut(foe, att, dir) {
    foe.state = 'ko'; foe.koT = 0; foe.action = null; foe.hurtTimer = 0;
    foe.vx = dir * 520; foe.vy = -560;
    this.hitStop = 0.28;
    Effects.shake(14, 0.5); Effects.flash('#ffffff', 0.7);
    Sound.play('ko');
    this.endRound(att, 'ko');
  },

  timeUp() {
    const r1 = this.p1.hp / this.p1.maxHp, r2 = this.p2.hp / this.p2.maxHp;
    const winner = Math.abs(r1 - r2) < 0.0005 ? null : (r1 > r2 ? this.p1 : this.p2);
    this.endRound(winner, 'time');
  },

  endRound(winner, reason) {
    this.roundWinner = winner;
    this.phase = reason === 'ko' ? 'ko' : 'timeup';
    this.phaseT = 0;
    if (winner) winner.win = true;
    if (reason === 'ko') this.announce('K.O.', 'ko', 2.6);
    else this.announce(winner ? 'TIME UP' : 'DRAW', 'draw', 2.2);
  },

  finishRound() {
    const w = this.roundWinner;
    if (w) { this.wins[w.side]++; this.updatePips(); }
    const need = Settings.roundsToWin;
    if (this.wins[0] >= need || this.wins[1] >= need) { this.showResult(); return; }
    this.round++;
    this.startRound();
  },

  /* ---------- Layar menang / kalah ---------- */
  showResult() {
    this.phase = 'result'; this.phaseT = 0;
    const playerWon = this.wins[0] > this.wins[1];
    const E = this.el;
    E.resTitle.textContent = playerWon ? 'VICTORY' : 'DEFEAT';
    E.resTitle.className = playerWon ? 'win' : 'lose';
    E.resSub.textContent = `${this.p1.char.name} ${this.wins[0]} — ${this.wins[1]} ${this.p2.char.name}`;
    const hpLeft = Math.round(this.p1.hp / this.p1.maxHp * 100);
    E.resStats.innerHTML =
      `<div><b>${this.p1.stats.damage}</b><span>TOTAL DAMAGE</span></div>` +
      `<div><b>${this.p1.stats.maxCombo}</b><span>COMBO TERTINGGI</span></div>` +
      `<div><b>${hpLeft}%</b><span>SISA HP</span></div>`;
    setTimeout(() => { if (this.phase === 'result') E.result.classList.remove('hidden'); }, 700);
    Sound.play(playerWon ? 'win' : 'lose');
  },

  /* ---------- Cutscene ultimate ---------- */
  startCinematic(f, skill) {
    this.cine = { t: 0, dur: 0.95, f, skill };
    Sound.play('ult');
    Effects.flash(f.char.color, 0.5);
  },

  /* ==========================================================
     HUD (elemen HTML)
     ========================================================== */
  updateHud() {
    const E = this.el;
    [this.p1, this.p2].forEach((f, i) => {
      const s = E.side[i], pct = clamp(f.hp / f.maxHp, 0, 1) * 100;
      s.hp.style.width = pct + '%'; s.ghost.style.width = pct + '%';
      s.hp.className = 'fill' + (pct < 25 ? ' low' : pct < 50 ? ' mid' : '');
      s.hpText.textContent = Math.ceil(f.hp) + ' / ' + f.maxHp;
      s.en.style.width = f.energy + '%';
      s.en.parentElement.classList.toggle('full', f.energy >= 100);
      s.guard.style.width = (f.guard / GUARD_MAX * 100) + '%';
      // tampilan combo
      const show = f.combo >= 2 && f.comboTimer > 0;
      if (show) {
        if (this.lastHud['c' + i] !== f.combo) {
          s.combo.innerHTML = `<span class="n">${f.combo}</span><span class="t">HIT COMBO</span>`;
          s.combo.classList.remove('pop'); void s.combo.offsetWidth; s.combo.classList.add('pop');
          this.lastHud['c' + i] = f.combo;
        }
      } else if (this.lastHud['c' + i]) { s.combo.innerHTML = ''; this.lastHud['c' + i] = 0; }
    });

    const t = Math.max(0, Math.ceil(this.roundTime));
    E.timer.textContent = t;
    E.timer.classList.toggle('warn', t <= 10 && this.phase === 'fight');

    // tombol skill di layar (indikator cooldown)
    const f = this.p1;
    ['skill1', 'skill2', 'skill3'].forEach((k, i) => {
      const b = E.btn['klu'[i]], cd = Math.max(0, f.cooldowns[k]), total = f.char.skills[k].cooldown;
      b.querySelector('.cd').style.height = (cd / total * 100) + '%';
      b.querySelector('.ctext').textContent = cd > 0 ? cd.toFixed(1) : '';
      b.classList.toggle('ready', cd <= 0);
    });
    const ub = E.btn.i, ready = f.energy >= 100;
    ub.querySelector('.cd').style.height = (100 - f.energy) + '%';
    ub.querySelector('.ctext').textContent = ready ? 'READY' : Math.floor(f.energy) + '%';
    ub.classList.toggle('ready', ready);
  },

  /* ==========================================================
     GAMBAR
     ========================================================== */
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, GAME_W, GAME_H);
    if (!this.p1) return;

    ctx.save();
    const sh = Effects.getShake(); ctx.translate(sh.x, sh.y);

    Arena.drawBack(ctx, this.time, this.cam);

    // petarung yang sedang bergerak/menyerang digambar paling depan
    const order = [this.p1, this.p2].sort((a, b) => (a.action ? 1 : 0) - (b.action ? 1 : 0));
    for (const f of order) renderFighter(ctx, f);

    for (const z of this.zones) Skills.drawZone(ctx, z);
    for (const p of this.projectiles) Skills.drawProjectile(ctx, p);
    for (const v of this.visuals) Skills.drawVisual(ctx, v);
    Effects.draw(ctx);
    Arena.drawFront(ctx, this.time, this.cam);

    if (this.cine) this.drawCinematic(ctx);
    ctx.restore();

    Effects.drawFlash(ctx);
  },

  // Tampilan "potong adegan" saat ultimate dipakai
  drawCinematic(ctx) {
    const c = this.cine, k = c.t / c.dur, f = c.f, col = f.char.color, col2 = f.char.color2;
    const a = k < 0.15 ? k / 0.15 : (k > 0.85 ? (1 - k) / 0.15 : 1);
    ctx.save();
    ctx.globalAlpha = 0.62 * a; ctx.fillStyle = '#02020a'; ctx.fillRect(0, 0, GAME_W, GAME_H);
    // garis kecepatan
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = col; ctx.lineWidth = 2;
    const seed = Math.floor(c.t * 40);
    for (let i = 0; i < 26; i++) {
      const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453, fr = r - Math.floor(r);
      const y = fr * GAME_H, len = 120 + fr * 380, x = ((fr * 7919 + c.t * 2400 + i * 91) % (GAME_W + len)) - len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
    ctx.restore();
    // petarung yang memakai ultimate digambar ulang di atas layar gelap
    renderFighter(ctx, f);
    // pita judul diagonal
    ctx.save();
    const slide = (1 - Math.min(1, k * 5)) * -GAME_W * 0.6;
    ctx.globalAlpha = a; ctx.translate(slide, 0);
    const g = ctx.createLinearGradient(0, 0, GAME_W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, 'rgba(8,4,24,.92)'); g.addColorStop(0.85, 'rgba(8,4,24,.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(GAME_W, 120); ctx.lineTo(GAME_W, 260); ctx.lineTo(0, 290); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(GAME_W, 120); ctx.stroke();
    ctx.strokeStyle = col2; ctx.beginPath(); ctx.moveTo(0, 290); ctx.lineTo(GAME_W, 260); ctx.stroke();
    ctx.shadowBlur = 0; ctx.textAlign = 'center';
    ctx.font = '900 italic 24px Orbitron, Impact, sans-serif'; ctx.fillStyle = col2;
    ctx.fillText('— ' + f.char.name.toUpperCase() + ' · ULTIMATE —', GAME_W / 2, 178);
    ctx.font = '900 italic 66px Orbitron, Impact, sans-serif';
    ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText(c.skill.name.toUpperCase(), GAME_W / 2, 244);
    ctx.shadowColor = col; ctx.shadowBlur = 26; ctx.fillStyle = '#fff'; ctx.fillText(c.skill.name.toUpperCase(), GAME_W / 2, 244);
    ctx.restore();
  }
};
