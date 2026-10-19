# Digital Monster Arena

Game fighting 2D 1 vs 1 bertema monster digital, dibuat dengan **HTML5 Canvas + JavaScript + CSS**.
Tanpa framework dan tanpa file aset: semua gambar karakter, arena, efek, suara, dan musik dibuat lewat kode.

## Cara menjalankan (Visual Studio Code + Live Server)

1. Pasang **Visual Studio Code**, lalu pasang ekstensi **Live Server** (pembuat: Ritwick Dey).
   Buka tab Extensions (`Ctrl+Shift+X`), cari "Live Server", klik Install.
2. Ekstrak folder `digital-monster-arena`, lalu di VS Code pilih **File → Open Folder…** dan buka folder tersebut.
3. Klik kanan `index.html` di panel Explorer, pilih **Open with Live Server**.
   (Atau klik tombol **Go Live** di pojok kanan bawah VS Code.)
4. Browser terbuka di `http://127.0.0.1:5500`. Klik sekali di halaman agar suara aktif, lalu klik **PLAY**.

Tips: pakai Chrome atau Edge. Layar dengan tinggi minimal ± 700 px memberi tampilan terbaik.

## Kontrol

| Tombol | Fungsi |
|---|---|
| A / D | Bergerak kiri / kanan |
| W | Lompat |
| J | Serangan normal (tekan berurutan untuk combo) |
| K, L, U | Skill 1, 2, 3 (ada cooldown) |
| I | Ultimate (butuh bar energi penuh) |
| Space | Bertahan (guard) |
| P / Esc | Pause |

Tombol yang sama juga tersedia di bawah layar (bisa diklik atau disentuh).

## Aturan singkat

- Pertandingan **best of 3 ronde**. Ronde berakhir saat HP lawan habis (K.O.) atau waktu habis (HP lebih banyak menang).
- Energi terisi saat memukul / terkena pukulan dan perlahan seiring waktu. Penuh = ultimate siap.
- Pukulan beruntun menambah combo (+3% damage tiap hit). Ada peluang **CRITICAL HIT**.
- Guard mengurangi damage hingga ±90%, tetapi bar guard (garis putih tipis di bawah energi) bisa habis lalu **GUARD BREAK**.
- Ultimate memiliki super-armor: tidak bisa diputus saat sedang dipakai.

## Monster

| Monster | Elemen | Gaya main |
|---|---|---|
| FlameRex | Api | Seimbang, ultimate beam api raksasa |
| ThunderWolf | Listrik | Tercepat, dash kilat dan sambaran petir |
| AquaDrake | Air | Tahan banting, bisa menyembuhkan diri |
| ShadowBat | Gelap | Teleport ke belakang lawan, menyedot HP |
| TerraGolem | Bumi | HP & pertahanan tertinggi, gempa dan meteor |
| CyberKnight | Data | Pedang energi, Overclock menambah serangan |

Pilih lawan CPU secara manual atau acak di halaman **Character Select**. Tingkat kesulitan AI
(Mudah / Normal / Sulit), waktu ronde, suara, musik, dan layar bergetar diatur di **Settings**
(tersimpan otomatis di browser).

## Struktur file

```
digital-monster-arena/
├── index.html          struktur halaman & semua layar (menu, pilih karakter, arena, settings, game)
├── style.css           tema neon, HUD, tombol, animasi UI
├── js/
│   ├── effects.js      konstanta, Settings, partikel, teks melayang, layar bergetar, suara & musik (WebAudio)
│   ├── characters.js   data 6 monster + gambar karakter (Canvas) + pose animasi
│   ├── skills.js       data skill (3 skill + ultimate + serangan normal) dan logikanya
│   ├── arena.js        3 arena berlapis dengan parallax, cahaya, partikel
│   ├── enemyAI.js      AI lawan (bergerak, menyerang, bertahan, pakai skill & ultimate)
│   ├── game.js         class Fighter, aturan duel, damage, combo, ronde, HUD, game loop
│   └── main.js         input, menu, pilih karakter/arena, settings, pause
└── assets/             folder opsional (kosong): sprite/suara sendiri bisa ditaruh di sini
```

Urutan `<script>` di `index.html` penting: `effects → characters → skills → arena → enemyAI → game → main`.

## Mengubah / menambah isi

- **Ubah angka keseimbangan**: statistik monster ada di `characters.js` (`CHARACTERS`), nilai skill di `skills.js` (`SKILL_SETS`).
- **Tambah monster**: buat fungsi `drawNamaMonster(ctx, pose)` di `characters.js`, tambahkan objek ke `CHARACTERS`,
  lalu tambahkan set skill dengan `id` yang sama di `SKILL_SETS`.
- **Tambah sprite sendiri**: ganti isi fungsi `draw...` dengan `ctx.drawImage(...)` dan taruh gambarnya di `assets/characters/`.
- **Mode demo CPU vs CPU**: buka `index.html?demo=1`.

## Jika ada masalah

- *Tidak ada suara*: klik atau tekan tombol di halaman dulu (aturan browser), dan cek Settings → Efek Suara / Musik.
- *Font terlihat polos*: font Orbitron diambil dari Google Fonts, jadi perlu internet. Tanpa internet game tetap jalan dengan font cadangan.
- *Halaman kosong / error saat dibuka dengan klik dua kali*: gunakan Live Server (atau server lokal lain), bukan membuka file langsung.
