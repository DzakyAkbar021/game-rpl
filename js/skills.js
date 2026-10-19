/* ==========================================================
   skills.js
   1) SKILL_SETS : data skill tiap monster (serangan normal, 3 skill, 1 ultimate)
   2) Skills     : logika menjalankan skill (melee, proyektil, beam, petir,
                   meteor, gempa, buff, teleport) beserta gambar efeknya.

   Cara kerja singkat:
   - Fighter menekan tombol -> mulai "action" (animasi serangan).
   - Pada saat "fire" (persentase dari durasi) fungsi Skills.types[tipe] dipanggil.
   - Proyektil / zona / visual disimpan di game.projectiles, game.zones, game.visuals.
   ========================================================== */
'use strict';

/*
  Keterangan field skill:
  type     : melee | projectile | beam | strike | rain | quake | buff | teleport
  cooldown : detik sebelum bisa dipakai lagi
  dur/fire : lama animasi total, dan kapan efeknya muncul (0..1)
  power    : pengali damage (damage = power * attack * 100/(100+defense))
  kb/stun  : kekuatan knockback dan lama lawan tidak bisa bergerak
  ai       : [jarak minimum, jarak maksimum] agar AI mau memakai skill ini
*/
const SKILL_SETS = {
  /* ---------------------- FlameRex ---------------------- */
  flamerex: {
    attack: { name: 'Claw Slash', icon: '⚔', desc: 'Cakaran cepat.', type: 'melee', cooldown: 0.36, dur: 0.36, fire: 0.4, active: 0.1, range: 105, power: 0.6, kb: 250, stun: 0.3, color: '#ff8a3c', sfx: 'slash' },
    skill1: { name: 'Fireball', icon: '🔥', desc: 'Bola api meluncur lurus.', type: 'projectile', cooldown: 3, dur: 0.5, fire: 0.5, speed: 660, r: 24, power: 1.35, kb: 360, stun: 0.45, style: 'fire', color: '#ff6a1a', color2: '#ffd23f', sfx: 'fire', ai: [180, 900] },
    skill2: { name: 'Dragon Rush', icon: '🐉', desc: 'Menerjang lawan sambil mencakar.', type: 'melee', cooldown: 5, dur: 0.55, fire: 0.25, active: 0.26, dash: 950, range: 130, power: 1.5, kb: 520, stun: 0.5, color: '#ff5a2a', sfx: 'slash', ai: [120, 420] },
    skill3: { name: 'Flame Pillar', icon: '🌋', desc: 'Tiang api menyembur dari tanah di posisi lawan.', type: 'strike', cooldown: 7, dur: 0.6, fire: 0.4, delay: 0.65, radius: 90, power: 1.7, kb: 430, stun: 0.55, zone: 'pillar', color: '#ff5a2a', color2: '#ffd23f', maxAir: 300, sfx: 'fire', ai: [0, 700] },
    ult:    { name: 'Inferno Roar', icon: '☄', desc: 'Raungan api raksasa menyapu arena.', type: 'beam', ult: true, cooldown: 0.5, dur: 1.35, fire: 0.3, length: 900, thick: 150, ticks: 8, interval: 0.1, power: 5.2, kb: 90, finalKb: 520, color: '#ff5a2a', color2: '#ffd23f', sfx: 'fire', ai: [0, 800] }
  },
  /* ---------------------- ThunderWolf ---------------------- */
  thunderwolf: {
    attack: { name: 'Fang Bite', icon: '⚔', desc: 'Gigitan super cepat.', type: 'melee', cooldown: 0.28, dur: 0.3, fire: 0.38, active: 0.1, range: 95, power: 0.5, kb: 220, stun: 0.28, color: '#ffe14a', sfx: 'slash' },
    skill1: { name: 'Spark Bolt', icon: '⚡', desc: 'Bola petir sangat cepat.', type: 'projectile', cooldown: 2, dur: 0.38, fire: 0.45, speed: 1000, r: 16, power: 1.0, kb: 300, stun: 0.4, style: 'bolt', color: '#ffe14a', color2: '#ffffff', sfx: 'bolt', ai: [150, 900] },
    skill2: { name: 'Volt Dash', icon: '💨', desc: 'Melesat secepat kilat menembus lawan.', type: 'melee', cooldown: 4, dur: 0.5, fire: 0.22, active: 0.22, dash: 1250, range: 130, power: 1.2, kb: 420, stun: 0.45, color: '#ffe14a', sfx: 'bolt', ai: [140, 500] },
    skill3: { name: 'Thunder Strike', icon: '🌩', desc: 'Petir menyambar posisi lawan.', type: 'strike', cooldown: 6.5, dur: 0.55, fire: 0.4, delay: 0.5, radius: 70, power: 1.8, kb: 330, stun: 0.6, zone: 'bolt', color: '#ffe14a', color2: '#ffffff', maxAir: 700, sfx: 'bolt', ai: [0, 900] },
    ult:    { name: 'Thunder Storm', icon: '⛈', desc: 'Badai petir menyambar seluruh arena.', type: 'rain', ult: true, cooldown: 0.5, dur: 1.4, fire: 0.3, count: 9, span: 1.5, base: 0.4, spread: 120, radius: 75, power: 1.2, kb: 300, stun: 0.4, zone: 'bolt', color: '#ffe14a', color2: '#ffffff', maxAir: 700, sfx: 'bolt', ai: [0, 900] }
  },
  /* ---------------------- AquaDrake ---------------------- */
  aquadrake: {
    attack: { name: 'Tail Whip', icon: '⚔', desc: 'Sabetan ekor.', type: 'melee', cooldown: 0.34, dur: 0.36, fire: 0.4, active: 0.1, range: 115, power: 0.55, kb: 250, stun: 0.3, color: '#6fe3ff', sfx: 'slash' },
    skill1: { name: 'Water Wave', icon: '🌊', desc: 'Gelombang air menembus lawan.', type: 'projectile', cooldown: 3.5, dur: 0.55, fire: 0.5, speed: 560, r: 38, power: 1.3, kb: 350, stun: 0.45, style: 'wave', pierce: true, life: 2, color: '#35c4ff', color2: '#e0faff', sfx: 'water', ai: [150, 900] },
    skill2: { name: 'Aqua Shield', icon: '🫧', desc: 'Perisai gelembung: memulihkan HP dan menaikkan pertahanan.', type: 'buff', cooldown: 10, dur: 0.55, fire: 0.35, heal: 0.1, defMult: 1.7, buffDur: 5, color: '#6fe3ff', sfx: 'buff', aiBuff: true },
    skill3: { name: 'Tidal Slash', icon: '🔱', desc: 'Tebasan ombak jarak dekat yang kuat.', type: 'melee', cooldown: 6, dur: 0.6, fire: 0.3, active: 0.2, dash: 380, range: 175, power: 1.7, kb: 560, stun: 0.55, color: '#35c4ff', sfx: 'water', ai: [60, 330] },
    ult:    { name: 'Tsunami', icon: '🌀', desc: 'Ombak raksasa menyapu seluruh arena.', type: 'projectile', ult: true, cooldown: 0.5, dur: 1.2, fire: 0.5, speed: 780, r: 130, power: 5.4, kb: 700, stun: 0.9, style: 'wave', pierce: true, life: 2.2, color: '#35c4ff', color2: '#e0faff', sfx: 'water', ai: [0, 900] }
  },
  /* ---------------------- ShadowBat ---------------------- */
  shadowbat: {
    attack: { name: 'Wing Strike', icon: '⚔', desc: 'Sabetan sayap cepat.', type: 'melee', cooldown: 0.28, dur: 0.3, fire: 0.38, active: 0.1, range: 100, power: 0.5, kb: 220, stun: 0.28, color: '#b24bff', sfx: 'slash' },
    skill1: { name: 'Shadow Fangs', icon: '🦇', desc: 'Tiga taring bayangan menyebar.', type: 'projectile', cooldown: 3, dur: 0.45, fire: 0.45, count: 3, spread: 0.22, speed: 720, r: 15, power: 0.75, kb: 260, stun: 0.35, style: 'shadow', color: '#b24bff', color2: '#ff2d55', sfx: 'dark', ai: [150, 900] },
    skill2: { name: 'Blood Drain', icon: '🩸', desc: 'Menyedot HP lawan jarak dekat.', type: 'melee', cooldown: 5, dur: 0.5, fire: 0.35, active: 0.14, range: 125, power: 1.25, lifesteal: 0.5, kb: 300, stun: 0.5, color: '#ff2d55', sfx: 'dark', ai: [0, 170] },
    skill3: { name: 'Dark Teleport', icon: '🌀', desc: 'Berteleportasi ke belakang lawan lalu menebas.', type: 'teleport', cooldown: 7, dur: 0.65, fire: 0.3, active: 0.14, range: 130, power: 1.7, kb: 420, stun: 0.5, color: '#b24bff', sfx: 'teleport', ai: [200, 900] },
    ult:    { name: 'Midnight Swarm', icon: '🌑', desc: 'Kawanan kelelawar pengejar menyerbu lawan.', type: 'projectile', ult: true, cooldown: 0.5, dur: 1.1, fire: 0.35, count: 9, spread: 0.3, speed: 640, r: 16, power: 0.52, kb: 220, stun: 0.3, stagger: 0.08, life: 3, homing: 5, style: 'shadow', color: '#b24bff', color2: '#ff2d55', sfx: 'dark', ai: [0, 900] }
  },
  /* ---------------------- TerraGolem ---------------------- */
  terragolem: {
    attack: { name: 'Rock Punch', icon: '⚔', desc: 'Pukulan batu berat.', type: 'melee', cooldown: 0.5, dur: 0.5, fire: 0.42, active: 0.12, range: 115, power: 0.7, kb: 330, stun: 0.4, color: '#c9a46a', sfx: 'rock' },
    skill1: { name: 'Rock Throw', icon: '🪨', desc: 'Melempar batu melengkung ke arah lawan.', type: 'projectile', cooldown: 4, dur: 0.6, fire: 0.5, lob: true, gravity: 1500, r: 28, power: 1.5, kb: 420, stun: 0.5, style: 'rock', explode: 80, color: '#c9a46a', color2: '#ffb347', sfx: 'rock', ai: [200, 700] },
    skill2: { name: 'Stone Skin', icon: '🛡', desc: 'Kulit batu: pulih sedikit dan pertahanan x2.', type: 'buff', cooldown: 11, dur: 0.6, fire: 0.3, heal: 0.08, defMult: 2, buffDur: 6, color: '#ffb347', sfx: 'buff', aiBuff: true },
    skill3: { name: 'Quake Stomp', icon: '💥', desc: 'Hentakan gempa (hindari dengan melompat).', type: 'quake', cooldown: 6.5, dur: 0.7, fire: 0.45, radius: 270, maxAir: 45, power: 1.6, kb: 480, stun: 0.6, color: '#c9a46a', color2: '#ffb347', sfx: 'rock', ai: [0, 260] },
    ult:    { name: 'Meteor Fall', icon: '☄', desc: 'Hujan meteor menghantam arena.', type: 'rain', ult: true, cooldown: 0.5, dur: 1.3, fire: 0.3, count: 7, span: 1.6, base: 0.6, spread: 170, radius: 95, power: 1.8, kb: 450, stun: 0.5, zone: 'meteor', color: '#ff7a2a', color2: '#ffd23f', maxAir: 260, sfx: 'rock', ai: [0, 900] }
  },
  /* ---------------------- CyberKnight ---------------------- */
  cyberknight: {
    attack: { name: 'Pulse Blade', icon: '⚔', desc: 'Tebasan pedang energi.', type: 'melee', cooldown: 0.32, dur: 0.34, fire: 0.4, active: 0.1, range: 120, power: 0.6, kb: 250, stun: 0.3, color: '#35f0ff', sfx: 'slash' },
    skill1: { name: 'Energy Slash', icon: '🗡', desc: 'Gelombang tebasan energi.', type: 'projectile', cooldown: 2.6, dur: 0.45, fire: 0.45, speed: 820, r: 26, power: 1.2, kb: 350, stun: 0.45, style: 'slash', color: '#35f0ff', color2: '#ffffff', sfx: 'slash', ai: [160, 900] },
    skill2: { name: 'Blade Rush', icon: '⚡', desc: 'Menerjang dengan tusukan pedang.', type: 'melee', cooldown: 4.2, dur: 0.5, fire: 0.25, active: 0.24, dash: 1050, range: 135, power: 1.3, kb: 450, stun: 0.5, color: '#35f0ff', sfx: 'slash', ai: [120, 460] },
    skill3: { name: 'Overclock', icon: '⚙', desc: 'Serangan +40% dan kecepatan +30% selama 6 detik.', type: 'buff', cooldown: 12, dur: 0.55, fire: 0.3, atkMult: 1.4, spdMult: 1.3, buffDur: 6, color: '#ff2d95', sfx: 'buff', aiBuff: true },
    ult:    { name: 'Omega Blade', icon: '✦', desc: 'Pedang energi raksasa membelah arena.', type: 'beam', ult: true, cooldown: 0.5, dur: 1.2, fire: 0.3, length: 1000, thick: 170, ticks: 5, interval: 0.12, power: 4.8, kb: 100, finalKb: 560, color: '#35f0ff', color2: '#ffffff', sfx: 'slash', ai: [0, 900] }
  }
};

// Tempelkan skill ke tiap karakter
CHARACTERS.forEach(c => { c.skills = SKILL_SETS[c.id]; });

/* ==========================================================
   Logika menjalankan skill
   ========================================================== */
const Skills = {
  // Opsi damage dari data skill
  hitOpts(s, extra) {
    return Object.assign({ power: s.power, kb: s.kb, stun: s.stun, lift: s.lift, color: s.color, lifesteal: s.lifesteal, ult: !!s.ult, energy: s.ult ? 2 : (s.type === 'melee' && s.cooldown < 0.6 ? 5 : 8), label: s.name }, extra || {});
  },

  // Dipanggil sekali pada momen "fire"
  fire(game, f, s, foe) {
    const fn = Skills.types[s.type];
    if (fn) fn(game, f, s, foe);
    if (s.sfx && s.type !== 'teleport') Sound.play(s.sfx);
    if (s.ult) { Effects.shake(11, 0.7); Effects.flash(s.color, 0.35); }
  },

  // Dipanggil setiap frame setelah fire: mengatur jendela serangan jarak dekat
  update(game, f, s, dt, foe) {
    const a = f.action;
    if (a.hitActive > 0) {
      a.hitActive -= dt;
      if (s.dash && !a.hitDone) {
        f.vx = f.facing * s.dash;
        Effects.spawn({ x: f.x - f.facing * 20, y: f.y - rand(30, 110), vx: -f.facing * 80, vy: rand(-30, 30), life: 0.3, size: rand(5, 9), color: s.color });
      }
      if (!a.hitDone && foe && Skills.meleeOverlap(f, foe, s)) {
        if (game.dealDamage(f, foe, Skills.hitOpts(s, { dir: f.facing }))) {
          a.hitDone = true;
          if (s.dash) f.vx *= 0.25;
        }
      }
    }
  },

  // Apakah lawan berada di dalam jangkauan serangan jarak dekat?
  meleeOverlap(f, foe, s) {
    const x0 = f.x - f.facing * 10, x1 = f.x + f.facing * s.range;
    const minX = Math.min(x0, x1) - 34, maxX = Math.max(x0, x1) + 34;
    return foe.x >= minX && foe.x <= maxX && Math.abs(foe.y - f.y) < 110;
  },

  /* ---------- Tipe-tipe skill ---------- */
  types: {
    melee(game, f, s) {
      f.action.hitActive = s.active || 0.12;
      f.action.hitDone = false;
      game.visuals.push({ kind: 'slash', x: f.x + f.facing * s.range * 0.35, y: f.y - 85, facing: f.facing, color: s.color, r: s.range * 0.7, t: 0, life: 0.24 });
      Effects.burst(f.x + f.facing * 40, f.y - 80, s.color, 6, 220, 4);
      if (s.dash) Effects.ring(f.x, GROUND_Y + 4, s.color, 80, 0.3, 4, 0.25);
    },

    projectile(game, f, s, foe) {
      const n = s.count || 1;
      for (let i = 0; i < n; i++) {
        let vx = f.facing * s.speed, vy = 0;
        if (n > 1) {
          const ang = (i - (n - 1) / 2) * (s.spread || 0.2);
          vx = Math.cos(ang) * s.speed * f.facing; vy = Math.sin(ang) * s.speed;
        }
        let y = f.y - 90;
        if (s.lob && foe) {                         // lemparan melengkung mengarah ke posisi lawan
          const T = 0.85;
          vx = clamp((foe.x - f.x) / T, -900, 900);
          vy = -0.5 * s.gravity * T;
        }
        if (s.homing) {                             // kawanan: keluar ke atas lalu mengejar
          vx = f.facing * rand(60, 260); vy = -rand(250, 600); y = f.y - rand(60, 130);
        }
        game.projectiles.push({
          owner: f, x: f.x + f.facing * 50, y, vx, vy, r: s.r, spec: s, style: s.style,
          pierce: !!s.pierce, hits: new Set(), life: s.life || 2.5, gravity: s.gravity || 0,
          homing: s.homing || 0, wait: s.stagger ? i * s.stagger : 0, t: 0, rot: 0, dead: false
        });
      }
    },

    beam(game, f, s) {
      game.zones.push({
        kind: 'beam', owner: f, dir: f.facing, x: f.x + f.facing * 40, y: f.y - 80, t: 0, spec: s,
        length: s.length, thick: s.thick, ticks: s.ticks, tickCount: 0, interval: s.interval, nextTick: 0.02,
        life: s.ticks * s.interval + 0.3, dead: false
      });
    },

    strike(game, f, s, foe) {
      if (!foe) return;
      game.zones.push(Skills.makeZone(f, s, foe.x, s.delay));
      Effects.ring(f.x, f.y - 70, s.color, 90, 0.4, 5);
    },

    rain(game, f, s, foe) {
      for (let i = 0; i < s.count; i++) {
        const aimed = i % 2 === 0 && foe;
        const x = clamp(aimed ? foe.x + rand(-s.spread, s.spread) : rand(WALL_L + 40, WALL_R - 40), WALL_L, WALL_R);
        game.zones.push(Skills.makeZone(f, s, x, s.base + i * (s.span / s.count)));
      }
    },

    quake(game, f, s) {
      game.zones.push(Skills.makeZone(f, s, f.x, 0, 'quake'));
    },

    buff(game, f, s) {
      f.buffs = f.buffs.filter(b => b.name !== s.name);
      f.buffs.push({ name: s.name, t: s.buffDur, defMult: s.defMult || 1, atkMult: s.atkMult || 1, spdMult: s.spdMult || 1, color: s.color });
      if (s.heal) {
        const h = Math.round(f.maxHp * s.heal);
        f.hp = Math.min(f.maxHp, f.hp + h);
        Effects.text(f.x, f.y - 175, '+' + h, '#5bff9a', 30);
      }
      Effects.ring(f.x, f.y - 80, s.color, 140, 0.6, 6);
      Effects.burst(f.x, f.y - 80, s.color, 22, 260, 5, { grav: -80 });
    },

    teleport(game, f, s, foe) {
      if (!foe) return;
      Effects.burst(f.x, f.y - 70, s.color, 20, 320, 5);
      Effects.ring(f.x, f.y - 70, s.color, 100, 0.4, 5);
      const side = foe.x >= f.x ? 1 : -1;
      let nx = foe.x + side * 85;                   // muncul di belakang lawan
      if (nx > WALL_R - 10 || nx < WALL_L + 10) nx = foe.x - side * 85;
      f.x = clamp(nx, WALL_L, WALL_R); f.y = GROUND_Y; f.vy = 0;
      f.facing = foe.x >= f.x ? 1 : -1;
      Effects.burst(f.x, f.y - 70, s.color, 20, 320, 5);
      Effects.ring(f.x, f.y - 70, s.color, 100, 0.4, 5);
      Sound.play('teleport');
      Skills.types.melee(game, f, s);
    }
  },

  makeZone(owner, s, x, delay, kind) {
    const z = {
      kind: kind || s.zone || 'pillar', owner, x, delay, t: 0, life: 0.5, spec: s,
      radius: s.radius, maxAir: s.maxAir !== undefined ? s.maxAir : 260, fired: false, dead: false, pts: []
    };
    for (let i = 0; i < 9; i++) z.pts.push(rand(-30, 30));
    return z;
  },

  /* ---------- Update proyektil ---------- */
  updateProjectile(game, p, dt) {
    if (p.wait > 0) { p.wait -= dt; return; }
    const s = p.spec, foe = game.opponentOf(p.owner);
    p.t += dt; p.life -= dt; p.rot += dt * 8;

    if (p.homing && foe) {                          // belok perlahan ke arah lawan
      const speed = Math.hypot(p.vx, p.vy), want = Math.atan2((foe.y - 80) - p.y, foe.x - p.x);
      let cur = Math.atan2(p.vy, p.vx), diff = want - cur;
      while (diff > Math.PI) diff -= TAU; while (diff < -Math.PI) diff += TAU;
      cur += clamp(diff, -p.homing * dt, p.homing * dt);
      const sp = lerp(speed, s.speed, Math.min(1, 2 * dt));
      p.vx = Math.cos(cur) * sp; p.vy = Math.sin(cur) * sp;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;

    // jejak partikel sesuai gaya proyektil
    if (Math.random() < 0.8) {
      const c = s.color, back = -Math.sign(p.vx || 1);
      if (p.style === 'fire') Effects.spawn({ x: p.x, y: p.y + rand(-8, 8), vx: back * 60, vy: rand(-80, -20), life: 0.4, size: p.r * 0.5, color: Math.random() < 0.5 ? c : s.color2 });
      else if (p.style === 'bolt') Effects.spawn({ x: p.x + back * rand(0, 30), y: p.y + rand(-14, 14), vx: 0, vy: 0, life: 0.2, size: 3, color: '#fff' });
      else if (p.style === 'wave') Effects.spawn({ x: p.x + rand(-10, 10), y: p.y + rand(-p.r, p.r), vx: back * 80, vy: rand(-120, 60), life: 0.45, size: rand(3, 6), color: s.color2, grav: 400 });
      else if (p.style === 'shadow') Effects.spawn({ x: p.x, y: p.y, vx: back * 40, vy: rand(-30, 30), life: 0.4, size: 7, color: Math.random() < 0.5 ? c : '#5a2ba0' });
      else if (p.style === 'rock') Effects.spawn({ x: p.x, y: p.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.35, size: 5, color: '#a98a5a', add: false });
      else if (p.style === 'slash') Effects.spawn({ x: p.x, y: p.y + rand(-p.r, p.r), vx: back * 120, vy: 0, life: 0.25, size: 3, color: '#fff' });
    }

    // tabrakan dengan lawan (lingkaran vs kotak)
    if (foe && foe.state !== 'ko' && !p.hits.has(foe)) {
      const cx = clamp(p.x, foe.x - 34, foe.x + 34), cy = clamp(p.y, foe.y - 150, foe.y);
      if ((p.x - cx) ** 2 + (p.y - cy) ** 2 <= (p.r + 4) ** 2) {
        const dir = Math.sign(p.vx) || p.owner.facing;
        if (game.dealDamage(p.owner, foe, Skills.hitOpts(s, { dir }))) {
          p.hits.add(foe);
          if (!p.pierce) { Effects.burst(p.x, p.y, s.color, 14, 360, 5); p.dead = true; }
        }
      }
    }
    // menyentuh tanah
    if (p.gravity > 0 && p.y >= GROUND_Y - 6 && !p.dead) {
      p.dead = true;
      if (s.explode) {
        const z = Skills.makeZone(p.owner, Object.assign({}, s, { radius: s.explode, maxAir: 90 }), p.x, 0, 'quake');
        game.zones.push(z);
      }
    }
    if (p.life <= 0 || p.x < -250 || p.x > GAME_W + 250) p.dead = true;
  },

  /* ---------- Update zona (petir, tiang api, meteor, gempa, beam) ---------- */
  updateZone(game, z, dt) {
    z.t += dt;
    const foe = game.opponentOf(z.owner);

    if (z.kind === 'beam') {                       // beam mengikuti penembaknya
      const o = z.owner;
      if (o.state === 'ko' || o.hurtTimer > 0) { z.dead = true; return; }
      z.x = o.x + z.dir * 40; z.y = o.y - 80;
      if (z.tickCount < z.ticks && z.t >= z.nextTick) {
        z.tickCount++; z.nextTick += z.interval;
        const last = z.tickCount === z.ticks;
        if (foe && foe.state !== 'ko') {
          const x0 = Math.min(z.x, z.x + z.dir * z.length), x1 = Math.max(z.x, z.x + z.dir * z.length);
          if (foe.x + 34 > x0 && foe.x - 34 < x1 && foe.y > z.y - z.thick / 2 && foe.y - 150 < z.y + z.thick / 2) {
            const s = z.spec;
            game.dealDamage(o, foe, Skills.hitOpts(s, { power: s.power / z.ticks, kb: last ? s.finalKb : s.kb, stun: last ? 0.6 : 0.25, dir: z.dir, lift: last ? 300 : 40, energy: 0 }));
          }
        }
      }
      if (Math.random() < 0.7) Effects.spawn({ x: z.x + z.dir * rand(40, z.length), y: z.y + rand(-z.thick / 2, z.thick / 2), vx: z.dir * rand(100, 500), vy: rand(-60, 60), life: 0.4, size: rand(3, 7), color: Math.random() < 0.5 ? z.spec.color : z.spec.color2 });
      if (z.t >= z.life) z.dead = true;
      return;
    }

    if (!z.fired && z.t >= z.delay) { z.fired = true; Skills.detonate(game, z, foe); }
    if (z.t >= z.delay + z.life) z.dead = true;
  },

  // Saat zona "meledak": efek + cek damage
  detonate(game, z, foe) {
    const s = z.spec, G = GROUND_Y;
    switch (z.kind) {
      case 'pillar':
        Sound.play('fire'); Effects.shake(7, 0.3);
        Effects.burst(z.x, G - 20, s.color, 28, 560, 6); Effects.burst(z.x, G - 60, s.color2, 18, 420, 5, { grav: -100 });
        Effects.ring(z.x, G + 6, s.color, z.radius * 1.6, 0.5, 8, 0.25); break;
      case 'bolt':
        Sound.play('bolt'); Effects.shake(5, 0.2); Effects.flash('#ffffff', 0.18);
        Effects.burst(z.x, G - 10, s.color, 22, 500, 5); Effects.sparks(z.x, G - 10, '#fff', 8, 1); Effects.sparks(z.x, G - 10, '#fff', 8, -1);
        Effects.ring(z.x, G + 6, s.color, z.radius * 1.5, 0.4, 6, 0.25); break;
      case 'meteor':
        Sound.play('explosion'); Effects.shake(9, 0.35);
        Effects.burst(z.x, G - 20, s.color, 30, 600, 7); Effects.burst(z.x, G - 20, s.color2, 20, 400, 5);
        Effects.ring(z.x, G + 6, s.color, z.radius * 1.8, 0.55, 9, 0.28); break;
      case 'quake':
        Sound.play('rock'); Effects.shake(s.ult ? 10 : 8, 0.35);
        Effects.burst(z.x, G, s.color, 26, 480, 6, { shape: 'square' });
        Effects.ring(z.x, G + 6, s.color2 || s.color, z.radius, 0.6, 9, 0.22);
        Effects.ring(z.x, G + 6, s.color, z.radius * 0.7, 0.45, 6, 0.22); break;
    }
    if (foe && foe.state !== 'ko' && Math.abs(foe.x - z.x) < z.radius + 28 && (G - foe.y) <= z.maxAir) {
      const dir = Math.sign(foe.x - z.x) || z.owner.facing;
      game.dealDamage(z.owner, foe, Skills.hitOpts(s, { dir, lift: 340 }));
    }
  },

  /* ==========================================================
     GAMBAR: proyektil, zona, visual
     ========================================================== */
  drawProjectile(ctx, p) {
    if (p.wait > 0) return;
    const s = p.spec, r = p.r, ang = Math.atan2(p.vy, p.vx), spd = Math.hypot(p.vx, p.vy) || 1;
    ctx.save(); ctx.translate(p.x, p.y);
    switch (p.style) {
      case 'fire': {
        for (let i = 4; i >= 1; i--) glowDot(ctx, -p.vx / spd * i * r * 0.7, -p.vy / spd * i * r * 0.7, r * (1.6 - i * 0.22), '#ff4a1a', 0.55);
        glowDot(ctx, 0, 0, r * 2.4, '#ff6a1a', 0.9); glowDot(ctx, 0, 0, r * 1.4, '#ffd23f', 1); glowDot(ctx, 0, 0, r * 0.7, '#ffffff', 1);
        break;
      }
      case 'bolt': {
        glowDot(ctx, 0, 0, r * 2.4, '#ffe14a', 0.8);
        const dir = Math.sign(p.vx) || 1, seed = Math.floor(p.t * 30);
        zap(ctx, -dir * 38, 0, dir * 76, 0, seed, '#ffe14a', 5); zap(ctx, -dir * 38, 0, dir * 76, 0, seed, '#ffffff', 2);
        break;
      }
      case 'wave': {
        ctx.rotate(Math.sign(p.vx) > 0 ? 0 : Math.PI);
        const g = ctx.createLinearGradient(-r, 0, r, 0);
        g.addColorStop(0, 'rgba(53,196,255,0.05)'); g.addColorStop(0.6, s.color); g.addColorStop(1, s.color2);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.15, -Math.PI / 2, Math.PI / 2);
        ctx.arc(-r * 0.55, 0, r * 1.0, Math.PI / 2, -Math.PI / 2, true); ctx.closePath();
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = s.color2; ctx.lineWidth = Math.max(3, r * 0.08); ctx.shadowColor = s.color; ctx.shadowBlur = 20; ctx.stroke();
        break;
      }
      case 'shadow': {
        ctx.rotate(ang);
        glowDot(ctx, 0, 0, r * 2.6, '#7a2fe0', 0.7);
        const fl = Math.sin(p.t * 26) * 0.6;
        ctx.fillStyle = '#1a0933'; ctx.strokeStyle = '#b24bff'; ctx.lineWidth = 2;
        for (const sd of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.6, sd * r * (1.4 + fl)); ctx.lineTo(-r * 1.5, sd * r * (0.6 + fl * 0.5)); ctx.lineTo(-r * 0.9, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.55, 0, 0, TAU); ctx.fillStyle = '#2a0f4f'; ctx.fill(); ctx.stroke();
        glowDot(ctx, r * 0.35, 0, r * 0.8, '#ff2d55', 0.9);
        break;
      }
      case 'rock': {
        ctx.rotate(p.rot);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr2 = r * (i % 2 ? 0.8 : 1.1); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
        ctx.closePath(); ctx.fillStyle = '#8b6b4a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2a1a10'; ctx.stroke();
        ctx.fillStyle = '#b89468'; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.3, 0, TAU); ctx.fill();
        break;
      }
      case 'slash': {
        ctx.rotate(Math.sign(p.vx) > 0 ? 0 : Math.PI);
        ctx.shadowColor = s.color; ctx.shadowBlur = 24; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-r * 0.7, 0, r * 1.5, -0.95, 0.95); ctx.strokeStyle = s.color; ctx.lineWidth = 14; ctx.stroke();
        ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(-r * 0.7, 0, r * 1.5, -0.8, 0.8); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
        break;
      }
      default: glowDot(ctx, 0, 0, r * 2, s.color, 0.9);
    }
    ctx.restore();
  },

  drawZone(ctx, z) {
    const s = z.spec, G = GROUND_Y;
    ctx.save();
    if (z.kind === 'beam') { Skills.drawBeam(ctx, z); ctx.restore(); return; }

    if (z.t < z.delay) {                           // fase peringatan: lingkaran di tanah (+ meteor jatuh)
      const k = z.t / z.delay;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.5 * k;
      ctx.strokeStyle = s.color; ctx.lineWidth = 3 + k * 3;
      ctx.beginPath(); ctx.ellipse(z.x, G + 4, z.radius * (1.15 - 0.15 * k), 14 + k * 4, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.12 + 0.2 * k; ctx.fillStyle = s.color; ctx.fill();
      if (z.kind === 'meteor') {
        const y = lerp(-90, G - 20, k * k);
        ctx.globalAlpha = 1;
        for (let i = 1; i <= 6; i++) glowDot(ctx, z.x - i * 7, y - i * 18, 34 - i * 4, '#ff5a1a', 0.5);
        glowDot(ctx, z.x, y, 50, '#ff7a2a', 0.9); glowDot(ctx, z.x, y, 26, '#fff3a0', 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath(); ctx.arc(z.x, y, 20, 0, TAU); ctx.fillStyle = '#4a2a18'; ctx.fill(); ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.restore(); return;
    }

    const k = clamp((z.t - z.delay) / z.life, 0, 1);
    ctx.globalCompositeOperation = 'lighter';
    if (z.kind === 'pillar') {
      const w = z.radius * Math.sin(Math.min(1, k * 2.2) * Math.PI / 2) * (1 - k * 0.7);
      const g = ctx.createLinearGradient(0, G - 420, 0, G);
      g.addColorStop(0, 'rgba(255,210,63,0)'); g.addColorStop(0.5, s.color2); g.addColorStop(1, s.color);
      ctx.globalAlpha = 1 - k * 0.6; ctx.fillStyle = g; ctx.shadowColor = s.color; ctx.shadowBlur = 30;
      ctx.fillRect(z.x - w, G - 420, w * 2, 430);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = (1 - k); ctx.fillRect(z.x - w * 0.35, G - 420, w * 0.7, 430);
    } else if (z.kind === 'bolt') {
      const pts = z.pts; ctx.globalAlpha = (1 - k) * (Math.random() < 0.3 ? 0.5 : 1);
      ctx.beginPath(); ctx.moveTo(z.x + pts[0], -20);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(z.x + pts[i] * (i / pts.length < 0.9 ? 1 : 0), -20 + (G + 10) * i / (pts.length - 1));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = s.color; ctx.shadowBlur = 28; ctx.strokeStyle = s.color; ctx.lineWidth = 18 * (1 - k * 0.6); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * (1 - k * 0.6); ctx.stroke();
      glowDot(ctx, z.x, G - 6, z.radius * 1.3, s.color, 0.8 * (1 - k));
    } else if (z.kind === 'meteor') {
      glowDot(ctx, z.x, G - 30, z.radius * (0.9 + k * 1.2), s.color, 0.9 * (1 - k));
      glowDot(ctx, z.x, G - 30, z.radius * (0.5 + k * 0.6), '#fff3a0', 0.9 * (1 - k));
    } else if (z.kind === 'quake') {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = s.color2 || s.color; ctx.lineWidth = 14 * (1 - k) + 2;
      ctx.shadowColor = s.color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(z.x, G + 6, z.radius * Math.sqrt(k), 16 + k * 10, 0, 0, TAU); ctx.stroke();
      glowDot(ctx, z.x, G, z.radius * 0.5, s.color, 0.5 * (1 - k));
    }
    ctx.restore();
  },

  drawBeam(ctx, z) {
    const k = z.t / z.life;
    const env = k < 0.12 ? k / 0.12 : (k > 0.8 ? (1 - k) / 0.2 : 1);
    const h = z.thick * env * (0.92 + 0.08 * Math.sin(z.t * 70));
    const len = z.length * Math.min(1, z.t / 0.1);
    const s = z.spec;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(z.x, z.y); ctx.scale(z.dir, 1);
    ctx.shadowColor = s.color; ctx.shadowBlur = 40;
    ctx.globalAlpha = 0.45; ctx.fillStyle = s.color; ctx.fillRect(0, -h / 2, len, h);
    ctx.globalAlpha = 0.8; ctx.fillStyle = s.color2; ctx.fillRect(0, -h * 0.3, len, h * 0.6);
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(0, -h * 0.13, len, h * 0.26);
    ctx.shadowBlur = 0;
    glowDot(ctx, 0, 0, h * 0.8, s.color2, 0.9 * env);
    glowDot(ctx, len, 0, h * 0.5, s.color, 0.6 * env);
  },

  drawVisual(ctx, v) {
    const k = v.t / v.life;
    ctx.save(); ctx.translate(v.x, v.y); ctx.scale(v.facing, 1);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
    if (v.kind === 'slash') {
      const r = v.r * (0.75 + 0.45 * k);
      ctx.lineCap = 'round'; ctx.shadowColor = v.color; ctx.shadowBlur = 26;
      ctx.beginPath(); ctx.arc(-r * 0.4, 0, r, -1.1 + k * 0.6, 1.1 + k * 0.6);
      ctx.strokeStyle = v.color; ctx.lineWidth = 20 * (1 - k) + 2; ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * (1 - k) + 1; ctx.stroke();
    }
    ctx.restore();
  }
};
