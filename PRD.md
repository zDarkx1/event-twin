# PRD — EventTwin

**Versi:** 1.1
**Tanggal:** 1 September 2026 (diperbarui 2 September 2026 — engine selesai, koefisien terkalibrasi)
**Deadline penyisihan:** 6 September 2026, 23.59 WIB
**Lomba:** ITechno Cup 2026 — Web Development (SMA/MA/SMK)

---

## 1. Ringkasan

EventTwin adalah *digital twin* kegiatan: pengguna mensimulasikan sebuah acara sebelum acara berlangsung, lalu membandingkan skenario penyelenggaraan pada empat dimensi — **sampah, energi, biaya, inklusi**.

**Pernyataan masalah.** Panitia acara mengambil keputusan (kemasan, pencahayaan, fasilitas) tanpa gambaran dampaknya. Dampak baru terlihat setelah acara selesai, ketika keputusan tidak bisa diubah.

**Pernyataan solusi.** Ubah keputusan → lihat empat angka dampak berubah seketika, sebelum acara terjadi.

**Metrik keberhasilan (untuk lomba).**
- Simulator berjalan tanpa error saat live demo.
- Perubahan input → keempat angka ter-update di bawah 100 ms (terasa instan).
- Setiap koefisien punya sumber yang bisa disebut saat Tanya Jawab juri.
- Skor inklusi menjawab frasa tema *"Inclusive Society"* secara eksplisit.

---

## 2. Ruang lingkup

### 2.1 Termasuk (v1 — target 6 September)

| # | Fitur | Prioritas |
|---|---|---|
| F1 | Event Builder — form input parameter acara | Wajib |
| F2 | Impact Estimator — hitung 4 dimensi dari input | Wajib |
| F3 | Scenario Simulator — what-if real-time | Wajib (killer) |
| F4 | Impact Dashboard — 4 kartu + komposisi sampah | Wajib |
| F5 | Scenario Comparison — baseline vs skenario berdampingan | Wajib |
| F6 | Recommendation Engine — urut dampak terbesar per rupiah | Wajib |
| F7 | AI Insight — narasi bahasa Indonesia atas hasil simulasi | Sebaiknya |
| F8 | Share via URL — encode parameter ke query string | Sebaiknya |
| F9 | Responsif mobile | Wajib (15% bobot) |

### 2.2 Tidak termasuk (non-goals)

- **Autentikasi & akun pengguna.** Tidak ada login. Killer feature tidak membutuhkannya.
- **Database.** State di React; persistensi lewat URL query + localStorage. Menambah Postgres untuk menyimpan tiga baris adalah keputusan teknis yang lemah, dan justru bisa dipertahankan di Q&A sebagai efisiensi teknologi.
- **Backend terpisah (Go/Docker).** Engine adalah perhitungan murni — API route Next.js cukup, dan tanpa network round-trip what-if justru lebih cepat.
- **Pencatatan sampah aktual pasca-acara.** Ini aplikasi keputusan pra-acara, bukan pelaporan.
- **Multi-bahasa.** Bahasa Indonesia saja.
- **AI sebagai penghitung.** AI hanya menarasikan angka yang sudah dihitung engine. Lihat §6.

---

## 3. Pengguna

**Persona utama — Panitia acara sekolah.**
Siswa/guru penanggung jawab festival, pentas seni, atau lomba internal. Punya anggaran terbatas, tidak punya latar belakang lingkungan, harus memutuskan konsumsi dan fasilitas beberapa minggu sebelum hari-H.

**Persona pendukung — Pengurus organisasi/komunitas.** Kebutuhan sama pada skala berbeda.

### User stories

| ID | Sebagai | Saya ingin | Supaya |
|---|---|---|---|
| US1 | panitia | memasukkan jumlah peserta dan durasi | mendapat estimasi awal dampak acara |
| US2 | panitia | mengganti kemasan disposable → reusable | melihat berapa kg sampah yang berkurang |
| US3 | panitia | mengubah jenis pencahayaan | melihat penghematan kWh dan rupiah |
| US4 | panitia | menandai fasilitas aksesibilitas yang tersedia | mengetahui seberapa inklusif acara saya |
| US5 | panitia | membandingkan dua skenario berdampingan | memilih yang paling seimbang |
| US6 | panitia | melihat rekomendasi terurut | tahu perubahan mana yang paling berdampak |
| US7 | panitia | membagikan tautan hasil simulasi | mendiskusikannya dengan panitia lain |

---

## 4. Spesifikasi fungsional

### 4.1 Input (F1)

| Field | Tipe | Rentang | Default |
|---|---|---:|---|
| `participants` | integer | 10–10.000 | 500 |
| `durationHours` | number | 1–24 | 6 |
| `eventType` | enum | `festival` \| `seminar` \| `competition` \| `bazaar` | `festival` |
| `mealsPerPerson` | number | 0–5 | 1 |
| `drinksPerPerson` | number | 0–8 | 2 |
| `foodPackaging` | enum | `disposable` \| `reusable` \| `mixed` | `disposable` |
| `drinkVessel` | enum | `plasticBottle` \| `refillStation` \| `mixed` | `plasticBottle` |
| `wasteBins` | enum | `none` \| `mixed` \| `segregated` | `mixed` |
| `lighting` | enum | `halogen` \| `led` | `halogen` |
| `soundSystemKw` | number | 0–20 | 3 |
| `powerSource` | enum | `pln` \| `generator` | `pln` |
| `accessibility` | set flag | ramp, toilet difabel, kursi prioritas, penerjemah isyarat, jalur pemandu, materi huruf besar | kosong |
| `estimatedDisabledGuests` | integer | 0–participants | 15 |

**Validasi.** Semua input numerik di-clamp ke rentang di atas sebelum masuk engine — diimplementasikan sebagai `clampParams()` di `src/lib/engine.ts`, termasuk penanganan `NaN` dan pembatasan `estimatedDisabledGuests` agar tidak melebihi `participants`. Ini batas kepercayaan sistem: nilai di luar rentang menghasilkan angka yang tidak masuk akal dan merusak kredibilitas saat demo.

### 4.2 Output — empat dimensi (F2)

**Dimensi 1 — Sampah (kg).**
```
sampahKemasan   = participants × mealsPerPerson × faktorKemasanMakanan
sampahMinuman   = participants × drinksPerPerson × faktorWadahMinum
sampahUmum      = participants × durationHours × faktorSampahUmumPerOrangJam
sampahOrganik   = participants × mealsPerPerson × faktorSisaMakanan
timbulan        = jumlah semua                          → waste.generatedKg
residuKeTPA     = timbulan × faktorResidu(wasteBins)    → waste.landfillKg
```
Timbulan dan residu ke TPA adalah **dua angka berbeda**. Pemilahan hanya mengurangi residu, tidak mengurangi timbulan — di UI, angka yang dipengaruhi `wasteBins` harus dilabeli "residu ke TPA". Komposisi dipecah: plastik, organik, kertas, lain-lain.

**Dimensi 2 — Energi (kWh) & emisi (kg CO₂).**
```
kWhPencahayaan = wattLampuPerPeserta × participants × durationHours / 1000
kWhSound       = soundSystemKw × durationHours
kWhTotal       = kWhPencahayaan + kWhSound
emisi          = kWhTotal × faktorEmisi(powerSource)
```
Faktor emisi resmi dinyatakan sebagai **CO₂**, bukan CO₂e — lihat `COEFFICIENTS.md` §2.

**Dimensi 3 — Biaya (Rp).**
```
biayaKonsumsi = participants × (mealsPerPerson × hargaMakanan(foodPackaging)
                             + drinksPerPerson × hargaMinum(drinkVessel))
biayaEnergi   = kWhTotal × tarifPerKwh(powerSource)
biayaSampah   = residuKeTPA × tarifAngkutPerKg
biayaAkses    = jumlah biaya fasilitas aksesibilitas yang dipilih
total         = jumlah semua
```
Biaya angkut mengikuti residu ke TPA, bukan timbulan bruto — yang diangkut itulah yang menimbulkan retribusi. Fasilitas reusable memerlukan investasi awal yang teramortisasi — dicatat terpisah sebagai `cost.reusableCapexRp` dan `cost.reusableAmortizedRp` agar tidak menyesatkan.

**Dimensi 4 — Skor inklusi (0–100).**
```
gap        = Σ bobot fasilitas yang TIDAK tersedia
needWeight = clamp(minNeedWeight + (1 − minNeedWeight) × (rasioDifabel / rasioAcuan),
                   minNeedWeight, 1)
skor       = clamp(100 − gap × needWeight, 0, 100)
```
Penalti bersifat **pengurangan atas celah fasilitas**, bukan perkalian atas skor dasar. Versi perkalian gagal justru di kasus terburuk: kalau tidak ada fasilitas sama sekali, skor dasar 0 dikali apa pun tetap 0, sehingga jumlah tamu difabel tidak berpengaruh. Bobot per fasilitas dan alasan parameternya ada di `COEFFICIENTS.md` §4.

**Sustainability score (0–100).** Agregat berbobot: sampah 35%, energi 25%, inklusi 25%, biaya 15%. Setiap dimensi dinormalisasi dengan mengenumerasi seluruh 108 kombinasi keputusan dari input numerik yang sama, sehingga skor tidak bergeser hanya karena jumlah peserta berbeda. Biaya fasilitas akses dikeluarkan dari dimensi biaya agar inklusi tidak dihukum dua kali.

### 4.3 Scenario Simulator (F3) — killer feature

Baseline dihitung dari input awal dan **dibekukan**. Setiap perubahan kontrol menghitung ulang skenario aktif dan menampilkan delta terhadap baseline.

Persyaratan: perhitungan sinkron, tanpa panggilan jaringan, di bawah 100 ms. Engine adalah fungsi murni — ini tercapai dengan sendirinya.

Momen demo: satu perubahan → empat angka bergerak serentak.

### 4.4 Rekomendasi (F6)

Engine menghitung ulang untuk setiap perubahan tunggal yang mungkin (ganti kemasan, ganti lampu, tambah ramp, dst.), lalu mengurutkan berdasarkan pengurangan dampak per rupiah. Menampilkan tiga teratas dengan angka konkret.

Contoh keluaran nyata dari engine (baseline 500 peserta, 6 jam): *"Ganti botol plastik → refill station: −15,0 kg timbulan, −Rp 3.109.660."* dan *"Tambah materi huruf besar: +6,8 poin inklusi, Rp 150.000"* — 45 poin inklusi per juta rupiah, empat kali lebih efisien daripada ramp (11 poin per juta).

### 4.5 AI Insight (F7)

Lihat §6. Bersifat pelengkap — jika API tidak tersedia, dashboard tetap berfungsi penuh.

---

## 5. Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router, TypeScript, Tailwind v4)           │
│                                                              │
│  ✅ src/lib/coefficients.ts    ← konstanta bersumber        │
│  ✅ src/lib/engine.ts          ← fungsi murni, deterministik │
│  ✅ src/lib/engine.test.ts     ← 32 test Vitest             │
│  ✅ scripts/demo-numbers.ts    ← generator angka demo       │
│  ⬜ src/lib/recommend.ts       ← urutkan dampak per rupiah  │
│  ⬜ src/app/page.tsx           ← simulator + dashboard      │
│  ⬜ src/app/api/insight/route.ts ← Claude (server-side)     │
└─────────────────────────────────────────────────────────────┘
```

Perintah: `npm test` (32 test), `npm run demo:numbers` (regenerasi angka dokumen), `npm run build`, `npm run dev`.

**Keputusan teknis dan alasannya (untuk Tanya Jawab juri).**

| Keputusan | Alasan |
|---|---|
| Rule-based engine, bukan AI | Angka harus deterministik dan bersumber; AI yang mengarang angka gagal di verifikasi |
| Tanpa database | Tidak ada data yang wajib persist untuk killer feature; share lewat URL query |
| Tanpa backend terpisah | Perhitungan murni; menghilangkan network round-trip membuat what-if terasa instan |
| Koefisien di satu file terdokumentasi | Bisa dikutip dan diaudit; bukan angka tersebar di komponen |
| API key hanya server-side | Route Handler, bukan client component — mencegah kebocoran kredensial |

---

## 6. Peran AI

**Yang dilakukan AI:** menarasikan hasil simulasi dalam bahasa Indonesia untuk panitia yang tidak punya latar belakang lingkungan.

**Yang tidak dilakukan AI:** menghitung, memperkirakan, atau mengubah angka apa pun.

Batas ini tegas karena juri akan menguji kredibilitas angka. Engine menghasilkan angka; AI menjelaskan artinya. System prompt melarang model mengubah nilai secara eksplisit.

Implementasi: `@anthropic-ai/sdk`, endpoint `/v1/messages`, `effort: "low"` (respons cepat untuk demo). Base URL dapat dikonfigurasi lewat env var sehingga endpoint Anthropic-compatible mana pun bisa dipakai. Key dibaca dari environment, tidak pernah masuk bundle klien.

Kegagalan AI ditangani dengan diam: jika request gagal atau ditolak, panel insight tidak muncul dan dashboard tetap utuh. Live demo tidak boleh bergantung pada jaringan.

---

## 7. Non-functional

| Aspek | Target |
|---|---|
| Waktu hitung ulang | < 100 ms |
| Responsif | 360 px – 1920 px |
| Aksesibilitas | Kontras WCAG AA, label form, navigasi keyboard, `aria-live` untuk angka yang berubah |
| Keamanan | Tanpa data pengguna; API key server-side; input di-clamp di batas |
| Hosting | Vercel |

Aksesibilitas bukan sekadar nilai UI/UX — aplikasi yang mengukur inklusi tapi tidak bisa dipakai dengan keyboard adalah kontradiksi yang akan ditanyakan juri.

---

## 8. Pemetaan ke kriteria penilaian

| Kriteria | Bobot | Cara dipenuhi |
|---|---:|---|
| Kesesuaian Tema & Subtema | 20% | SDG 11 + 7 + 9; dimensi Inklusi menjawab *"Inclusive Society"* langsung |
| Inovasi & Orisinalitas | 20% | Predictive simulator, bukan pencatatan; 4 dimensi sekaligus |
| Fungsionalitas | 20% | Enam fitur wajib berfungsi; simulator stabil |
| UI/UX & Responsivitas | 15% | Satu layar, empat kartu, mobile-first |
| Implementasi Teknologi | 15% | Next.js + TS; engine murni tertest; keputusan teknis beralasan |
| Dokumentasi & Repositori | 10% | README sesuai template, PRD, COEFFICIENTS bersumber |

Babak final: Live Demo 25% + Presentasi 25% → skenario demo di `AGENTS.md` §Demo Pitch.

---

## 9. Timeline

| Hari | Target | Status |
|---|---|---|
| 1 Sep | Scaffold, `coefficients.ts` | ✅ selesai |
| 2 Sep | `engine.ts` + 32 test, kalibrasi koefisien ke sumber primer, regenerasi angka dokumen | ✅ selesai |
| 3 Sep | Form input + 4 kartu dampak, hitung ulang real-time, `recommend.ts` | ⬜ |
| 4 Sep | Perbandingan skenario, responsif, AI insight, share URL, **deploy Vercel** | ⬜ |
| 5 Sep | README sesuai template, uji lintas perangkat, perbaikan | ⬜ |
| 6 Sep | Cadangan + kumpulkan (batas 23.59 WIB) | ⬜ |

Deploy dijadwalkan H-2, bukan hari terakhir. Masalah hosting yang muncul di hari terakhir tidak punya ruang perbaikan.

**Catatan jujur soal jadwal.** Rencana awal menargetkan form input dan empat kartu dampak selesai 2 Sep. Yang benar-benar selesai 2 Sep adalah engine, test, dan kalibrasi koefisien — UI belum mulai. Artinya beban 3–4 Sep sekarang lebih berat dari rencana. Prioritaskan F1–F5 (killer feature) dan biarkan F7 (AI insight) serta F8 (share URL) jadi yang pertama dilepas kalau waktu habis.

---

## 10. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Koefisien dipertanyakan juri | Kredibilitas runtuh | Setiap angka bersumber di `COEFFICIENTS.md`; sebut sumber saat pitching |
| Demo error saat final | Kehilangan 25% bobot | Engine murni tanpa jaringan; AI opsional; latihan demo |
| Waktu habis sebelum fitur selesai | Fungsionalitas turun | Killer feature dulu; F7–F8 boleh dilepas |
| Formula inklusi dianggap arbitrer | Pembeda utama melemah | Bobot terdokumentasi dengan alasan, bukan angka bulat tanpa dasar |
| Empat dimensi membingungkan pengguna | UI/UX turun | Satu layar, kartu sejajar, delta berwarna |
