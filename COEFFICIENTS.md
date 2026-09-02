# Koefisien Simulasi EventTwin

Dokumen ini adalah **satu-satunya sumber** koefisien yang dipakai `src/lib/engine.ts`. Tidak ada angka perhitungan yang ditulis langsung di komponen.

> ⚠️ **Wajib dibaca sebelum pitching.** Kolom **Status** menandai mana yang sudah terverifikasi dari sumber publik dan mana yang masih asumsi kalibrasi. Setiap angka berstatus `PERLU VERIFIKASI` harus dicek dan diperbarui sebelum 6 September — juri kemungkinan besar akan menanyakan asal angka, dan menyebut sumber yang belum dicek lebih merusak daripada mengakui itu asumsi.

Status yang dipakai:

| Kode | Arti |
|---|---|
| `PERLU VERIFIKASI` | Nilai awal untuk kalibrasi. Belum dicek ke sumber primer. |
| `TERVERIFIKASI` | Sudah dicek ke sumber primer; tanggal dan tautan dicatat. |
| `ASUMSI MODEL` | Tidak ada sumber publik; nilai adalah keputusan desain kami, dengan alasan tertulis. Sampaikan sebagai asumsi, bukan sebagai data. |

---

## 1. Sampah

### 1.1 Timbulan dasar

| Konstanta | Nilai | Satuan | Status | Sumber yang dituju |
|---|---:|---|---|---|
| `WASTE_GENERAL_PER_PERSON_HOUR` | 0,028 | kg/orang/jam | `PERLU VERIFIKASI` | SIPSN KLHK — timbulan sampah harian per kapita, dibagi rata per jam aktivitas |
| `WASTE_FOOD_RESIDUE_PER_MEAL` | 0,12 | kg/porsi | `PERLU VERIFIKASI` | Studi food waste acara/katering |

**Cara verifikasi `WASTE_GENERAL_PER_PERSON_HOUR`.** SIPSN mempublikasikan timbulan per kapita per hari (satuan kg/orang/hari). Angka itu mencakup sampah rumah tangga sehari penuh, bukan sampah acara. Untuk turunkan ke per-jam-acara, bagi dengan jam aktif harian dan sesuaikan — dan catat penyesuaiannya di sini. Jangan langsung pakai angka harian sebagai angka acara; itu akan melebih-lebihkan hasil dan mudah dibantah.

### 1.2 Kemasan makanan

| Pilihan | Nilai | Satuan | Status | Dasar |
|---|---:|---|---|---|
| `disposable` | 0,035 | kg/porsi | `PERLU VERIFIKASI` | Berat kotak makan kertas berlapis + sendok plastik |
| `mixed` | 0,018 | kg/porsi | `ASUMSI MODEL` | Titik tengah; asumsi 50% peserta pakai reusable |
| `reusable` | 0,004 | kg/porsi | `ASUMSI MODEL` | Bukan nol — tetap ada susut, tisu, dan kemasan bahan baku |

**Kenapa `reusable` bukan nol.** Reusable tetap menghasilkan sampah tidak langsung: tisu, kemasan bahan mentah, dan unit yang rusak. Menetapkan nol membuat model terlihat naif dan mudah dibantah dengan satu pertanyaan.

### 1.3 Wadah minuman

| Pilihan | Nilai | Satuan | Status | Dasar |
|---|---:|---|---|---|
| `plasticBottle` | 0,021 | kg/porsi | `PERLU VERIFIKASI` | Berat botol PET 600 ml + label + tutup |
| `mixed` | 0,011 | kg/porsi | `ASUMSI MODEL` | Titik tengah |
| `refillStation` | 0,001 | kg/porsi | `ASUMSI MODEL` | Cup susut/rusak |

### 1.4 Efek pemilahan

| Pilihan | Faktor sisa | Status | Alasan |
|---|---:|---|---|
| `none` | 1,00 | `ASUMSI MODEL` | Tanpa pemilahan, seluruh timbulan masuk residu |
| `mixed` | 0,92 | `ASUMSI MODEL` | Sebagian terpungut informal |
| `segregated` | 0,74 | `ASUMSI MODEL` | Organik dan daur ulang terpisah dari residu |

**Penting untuk Q&A.** Pemilahan **tidak mengurangi timbulan sampah** — ia mengurangi sampah yang berakhir di TPA. Di UI, angka yang terpengaruh harus diberi label "residu ke TPA", bukan "total sampah". Salah label di sini adalah kekeliruan konsep, bukan sekadar kekeliruan angka.

### 1.5 Komposisi

Total dipecah untuk grafik komposisi:

| Fraksi | Asal |
|---|---|
| Plastik | kemasan makanan + wadah minuman |
| Organik | sisa makanan |
| Kertas | porsi kemasan berbahan kertas |
| Lain-lain | timbulan umum |

---

## 2. Energi dan emisi

| Konstanta | Nilai | Satuan | Status | Sumber yang dituju |
|---|---:|---|---|---|
| `LIGHTING_HALOGEN_W_PER_PERSON` | 12 | watt/orang | `ASUMSI MODEL` | Perkiraan kebutuhan penerangan area per peserta, lampu halogen |
| `LIGHTING_LED_W_PER_PERSON` | 4 | watt/orang | `ASUMSI MODEL` | Rasio ±1:3 terhadap halogen pada lumen setara |
| `EMISSION_FACTOR_PLN` | 0,87 | kg CO₂e/kWh | `PERLU VERIFIKASI` | Faktor emisi grid sistem Jawa-Bali, Kementerian ESDM |
| `EMISSION_FACTOR_GENERATOR` | 0,72 | kg CO₂e/kWh | `PERLU VERIFIKASI` | Faktor emisi pembakaran diesel genset |

**Cara verifikasi faktor emisi PLN.** Kementerian ESDM menerbitkan faktor emisi grid per sistem kelistrikan (Jawa-Bali, Sumatera, dst.) dan angkanya berubah tiap tahun seiring bauran energi. Catat **sistem mana** dan **tahun berapa** yang dipakai di baris ini setelah dicek. Menyebut satu angka nasional tanpa menyebut sistem dan tahun adalah celah yang mudah ditanyakan.

**Rasio LED:halogen.** Rasio 1:3 adalah penyederhanaan yang umum diterima. Jika ada waktu, ganti dengan perbandingan lumen/watt dari label daya produk nyata dan catat produknya di sini.

---

## 3. Biaya

| Konstanta | Nilai | Satuan | Status | Catatan |
|---|---:|---|---|---|
| `PRICE_MEAL_DISPOSABLE` | 15.000 | Rp/porsi | `ASUMSI MODEL` | Harga katering sekolah; **kalibrasi ke harga lokal** |
| `PRICE_MEAL_REUSABLE` | 14.000 | Rp/porsi | `ASUMSI MODEL` | Lebih murah per porsi, ada investasi awal |
| `PRICE_MEAL_MIXED` | 14.500 | Rp/porsi | `ASUMSI MODEL` | Titik tengah |
| `PRICE_DRINK_BOTTLE` | 4.000 | Rp/porsi | `ASUMSI MODEL` | Botol air mineral 600 ml |
| `PRICE_DRINK_REFILL` | 900 | Rp/porsi | `ASUMSI MODEL` | Air isi ulang + cup |
| `PRICE_DRINK_MIXED` | 2.450 | Rp/porsi | `ASUMSI MODEL` | Titik tengah |
| `TARIFF_PLN_PER_KWH` | 1.444,70 | Rp/kWh | `PERLU VERIFIKASI` | Tarif PLN golongan non-subsidi — **sebutkan golongannya** |
| `TARIFF_GENERATOR_PER_KWH` | 3.200 | Rp/kWh | `ASUMSI MODEL` | Konsumsi diesel + sewa genset |
| `COST_WASTE_HAULING_PER_KG` | 700 | Rp/kg | `ASUMSI MODEL` | Retribusi angkut; sangat bervariasi antardaerah |

**Investasi awal reusable** (dicatat terpisah, tidak dicampur ke biaya operasional):

| Item | Nilai | Satuan | Status |
|---|---:|---|---|
| `CAPEX_REUSABLE_SET_PER_PERSON` | 25.000 | Rp/orang | `ASUMSI MODEL` |
| `REUSABLE_EXPECTED_USES` | 30 | kali pakai | `ASUMSI MODEL` |

Biaya teramortisasi = `CAPEX / REUSABLE_EXPECTED_USES`. Menyembunyikan investasi awal membuat reusable tampak gratis — itu tidak jujur dan akan ditanyakan.

**Harga adalah variabel paling lokal di model ini.** Sebelum pitching, sesuaikan ke harga di kota kalian dan catat kotanya di sini. Harga yang jelas tidak masuk akal untuk daerah juri adalah target pertanyaan yang mudah.

---

## 4. Skor inklusi (0–100)

Seluruh bagian ini berstatus `ASUMSI MODEL`. Tidak ada standar tunggal yang memberi bobot numerik untuk fasilitas acara, jadi ini **rubrik desain kami** — sampaikan sebagai rubrik, bukan sebagai standar.

### 4.1 Bobot fasilitas

| Fasilitas | Bobot | Alasan bobot |
|---|---:|---|
| Ramp / jalur kursi roda | 25 | Tanpa ini, akses fisik ke lokasi tertutup sama sekali |
| Toilet difabel | 20 | Menentukan berapa lama seseorang bisa bertahan di acara |
| Kursi prioritas | 12 | Melayani lansia, ibu hamil, disabilitas tak terlihat |
| Penerjemah bahasa isyarat | 18 | Satu-satunya akses ke isi acara bagi tuli |
| Jalur pemandu / penanda taktil | 15 | Navigasi mandiri bagi tunanetra |
| Materi huruf besar / kontras tinggi | 10 | Low vision; biaya paling rendah, sering terlewat |

Total bobot = 100.

**Dasar penetapan bobot.** Fasilitas yang **memblokir akses sepenuhnya** jika tidak ada (ramp, penerjemah, jalur pemandu) diberi bobot lebih tinggi daripada yang **mengurangi kenyamanan** (kursi prioritas, materi huruf besar). Prinsip ini yang harus disampaikan saat ditanya — bukan angkanya.

### 4.2 Penyesuaian rasio kebutuhan

Skor dasar adalah jumlah bobot fasilitas yang tersedia. Skor itu lalu dikoreksi:

```
rasioDifabel = estimatedDisabledGuests / participants
skor         = skorDasar × (1 − penalti)
penalti      = clamp(rasioDifabel × 2 × (1 − skorDasar/100), 0, 0,3)
```

Artinya: **fasilitas minim lebih berat konsekuensinya** ketika proporsi tamu difabel tinggi. Acara dengan 200 tamu difabel dan tanpa ramp lebih gagal secara inklusi daripada acara dengan 2 tamu difabel dan kondisi yang sama.

Penalti dibatasi 0,3 agar tidak menghapus skor sepenuhnya — fasilitas yang sudah ada tetap punya nilai.

### 4.3 Biaya fasilitas

| Fasilitas | Nilai | Satuan | Status |
|---|---:|---|---|
| Ramp portabel | 1.500.000 | Rp | `ASUMSI MODEL` |
| Toilet difabel (sewa) | 2.000.000 | Rp | `ASUMSI MODEL` |
| Kursi prioritas | 300.000 | Rp | `ASUMSI MODEL` |
| Penerjemah isyarat | 1.200.000 | Rp | `ASUMSI MODEL` |
| Jalur pemandu | 800.000 | Rp | `ASUMSI MODEL` |
| Materi huruf besar | 150.000 | Rp | `ASUMSI MODEL` |

Biaya ini yang membuat rekomendasi "dampak per rupiah" bermakna: materi huruf besar memberi 10 poin inklusi dengan biaya paling rendah — temuan yang berguna dan tidak jelas tanpa model.

---

## 5. Sustainability score

Agregat 0–100 dari empat dimensi yang sudah dinormalisasi:

| Dimensi | Bobot | Alasan |
|---|---:|---|
| Sampah | 35% | Dampak utama dan paling terlihat pada acara |
| Energi | 25% | Terhubung ke SDG 7 |
| Inklusi | 25% | Pembeda utama; menjawab tema *Inclusive Society* |
| Biaya | 15% | Kendala praktis, bukan tujuan keberlanjutan |

Status: `ASUMSI MODEL`. Bobot ini adalah pilihan desain. Yang perlu dipertahankan saat Q&A adalah **alasan urutannya**, bukan angka persennya.

Normalisasi memakai skenario terburuk yang mungkin dari input yang sama sebagai pembanding, sehingga skor tidak berubah drastis hanya karena jumlah peserta berbeda.

---

## 6. Prinsip yang harus dipegang

1. **Satu file, satu sumber.** Tidak ada koefisien di komponen UI.
2. **Setiap angka punya baris di dokumen ini** dengan status dan alasan.
3. **Asumsi disebut asumsi.** Menyebut sumber yang belum dicek jauh lebih merusak daripada mengakui asumsi dengan alasan yang jelas.
4. **Prioritas verifikasi:** faktor emisi PLN → tarif PLN → timbulan SIPSN → berat kemasan. Empat ini yang paling mungkin ditanyakan.
5. **Perubahan koefisien = perubahan hasil demo.** Setelah verifikasi, jalankan ulang skenario demo dan perbarui angka di `AGENTS.md` dan `PRD.md`.
