# EventTwin

## Konsep

**EventTwin** adalah *digital twin* sebuah kegiatan: pengguna mensimulasikan sebuah acara **sebelum acara berlangsung**, lalu membandingkan beberapa skenario penyelenggaraan untuk menemukan pilihan dengan **sampah, konsumsi energi, biaya paling rendah dan tingkat inklusivitas paling tinggi**.

> Bukan aplikasi pencatatan. EventTwin membantu panitia mengambil keputusan sebelum dampaknya muncul — lingkungan, biaya, maupun akses.

## Masalah

Pengelolaan acara umumnya dipikirkan setelah acara selesai. Akibatnya:

- jumlah sampah dan konsumsi energi sulit diprediksi;
- kebutuhan tempat sampah, listrik, dan anggaran meleset;
- penggunaan disposable packaging berlebihan;
- **aksesibilitas peserta difabel/lansia jarang direncanakan** — acara jadi tidak inklusif;
- panitia tak punya gambaran dampak dari keputusan sebelum acara.

## Solusi

Pengguna memasukkan parameter kegiatan:

- jumlah & profil peserta (termasuk perkiraan peserta difabel/lansia);
- durasi acara;
- jenis acara;
- konsumsi makanan/minuman & jenis kemasan;
- sumber & perkiraan pemakaian energi (lampu, sound system, genset/PLN);
- fasilitas pengelolaan sampah;
- fasilitas akses (ramp, toilet difabel, kursi prioritas, penerjemah isyarat).

Sistem membuat *digital twin* acara dan membandingkan beberapa skenario pada 4 dimensi: **Sampah · Energi · Biaya · Inklusi**.

### Contoh

**Acara:** Festival sekolah **Peserta:** 500 orang, 6 jam

Angka di bawah dihasilkan `npm run demo:numbers` dari engine, bukan ditulis manual.

| Skenario | Timbulan | Residu ke TPA | Energi | Emisi | Biaya operasional | Inklusi | Sustainability |
|---|---:|---:|---:|---:|---:|---:|---:|
| Disposable | 99,5 kg | 91,5 kg | 54,0 kWh | 47,0 kg CO₂ | Rp 13.242.092 | 32 / 100 | 15 / 100 |
| Reusable | 75,5 kg | 69,5 kg | 54,0 kWh | 47,0 kg CO₂ | Rp 10.436.636 | 32 / 100 | 47 / 100 |
| Reusable + akses & energi efisien | 75,5 kg | 55,9 kg | 30,0 kWh | 26,1 kg CO₂ | Rp 16.342.450 | 100 / 100 | 96 / 100 |

Perhatikan: skenario ketiga **lebih mahal** karena enam fasilitas aksesibilitas menambah Rp 5,95 juta. Itu memang temuan modelnya — inklusi tidak gratis, dan panitia perlu melihat trade-off itu secara eksplisit, bukan disembunyikan.

## Killer Feature

### Scenario Simulator (what-if real-time)

Pengguna mengubah keputusan dan melihat dampak **seketika** di depan layar.

Contoh:

> Bagaimana jika 70% botol plastik diganti refill station, LED menggantikan lampu halogen, dan ditambah 2 ramp?

Sistem memperbarui langsung:
- estimasi volume & jenis sampah;
- konsumsi energi (kWh) & emisi CO₂;
- biaya penyelenggaraan;
- **skor inklusi**;
- kebutuhan tempat sampah & titik daya.

> **Momen demo:** ubah satu keputusan → keempat angka dampak bergerak serentak.

## Fitur Utama

### 1. Event Builder
Membuat *twin* acara dari karakteristik kegiatan.

### 2. Impact Estimator
Mengestimasi sampah, energi (kWh), emisi CO₂, dan biaya dari parameter kegiatan.

### 3. Inclusion Scorer
Menghitung skor inklusi (0–100) dari rasio fasilitas akses terhadap profil peserta. **Ini dimensi pembeda yang menjawab tema "Inclusive Society".**

### 4. Scenario Comparison
Membandingkan beberapa strategi acara berdampingan pada 4 dimensi.

### 5. Impact Dashboard
Total sampah, komposisi, konsumsi energi, biaya, skor inklusi, sustainability score.

### 6. Recommendation Engine
Merekomendasikan perubahan dengan dampak terbesar per rupiah.

> Mengganti botol plastik dengan refill station mengurangi 15,0 kg timbulan sampah dan menghemat Rp 2.299.660; menambah 1 ramp menaikkan skor inklusi +17,1 poin.

## Contoh User Flow

```text
Create Event
    ↓
Input Participants (+ profil aksesibilitas)
    ↓
Input Food, Beverage & Energy
    ↓
Choose Packaging & Access Facilities
    ↓
Generate Twin
    ↓
Compare Scenarios (Sampah · Energi · Biaya · Inklusi)
    ↓
Apply Recommendation
    ↓
Final Sustainability & Inclusion Plan
```

## Teknologi yang Dipakai

- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS v4
- **Rule-based simulation engine** (inti nilai teknis, bukan AI) — `src/lib/engine.ts`, fungsi murni, 210 test Vitest (38 engine + 36 layout/denah + 15 rekomendasi + 26 workspace/draf + 25 validasi request + 24 share URL + 14 easing + 10 count-up + 10 prompt AI + 8 rate limit + 4 print)
- Grafik komposisi: **flexbox murni**, tanpa chart library. Satu batang part-to-whole adalah pembagian lebar proporsional — `flex-grow` melakukannya persis di setiap lebar layar, tanpa sumbu dan tanpa JavaScript saat resize. Recharts terpasang tapi tidak dipakai di UI.
- **Tanpa database, tanpa autentikasi.** State di React; share lewat URL query, draf tersimpan otomatis di localStorage perangkat. PRD §2.2 menjelaskan alasannya, dan itu justru bisa dipertahankan sebagai efisiensi teknologi.

AI tidak jadi inti. Nilai teknis diletakkan pada *simulation engine*, model perhitungan, dan **koefisien yang bersumber jelas** (bukan angka karangan).

## Kredibilitas Angka (wajib — antisipasi Tanya Jawab Juri)

Rinciannya di `COEFFICIENTS.md`; empat koefisien prioritas sudah **terverifikasi ke sumber primer** per 2 September 2026:

| Koefisien | Nilai | Sumber |
|---|---:|---|
| Timbulan sampah nasional | 0,48 kg/orang/hari | SIPSN/SIKPSN, Kementerian Lingkungan Hidup (2026) |
| Komposisi sampah nasional | sisa makanan 40,2%, plastik 20,2% | SIPSN Portal Indikatif, 2025 periode 2 |
| Faktor emisi grid | 0,87 ton CO₂/MWh (JAMALI, data 2019) | Kepmen ESDM No. 163.K/HK.02/MEM.S/2021 |
| Tarif listrik | Rp 1.444,70/kWh (B-2/TR) | Permen ESDM No. 7/2024 Lampiran III, berlaku TW III 2026 |
| Berat kemasan & botol | kotak 20 g, sendok 2,2 g, botol PET 600 ml 14,5 g | Lembar spesifikasi BioPak, Fuling, Toko Plastik |

Tiga hal yang **wajib disebut dengan tepat** saat pitching:

1. Faktor emisi 0,87 satuannya **kg CO₂/kWh, bukan CO₂e**, dan spesifik grid **Jawa-Madura-Bali** — bukan nasional. Luar Jawa-Bali beda jauh (Kalbar 1,63; Sumatera 0,94).
2. Tarif Rp 1.444,70 adalah golongan **B-2/TR (bisnis)**. Kalau venue-nya sekolah dengan sambungan sosial S-2/TR, tarifnya Rp 900/kWh.
3. Angka sisa makanan 0,115 kg/porsi berasal dari **WRAP UK 2013**, bukan data Indonesia. Sebutkan asalnya.

Yang masih **asumsi model** dan harus disampaikan sebagai asumsi: tarif genset, retribusi angkut, watt pencahayaan per orang, faktor pemilahan, biaya fasilitas akses, seluruh rubrik bobot inklusi. Harga katering dan minuman sudah dikalibrasi ke daftar harga terbitan Jabodetabek (COEFFICIENTS.md §3.1).

> Koefisien disimpan di satu file konstanta terdokumentasi (`src/lib/coefficients.ts`), bukan hardcode tersebar. Angka demo digenerate dari engine lewat `npm run demo:numbers` — bukan ditulis manual — supaya dokumen dan aplikasi tidak pernah menampilkan angka berbeda saat live demo.

## SDG

Utama:
- **SDG 11 — Kota dan Komunitas Berkelanjutan**
- **SDG 7 — Energi Bersih dan Terjangkau** (dimensi energi)

Pendukung:
- **SDG 9 — Industri, Inovasi, dan Infrastruktur**

> Menyentuh 3 dari 4 SDG tema sekaligus, dengan dimensi **Inklusi** yang langsung menjawab frasa *"Inclusive Society"*.

## Nilai Unik

EventTwin mengubah:

> "Bagaimana cara mengelola acara?"

menjadi:

> **"Bagaimana keputusan kita hari ini memengaruhi sampah, energi, biaya, dan akses acara besok?"**

## Tantangan Teknis

- membuat model estimasi yang masuk akal dan bersumber;
- merancang formula skor inklusi yang adil;
- membuat perubahan input terasa real-time;
- menjaga 4 dimensi tetap mudah dipahami dalam satu layar;
- realistis tanpa data lapangan kompleks.

## Demo Pitch

1. Buat twin acara 500 orang, 6 jam.
2. Tampilkan baseline: 99,5 kg timbulan (91,5 kg residu ke TPA), 54 kWh, Rp 13,2 jt, inklusi 32, sustainability 15.
3. Terapkan skenario reusable + refill station + LED + pemilahan + akses lengkap.
4. Empat angka bergerak serentak: 75,5 kg timbulan (55,9 kg residu), 30 kWh, Rp 16,3 jt, inklusi 100 → sustainability 96.
5. Tunjukkan rekomendasi berdampak terbesar per rupiah: refill station (−15,0 kg, −Rp 2,3 jt) dan materi huruf besar (+6,8 poin inklusi, Rp 150 rb).
6. Bandingkan dua skenario secara visual.

> **Jujur soal biaya saat demo.** Total biaya skenario 3 justru naik karena fasilitas akses Rp 5,95 juta, walau konsumsi dan energi turun. Sampaikan itu apa adanya — model yang menyembunyikan biaya inklusi akan gagal di pertanyaan pertama juri, dan trade-off ini justru bukti modelnya bekerja.

**Momen demo:** perubahan keputusan → dampak 4 dimensi berubah langsung.

---
