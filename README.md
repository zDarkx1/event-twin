# EventTwin

**Digital twin acara** — simulasikan dampak sebuah kegiatan sebelum kegiatan itu berlangsung, lalu bandingkan skenario penyelenggaraan pada empat dimensi: **sampah, energi, biaya, inklusi**.

> Ubah satu keputusan → empat angka dampak bergerak serentak.

Dibuat untuk **ITechno Cup 2026 — Web Development (SMA/MA/SMK)**, subtema *"Smart Sustainable Digital Solution for Inclusive Society"*.

---

## 1. Penjelasan Aplikasi

### Latar belakang

Pengelolaan dampak acara di Indonesia hampir selalu dipikirkan **setelah** acara selesai. Panitia memutuskan jenis kemasan, sumber listrik, dan fasilitas beberapa minggu sebelum hari-H — tanpa gambaran konsekuensinya. Akibatnya:

- jumlah sampah dan konsumsi energi tidak bisa diprediksi, sehingga kebutuhan tempat sampah, titik daya, dan anggaran meleset;
- penggunaan kemasan sekali pakai berlebihan karena tidak ada pembanding;
- **aksesibilitas peserta difabel dan lansia jarang direncanakan** — acara jadi tidak inklusif, dan itu baru terasa saat ada yang tidak bisa masuk.

Konteksnya nyata: sisa makanan menyumbang **40,2%** dan plastik **20,2%** dari timbulan sampah nasional (SIPSN, Kementerian Lingkungan Hidup, 2025). Acara adalah salah satu penghasil kedua fraksi itu, dan justru yang paling bisa direncanakan.

### Tujuan

Mengubah pertanyaan panitia dari:

> *"Bagaimana cara mengelola acara?"*

menjadi:

> **"Bagaimana keputusan kami hari ini memengaruhi sampah, energi, biaya, dan akses acara besok?"**

EventTwin bukan aplikasi pencatatan pasca-acara. Ini alat bantu **keputusan pra-acara**.

### Kesesuaian SDG

| SDG | Bagaimana dijawab |
|---|---|
| **SDG 11** — Kota dan Komunitas Berkelanjutan | Dimensi sampah: estimasi timbulan dan residu yang berakhir di TPA |
| **SDG 7** — Energi Bersih dan Terjangkau | Dimensi energi: kWh dan emisi CO₂ dari pilihan pencahayaan serta sumber daya |
| **SDG 9** — Industri, Inovasi, dan Infrastruktur | Rule-based simulation engine dengan koefisien bersumber, bukan angka karangan |

Dimensi **Inklusi** menjawab frasa *"Inclusive Society"* pada subtema secara langsung dan terukur, bukan sebagai klaim.

---

## 2. Fitur Utama

### 🎯 Scenario Simulator (fitur pembeda)

Pengguna mengubah keputusan dan melihat dampaknya **seketika**, tanpa menunggu.

> *Bagaimana jika botol plastik diganti refill station, halogen diganti LED, dan ditambah dua ramp?*

Empat angka bergerak bersamaan: timbulan sampah, kWh dan emisi, biaya, skor inklusi. Baseline dibekukan sebagai pembanding, jadi setiap perubahan menampilkan **delta** — bukan cuma angka baru.

Perhitungan berjalan sinkron di browser tanpa panggilan jaringan, sehingga responsnya di bawah 100 ms.

### 📊 Empat dimensi dampak

| Dimensi | Yang dihitung |
|---|---|
| **Sampah** | Timbulan (kg) dan residu ke TPA (kg), dipecah jadi plastik / organik / kertas / lain-lain |
| **Energi** | Konsumsi kWh (pencahayaan + sound system) dan emisi kg CO₂ |
| **Biaya** | Konsumsi, energi, angkut sampah, fasilitas akses; investasi awal reusable dicatat terpisah dan teramortisasi |
| **Inklusi** | Skor 0–100 dari ketersediaan fasilitas akses, disesuaikan dengan proporsi tamu difabel |

Plus satu **Sustainability Score** agregat (sampah 35%, energi 25%, inklusi 25%, biaya 15%).

### ♿ Inclusion Scorer

Ini yang membedakan EventTwin dari kalkulator jejak karbon biasa. Skor inklusi dihitung dari celah fasilitas yang **tidak** tersedia, dibobot dengan proporsi tamu yang membutuhkan aksesibilitas:

```
gap        = Σ bobot fasilitas yang TIDAK tersedia
needWeight = clamp(0,55 + 0,45 × (rasioDifabel / 0,10), 0,55 → 1)
skor       = clamp(100 − gap × needWeight, 0 → 100)
```

Konsekuensinya: acara dengan 200 tamu difabel dan tanpa ramp mendapat skor lebih rendah daripada acara dengan 2 tamu difabel pada kondisi yang sama. Fasilitas minim lebih berat konsekuensinya ketika kebutuhannya tinggi.

`needWeight` tidak pernah nol, bahkan ketika tidak ada tamu difabel terdata — disabilitas tak terlihat, lansia, dan tamu yang tidak mendaftarkan kebutuhannya selalu ada.

### 💡 Recommendation Engine

Engine menghitung ulang setiap perubahan tunggal yang mungkin, lalu mengurutkan berdasarkan **dampak per rupiah**. Contoh hasil nyata untuk acara 500 peserta:

- Ganti botol plastik → refill station: **−15,0 kg** timbulan, **−Rp 3.109.660**
- Tambah materi huruf besar: **+6,8 poin** inklusi dengan **Rp 150.000** — 45 poin per juta rupiah, empat kali lebih efisien daripada ramp (11 poin per juta)

Temuan seperti ini tidak terlihat tanpa model.

### 🔍 Scenario Comparison

Bandingkan beberapa strategi berdampingan pada keempat dimensi sekaligus.

---

## 3. Kredibilitas Angka

Ini bagian yang paling menentukan apakah aplikasi ini bisa dipercaya. **Setiap koefisien punya baris terdokumentasi di [`COEFFICIENTS.md`](./COEFFICIENTS.md)** lengkap dengan status verifikasi, sumber, dan alasannya.

Koefisien yang sudah **terverifikasi ke sumber primer** (2 September 2026):

| Koefisien | Nilai | Sumber |
|---|---:|---|
| Timbulan sampah nasional | 0,48 kg/orang/hari | SIPSN/SIKPSN, Kementerian Lingkungan Hidup (2026) |
| Komposisi sampah nasional | sisa makanan 40,21%, plastik 20,16% | SIPSN Portal Indikatif, 2025 periode 2 |
| Faktor emisi grid listrik | 0,87 ton CO₂/MWh | Kepmen ESDM No. 163.K/HK.02/MEM.S/2021 (grid JAMALI, data 2019) |
| Tarif listrik | Rp 1.444,70/kWh | Permen ESDM No. 7/2024 Lampiran III, golongan B-2/TR |
| Sisa makanan per porsi | 0,115 kg | WRAP UK 2013 — 920.000 t ÷ 8 miliar porsi |
| Berat kotak makan kertas | 20 g | Lembar spesifikasi BioPak BB-LBS-1 |
| Berat sendok plastik | 2,2 g | Fuling USA, Medium Weight Cutlery |
| Berat botol PET 600 ml | 14,5 g (badan+tutup) | Toko Plastik; verifikasi silang Jordan Plastics |

Tiga hal yang dinyatakan apa adanya, bukan disembunyikan:

1. Faktor emisi 0,87 satuannya **kg CO₂/kWh, bukan CO₂e**, dan spesifik grid **Jawa-Madura-Bali** — bukan nasional. Untuk acara di luar Jawa-Bali, nilainya berbeda (Kalbar 1,63; Sumatera 0,94).
2. Tarif Rp 1.444,70 adalah golongan **B-2/TR (bisnis)**. Venue sekolah dengan sambungan sosial S-2/TR tarifnya Rp 900/kWh.
3. Angka sisa makanan berasal dari **sektor jasa makanan UK**, bukan data Indonesia — tidak ada angka kg-per-porsi nasional yang bisa dikutip.

Koefisien yang **masih asumsi model** (harga katering, tarif genset, retribusi angkut, watt pencahayaan, bobot rubrik inklusi) ditandai eksplisit sebagai asumsi di `COEFFICIENTS.md`. Menyebut sumber yang belum dicek lebih merusak daripada mengakui asumsi dengan alasan yang jelas.

**Angka demo digenerate dari engine**, bukan ditulis manual:

```bash
npm run demo:numbers
```

Ini yang mencegah dokumen dan aplikasi menampilkan angka berbeda saat live demo.

---

## 4. Teknologi yang Digunakan

| Teknologi | Versi | Peran |
|---|---|---|
| [Next.js](https://nextjs.org) | 16.3.4 | Framework React dengan App Router; API Route Handler untuk endpoint AI server-side |
| [React](https://react.dev) | 19.2.8 | UI library |
| [TypeScript](https://www.typescriptlang.org) | 5.x | Type safety pada engine dan komponen; mode `strict` |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Styling utility-first, mobile-first responsif |
| [Vitest](https://vitest.dev) | 3.2.4 | Unit test engine, rekomendasi, prompt AI, validasi request, rate limit (84 test) |
| [ESLint](https://eslint.org) | 9.x | Linting dengan `eslint-config-next` |
| [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) | 0.122.0 | AI Insight — menarasikan hasil simulasi (opsional) |

### Keputusan teknis dan alasannya

| Keputusan | Alasan |
|---|---|
| **Rule-based engine, bukan AI** | Angka harus deterministik dan bisa ditelusuri sumbernya. AI yang mengarang angka gagal di verifikasi. |
| **Tanpa database** | Tidak ada data yang wajib persist untuk fitur inti; state di React, share lewat URL query. Menambah Postgres untuk menyimpan tiga baris adalah keputusan teknis yang lemah. |
| **Tanpa backend terpisah** | Perhitungan murni. Menghilangkan network round-trip membuat simulasi what-if terasa instan (<100 ms). |
| **Tanpa autentikasi** | Fitur inti tidak membutuhkannya. Tidak ada data pengguna yang disimpan. |
| **Koefisien di satu file terdokumentasi** | Bisa dikutip dan diaudit; bukan angka tersebar di komponen. |
| **API key hanya server-side** | Route Handler, bukan client component — mencegah kebocoran kredensial ke bundle browser. |
| **Engine sebagai fungsi murni** | Bisa diuji tanpa mock, bisa dienumerasi untuk normalisasi skor, dan tidak punya efek samping. |

### Peran AI — batas yang tegas

**Yang dilakukan AI:** menarasikan hasil simulasi dalam bahasa Indonesia untuk panitia yang tidak punya latar belakang lingkungan.

**Yang tidak dilakukan AI:** menghitung, memperkirakan, atau mengubah angka apa pun.

Engine menghasilkan angka; AI hanya menjelaskan artinya. Kalau request AI gagal, panel insight tidak muncul dan dashboard tetap berfungsi penuh — live demo tidak boleh bergantung pada jaringan.

---

## 5. Struktur Proyek

```
event-twin/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Halaman simulator
│   │   ├── globals.css             # Tailwind + design token
│   │   └── api/insight/route.ts    # F7 — endpoint AI (server-side)
│   ├── components/
│   │   ├── scenario-simulator.tsx  # F3 — menyatukan form, dashboard, rekomendasi
│   │   ├── event-form.tsx          # F1 — 13 field parameter acara
│   │   ├── impact-dashboard.tsx    # F4 — empat kartu + sustainability score
│   │   ├── impact-card.tsx         # Satu kartu dampak + delta
│   │   ├── waste-composition-chart.tsx  # Batang part-to-whole (flexbox murni)
│   │   ├── recommendation-list.tsx # F6 — tiga langkah berdampak terbesar
│   │   ├── scenario-comparison.tsx # F5 — tabel baseline vs skenario
│   │   ├── ai-insight.tsx          # F7 — panel narasi AI
│   │   ├── field.tsx               # Pembungkus label + hint yang terhubung
│   │   └── ui/                     # Primitif shadcn/ui
│   └── lib/
│       ├── coefficients.ts         # Satu-satunya sumber koefisien
│       ├── engine.ts               # Engine simulasi — fungsi murni
│       ├── engine.test.ts          # 32 unit test engine
│       ├── recommend.ts            # Peringkat dampak per rupiah
│       ├── recommend.test.ts       # 13 unit test rekomendasi
│       ├── ai-prompt.ts            # Prompt F7 — fungsi murni
│       ├── ai-prompt.test.ts       # 10 unit test prompt
│       ├── insight-request.ts      # Validasi body request /api/insight
│       ├── insight-request.test.ts # 21 unit test validasi
│       ├── rate-limit.ts           # Pelindung kuota API
│       ├── rate-limit.test.ts      # 8 unit test rate limit
│       ├── defaults.ts             # Nilai awal Event Builder
│       ├── labels.ts               # Label opsi bahasa Indonesia
│       └── format.ts               # Format angka id-ID
├── scripts/
│   └── demo-numbers.ts             # Generator angka demo dari engine
├── .env.example                    # Contoh konfigurasi environment
├── COEFFICIENTS.md                 # Sumber & status setiap koefisien
├── PRD.md                          # Spesifikasi produk
└── AGENTS.md                       # Konsep & materi pitching
```

---

## 6. Cara Instalasi

### Prasyarat

- **Node.js** 20 atau lebih baru — [unduh](https://nodejs.org)
- **npm** (terpasang bersama Node.js)

Cek versi:

```bash
node --version   # v20.0.0 atau lebih baru
npm --version
```

### Langkah instalasi

**1. Clone repositori**

```bash
git clone https://github.com/zDarkx1/event-twin.git
cd event-twin
```

**2. Pasang dependensi**

```bash
npm install
```

**3. Konfigurasi environment (opsional)**

Langkah ini **hanya** diperlukan kalau ingin mengaktifkan fitur AI Insight. Tanpa ini, aplikasi tetap berjalan penuh — panel insight saja yang tidak muncul.

Buat file `.env.local` di root proyek:

```bash
NEW_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_BASE_URL=https://api.anthropic.com    # opsional — endpoint Anthropic-compatible mana pun
ANTHROPIC_MODEL=claude-opus-5                   # opsional
```

Salin dari `.env.example` bila perlu. Key hanya dibaca di `src/app/api/insight/route.ts` (server-only, `runtime: nodejs`) — tidak pernah masuk bundle browser. Nama `ANTHROPIC_API_KEY` juga masih didukung untuk setup Anthropic standar.

> ⚠️ `.env.local` sudah masuk `.gitignore`. Jangan pernah commit API key ke repositori.

**4. Verifikasi instalasi**

```bash
npm test     # 84 test harus lolos
npm run build # build produksi harus sukses
```

---

## 7. Cara Penggunaan

### Menjalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Perintah yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server dengan hot reload |
| `npm run build` | Build produksi |
| `npm start` | Jalankan hasil build produksi |
| `npm test` | Jalankan seluruh unit test (84 test) |
| `npm run test:watch` | Test dalam mode watch |
| `npm run lint` | Periksa kualitas kode dengan ESLint |
| `npm run demo:numbers` | Generate tabel angka demo dari engine |

### Alur penggunaan aplikasi

```
Isi parameter acara
   (peserta, durasi, jenis acara)
        ↓
Isi konsumsi & energi
   (makanan, minuman, lampu, sound system, sumber daya)
        ↓
Pilih kemasan & fasilitas akses
        ↓
Lihat dashboard 4 dimensi + Sustainability Score
        ↓
Ubah satu keputusan → lihat delta seketika  ← fitur pembeda
        ↓
Terapkan rekomendasi berdampak terbesar per rupiah
        ↓
Bandingkan skenario berdampingan
```

### Memakai engine secara langsung

Engine bisa dipakai lepas dari UI — berguna untuk pengujian atau integrasi lain:

```typescript
import { simulate, clampParams } from "@/lib/engine";
import type { EventParams } from "@/lib/engine";

const params: EventParams = {
  participants: 500,
  durationHours: 6,
  eventType: "festival",
  mealsPerPerson: 1,
  drinksPerPerson: 2,
  foodPackaging: "disposable",
  drinkVessel: "plasticBottle",
  wasteBins: "mixed",
  lighting: "halogen",
  soundSystemKw: 3,
  powerSource: "pln",
  accessibility: [],
  estimatedDisabledGuests: 15,
};

const hasil = simulate(clampParams(params));

console.log(hasil.waste.generatedKg);      // 99.5  — timbulan (kg)
console.log(hasil.waste.landfillKg);       // 91.5  — residu ke TPA (kg)
console.log(hasil.energy.kwh);             // 54.0  — kWh
console.log(hasil.energy.co2eKg);          // 47.0  — kg CO₂
console.log(hasil.cost.totalRp);           // 11642092
console.log(hasil.inclusion.score);        // 32    — skor inklusi
console.log(hasil.sustainabilityScore);    // 15    — agregat
```

> `clampParams()` menjepit setiap input numerik ke rentang yang valid sebelum masuk engine. Selalu panggil ini untuk input dari pengguna.

### Contoh hasil simulasi

Festival sekolah, 500 peserta, 6 jam — angka digenerate `npm run demo:numbers`:

| Skenario | Timbulan | Residu ke TPA | Energi | Emisi | Biaya operasional | Inklusi | Sustainability |
|---|---:|---:|---:|---:|---:|---:|---:|
| Disposable | 99,5 kg | 91,5 kg | 54,0 kWh | 47,0 kg CO₂ | Rp 11.642.092 | 32 / 100 | 15 / 100 |
| Reusable | 75,5 kg | 69,5 kg | 54,0 kWh | 47,0 kg CO₂ | Rp 8.026.636 | 32 / 100 | 47 / 100 |
| Reusable + akses & energi efisien | 75,5 kg | 55,9 kg | 30,0 kWh | 26,1 kg CO₂ | Rp 13.932.450 | 100 / 100 | 96 / 100 |

Perhatikan skenario ketiga: totalnya **lebih mahal** karena enam fasilitas aksesibilitas menambah Rp 5,95 juta, meski konsumsi dan energi turun. Itu memang temuan modelnya — inklusi tidak gratis, dan panitia perlu melihat trade-off itu secara eksplisit.

---

## 8. Pengujian

```bash
npm test
```

84 unit test menutupi keempat dimensi engine, normalisasi skor, validasi input, peringkat rekomendasi, prompt AI Insight, validasi body request endpoint, rate limiter, dan satu test regresi khusus untuk formula inklusi.

Contoh yang diuji:

- Timbulan sampah **tidak** berubah ketika hanya jenis tempat sampah diganti — yang berubah hanya residu ke TPA (kekeliruan konsep yang mudah terjadi).
- Investasi awal reusable tidak tercampur ke biaya operasional.
- Sustainability score tidak bergeser drastis hanya karena jumlah peserta berbeda (100 vs 5.000 peserta, selisih < 10 poin).
- Skor inklusi membedakan 2 tamu difabel dari 200 tamu difabel walaupun sama-sama tanpa fasilitas — perilaku yang gagal pada formula perkalian versi awal.
- `clampParams()` menangani nilai di luar rentang dan `NaN`.
- Rekomendasi tidak pernah mengusulkan mencabut fasilitas akses yang sudah ada, dan tidak pernah mengusulkan nilai yang sedang dipakai.
- Endpoint `/api/insight` menolak enum di luar daftar, duplikat fasilitas, `NaN`, `null`, angka berbentuk string, dan membuang field asing dari body.
- Rate limiter memakai jendela geser (bukan jendela tetap) dan tidak membiarkan peta identitas tumbuh tanpa batas.

---

## 9. Aksesibilitas

Aplikasi yang mengukur inklusi tapi tidak bisa dipakai dengan keyboard adalah kontradiksi. Target yang diterapkan:

- Kontras warna memenuhi **WCAG AA**
- Setiap kontrol form punya label yang terhubung
- Navigasi keyboard penuh
- `aria-live` pada angka dampak yang berubah, sehingga pengguna screen reader mendengar hasil simulasi
- Responsif 360 px – 1920 px

---

## 10. Dokumen Terkait

| Dokumen | Isi |
|---|---|
| [`COEFFICIENTS.md`](./COEFFICIENTS.md) | Sumber, status verifikasi, dan alasan setiap koefisien |
| [`PRD.md`](./PRD.md) | Spesifikasi produk: ruang lingkup, formula, arsitektur, timeline |
| [`AGENTS.md`](./AGENTS.md) | Konsep produk dan materi pitching |

---

## Lisensi

Dibuat untuk keperluan kompetisi ITechno Cup 2026.
