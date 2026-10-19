/* ==========================================================
   arena.js
   3 arena bertema dunia digital:
     1. Digital Forest  – hutan digital, pohon bercahaya, kristal energi
     2. Cyber City      – kota neon, papan hologram, mobil terbang
     3. Volcano Core    – gunung berapi, lava, partikel api

   Teknik:
   - Layer statis digambar SEKALI ke canvas tersembunyi (cepat).
   - Elemen animasi (cahaya berdenyut, hujan, lava, hologram, dll.)
     digambar tiap frame di atasnya.
   - Parallax: tiap layer punya "depth"; makin besar, makin bergeser
     mengikuti posisi kamera (titik tengah kedua petarung).
   ========================================================== */
'use strict';

const FLOOR_Y = 525;              // garis atas lantai arena
const LAYER_W = GAME_W + 240;     // layer lebih lebar agar bisa digeser (parallax)
const LAYER_OFF = 120;            // setengah dari kelebihan lebar

// Pembangkit angka acak yang selalu sama untuk seed yang sama
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeLayer(w = LAYER_W, h = GAME_H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d') };
}

// Membuat objek arena dari daftar layer. back = di belakang petarung, front = di depan.
function makeArena(info, back, front, ambientUpdate) {
  return Object.assign(info, {
    back, front, ps: [],
    update(dt) { if (ambientUpdate) ambientUpdate(this, dt); },
    drawBack(ctx, t, cam) { drawItems(ctx, this.back, t, cam, this); },
    drawFront(ctx, t, cam) { drawItems(ctx, this.front, t, cam, this); }
  });
}
function drawItems(ctx, items, t, cam, arena) {
  for (const it of items) {
    if (it.img) ctx.drawImage(it.img, -LAYER_OFF - cam * it.depth, 0);
    else {
      ctx.save(); ctx.translate(-cam * (it.depth || 0), 0);
      it.dyn(ctx, t, arena); ctx.restore();
    }
  }
}

/* ==========================================================
   1) DIGITAL FOREST
   ========================================================== */
function buildForest() {
  const r = mulberry32(7);
  const canopies = [], crystals = [];

  // --- langit malam + bulan digital ---
  const sky = makeLayer(); {
    const g = sky.g, gr = g.createLinearGradient(0, 0, 0, FLOOR_Y);
    gr.addColorStop(0, '#050722'); gr.addColorStop(0.55, '#0b2a46'); gr.addColorStop(1, '#12665f');
    g.fillStyle = gr; g.fillRect(0, 0, LAYER_W, GAME_H);
    for (let i = 0; i < 150; i++) { g.fillStyle = `rgba(180,255,255,${0.25 + r() * 0.6})`; g.fillRect(r() * LAYER_W, r() * 300, r() * 1.6 + 0.4, r() * 1.6 + 0.4); }
    const mx = LAYER_W * 0.72, my = 125;
    let mg = g.createRadialGradient(mx, my, 20, mx, my, 170); mg.addColorStop(0, 'rgba(120,255,230,.55)'); mg.addColorStop(1, 'rgba(120,255,230,0)');
    g.fillStyle = mg; g.fillRect(mx - 180, my - 180, 360, 360);
    g.fillStyle = '#cffff4'; g.beginPath(); g.arc(mx, my, 52, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(53,240,255,.45)'; g.lineWidth = 2;
    for (const rr2 of [72, 92, 116]) { g.beginPath(); g.arc(mx, my, rr2, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(40,150,150,.35)'; g.beginPath(); g.arc(mx - 14, my - 8, 12, 0, TAU); g.arc(mx + 16, my + 14, 8, 0, TAU); g.fill();
  }

  // --- hutan jauh (siluet) ---
  const far = makeLayer(); {
    const g = far.g;
    for (let x = -20; x < LAYER_W + 40; x += 30 + r() * 14) {
      const h = 150 + r() * 120, w = 38 + r() * 20, base = FLOOR_Y + 12;
      g.fillStyle = '#082833';
      for (let tier = 0; tier < 3; tier++) {
        const ty = base - h * (0.25 + tier * 0.28), tw = w * (1 - tier * 0.25);
        g.beginPath(); g.moveTo(x - tw, ty + h * 0.3); g.lineTo(x, ty - h * 0.25); g.lineTo(x + tw, ty + h * 0.3); g.closePath(); g.fill();
      }
      g.fillStyle = '#082833'; g.fillRect(x - 4, base - 40, 8, 40);
      g.strokeStyle = 'rgba(53,240,255,.2)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, base - h * 1.02); g.lineTo(x + w * 0.25, base - h * 0.75); g.stroke();
    }
    const fog = g.createLinearGradient(0, FLOOR_Y - 200, 0, FLOOR_Y + 10);
    fog.addColorStop(0, 'rgba(20,160,150,0)'); fog.addColorStop(1, 'rgba(20,160,150,.35)');
    g.fillStyle = fog; g.fillRect(0, FLOOR_Y - 200, LAYER_W, 220);
  }

  // --- pohon tengah bercahaya dengan jalur sirkuit ---
  const mid = makeLayer(); {
    const g = mid.g, n = 8;
    for (let i = 0; i < n; i++) {
      const x = 90 + i * (LAYER_W - 180) / (n - 1) + (r() - 0.5) * 40, tw = 40 + r() * 20, top = 230 + r() * 40;
      const gr = g.createLinearGradient(x - tw, 0, x + tw, 0); gr.addColorStop(0, '#0a1a28'); gr.addColorStop(0.5, '#164256'); gr.addColorStop(1, '#0a1a28');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - tw, FLOOR_Y + 14); g.lineTo(x - tw * 0.6, top); g.lineTo(x + tw * 0.6, top); g.lineTo(x + tw, FLOOR_Y + 14); g.closePath(); g.fill();
      // jalur sirkuit di batang
      g.strokeStyle = 'rgba(53,240,255,.75)'; g.lineWidth = 2; g.fillStyle = '#35f0ff';
      let cx = x - tw * 0.2, cy = FLOOR_Y; g.beginPath(); g.moveTo(cx, cy);
      while (cy > top + 20) { cy -= 30 + r() * 40; g.lineTo(cx, cy); if (r() < 0.6) { cx += (r() - 0.5) * tw * 0.7; g.lineTo(cx, cy); } }
      g.stroke(); g.beginPath(); g.arc(cx, cy, 4, 0, TAU); g.fill();
      // kanopi bercahaya
      for (let k = 0; k < 5; k++) {
        const bx = x + (r() - 0.5) * 120, by = top - 20 + (r() - 0.5) * 70, br = 55 + r() * 40;
        const cg = g.createRadialGradient(bx, by, 4, bx, by, br);
        cg.addColorStop(0, 'rgba(110,255,190,.85)'); cg.addColorStop(0.55, 'rgba(30,190,150,.55)'); cg.addColorStop(1, 'rgba(10,100,110,0)');
        g.fillStyle = cg; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
      }
      canopies.push({ x: x - LAYER_OFF, y: top - 20, ph: r() * 6 });
    }
  }

  // --- lantai grid digital + kristal energi ---
  const floor = makeLayer(); {
    const g = floor.g, gr = g.createLinearGradient(0, FLOOR_Y, 0, GAME_H);
    gr.addColorStop(0, '#0a3338'); gr.addColorStop(0.3, '#06202a'); gr.addColorStop(1, '#02070c');
    g.fillStyle = gr; g.fillRect(0, FLOOR_Y, LAYER_W, GAME_H - FLOOR_Y);
    g.strokeStyle = 'rgba(53,240,255,.22)'; g.lineWidth = 1.5;
    for (let i = -26; i <= 26; i++) { g.beginPath(); g.moveTo(LAYER_W / 2 + i * 55, FLOOR_Y); g.lineTo(LAYER_W / 2 + i * 55 * 3.4, GAME_H); g.stroke(); }
    for (let j = 1; j < 9; j++) { const y = FLOOR_Y + j * j * 1.9 + j * 4; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(LAYER_W, y); g.stroke(); g.globalAlpha = 1; }
    g.shadowColor = '#35f0ff'; g.shadowBlur = 14; g.strokeStyle = '#35f0ff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, FLOOR_Y); g.lineTo(LAYER_W, FLOOR_Y); g.stroke(); g.shadowBlur = 0;
    // kristal energi
    for (const cxp of [150, 430, 840, 1150, 1380]) {
      const col = r() < 0.5 ? ['#35f0ff', '#b8fbff'] : ['#a63cff', '#e0b8ff'];
      for (let k = 0; k < 4; k++) {
        const bx = cxp + (k - 1.5) * 16, h = 34 + r() * 52 - Math.abs(k - 1.5) * 8;
        g.fillStyle = col[0]; g.beginPath(); g.moveTo(bx - 9, FLOOR_Y + 8); g.lineTo(bx - 3, FLOOR_Y + 8 - h); g.lineTo(bx + 6, FLOOR_Y + 8 - h * 0.85); g.lineTo(bx + 10, FLOOR_Y + 8); g.closePath(); g.fill();
        g.fillStyle = col[1]; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(bx - 3, FLOOR_Y + 8 - h); g.lineTo(bx + 1, FLOOR_Y + 8); g.lineTo(bx - 9, FLOOR_Y + 8); g.closePath(); g.fill(); g.globalAlpha = 1;
      }
      crystals.push({ x: cxp - LAYER_OFF, y: FLOOR_Y - 20, c: col[0] });
    }
  }

  // --- batang pohon besar di tepi layar (depan) ---
  const fg = makeLayer(); {
    const g = fg.g;
    for (const side of [0, 1]) {
      const x0 = side ? LAYER_W : 0, d = side ? -1 : 1;
      g.fillStyle = '#030a10'; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + d * 190, 0); g.quadraticCurveTo(x0 + d * 120, 280, x0 + d * 170, GAME_H); g.lineTo(x0, GAME_H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(53,240,255,.55)'; g.lineWidth = 2.5; g.shadowColor = '#35f0ff'; g.shadowBlur = 10;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 + d * (40 + k * 22), 0); g.bezierCurveTo(x0 + d * (80 + k * 10), 160, x0 + d * (30 + k * 20), 300, x0 + d * (90 + k * 14), GAME_H); g.stroke(); }
      g.shadowBlur = 0;
      const sh = g.createLinearGradient(x0, 0, x0 + d * 260, 0); sh.addColorStop(0, 'rgba(0,0,0,.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sh; g.fillRect(Math.min(x0, x0 + d * 260), 0, 260, GAME_H);
    }
  }

  const rain = []; for (let i = 0; i < 28; i++) rain.push({ x: r() * GAME_W, sp: 40 + r() * 90, ph: r() * 800, len: 6 + Math.floor(r() * 5) });
  const CH = '01ABCDEF<>/{}#';

  const back = [
    { img: sky.c, depth: 0 },
    { depth: 0.01, dyn(ctx, t) {            // hujan kode digital
      ctx.font = '15px monospace'; ctx.textAlign = 'center';
      for (const c of rain) {
        const y0 = (t * c.sp + c.ph) % (GAME_H + 200);
        for (let k = 0; k < c.len; k++) {
          ctx.fillStyle = `rgba(90,255,200,${(1 - k / c.len) * 0.28})`;
          ctx.fillText(CH[(k * 7 + Math.floor(c.x) + Math.floor(t * 2)) % CH.length], c.x, y0 - k * 17);
        }
      }
    } },
    { img: far.c, depth: 0.02 },
    { img: mid.c, depth: 0.05 },
    { depth: 0.05, dyn(ctx, t) {            // cahaya kanopi berdenyut
      for (const c of canopies) glowDot(ctx, c.x, c.y, 120, '#4dffc0', 0.16 + 0.1 * Math.sin(t * 1.6 + c.ph));
    } },
    { img: floor.c, depth: 0 },
    { depth: 0, dyn(ctx, t) {               // kristal berpendar
      crystals.forEach((c, i) => glowDot(ctx, c.x, c.y, 80, c.c, 0.35 + 0.2 * Math.sin(t * 2.2 + i)));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#35f0ff'; ctx.fillRect(0, FLOOR_Y + ((t * 40) % 115), GAME_W, 3); ctx.restore();
    } }
  ];
  const front = [
    { img: fg.c, depth: 0.1 },
    { depth: 0, dyn(ctx, t, a) {            // kunang-kunang digital
      for (const f of a.ps) {
        const al = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + f.ph));
        glowDot(ctx, f.x + Math.sin(t * f.sp + f.ph) * 30, f.y + Math.cos(t * f.sp * 0.8 + f.ph) * 20, 9, '#d6ff6a', al);
      }
    } }
  ];
  const arena = makeArena({ id: 'forest', name: 'Digital Forest', theme: 'forest', desc: 'Hutan digital dengan pohon bercahaya, hujan kode, dan kristal energi.' }, back, front);
  for (let i = 0; i < 34; i++) arena.ps.push({ x: r() * GAME_W, y: 160 + r() * 380, ph: r() * 10, sp: 0.6 + r() });
  return arena;
}

/* ==========================================================
   2) CYBER CITY
   ========================================================== */
function buildCity() {
  const r = mulberry32(21);
  const boards = [], antennas = [];

  // --- langit synthwave + matahari bergaris ---
  const sky = makeLayer(); {
    const g = sky.g, gr = g.createLinearGradient(0, 0, 0, FLOOR_Y);
    gr.addColorStop(0, '#0b0224'); gr.addColorStop(0.5, '#3a0a6e'); gr.addColorStop(1, '#ff2e93');
    g.fillStyle = gr; g.fillRect(0, 0, LAYER_W, GAME_H);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; g.fillRect(r() * LAYER_W, r() * 260, 1.4, 1.4); }
    const sc = makeLayer(300, 300), sg = sc.g, sgr = sg.createLinearGradient(0, 20, 0, 280);
    sgr.addColorStop(0, '#ffe14a'); sgr.addColorStop(1, '#ff2e93');
    sg.fillStyle = sgr; sg.beginPath(); sg.arc(150, 150, 130, 0, TAU); sg.fill();
    sg.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 7; k++) sg.fillRect(0, 160 + k * 18, 300, 2 + k * 1.6);
    g.drawImage(sc.c, LAYER_W / 2 - 150, 230);
    const hz = g.createLinearGradient(0, FLOOR_Y - 120, 0, FLOOR_Y); hz.addColorStop(0, 'rgba(255,46,147,0)'); hz.addColorStop(1, 'rgba(255,120,200,.4)');
    g.fillStyle = hz; g.fillRect(0, FLOOR_Y - 120, LAYER_W, 120);
  }

  const buildings = (layer, wMin, wMax, hMin, hMax, fill, neon, winAlpha) => {
    const g = layer.g; let x = -30;
    while (x < LAYER_W + 20) {
      const w = wMin + r() * (wMax - wMin), h = hMin + r() * (hMax - hMin), top = FLOOR_Y + 12 - h;
      g.fillStyle = fill; g.fillRect(x, top, w, h);
      if (neon) {
        const col = r() < 0.5 ? '#35f0ff' : '#ff2d95';
        g.save(); g.shadowColor = col; g.shadowBlur = 14; g.strokeStyle = col; g.lineWidth = 2.5; g.strokeRect(x + 1, top, w - 2, h); g.restore();
      }
      const cols = Math.floor(w / 16), rows = Math.floor(h / 22);
      for (let cx = 0; cx < cols; cx++) for (let cy = 1; cy < rows; cy++) {
        if (r() < winAlpha) {
          const c = r(); g.fillStyle = c < 0.5 ? '#35f0ff' : (c < 0.8 ? '#ffe14a' : '#ff6ad5'); g.globalAlpha = 0.35 + r() * 0.5;
          g.fillRect(x + 6 + cx * 16, top + 10 + cy * 22, 7, 10);
        }
      }
      g.globalAlpha = 1;
      if (neon && r() < 0.5) { g.fillStyle = '#222'; g.fillRect(x + w / 2 - 1.5, top - 40, 3, 40); antennas.push({ x: x + w / 2 - LAYER_OFF, y: top - 40, ph: r() * 5 }); }
      x += w + 6 + r() * 10;
    }
  };
  const far = makeLayer(); buildings(far, 40, 90, 120, 290, '#1b0a40', false, 0.18);
  const mid = makeLayer(); buildings(mid, 100, 170, 230, 410, '#0e0526', true, 0.4);
  // papan hologram (posisi layar) di tiga titik
  boards.push({ x: 150, y: 150, w: 150, h: 92, c: '#35f0ff', txt: 'DIGI-NET' });
  boards.push({ x: 560, y: 110, w: 170, h: 100, c: '#ff2d95', txt: 'ARENA' });
  boards.push({ x: 1000, y: 160, w: 150, h: 92, c: '#a63cff', txt: 'NEO-TOKYO' });

  // --- jalan neon ---
  const floor = makeLayer(); {
    const g = floor.g, gr = g.createLinearGradient(0, FLOOR_Y, 0, GAME_H);
    gr.addColorStop(0, '#1b0a40'); gr.addColorStop(0.25, '#0d0524'); gr.addColorStop(1, '#03010a');
    g.fillStyle = gr; g.fillRect(0, FLOOR_Y, LAYER_W, GAME_H - FLOOR_Y);
    // pantulan neon di aspal
    for (let i = 0; i < 18; i++) {
      const x = r() * LAYER_W, c = r() < 0.5 ? '53,240,255' : '255,45,149', rg = g.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 90);
      rg.addColorStop(0, `rgba(${c},.35)`); rg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = rg; g.fillRect(x, FLOOR_Y, 8 + r() * 14, 90);
    }
    g.strokeStyle = 'rgba(166,60,255,.35)'; g.lineWidth = 1.5;
    for (let i = -26; i <= 26; i++) { g.beginPath(); g.moveTo(LAYER_W / 2 + i * 55, FLOOR_Y); g.lineTo(LAYER_W / 2 + i * 55 * 3.4, GAME_H); g.stroke(); }
    for (let j = 1; j < 9; j++) { const y = FLOOR_Y + j * j * 1.9 + j * 4; g.beginPath(); g.moveTo(0, y); g.lineTo(LAYER_W, y); g.stroke(); }
    g.shadowColor = '#ff2d95'; g.shadowBlur = 16; g.strokeStyle = '#ff2d95'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, FLOOR_Y); g.lineTo(LAYER_W, FLOOR_Y); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(53,240,255,.7)'; g.lineWidth = 3; g.setLineDash([36, 28]);
    g.beginPath(); g.moveTo(0, FLOOR_Y + 62); g.lineTo(LAYER_W, FLOOR_Y + 62); g.stroke(); g.setLineDash([]);
  }

  // --- tiang lampu neon di tepi (depan) ---
  const fg = makeLayer(); {
    const g = fg.g;
    for (const px of [70, LAYER_W - 70]) {
      g.fillStyle = '#05020f'; g.fillRect(px - 8, 120, 16, GAME_H - 120);
      g.fillStyle = '#05020f'; g.fillRect(px - 36 * Math.sign(px - LAYER_W / 2) * -1 - 2, 120, 36, 10);
      const lx = px + (px < LAYER_W / 2 ? 34 : -34);
      g.save(); g.shadowColor = '#35f0ff'; g.shadowBlur = 28; g.fillStyle = '#b8fbff'; g.fillRect(lx - 16, 128, 32, 8); g.restore();
      const cone = g.createLinearGradient(0, 136, 0, 520); cone.addColorStop(0, 'rgba(53,240,255,.25)'); cone.addColorStop(1, 'rgba(53,240,255,0)');
      g.fillStyle = cone; g.beginPath(); g.moveTo(lx - 14, 136); g.lineTo(lx + 14, 136); g.lineTo(lx + 90, 520); g.lineTo(lx - 90, 520); g.closePath(); g.fill();
    }
  }

  const cars = []; for (let i = 0; i < 5; i++) cars.push({ x: r() * GAME_W, y: 90 + r() * 190, sp: (40 + r() * 90) * (r() < 0.5 ? 1 : -1), c: r() < 0.5 ? '#35f0ff' : '#ff2d95' });
  const drops = []; for (let i = 0; i < 90; i++) drops.push({ x: r() * GAME_W, y: r() * GAME_H, sp: 700 + r() * 400 });

  const back = [
    { img: sky.c, depth: 0 },
    { depth: 0.03, dyn(ctx, t) {             // mobil terbang
      for (const c of cars) {
        const x = ((c.x + t * c.sp) % (GAME_W + 200) + GAME_W + 200) % (GAME_W + 200) - 100, d = Math.sign(c.sp);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const tr = ctx.createLinearGradient(x, 0, x - d * 90, 0); tr.addColorStop(0, c.c); tr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tr; ctx.fillRect(Math.min(x, x - d * 90), c.y - 2, 90, 4);
        ctx.restore(); glowDot(ctx, x, c.y, 14, c.c, 0.9);
        ctx.fillStyle = '#0d0524'; ctx.fillRect(x - 12, c.y - 4, 24, 7);
      }
    } },
    { img: far.c, depth: 0.02 },
    { img: mid.c, depth: 0.05 },
    { depth: 0.05, dyn(ctx, t) {             // hologram + lampu antena
      for (const a of antennas) { if (Math.sin(t * 3 + a.ph) > 0.3) glowDot(ctx, a.x, a.y, 14, '#ff2d55', 0.9); }
      for (const b of boards) {
        const fl = Math.sin(t * 25 + b.x) > 0.93 ? 0.4 : 1;
        ctx.save(); ctx.globalAlpha = 0.85 * fl; ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(10,20,40,.55)'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = b.c; ctx.lineWidth = 2; ctx.shadowColor = b.c; ctx.shadowBlur = 16; ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0; ctx.fillStyle = b.c; ctx.font = 'bold 18px Orbitron, monospace'; ctx.textAlign = 'center';
        ctx.fillText(b.txt, b.x + b.w / 2, b.y + 28);
        for (let i = 0; i < 6; i++) { const hh = 8 + (Math.sin(t * 3 + i + b.x) * 0.5 + 0.5) * (b.h - 54); ctx.fillRect(b.x + 14 + i * ((b.w - 28) / 6), b.y + b.h - 10 - hh, ((b.w - 28) / 6) - 5, hh); }
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff'; ctx.fillRect(b.x, b.y + ((t * 40) % b.h), b.w, 2);
        ctx.restore();
        glowDot(ctx, b.x + b.w / 2, b.y + b.h / 2, b.w, b.c, 0.12);
      }
    } },
    { img: floor.c, depth: 0 },
    { depth: 0, dyn(ctx, t) {                // garis pindai di jalan
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12; ctx.fillStyle = '#ff2d95';
      ctx.fillRect(0, FLOOR_Y + ((t * 60) % 115), GAME_W, 3); ctx.restore();
    } }
  ];
  const front = [
    { img: fg.c, depth: 0.1 },
    { depth: 0, dyn(ctx, t) {                // hujan neon
      ctx.save(); ctx.strokeStyle = 'rgba(150,220,255,.28)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const d of drops) { const y = (d.y + t * d.sp) % (GAME_H + 40) - 20, x = d.x - y * 0.12; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 16); }
      ctx.stroke(); ctx.restore();
    } }
  ];
  return makeArena({ id: 'city', name: 'Cyber City', theme: 'city', desc: 'Kota futuristik dengan gedung neon, papan hologram, dan mobil terbang.' }, back, front);
}

/* ==========================================================
   3) VOLCANO CORE
   ========================================================== */
function buildVolcano() {
  const r = mulberry32(33);
  const cracks = [], crater = { x: LAYER_W * 0.5 - LAYER_OFF, y: 150 };

  // --- langit merah + gunung berapi besar ---
  const sky = makeLayer(); {
    const g = sky.g, gr = g.createLinearGradient(0, 0, 0, FLOOR_Y);
    gr.addColorStop(0, '#12030a'); gr.addColorStop(0.55, '#4a0a12'); gr.addColorStop(1, '#d4430c');
    g.fillStyle = gr; g.fillRect(0, 0, LAYER_W, GAME_H);
    const cx = LAYER_W * 0.5;
    g.fillStyle = '#1a0806'; g.beginPath(); g.moveTo(cx - 430, FLOOR_Y + 14);
    g.bezierCurveTo(cx - 300, 400, cx - 190, 220, cx - 90, 150); g.lineTo(cx + 90, 150);
    g.bezierCurveTo(cx + 190, 220, cx + 300, 400, cx + 430, FLOOR_Y + 14); g.closePath(); g.fill();
    // kawah bercahaya
    const cg = g.createRadialGradient(cx, 150, 5, cx, 150, 130); cg.addColorStop(0, 'rgba(255,230,120,.95)'); cg.addColorStop(0.4, 'rgba(255,100,20,.7)'); cg.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = cg; g.fillRect(cx - 140, 20, 280, 260);
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(cx, 152, 90, 12, 0, 0, TAU); g.fill();
    // aliran lava di lereng
    g.lineCap = 'round'; g.shadowColor = '#ff7a1a'; g.shadowBlur = 14;
    for (let k = 0; k < 6; k++) {
      const sx = cx + (k - 2.5) * 38; g.strokeStyle = `rgba(255,${110 + r() * 80},30,.85)`; g.lineWidth = 3 + r() * 3;
      g.beginPath(); g.moveTo(sx, 156); g.bezierCurveTo(sx + (r() - 0.5) * 80, 260, sx + (r() - 0.5) * 120, 360, sx * 1.12 - cx * 0.12 + (r() - 0.5) * 60, FLOOR_Y); g.stroke();
    }
    g.shadowBlur = 0;
  }
  const far = makeLayer(); {
    const g = far.g; g.fillStyle = '#2a0b0a'; g.beginPath(); g.moveTo(0, FLOOR_Y + 14);
    for (let x = 0; x <= LAYER_W + 40; x += 45) g.lineTo(x, FLOOR_Y - 60 - r() * 130 + (Math.abs(x - LAYER_W / 2) > 400 ? -40 : 30));
    g.lineTo(LAYER_W, FLOOR_Y + 14); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,120,40,.35)'; g.lineWidth = 2; g.stroke();
  }
  const mid = makeLayer(); {
    const g = mid.g;
    for (let i = 0; i < 9; i++) {
      const x = 60 + i * (LAYER_W - 120) / 8 + (r() - 0.5) * 50, w = 70 + r() * 50, h = 160 + r() * 150;
      g.fillStyle = '#190807'; g.beginPath(); g.moveTo(x - w, FLOOR_Y + 14); g.lineTo(x - w * 0.25, FLOOR_Y - h); g.lineTo(x + w * 0.1, FLOOR_Y - h * 0.8); g.lineTo(x + w * 0.35, FLOOR_Y - h * 0.95); g.lineTo(x + w, FLOOR_Y + 14); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,140,50,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - w * 0.25, FLOOR_Y - h); g.lineTo(x - w * 0.9, FLOOR_Y + 10); g.stroke();
      g.save(); g.shadowColor = '#ff7a1a'; g.shadowBlur = 10; g.strokeStyle = '#ff9a2a'; g.lineWidth = 2; g.beginPath();
      let cx2 = x, cy2 = FLOOR_Y - h * 0.8; g.moveTo(cx2, cy2); for (let k = 0; k < 5; k++) { cx2 += (r() - 0.5) * 24; cy2 += 24 + r() * 26; g.lineTo(cx2, cy2); } g.stroke(); g.restore();
    }
  }
  const floor = makeLayer(); {
    const g = floor.g, gr = g.createLinearGradient(0, FLOOR_Y, 0, GAME_H);
    gr.addColorStop(0, '#3a1208'); gr.addColorStop(0.3, '#1a0a08'); gr.addColorStop(1, '#070202');
    g.fillStyle = gr; g.fillRect(0, FLOOR_Y, LAYER_W, GAME_H - FLOOR_Y);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    for (let j = 1; j < 8; j++) { const y = FLOOR_Y + j * j * 1.9 + j * 4; g.beginPath(); g.moveTo(0, y); g.lineTo(LAYER_W, y); g.stroke(); }
    g.save(); g.shadowColor = '#ff6a1a'; g.shadowBlur = 12; g.strokeStyle = '#ff8a2a'; g.lineWidth = 2.5; g.lineJoin = 'round';
    for (let i = 0; i < 14; i++) {
      let x = r() * LAYER_W, y = FLOOR_Y + 8 + r() * 20; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 120; y += 10 + r() * 22; g.lineTo(x, y); if (k === 2) cracks.push({ x: x - LAYER_OFF, y }); }
      g.stroke();
    }
    g.restore();
    g.shadowColor = '#ff6a1a'; g.shadowBlur = 16; g.strokeStyle = '#ff6a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, FLOOR_Y); g.lineTo(LAYER_W, FLOOR_Y); g.stroke(); g.shadowBlur = 0;
  }
  const fg = makeLayer(); {
    const g = fg.g;
    for (const side of [0, 1]) {
      const x0 = side ? LAYER_W : 0, d = side ? -1 : 1;
      g.fillStyle = '#0a0302'; g.beginPath(); g.moveTo(x0, 250); g.lineTo(x0 + d * 60, 330); g.lineTo(x0 + d * 110, 300); g.lineTo(x0 + d * 160, 420); g.lineTo(x0 + d * 150, GAME_H); g.lineTo(x0, GAME_H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,120,40,.7)'; g.lineWidth = 2.5; g.shadowColor = '#ff7a1a'; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0;
    }
  }

  const embers = []; for (let i = 0; i < 70; i++) embers.push({ x: r() * GAME_W, y: r() * GAME_H, sp: 25 + r() * 60, sz: 1 + r() * 2.2, ph: r() * 10 });
  const smoke = []; for (let i = 0; i < 8; i++) smoke.push({ x: r() * GAME_W, y: 40 + r() * 140, rx: 130 + r() * 120, ry: 28 + r() * 24, sp: 6 + r() * 12 });

  const back = [
    { img: sky.c, depth: 0 },
    { depth: 0.01, dyn(ctx, t) {                 // asap bergerak
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#1a0605';
      for (const s of smoke) { const x = ((s.x - t * s.sp) % (GAME_W + 400) + GAME_W + 400) % (GAME_W + 400) - 200; ctx.beginPath(); ctx.ellipse(x, s.y, s.rx, s.ry, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    } },
    { depth: 0.015, dyn(ctx, t, a) {             // letusan gunung
      glowDot(ctx, crater.x + 0, crater.y, 160, '#ff7a1a', 0.3 + 0.12 * Math.sin(t * 3));
      for (const p of a.ps) { if (p.kind !== 'lava') continue; ctx.fillStyle = p.hot ? '#ffe28a' : '#ff6a1a'; ctx.globalAlpha = clamp(p.life * 1.2, 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    } },
    { img: far.c, depth: 0.03 },
    { img: mid.c, depth: 0.06 },
    { depth: 0, dyn(ctx, t) {                    // sungai lava
      const y0 = FLOOR_Y - 34;
      const g = ctx.createLinearGradient(0, y0, 0, FLOOR_Y + 2); g.addColorStop(0, '#ff9a2a'); g.addColorStop(0.5, '#ff4a0a'); g.addColorStop(1, '#a01a04');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, FLOOR_Y + 2);
      for (let x = 0; x <= GAME_W + 10; x += 10) ctx.lineTo(x, y0 + Math.sin(x * 0.03 + t * 1.6) * 3 + Math.sin(x * 0.011 - t) * 3);
      ctx.lineTo(GAME_W, FLOOR_Y + 2); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,230,120,.5)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); for (let x = 0; x <= GAME_W; x += 12) { const y = y0 + 10 + k * 7 + Math.sin(x * 0.04 + t * 2 + k * 2) * 2.5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const bx = (i * 227 + t * 20) % GAME_W, ph = (t * 0.7 + i * 0.37) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(bx, y0 + 16, 3 + ph * 8, 0, TAU); ctx.stroke(); }
      ctx.restore();
      glowDot(ctx, GAME_W / 2, FLOOR_Y - 14, 700, '#ff5a10', 0.12);
    } },
    { img: floor.c, depth: 0 },
    { depth: 0, dyn(ctx, t) {                    // retakan lantai berdenyut
      cracks.forEach((c, i) => glowDot(ctx, c.x, c.y, 60, '#ff7a1a', 0.3 + 0.25 * Math.sin(t * 2.4 + i * 1.3)));
    } }
  ];
  const front = [
    { img: fg.c, depth: 0.1 },
    { depth: 0, dyn(ctx, t) {                    // bara api melayang + kabut panas
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        const y = ((e.y - t * e.sp) % (GAME_H + 20) + GAME_H + 20) % (GAME_H + 20), x = e.x + Math.sin(t * 1.5 + e.ph) * 24;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + e.ph); ctx.fillStyle = e.sz > 2 ? '#ffd23f' : '#ff6a1a';
        ctx.beginPath(); ctx.arc(x, y, e.sz, 0, TAU); ctx.fill();
      }
      ctx.restore();
      const hz = ctx.createLinearGradient(0, GAME_H - 160, 0, GAME_H);
      hz.addColorStop(0, 'rgba(255,90,20,0)'); hz.addColorStop(1, `rgba(255,90,20,${0.16 + 0.05 * Math.sin(t * 2)})`);
      ctx.fillStyle = hz; ctx.fillRect(0, GAME_H - 160, GAME_W, 160);
    } }
  ];
  // ambient: percikan lava dari kawah
  return makeArena({ id: 'volcano', name: 'Volcano Core', theme: 'volcano', desc: 'Inti gunung berapi dengan sungai lava, letusan, dan hujan bara api.' }, back, front, (a, dt) => {
    a.eruptT = (a.eruptT || 0) - dt;
    if (a.eruptT <= 0) {
      a.eruptT = 2.2 + Math.random() * 2;
      for (let i = 0; i < 26; i++) a.ps.push({ kind: 'lava', x: crater.x + rand(-60, 60), y: crater.y, vx: rand(-130, 130), vy: -rand(220, 480), life: rand(1.2, 2.4), sz: rand(2.5, 6), hot: Math.random() < 0.4 });
    }
    for (const p of a.ps) { p.life -= dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    a.ps = a.ps.filter(p => p.life > 0 && p.y < FLOOR_Y - 20);
  });
}

/* ==========================================================
   Pengelola arena
   ========================================================== */
const Arena = {
  list: [],
  current: null,

  init() {
    this.list = [buildForest(), buildCity(), buildVolcano()];
    this.current = this.list[0];
  },
  get(id) { return this.list.find(a => a.id === id) || this.list[0]; },
  use(id) { this.current = this.get(id); },
  update(dt) { if (this.current) this.current.update(dt); },
  drawBack(ctx, t, cam) { this.current.drawBack(ctx, t, cam); },
  drawFront(ctx, t, cam) { this.current.drawFront(ctx, t, cam); },

  // Gambar versi kecil untuk kartu pilih arena
  drawPreview(ctx, arena, w, h, t) {
    ctx.save(); ctx.scale(w / GAME_W, h / GAME_H);
    arena.drawBack(ctx, t, 0); arena.drawFront(ctx, t, 0);
    ctx.restore();
  }
};
