/* ==========================================================
   characters.js
   Data 6 monster + cara menggambarnya dengan Canvas
   (tidak butuh file gambar: semua dibuat dari bentuk geometris).

   Koordinat gambar karakter:
     - kaki berada di (0, 0), tubuh ke arah y NEGATIF (atas)
     - karakter menghadap ke kanan (+x); arah kiri dibalik otomatis
   "pose" berisi info animasi: t, bob, step, wind, thrust, air, ko, ...
   Daftar skill (skills.js) menempel ke setiap karakter saat game dimuat.
   ========================================================== */
'use strict';

const OUTLINE = '#12061f';

/* ---------- Helper menggambar bentuk ---------- */
function shapeFill(ctx, fill) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.stroke();
}
function ell(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); shapeFill(ctx, fill);
}
function poly(ctx, pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath(); shapeFill(ctx, fill);
}
function rr(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); shapeFill(ctx, fill);
}
// Anggota badan: garis tebal berujung bulat dengan outline
function limb(ctx, x1, y1, x2, y2, w, fill) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = w + 6; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke(); ctx.restore();
}
function line(ctx, pts, color, w) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
// Api kecil bergoyang
function flame(ctx, x, y, s, t) {
  ctx.save(); ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 18;
  const cols = ['#ff3a1a', '#ffb020', '#fff3a0'], sc = [1, 0.68, 0.38];
  for (let i = 0; i < 3; i++) {
    const k = sc[i] * s, sway = Math.sin(t * 13 + i * 2) * 3;
    ctx.beginPath(); ctx.moveTo(x - k * 0.7, y + k * 0.5);
    ctx.quadraticCurveTo(x - k * 0.9, y - k * 0.6, x + sway, y - k * 1.9);
    ctx.quadraticCurveTo(x + k * 0.9, y - k * 0.6, x + k * 0.7, y + k * 0.5);
    ctx.quadraticCurveTo(x, y + k * 1.0, x - k * 0.7, y + k * 0.5);
    ctx.fillStyle = cols[i]; ctx.fill();
  }
  ctx.restore();
}
// Garis petir bergerigi
function zap(ctx, x, y, dx, dy, seed, color, w = 3) {
  let px = x, py = y; ctx.beginPath(); ctx.moveTo(px, py);
  for (let i = 1; i <= 5; i++) {
    const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; const f = r - Math.floor(r) - 0.5;
    px = x + dx * i / 5 + f * 14; py = y + dy * i / 5 + f * 14; ctx.lineTo(px, py);
  }
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
}

/* ==========================================================
   1) FLAMEREX — naga api
   ========================================================== */
function drawFlameRex(ctx, p) {
  const t = p.t, b = p.bob, sw = p.air ? 5 : p.step * 11, th = p.thrust, wd = p.wind;
  const BODY = '#e8432b', DARK = '#a02218', BELLY = '#ffd27a', CREAM = '#fff1c9';
  ctx.translate(th * 12 - wd * 8, 0);
  // ekor + api di ujung
  const tw = Math.sin(t * 5) * 7 - sw * 0.4;
  ctx.save(); ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(-20, -50 + b); ctx.bezierCurveTo(-55, -28, -85, -52 + tw * 0.3, -108, -80 + tw);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 25; ctx.stroke(); ctx.strokeStyle = BODY; ctx.lineWidth = 18; ctx.stroke(); ctx.restore();
  flame(ctx, -110, -84 + tw, 16, t);
  // sayap belakang
  const wf = Math.sin(t * (p.air ? 11 : 3)) * 9;
  poly(ctx, [-4, -110 + b, -44, -178 + wf, -40, -142 + b, -78, -156 + wf, -56, -120 + b, -80, -104 + b, -48, -96 + b], DARK);
  // kaki belakang
  limb(ctx, -14, -38, -14 - sw * 0.6, -8, 20, DARK); ell(ctx, -6 - sw * 0.6, -6, 19, 8, DARK);
  // badan + perut
  ell(ctx, 0, -84 + b, 37, 46, BODY); ell(ctx, 10, -80 + b, 22, 36, BELLY);
  for (let i = 0; i < 4; i++) line(ctx, [-2, -104 + i * 14 + b, 24, -104 + i * 14 + b], '#e0a050', 2);
  for (let i = 0; i < 4; i++) poly(ctx, [-34 + i * 2, -118 + i * 17 + b, -48 + i * 2, -108 + i * 17 + b, -33 + i * 2, -102 + i * 17 + b], DARK);
  // kaki depan
  limb(ctx, 16, -38, 16 + sw * 0.6, -8, 22, BODY); ell(ctx, 24 + sw * 0.6, -6, 20, 8, BODY);
  // lengan + cakar
  const ax = 30 + th * 40 - wd * 14, ay = -88 + b - wd * 28 + th * 4;
  limb(ctx, 22, -98 + b, ax, ay, 16, BODY);
  for (let i = 0; i < 3; i++) poly(ctx, [ax + 4, ay - 8 + i * 7, ax + 18, ay - 4 + i * 7, ax + 4, ay - 2 + i * 7], CREAM);
  // leher + kepala
  const hx = 42 + th * 18 - wd * 8, hy = -138 + b - wd * 4;
  const open = clamp(Math.max(th, wd * 0.6) * 1.3, 0, 1);
  limb(ctx, 12, -112 + b, hx - 6, hy + 12, 24, BODY);
  poly(ctx, [hx - 8, hy - 14, hx - 30, hy - 46, hx + 2, hy - 20], CREAM);   // tanduk
  ell(ctx, hx, hy, 26, 21, BODY);
  ell(ctx, hx + 22, hy + 5, 21, 13, BODY);
  ell(ctx, hx + 20, hy + 14 + open * 9, 17, 7, DARK);                      // rahang bawah
  if (open > 0.25) glowDot(ctx, hx + 38, hy + 10, 30 * open, '#ff8a1c', 0.9);
  poly(ctx, [hx + 28, hy + 12, hx + 32, hy + 20, hx + 36, hy + 12], '#fff');   // taring
  ell(ctx, hx + 8, hy - 4, 5, 6, '#ffe14a'); ell(ctx, hx + 9, hy - 4, 2, 4, '#000');
  ell(ctx, hx + 38, hy + 1, 2, 2, '#000');
}

/* ==========================================================
   2) THUNDERWOLF — serigala listrik
   ========================================================== */
function drawThunderWolf(ctx, p) {
  const t = p.t, b = p.bob, sw = p.air ? 6 : p.step * 12, th = p.thrust, wd = p.wind;
  const FUR = '#3a4a9a', DARK = '#1b2155', LIGHT = '#e8eeff', YEL = '#ffe14a';
  ctx.translate(th * 14 - wd * 10, 0);
  // ekor berbentuk petir
  const tw = Math.sin(t * 6) * 6;
  poly(ctx, [-20, -60 + b, -50, -62, -42, -78, -80, -84 + tw, -68, -100 + tw, -108, -124 + tw, -84, -100 + tw * 0.5, -96, -90 + tw * 0.5, -62, -72 + b, -50, -56], YEL);
  glowDot(ctx, -106, -122 + tw, 24, '#ffe14a', 0.6);
  // kaki belakang
  limb(ctx, -14, -44, -22 - sw * 0.5, -24, 18, DARK); limb(ctx, -22 - sw * 0.5, -24, -12 - sw * 0.7, -6, 14, DARK); ell(ctx, -4 - sw * 0.7, -4, 16, 7, DARK);
  // badan
  ell(ctx, 0, -84 + b, 32, 44, FUR); ell(ctx, 10, -76 + b, 19, 32, LIGHT);
  line(ctx, [-26, -100 + b, -14, -92 + b, -24, -84 + b, -10, -76 + b], YEL, 3);
  line(ctx, [-26, -78 + b, -14, -70 + b, -22, -62 + b], YEL, 3);
  // kaki depan
  limb(ctx, 14, -44, 22 + sw * 0.5, -24, 19, FUR); limb(ctx, 22 + sw * 0.5, -24, 12 + sw * 0.7, -6, 15, FUR); ell(ctx, 22 + sw * 0.7, -4, 17, 7, FUR);
  // lengan
  const ax = 28 + th * 38 - wd * 12, ay = -92 + b - wd * 26 + th * 4;
  limb(ctx, 18, -104 + b, ax, ay, 15, FUR);
  for (let i = 0; i < 3; i++) poly(ctx, [ax + 3, ay - 7 + i * 6, ax + 16, ay - 4 + i * 6, ax + 3, ay - 1 + i * 6], '#fff');
  // surai + kepala
  const hx = 38 + th * 16 - wd * 6, hy = -132 + b - wd * 3;
  const open = clamp(Math.max(th, wd * 0.6) * 1.2, 0, 1);
  poly(ctx, [hx - 22, hy - 4, hx - 40, hy - 18, hx - 30, hy + 2, hx - 46, hy + 14, hx - 22, hy + 16, hx - 28, hy + 34, hx - 4, hy + 20], LIGHT);
  poly(ctx, [hx - 12, hy - 14, hx - 24, hy - 54, hx + 2, hy - 22], DARK);    // telinga
  poly(ctx, [hx - 10, hy - 20, hx - 20, hy - 46, hx - 2, hy - 24], YEL);
  poly(ctx, [hx + 8, hy - 16, hx + 6, hy - 52, hx + 24, hy - 14], FUR);
  ell(ctx, hx, hy, 22, 19, FUR); ell(ctx, hx + 19, hy + 5, 17, 10, LIGHT);
  ell(ctx, hx + 20, hy + 11 + open * 7, 13, 5, DARK);
  poly(ctx, [hx + 22, hy + 10, hx + 25, hy + 17, hx + 28, hy + 10], '#fff');
  ell(ctx, hx + 34, hy + 2, 4, 3, '#000');
  poly(ctx, [hx + 4, hy - 7, hx + 17, hy - 3, hx + 5, hy - 1], YEL); glowDot(ctx, hx + 10, hy - 4, 12, '#ffe14a', 0.7);
  // percikan listrik di sekitar tubuh
  const seed = Math.floor(t * 14);
  zap(ctx, -30, -120 + b, -18, 22, seed, '#8fe9ff', 2.5);
  zap(ctx, 34, -60 + b, 22, -18, seed + 7, '#ffe14a', 2.5);
  if (th > 0.2) { zap(ctx, ax, ay, 50, -8, seed + 3, '#fff', 3); glowDot(ctx, ax + 20, ay, 30, '#ffe14a', 0.7); }
}

/* ==========================================================
   3) AQUADRAKE — naga air
   ========================================================== */
function drawAquaDrake(ctx, p) {
  const t = p.t, b = p.bob, sw = p.air ? 5 : p.step * 10, th = p.thrust, wd = p.wind;
  const BODY = '#1b8fd6', DARK = '#0b4f8f', BELLY = '#c6f3ff', FIN = '#4fd6ff';
  ctx.translate(th * 10 - wd * 8, 0);
  // ekor bergelombang dengan sirip
  const w1 = Math.sin(t * 3.4) * 10, w2 = Math.sin(t * 3.4 + 1.4) * 14;
  ctx.save(); ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(-18, -44 + b); ctx.bezierCurveTo(-52, -20 + w1, -78, -60 + w2, -112, -34 + w2);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 24; ctx.stroke(); ctx.strokeStyle = BODY; ctx.lineWidth = 17; ctx.stroke(); ctx.restore();
  poly(ctx, [-108, -34 + w2, -140, -62 + w2, -128, -34 + w2, -142, -10 + w2], FIN);
  // sirip punggung
  for (let i = 0; i < 4; i++) poly(ctx, [-30 + i * 2, -112 + i * 16 + b, -52 + i * 2, -108 + i * 16 + b, -32 + i * 2, -96 + i * 16 + b], FIN);
  // kaki belakang (berselaput)
  limb(ctx, -12, -38, -12 - sw * 0.6, -8, 19, DARK); ell(ctx, -4 - sw * 0.6, -6, 20, 7, FIN);
  // badan
  ell(ctx, 0, -76 + b, 35, 44, BODY); ell(ctx, 10, -72 + b, 20, 34, BELLY);
  for (let i = 0; i < 3; i++) ell(ctx, -14, -92 + i * 20 + b, 5, 5, DARK);
  limb(ctx, 14, -38, 14 + sw * 0.6, -8, 21, BODY); ell(ctx, 24 + sw * 0.6, -6, 21, 7, FIN);
  // lengan
  const ax = 28 + th * 40 - wd * 12, ay = -84 + b - wd * 26 + th * 4;
  limb(ctx, 20, -92 + b, ax, ay, 15, BODY);
  poly(ctx, [ax, ay - 10, ax + 22, ay - 2, ax, ay + 8], FIN);
  // leher panjang + kepala
  const hx = 44 + th * 18 - wd * 8, hy = -150 + b - wd * 5;
  const open = clamp(Math.max(th, wd * 0.6) * 1.3, 0, 1);
  limb(ctx, 12, -104 + b, hx - 8, hy + 14, 22, BODY);
  poly(ctx, [hx - 16, hy - 12, hx - 40, hy - 30, hx - 30, hy - 6, hx - 46, hy + 6, hx - 18, hy + 6], FIN);   // sirip kepala
  ell(ctx, hx, hy, 22, 18, BODY); ell(ctx, hx + 20, hy + 5, 19, 10, BODY);
  ell(ctx, hx + 20, hy + 13 + open * 8, 15, 6, DARK);
  glowDot(ctx, hx, hy - 12, 12, '#fff', 0.8); ell(ctx, hx, hy - 12, 4, 4, '#fff');                           // mutiara
  ell(ctx, hx + 8, hy - 3, 5, 6, '#fff'); ell(ctx, hx + 9, hy - 3, 2.5, 4, '#06324f');
  const wv = Math.sin(t * 4) * 6;
  line(ctx, [hx + 6, hy + 10, hx - 14, hy + 18 + wv, hx - 36, hy + 12 - wv], FIN, 3);                       // kumis
  if (open > 0.25) glowDot(ctx, hx + 38, hy + 12, 30 * open, '#6fe3ff', 0.9);
  // tetes air melayang
  for (let i = 0; i < 3; i++) { const yy = -60 - ((t * 20 + i * 40) % 110); ell(ctx, -50 + i * 8, yy, 4, 5, 'rgba(150,230,255,.7)'); }
}

/* ==========================================================
   4) SHADOWBAT — kelelawar bayangan (melayang)
   ========================================================== */
function drawShadowBat(ctx, p) {
  const t = p.t, th = p.thrust, wd = p.wind;
  const DARK = '#1f0d3a', BODY = '#3b1a6b', GLOW = '#b24bff', RED = '#ff2d55';
  const hover = -40 + Math.sin(t * 4) * 7;
  const flap = Math.sin(t * (p.air ? 12 : 7)) * 0.55 + wd * 0.5 - th * 0.4;
  ctx.translate(th * 16 - wd * 8, hover);
  glowDot(ctx, 0, -70, 90, GLOW, 0.22);                       // aura gelap
  // fungsi sayap (satu sisi)
  const wing = (x, y, ang, scale, col) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-40, -70, -110, -78);      // tulang atas
    ctx.quadraticCurveTo(-96, -52, -102, -30);      // gerigi bawah 1
    ctx.quadraticCurveTo(-82, -38, -76, -12);       // gerigi 2
    ctx.quadraticCurveTo(-56, -26, -44, 8);         // gerigi 3
    ctx.quadraticCurveTo(-24, -4, 0, 8);
    ctx.closePath(); shapeFill(ctx, col);
    line(ctx, [0, 0, -110, -78], '#6b36b8', 3); line(ctx, [0, 0, -102, -30], '#6b36b8', 2); line(ctx, [0, 0, -76, -12], '#6b36b8', 2);
    ctx.restore();
  };
  wing(-6, -92, -0.5 - flap, 1.1, DARK);                      // sayap belakang
  // ekor
  line(ctx, [-12, -50, -40, -36 + Math.sin(t * 5) * 5, -58, -50], OUTLINE, 9); line(ctx, [-12, -50, -40, -36 + Math.sin(t * 5) * 5, -58, -50], BODY, 5);
  poly(ctx, [-58, -50, -70, -58, -66, -44], DARK);
  // kaki
  limb(ctx, -8, -44, -10, -22, 7, DARK); limb(ctx, 8, -44, 10, -20, 7, DARK);
  poly(ctx, [-14, -22, -10, -14, -6, -22], '#fff'); poly(ctx, [6, -20, 10, -12, 14, -20], '#fff');
  // badan
  ell(ctx, 0, -72, 24, 32, BODY); ell(ctx, 7, -68, 13, 22, '#5a2ba0');
  // lengan kecil bercakar
  const ax = 22 + th * 36, ay = -74 - wd * 18 + th * 6;
  limb(ctx, 14, -80, ax, ay, 9, BODY);
  for (let i = 0; i < 3; i++) poly(ctx, [ax + 2, ay - 6 + i * 5, ax + 14, ay - 3 + i * 5, ax + 2, ay - 1 + i * 5], '#e8d8ff');
  // kepala
  const hx = 10 + th * 12, hy = -112;
  const open = clamp(Math.max(th, wd * 0.6), 0, 1);
  poly(ctx, [hx - 14, hy - 10, hx - 26, hy - 56, hx - 2, hy - 18], DARK);        // telinga
  poly(ctx, [hx + 4, hy - 16, hx + 10, hy - 60, hx + 22, hy - 10], DARK);
  poly(ctx, [hx - 12, hy - 16, hx - 20, hy - 44, hx - 4, hy - 20], '#6b2fb3');
  ell(ctx, hx, hy, 21, 17, BODY); ell(ctx, hx + 14, hy + 5, 11, 8, '#5a2ba0');
  ell(ctx, hx + 14, hy + 10 + open * 6, 9, 4, DARK);
  poly(ctx, [hx + 12, hy + 8, hx + 14, hy + 16, hx + 17, hy + 8], '#fff'); poly(ctx, [hx + 20, hy + 8, hx + 22, hy + 14, hx + 25, hy + 8], '#fff');
  poly(ctx, [hx + 2, hy - 8, hx + 17, hy - 4, hx + 3, hy], RED); glowDot(ctx, hx + 9, hy - 5, 14, RED, 0.9);
  wing(8, -92, 0.5 + flap, 0.95, '#2e1458');                  // sayap depan
}

/* ==========================================================
   5) TERRAGOLEM — golem batu (berat & kuat)
   ========================================================== */
function drawTerraGolem(ctx, p) {
  const t = p.t, b = p.bob * 0.6, sw = p.air ? 4 : p.step * 7, th = p.thrust, wd = p.wind;
  const STONE = '#8b6b4a', DARK = '#5a4230', LIGHT = '#b89468', MOSS = '#4c8a3c', CRYS = '#ffb347';
  ctx.translate(th * 10 - wd * 8, 0);
  // kristal di punggung
  poly(ctx, [-44, -150 + b, -70, -196 + b, -30, -166 + b], CRYS); poly(ctx, [-30, -160 + b, -42, -210 + b, -14, -170 + b], '#ffd27a');
  glowDot(ctx, -44, -176 + b, 40, CRYS, 0.35 + Math.sin(t * 2) * 0.1);
  // kaki
  rr(ctx, -40, -56, 34, 56 + sw * 0.0, 10, DARK); rr(ctx, -46 - sw * 0.5, -14, 46, 16, 6, DARK);
  rr(ctx, 6, -56, 36, 56, 10, STONE); rr(ctx, 2 + sw * 0.5, -14, 50, 16, 6, STONE);
  // badan
  rr(ctx, -52, -158 + b, 104, 108, 22, STONE);
  rr(ctx, -34, -128 + b, 68, 54, 12, LIGHT);
  line(ctx, [-34, -110 + b, 34, -110 + b], DARK, 3); line(ctx, [-34, -92 + b, 34, -92 + b], DARK, 3);
  // inti kristal di dada
  const pulse = 0.6 + Math.sin(t * 3) * 0.2;
  glowDot(ctx, 0, -110 + b, 38, CRYS, pulse); poly(ctx, [0, -128 + b, 12, -110 + b, 0, -92 + b, -12, -110 + b], CRYS);
  ell(ctx, -36, -150 + b, 14, 9, MOSS); ell(ctx, 30, -60 + b, 12, 7, MOSS);
  // bahu
  ell(ctx, -50, -148 + b, 24, 21, LIGHT); ell(ctx, 50, -148 + b, 24, 21, LIGHT);
  poly(ctx, [40, -160 + b, 52, -190 + b, 62, -158 + b], CRYS);
  // lengan depan: tinju besar
  const fx = 62 + th * 56 - wd * 16, fy = -92 + b - wd * 70 + th * 10;
  limb(ctx, 50, -140 + b, fx, fy, 30, STONE);
  rr(ctx, fx - 4, fy - 20, 42, 40, 12, LIGHT);
  line(ctx, [fx + 8, fy - 12, fx + 8, fy + 12], DARK, 2); line(ctx, [fx + 20, fy - 14, fx + 20, fy + 14], DARK, 2);
  if (th > 0.3) glowDot(ctx, fx + 40, fy, 40, '#ffd27a', 0.6);
  // kepala kecil di antara bahu
  rr(ctx, -4, -204 + b, 50, 44, 12, STONE);
  rr(ctx, 4, -196 + b, 36, 14, 4, DARK);
  poly(ctx, [4, -186 + b, 40, -186 + b, 40, -178 + b, 4, -178 + b], '#2a1a10');
  ell(ctx, 16, -180 + b, 5, 4, CRYS); ell(ctx, 32, -180 + b, 5, 4, CRYS); glowDot(ctx, 24, -180 + b, 26, CRYS, 0.7);
  poly(ctx, [10, -204 + b, 18, -224 + b, 26, -204 + b], DARK);
}

/* ==========================================================
   6) CYBERKNIGHT — ksatria digital dengan pedang energi
   ========================================================== */
function drawCyberKnight(ctx, p) {
  const t = p.t, b = p.bob, sw = p.air ? 6 : p.step * 12, th = p.thrust, wd = p.wind;
  const ARM = '#e7eeff', BLUE = '#2e6bff', DARK = '#16204a', PINK = '#ff2d95', CY = '#35f0ff';
  ctx.translate(th * 8 - wd * 8, 0);
  // jubah
  const cw = Math.sin(t * 4) * 8 - sw * 0.5;
  poly(ctx, [-8, -128 + b, -60, -112 + cw, -88, -60 + cw, -76, -20, -40, -44, -20, -50], PINK);
  // kaki belakang
  limb(ctx, -8, -64 + b, -12 - sw * 0.5, -34, 16, DARK); limb(ctx, -12 - sw * 0.5, -34, -6 - sw * 0.7, -8, 14, BLUE); rr(ctx, -20 - sw * 0.7, -14, 30, 14, 5, DARK);
  // badan
  rr(ctx, -26, -130 + b, 52, 64, 12, ARM); rr(ctx, -20, -112 + b, 40, 36, 8, BLUE);
  glowDot(ctx, 0, -98 + b, 26, CY, 0.8); ell(ctx, 0, -98 + b, 7, 7, CY);
  rr(ctx, -26, -72 + b, 52, 10, 3, PINK);
  // kaki depan
  limb(ctx, 10, -64 + b, 14 + sw * 0.5, -34, 17, ARM); limb(ctx, 14 + sw * 0.5, -34, 8 + sw * 0.7, -8, 15, BLUE); rr(ctx, -2 + sw * 0.7, -14, 34, 14, 5, ARM);
  // bahu
  ell(ctx, -22, -128 + b, 15, 12, ARM); ell(ctx, 22, -128 + b, 15, 12, ARM); ell(ctx, 22, -128 + b, 6, 5, PINK);
  // lengan + pedang energi
  const hx = 34 + th * 26 - wd * 8, hy = -100 + b - wd * 24 + th * 10;
  limb(ctx, 20, -122 + b, hx, hy, 13, ARM);
  const ang = -0.9 - 1.3 * wd + 2.0 * th;            // sudut pedang (rad): naik saat wind-up, menebas turun
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  rr(ctx, -6, -4, 18, 8, 3, DARK);                    // gagang
  rr(ctx, 10, -9, 5, 18, 2, PINK);                    // pelindung
  ctx.shadowColor = CY; ctx.shadowBlur = 24;
  const bl = 84 + th * 22;
  poly(ctx, [15, -5, 15 + bl, -2, 20 + bl, 0, 15 + bl, 2, 15, 5], CY);
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillRect(16, -1.5, bl, 3);
  ctx.restore();
  // helm
  const hdx = 4 + th * 8, hdy = -150 + b;
  poly(ctx, [hdx - 8, hdy - 26, hdx - 44, hdy - 40 + Math.sin(t * 5) * 4, hdx - 70, hdy - 20 + Math.sin(t * 5 + 1) * 5, hdx - 30, hdy - 12], PINK);   // jambul
  ell(ctx, hdx, hdy, 22, 22, ARM);
  poly(ctx, [hdx - 4, hdy - 8, hdx + 22, hdy - 6, hdx + 20, hdy + 4, hdx - 2, hdy + 4], DARK);
  poly(ctx, [hdx - 2, hdy - 6, hdx + 20, hdy - 4, hdx + 18, hdy + 1, hdx, hdy + 2], CY); glowDot(ctx, hdx + 12, hdy - 2, 20, CY, 0.8);
  poly(ctx, [hdx - 6, hdy - 20, hdx + 4, hdy - 34, hdx + 12, hdy - 18], BLUE);   // jengger
}

/* ==========================================================
   DAFTAR KARAKTER
   stats: hp, attack, defense, speed (speed 100 = kecepatan standar)
   ========================================================== */
const CHARACTERS = [
  { id: 'flamerex', name: 'FlameRex', title: 'NAGA API PENGHANCUR', element: 'API', color: '#ff5a2a', color2: '#ffd23f',
    stats: { hp: 1000, attack: 115, defense: 45, speed: 100 }, scale: 1, draw: drawFlameRex,
    desc: 'Naga api dengan serangan paling ganas. Seimbang antara jarak dekat dan jauh, ultimate-nya menyapu seluruh arena.' },
  { id: 'thunderwolf', name: 'ThunderWolf', title: 'SERIGALA PETIR', element: 'LISTRIK', color: '#ffe14a', color2: '#5aa0ff',
    stats: { hp: 880, attack: 100, defense: 35, speed: 135 }, scale: 1, draw: drawThunderWolf,
    desc: 'Monster tercepat. Menyerang dengan dash kilat dan sambaran petir dari langit, tapi tubuhnya rapuh.' },
  { id: 'aquadrake', name: 'AquaDrake', title: 'NAGA GELOMBANG', element: 'AIR', color: '#35c4ff', color2: '#b8f0ff',
    stats: { hp: 1050, attack: 95, defense: 55, speed: 95 }, scale: 1, draw: drawAquaDrake,
    desc: 'Naga air yang tahan banting. Bisa memulihkan diri dengan perisai gelembung dan menutup duel dengan Tsunami.' },
  { id: 'shadowbat', name: 'ShadowBat', title: 'KELELAWAR BAYANGAN', element: 'GELAP', color: '#b24bff', color2: '#ff2d55',
    stats: { hp: 850, attack: 110, defense: 30, speed: 125 }, scale: 1, draw: drawShadowBat,
    desc: 'Pembunuh gesit yang berteleportasi ke belakang lawan dan menyedot darahnya. Damage tinggi, pertahanan rendah.' },
  { id: 'terragolem', name: 'TerraGolem', title: 'GOLEM BATU KRISTAL', element: 'BUMI', color: '#c9a46a', color2: '#ffb347',
    stats: { hp: 1300, attack: 105, defense: 85, speed: 65 }, scale: 0.88, draw: drawTerraGolem,
    desc: 'Raksasa lambat dengan HP dan pertahanan tertinggi. Gempa dan hujan meteornya menghukum lawan yang diam.' },
  { id: 'cyberknight', name: 'CyberKnight', title: 'KSATRIA DIGITAL', element: 'DATA', color: '#35f0ff', color2: '#ff2d95',
    stats: { hp: 1000, attack: 105, defense: 60, speed: 105 }, scale: 1, draw: drawCyberKnight,
    desc: 'Ksatria dengan pedang energi. Bisa melakukan Overclock untuk menambah serangan dan kecepatan sesaat.' }
];

function getCharacter(id) { return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]; }

/* ==========================================================
   Pose animasi & render fighter
   ========================================================== */
// Mengubah state fighter menjadi parameter pose untuk fungsi draw karakter
function buildPose(f) {
  let wind = 0, thrust = 0;
  const a = f.action;
  if (a) {
    const s = a.skill, ap = clamp(a.t / s.dur, 0, 1);
    if (ap < s.fire) wind = ap / s.fire;              // 0..1 : bersiap mengayun
    else { const k = (ap - s.fire) / (1 - s.fire); wind = 1 - k; thrust = Math.sin(Math.PI * k); }
  }
  const idle = f.state === 'idle' || f.state === 'block';
  return {
    t: f.animT, state: f.state, wind, thrust,
    step: Math.sin(f.walkPhase),
    bob: idle ? Math.sin(f.animT * 3.2) * 2.5 : Math.sin(f.walkPhase * 2) * 2,
    air: f.y < GROUND_Y - 6,
    hurt: f.hurtTimer > 0, hurtK: clamp(f.hurtTimer / 0.35, 0, 1),
    ko: f.state === 'ko' ? clamp(f.koT / 0.7, 0, 1) : 0
  };
}

// Menggambar satu fighter (bayangan, aura buff, sprite, perisai guard)
function renderFighter(ctx, f) {
  const def = f.char, p = buildPose(f), sc = def.scale || 1;
  const height = GROUND_Y - f.y;

  // bayangan di lantai
  ctx.save();
  ctx.globalAlpha = 0.4 * (1 - clamp(height / 320, 0, 0.7));
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(f.x, GROUND_Y + 6, 48 * (1 - clamp(height / 600, 0, 0.5)), 10, 0, 0, TAU); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(f.x, f.y);
  // aura untuk buff aktif
  for (const bf of f.buffs) {
    if (!bf.color) continue;
    const pulse = 0.5 + Math.sin(f.animT * 6) * 0.15;
    glowDot(ctx, 0, -80, 105, bf.color, 0.35 * pulse + 0.15);
    ctx.save(); ctx.globalAlpha = 0.5 + pulse * 0.3; ctx.strokeStyle = bf.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -80, 66, 88, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  ctx.scale(f.facing * sc, sc);
  if (p.ko > 0) { ctx.rotate(-p.ko * 1.45); ctx.translate(-p.ko * 14, 0); }
  else if (p.hurt) { ctx.rotate(-0.2 * p.hurtK); ctx.translate(-10 * p.hurtK, 0); }
  if (p.hurt && Math.floor(f.animT * 30) % 2 === 0) ctx.filter = 'brightness(2.2) saturate(.4)';
  def.draw(ctx, p);
  ctx.filter = 'none';
  ctx.restore();

  // perisai saat bertahan
  if (f.state === 'block') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#7ff3ff'; ctx.lineWidth = 5; ctx.shadowColor = '#35f0ff'; ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.65 + Math.sin(f.animT * 14) * 0.2;
    ctx.beginPath(); ctx.arc(f.x, f.y - 80, 80, f.facing > 0 ? -1.0 : Math.PI - 1.0, f.facing > 0 ? 1.0 : Math.PI + 1.0); ctx.stroke();
    ctx.fillStyle = 'rgba(53,240,255,.12)'; ctx.fill();
    ctx.restore();
  }
}

// Menggambar potret idle (untuk kartu pilih karakter)
function drawPortrait(ctx, def, w, h, t) {
  ctx.clearRect(0, 0, w, h);
  const pose = { t, state: 'idle', wind: 0, thrust: 0, step: 0, bob: Math.sin(t * 3.2) * 2.5, air: false, hurt: false, hurtK: 0, ko: 0 };
  const s = (h - 34) / 225 * (def.scale ? Math.min(1.1, 1 / def.scale * 0.95) : 1);
  ctx.save();
  glowDot(ctx, w / 2, h * 0.55, h * 0.55, def.color, 0.25);
  ctx.translate(w * 0.46, h - 26);
  ctx.scale(s * (def.scale || 1), s * (def.scale || 1));
  def.draw(ctx, pose);
  ctx.restore();
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.ellipse(w * 0.46, h - 22, w * 0.26, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
}
