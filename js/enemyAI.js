/* ==========================================================
   enemyAI.js
   AI lawan. AI memakai "tombol virtual" yang SAMA dengan pemain
   (fighter.ctrl), jadi aturan permainannya benar-benar adil.

   Setiap beberapa persepuluh detik (waktu reaksi), AI memutuskan:
     - bertahan (guard) jika lawan sedang menyerang / ada proyektil
     - memakai ultimate bila energi penuh dan lawan dalam jangkauan
     - memakai skill yang siap & jaraknya pas
     - mendekat, menyerang, atau mundur
   Tingkat kesulitan mengubah kecepatan reaksi, agresivitas, dan
   peluang bertahan.
   ========================================================== */
'use strict';

const AI_LEVELS = {
  //          reaksi  agresif  tahan   skill  lompat
  easy:   { react: 0.50, aggr: 0.45, block: 0.12, skill: 0.35, jump: 0.05 },
  normal: { react: 0.30, aggr: 0.68, block: 0.35, skill: 0.55, jump: 0.10 },
  hard:   { react: 0.16, aggr: 0.88, block: 0.62, skill: 0.78, jump: 0.15 }
};

class EnemyAI {
  constructor(level) {
    Object.assign(this, AI_LEVELS[level] || AI_LEVELS.normal);
    this.timer = rand(0.3, 0.8);   // jeda sebelum keputusan pertama
    this.intent = 'idle';          // niat saat ini: approach | retreat | guard | hop | strafe | idle
    this.intentT = 0;
    this.strafeDir = 1;
  }

  update(dt, me, foe, game) {
    const c = me.ctrl;
    // reset semua tombol tiap frame
    c.left = c.right = c.guard = false;
    c.jump = c.attack = c.skill1 = c.skill2 = c.skill3 = c.ult = false;
    if (me.state === 'ko' || foe.state === 'ko') return;
    if (me.action || me.hurtTimer > 0) return;      // sedang sibuk

    this.timer -= dt; this.intentT -= dt;
    const dx = foe.x - me.x, dist = Math.abs(dx), dir = Math.sign(dx) || 1;

    if (this.timer <= 0 && this.intentT <= 0) {
      this.timer = this.react * rand(0.7, 1.3);
      this.decide(me, foe, game, dist, dir);
    }

    // jalankan niat yang sedang aktif
    const atkRange = me.char.skills.attack.range;
    switch (this.intent) {
      case 'approach':
        if (dist > atkRange - 25) { dir > 0 ? c.right = true : c.left = true; }
        break;
      case 'retreat':
        if ((me.x < WALL_L + 90 && dir > 0) || (me.x > WALL_R - 90 && dir < 0)) {   // terpojok -> lompati lawan
          if (this.intentT > 0.2 && me.onGround()) { c.jump = true; dir > 0 ? c.right = true : c.left = true; }
        } else { dir > 0 ? c.left = true : c.right = true; }
        break;
      case 'guard': c.guard = true; break;
      case 'hop':
        if (me.onGround() && this.intentT > 0.1) c.jump = true;
        break;
      case 'strafe':
        this.strafeDir > 0 ? c.right = true : c.left = true; break;
    }
  }

  decide(me, foe, game, dist, dir) {
    const c = me.ctrl, sk = me.char.skills;
    this.intent = 'idle';

    // 1) Bertahan jika lawan sedang menyerang dari dekat
    if (foe.action && dist < (foe.action.skill.range || 260) + 120 && Math.random() < this.block) {
      this.intent = 'guard'; this.intentT = rand(0.3, 0.6); return;
    }
    // 2) Ada proyektil mendekat -> lompat atau tahan
    const incoming = game.projectiles.find(p => p.owner === foe && !p.dead && p.wait <= 0 &&
      Math.abs(p.x - me.x) < 340 && Math.sign(p.vx) === Math.sign(me.x - p.x));
    if (incoming && Math.random() < this.block + 0.2) {
      if (Math.random() < 0.5 && me.onGround() && incoming.r < 100) { this.intent = 'hop'; this.intentT = 0.5; c.jump = true; }
      else { this.intent = 'guard'; this.intentT = 0.5; }
      return;
    }
    // 3) HP rendah -> kadang mundur
    if (me.hp / me.maxHp < 0.25 && Math.random() < 0.3) { this.intent = 'retreat'; this.intentT = 0.7; return; }

    // 4) Ultimate
    const u = sk.ult;
    if (me.energy >= 100 && dist >= u.ai[0] && dist <= u.ai[1] && Math.random() < 0.85) { c.ult = true; return; }

    // 5) Skill khusus
    if (Math.random() < this.skill) {
      const keys = ['skill1', 'skill2', 'skill3'].sort(() => Math.random() - 0.5);
      for (const k of keys) {
        const s = sk[k];
        if (me.cooldowns[k] > 0) continue;
        if (s.type === 'buff') {
          const buffed = me.buffs.some(b => b.name === s.name);
          if (!buffed && (s.atkMult || me.hp / me.maxHp < 0.8)) { c[k] = true; return; }
          continue;
        }
        if (s.ai && dist >= s.ai[0] && dist <= s.ai[1]) { c[k] = true; return; }
      }
    }

    // 6) Serangan normal / bergerak
    const range = sk.attack.range;
    if (dist < range - 5) {
      if (me.cooldowns.attack <= 0 && Math.random() < this.aggr + 0.2) c.attack = true;
      else if (Math.random() < 0.3) { this.intent = 'retreat'; this.intentT = rand(0.2, 0.45); }
      else if (Math.random() < 0.3) { this.intent = 'guard'; this.intentT = rand(0.2, 0.4); }
    } else {
      if (Math.random() < this.aggr) {
        this.intent = 'approach'; this.intentT = rand(0.15, 0.35);
        if (Math.random() < this.jump && me.onGround()) c.jump = true;
      } else {
        this.intent = 'strafe'; this.strafeDir = Math.random() < 0.5 ? 1 : -1; this.intentT = rand(0.2, 0.5);
      }
    }
  }
}
