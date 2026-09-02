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

**Acara:** Festival sekolah **Peserta:** 500 orang

| Skenario | Sampah | Energi | Biaya | Skor Inklusi |
|---|---:|---:|---:|---:|
| Disposable | 42 kg | 120 kWh | Rp 8,5 jt | 45 / 100 |
| Reusable | 27 kg | 108 kWh | Rp 7,2 jt | 45 / 100 |
| Reusable + akses & energi efisien | 24 kg | 78 kWh | Rp 6,8 jt | 82 / 100 |

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

> Mengganti disposable cup dengan reusable berpotensi mengurangi 8,2 kg sampah; menambah 1 ramp menaikkan skor inklusi +15.

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

## Potensi Teknologi

- Next.js / React + TypeScript
- Tailwind CSS
- PostgreSQL / Supabase
- Chart library (Recharts)
- **Rule-based simulation engine** (inti nilai teknis, bukan AI)

AI tidak harus jadi inti. Nilai teknis diletakkan pada *simulation engine*, model perhitungan, dan **koefisien yang bersumber jelas** (bukan angka karangan).

## Kredibilitas Angka (wajib — antisipasi Tanya Jawab Juri)

Setiap koefisien harus punya sumber yang bisa disebut saat pitching:
- faktor timbulan sampah per orang → rujuk data KLHK / SIPSN;
- faktor emisi listrik → faktor emisi grid PLN (kg CO₂/kWh);
- konsumsi daya alat → label daya perangkat.

> `ponytail:` koefisien disimpan di satu tabel konstanta terdokumentasi (bukan hardcode tersebar); upgrade ke input berbasis wilayah bila ada waktu.

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

1. Buat twin acara 500 orang.
2. Tampilkan baseline: 42 kg sampah, 120 kWh, Rp 8,5 jt, inklusi 45.
3. Terapkan skenario reusable + energi efisien + akses.
4. Empat angka turun/naik serentak: 24 kg, 78 kWh, Rp 6,8 jt, inklusi 82.
5. Tunjukkan rekomendasi berdampak terbesar.
6. Bandingkan dua skenario secara visual.

**Momen demo:** perubahan keputusan → dampak 4 dimensi berubah langsung.

---
