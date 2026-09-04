# Koefisien Simulasi EventTwin

Dokumen ini adalah **satu-satunya sumber** koefisien yang dipakai `src/lib/engine.ts`. Tidak ada angka perhitungan yang ditulis langsung di komponen.

> ⚠️ **Wajib dibaca sebelum pitching.** Kolom **Status** menandai mana yang sudah terverifikasi dari sumber publik dan mana yang masih asumsi kalibrasi. Setiap angka berstatus `PERLU VERIFIKASI` harus dicek dan diperbarui sebelum 6 September — juri kemungkinan besar akan menanyakan asal angka, dan menyebut sumber yang belum dicek lebih merusak daripada mengakui itu asumsi.

Status yang dipakai:

| Kode | Arti |
|---|---|
| `PERLU VERIFIKASI` | Nilai awal untuk kalibrasi. Belum dicek ke sumber primer. |
| `TERVERIFIKASI` | Sudah dicek ke sumber primer; tanggal dan tautan dicatat. |
| `ASUMSI MODEL` | Tidak ada sumber publik; nilai adalah keputusan desain kami, dengan alasan tertulis. Sampaikan sebagai asumsi, bukan sebagai data. |

**Verifikasi terakhir: 3 September 2026.** Empat koefisien prioritas (faktor emisi PLN, tarif PLN, timbulan SIPSN, berat kemasan) dicek ke sumber primer 2 September. **Harga konsumsi — pos biaya terbesar, 98,9% biaya operasional baseline — dikalibrasi ke daftar harga katering terbitan pada 3 September (§3.1).** Yang masih `ASUMSI MODEL`: biaya fasilitas akses, watt pencahayaan, tarif genset, retribusi angkut, dan rubrik bobot inklusi.

---

## 1. Sampah

### 1.1 Timbulan dasar

| Konstanta | Nilai | Satuan | Status | Sumber |
|---|---:|---|---|---|
| `WASTE.generalPerPersonHour` | 0,005 | kg/orang/jam | `TERVERIFIKASI` (turunan) | SIPSN/SIKPSN — Koefisien timbulan nasional 0,48 kg/orang/hari |
| `WASTE.foodResiduePerMeal` | 0,115 | kg/porsi | `TERVERIFIKASI` | WRAP (UK) 2013, *Overview of Waste in the UK Hospitality and Food Service Sector* |

**Sumber timbulan nasional.** Kementerian Lingkungan Hidup — SIPSN/SIKPSN, kartu indikator "Koefisien" pada dasbor nasional: **0,48 kg/orang/hari** (data 2026). Dasbor yang sama menampilkan penduduk 279.085.097 jiwa dan timbulan 144.348,77 ton/hari, yang rasionya memberi 0,5172 kg/orang/hari. Pembanding resmi: KLH Direktorat Persampahan (21 April 2026) memakai koefisien 0,49 kg/orang/hari. Rentang yang bisa dipertanggungjawabkan: **0,45–0,52 kg/orang/hari**.

- Dasbor: https://sampahnasional.kemenlh.go.id/
- KLH 21 April 2026: https://dml.or.id/wp-content/uploads/2026/05/Direktorat-Persampahan-KLH-21-April-2026.pdf

**Cara angka 0,005 diturunkan — penting untuk Q&A.** Angka SIPSN 0,48 kg/orang/hari adalah **seluruh** sampah domestik satu orang sepanjang hari, dan **tidak boleh** dipakai langsung sebagai sampah acara. Dua koreksi diterapkan:

1. **Ambil hanya fraksi yang belum dihitung terpisah.** Kemasan makanan, wadah minuman, dan sisa makanan sudah punya barisnya sendiri di §1.2–§1.3. Kalau timbulan umum juga mencakup fraksi itu, terjadi hitung ganda. Dari komposisi SIPSN 2025 (§1.5), fraksi yang tersisa — logam 2,88% + kain 2,58% + karet/kulit 2,02% + kaca 2,29% + lainnya 7,07% = **16,84%**.
2. **Bagi dengan jam aktif, bukan 24 jam.** Sampah tidak dihasilkan saat tidur. 16 jam aktif dipakai sebagai pembagi.

```
0,48 kg/orang/hari × 0,1684 ÷ 16 jam = 0,00505 → dibulatkan 0,005 kg/orang/jam
```

Baris ini karena itu mewakili **sampah umum saja** (tisu, brosur, tiket, kemasan kecil), bukan seluruh timbulan. Kalau juri menanyakan kenapa angkanya jauh di bawah 0,48, inilah jawabannya — dan angka utuh SIPSN tetap bisa disebut sebagai sumbernya.

**Sisa makanan per porsi.** WRAP 2013 melaporkan 920.000 ton sisa makanan/tahun di sektor jasa makanan UK dari 8 miliar porsi disajikan → 920.000.000 kg ÷ 8.000.000.000 = **0,115 kg/porsi**. Cakupannya seluruh sisa makanan outlet (21% spoilage, 45% preparasi, 34% piring konsumen), cocok untuk katering acara yang menanggung dapur dan prasmanan.

- https://www.wrap.ngo/sites/default/files/2020-10/WRAP-Overview%20of%20Waste%20in%20the%20UK%20Hospitality%20and%20Food%20Service%20Sector%20FINAL.pdf

Batas bawah pembanding: Wang et al. 2017 (*Waste Management* 66:3–12, penimbangan 3.557 meja di 195 restoran) 0,093 kg/porsi untuk sisa piring saja. Batas atas: hotel bintang-3 Mesir (IJHTH 2017) 0,214 kg/pelanggan. **Rentang wajar 0,09–0,21 kg/porsi.**

> **Sebutkan asalnya.** Tidak ada angka kg-per-porsi nasional Indonesia yang bisa dikutip. Ini data sektor jasa makanan UK — sampaikan begitu, jangan diklaim sebagai data Indonesia. Konteks Indonesia yang bisa dipakai untuk narasi: UNEP *Food Waste Index* 2024 mencatat ~14,73 juta ton sisa makanan/tahun, dan SIPSN mencatat sisa makanan 40,2% dari timbulan nasional.

### 1.2 Kemasan makanan

| Pilihan | Nilai | Satuan | Status | Dasar |
|---|---:|---|---|---|
| `disposable` | 0,022 | kg/porsi | `TERVERIFIKASI` | Kotak kertas 750 ml 20 g + sendok plastik 2,2 g |
| `mixed` | 0,013 | kg/porsi | `ASUMSI MODEL` | Titik tengah; asumsi ~50% peserta pakai reusable |
| `reusable` | 0,004 | kg/porsi | `ASUMSI MODEL` | Bukan nol — tetap ada susut, tisu, dan kemasan bahan baku |

Komponen `disposable`:

- Kotak makan kertas berlapis 756 ml: **20 g** — BioPak BB-LBS-1, lembar spesifikasi produk (270 gsm). Konsisten lintas produsen: Ecozema 750 cc = 20–21 g.
  https://www.biopak.com/au/productpdf/download/file/id/1185/name/BB-LBS-1-small-bioboard-lunch-box-product-specifications.pdf/
- Sendok plastik sekali pakai: **2,2 g** — Fuling USA, spesifikasi *Medium Weight Cutlery* (rentang katalog 0,6–4,3 g untuk panjang 83–200 mm).
  https://www.fulingusa.com/medium-weight

**Nilai lama 0,035 kg dikoreksi ke bawah.** 35 g terlalu berat untuk asumsi yang dinyatakan ("kotak kertas + sendok"). 35 g baru wajar kalau satu porsi mencakup kotak dengan **tutup kertas terpisah** (base 17,66 g + lid 22 g ≈ 40 g), atau kotak + sendok + tisu + cup saus. Kalau nanti desainnya begitu, rinciannya harus ditulis eksplisit di sini.

**Kenapa `reusable` bukan nol.** Reusable tetap menghasilkan sampah tidak langsung: tisu, kemasan bahan mentah, dan unit yang rusak. Menetapkan nol membuat model terlihat naif dan mudah dibantah dengan satu pertanyaan.

### 1.3 Wadah minuman

| Pilihan | Nilai | Satuan | Status | Dasar |
|---|---:|---|---|---|
| `plasticBottle` | 0,016 | kg/porsi | `TERVERIFIKASI` | Botol PET 600 ml badan+tutup 14,5 g + label 0,3 g |
| `mixed` | 0,0085 | kg/porsi | `ASUMSI MODEL` | Titik tengah |
| `refillStation` | 0,001 | kg/porsi | `ASUMSI MODEL` | Cup PP 2,5 g dibagi ~3 kali pakai |

Sumber botol PET 600 ml:

- Supplier Indonesia, badan + tutup: **14,5 g** — Toko Plastik ("Berat: 14,5 gr"). Jordan Plastics: 14 g (ECO) dan 15 g (HF).
  https://tokoplastik.co.id/product/botol-600ml/
- Badan botol saja: **12 g** — Delta El Nile, SKU DEN-WATER-12-29-25 (preform 600 ml still water, leher 29/25, toleransi ±0,2 g).
  https://www.deltaelnile.com/en/sku/den-water-12-29-25.html
- Tutup 29/25: **1,28–1,30 g** — Wisecap "Frankie", ALPLA GME30.26 Lanzarote.
- Label wrap-around: **0,31 g** (PP) — Politecnico di Milano, tesi LCA Tabel 16.
- Penimbangan sampel pasar 500 ml lengkap: **15,15 g** (badan 12,72 + tutup 2,12 + label 0,31), diskala ke 600 ml ≈ 16–18 g.

**Nilai lama 0,021 kg dikoreksi ke bawah 20–35%.** 21 g hanya bisa dibela kalau mengutip data lama Amerika (NC DEQ, laporan 2008: botol 20 oz = 23,83 g) — bukan botol hasil *lightweighting* sekarang. Rata-rata botol air 0,5 L di AS sudah 9,25 g pada 2014 (IBWA via Recycling Today).

**Cup refill station.** Cup kertas 280 ml = 7,59 g (BioPak BC-8); cup plastik PP 220 ml = 2,5 g (Sarana Kemasan). Angka 0,001 kg mengasumsikan cup PP dipakai ulang ~3 kali dalam satu acara. Kalau acaranya memakai cup sekali pakai murni, naikkan ke 0,0025 (PP) atau 0,0076 (kertas) — dan katakan begitu, jangan sembunyikan.

### 1.4 Efek pemilahan

| Pilihan | Faktor sisa | Status | Alasan |
|---|---:|---|---|
| `none` | 1,00 | `ASUMSI MODEL` | Tanpa pemilahan, seluruh timbulan masuk residu |
| `mixed` | 0,92 | `ASUMSI MODEL` | Sebagian terpungut informal |
| `segregated` | 0,74 | `ASUMSI MODEL` | Organik dan daur ulang terpisah dari residu |

**Penting untuk Q&A.** Pemilahan **tidak mengurangi timbulan sampah** — ia mengurangi sampah yang berakhir di TPA. Engine memisahkan keduanya secara eksplisit: `waste.generatedKg` (timbulan) tidak tersentuh pemilahan, `waste.landfillKg` (residu ke TPA) yang berubah. Di UI, angka yang terpengaruh harus diberi label "residu ke TPA", bukan "total sampah". Salah label di sini adalah kekeliruan konsep, bukan sekadar kekeliruan angka.

### 1.5 Komposisi

Total dipecah untuk grafik komposisi:

| Fraksi | Asal |
|---|---|
| Plastik | bagian plastik kemasan makanan + wadah minuman |
| Organik | sisa makanan |
| Kertas | bagian kertas kemasan makanan (`packagingPaperShare` = 0,90 untuk disposable) |
| Lain-lain | timbulan umum |

**Komposisi sampah nasional 2025** — `TERVERIFIKASI`, dipakai untuk menurunkan `generalPerPersonHour` di §1.1 dan sebagai pembanding saat pitching:

| Jenis | % berat basah |
|---|---:|
| Sisa makanan | 40,21 |
| Plastik | 20,16 |
| Kayu-ranting | 13,04 |
| Kertas/karton | 10,71 |
| Lainnya | 7,07 |
| Logam | 2,88 |
| Kain | 2,58 |
| Kaca | 2,29 |
| Karet/kulit | 2,02 |

Sumber: Kementerian Lingkungan Hidup — SIPSN, Portal Indikatif, Komposisi Sampah Berdasarkan Jenis Sampah, filter wilayah "Nasional", tahun 2025 periode 2 (304 kab/kota pelapor).
https://sampahnasional.kemenlh.go.id/portal-indikatif/data/komposisi-sampah

Jumlah sembilan komponen = 100,95% (portal tidak menormalisasi). Tren: sisa makanan stabil 39–41% sejak 2020, plastik naik perlahan 17,7% → 20,2%.

> **Catatan interpretasi.** Komposisi ini sampah rumah tangga + sejenis, bukan sampah acara. Di acara berkatering, pangsa sisa makanan lazimnya **jauh lebih tinggi** dan kayu-ranting mendekati nol. Pakai sebagai baseline dan sebutkan keterbatasannya.

---

## 2. Energi dan emisi

| Konstanta | Nilai | Satuan | Status | Sumber |
|---|---:|---|---|---|
| `ENERGY.lightingWattPerPerson.halogen` | 12 | watt/orang | `ASUMSI MODEL` | Perkiraan kebutuhan penerangan area per peserta |
| `ENERGY.lightingWattPerPerson.led` | 4 | watt/orang | `ASUMSI MODEL` | Rasio ±1:3 terhadap halogen pada lumen setara |
| `ENERGY.emissionFactor.pln` | 0,87 | kg CO₂/kWh | `TERVERIFIKASI` | Kepmen ESDM No. 163.K/HK.02/MEM.S/2021 |
| `ENERGY.emissionFactor.generator` | 0,72 | kg CO₂e/kWh | `PERLU VERIFIKASI` | Faktor emisi pembakaran diesel genset |

**Faktor emisi PLN — nilai benar, label perlu dikoreksi.** 0,87 terverifikasi, tapi tiga hal harus disebut dengan tepat saat pitching:

1. **Satuannya kg CO₂/kWh, bukan CO₂e.** Dokumen resmi menyatakan ton CO₂/MWh (= kg CO₂/kWh) sebagai CO₂ pembakaran saja. Menyebutnya "kg CO₂e/kWh" tidak tepat secara teknis walau angkanya sama.
2. **Ini spesifik grid Jawa-Madura-Bali (JAMALI)**, bukan nasional — Banten, DKI, Jabar, Jateng, DIY, Jatim, Bali; 302 pembangkit. Sistem lain berbeda jauh: Sumatera 0,94; Sulselbar 0,95; Sulutgo 0,78; Khatulistiwa (Kalbar) 1,63; Barito (Kalteng) 1,31; Lombok 1,61. **Kalau acaranya di luar Jawa-Bali, ganti ke nilai sistem setempat.**
3. **Basis datanya 2019**, ditetapkan 30 Agustus 2021, dan masih penetapan resmi terbaru per September 2026 — Ditjen Ketenagalistrikan belum menerbitkan faktor emisi tahun >2019. Jadi tidak kedaluwarsa secara hukum, walau datanya lama.

0,87 adalah Combined Margin ex-post (bobot OM 0,5 / BM 0,5). Komponennya: OM 0,80; BM 0,94. Untuk PLTS/PLTB dipakai 0,84.

**Kalimat kutipan yang disarankan:** *"Faktor emisi grid Jawa-Madura-Bali 0,87 ton CO₂/MWh (Combined Margin, data 2019) — Kepmen ESDM No. 163.K/HK.02/MEM.S/2021."*

- https://jdih.esdm.go.id/dokumen/view?id=2183
- https://gatrik.esdm.go.id/assets/uploads/download_index/files/96d7c-nilai-fe-grk-sistem-ketenagalistrikan-tahun-2019.pdf

**Rasio LED:halogen.** Rasio 1:3 adalah penyederhanaan yang umum diterima. Kalau ada waktu, ganti dengan perbandingan lumen/watt dari label daya produk nyata dan catat produknya di sini.

---

## 3. Biaya

| Konstanta | Nilai | Satuan | Status | Catatan |
|---|---:|---|---|---|
| `COST.mealPerPortion.disposable` | 21.000 | Rp/porsi | `TERVERIFIKASI` | Nasi box paket ekonomis Jabodetabek; titik tengah rentang terbit Rp 19.000–23.000 |
| `COST.mealPerPortion.reusable` | 20.000 | Rp/porsi | `TERVERIFIKASI` | Prasmanan tier terendah — sudah termasuk peralatan makan, meja, waiters |
| `COST.mealPerPortion.mixed` | 20.500 | Rp/porsi | `ASUMSI MODEL` | Titik tengah dua nilai di atas |
| `COST.drinkPerPortion.plasticBottle` | 2.600 | Rp/porsi | `TERVERIFIKASI` | Karton 24 × 600 ml, median 12 penawaran Rp 63.250 ÷ 24 = Rp 2.635 |
| `COST.drinkPerPortion.refillStation` | 310 | Rp/porsi | `TERVERIFIKASI` (turunan) | Air isi ulang Rp 1.000/L × 0,25 L + cup PP Rp 180 ÷ 3 pakai |
| `COST.drinkPerPortion.mixed` | 1.455 | Rp/porsi | `ASUMSI MODEL` | Titik tengah dua nilai di atas |
| `COST.tariffPerKwh.pln` | 1.444,70 | Rp/kWh | `TERVERIFIKASI` | B-2/TR, Permen ESDM No. 7/2024 Lampiran III |
| `COST.tariffPerKwh.generator` | 3.200 | Rp/kWh | `ASUMSI MODEL` | Konsumsi diesel + sewa genset |
| `COST.wasteHaulingPerKg` | 700 | Rp/kg | `ASUMSI MODEL` | Retribusi angkut; sangat bervariasi antardaerah |

### 3.1 Harga konsumsi — kalibrasi 3 September 2026

Ini pos biaya terbesar: **98,9% biaya operasional baseline**. Sebelumnya seluruhnya `ASUMSI MODEL`; sekarang dikalibrasi ke daftar harga terbitan.

**Makanan.** Dua jenis layanan yang berbeda, bukan satu harga dinaik-turunkan:

| Layanan | Harga terbit | Dipakai untuk |
|---|---:|---|
| Nasi box paket ekonomis | Rp 19.000–23.000/porsi | `disposable` → 21.000 (titik tengah) |
| Prasmanan tier terendah | Rp 20.000/pax | `reusable` → 20.000 |

- Nasi box: Rumah Tumpeng Jakarta menyebut "mulai Rp 19.000 per porsi" dan "paket ekonomis Rp 19.000–23.000"; cateringprasmanan.com menampilkan Rp 23.000/25.000/28.000 untuk menu nasi box.
  https://rumahtumpengjakarta.com/nasi-kotak2/ · https://www.cateringprasmanan.com/menu-nasi-box/
- Prasmanan: cateringprasmanan.com dan spyneter.com sama-sama membuka daftar pada **Rp 20.000/pax**, dengan keterangan "sudah meliputi biaya peralatan, tenaga waiters".
  https://www.cateringprasmanan.com/menu-prasmanan/ · https://www.spyneter.com/menu-prasmanan/

**Kenapa `reusable` lebih murah daripada `disposable`, bukan sebaliknya.** Ini pertanyaan yang paling mungkin diajukan juri. Pada prasmanan, katering tidak membeli kotak dan sendok sekali pakai untuk 500 porsi — peralatan makan sudah termasuk dalam harga pax dan dipakai berulang. Selisihnya kecil (Rp 1.000/porsi) dan model tetap mencatat **investasi awal reusable terpisah** (§3.2), jadi penghematannya tidak dilebih-lebihkan.

**Minuman.** Satu porsi = satu botol 600 ml, atau satu cup ±250 ml dari refill station.

- Botol: harga **karton 24 × 600 ml**, bukan ritel satuan — acara 500 orang membeli per karton. Median 12 penawaran pasar (Rp 44.000–87.344) = **Rp 63.250/karton** → Rp 2.635/botol, dibulatkan **2.600**. Harga ritel satuan Aqua 600 ml Rp 3.000–3.800 (Klik Indomaret, Alfagift) dipakai sebagai batas atas, bukan sebagai nilai model.
- Refill: situs Aqua menyebut isi ulang galon 19 L ≈ **Rp 1.000/liter**; 0,25 L = Rp 250. Cup PP 220 ml Rp 9.000/50 pcs = Rp 180/cup, dibagi ~3 kali pakai = Rp 60. Total **Rp 310**.
  https://www.liputan6.com/bisnis/read/8280754/daftar-harga-galon-air-minum-terbaru-2026-dari-merek-nasional-sampai-lokal

**Yang belum dimodelkan, dan harus disebut kalau ditanya:** sewa dispenser refill station, ongkos kirim katering, dan PPN. Ketiganya menambah biaya absolut tapi tidak mengubah arah perbandingan antarskenario.

**Batas geografis.** Seluruh harga di atas pasar **Jabodetabek**. Di kota lain harganya berbeda; kalau acaranya di luar Jabodetabek, ganti angkanya dan katakan bahwa angka bawaan model adalah harga Jabodetabek.


### 3.2 Tarif listrik

**Tarif PLN — terverifikasi dan masih berlaku.** Rp 1.444,70/kWh terbaca langsung di Permen ESDM No. 7 Tahun 2024 Lampiran III: golongan **B-2/TR** (Bisnis, Tegangan Rendah, 6.600 VA s.d. 200 kVA), reguler dan prabayar sama. Status berlaku dikonfirmasi Siaran Pers ESDM No. 038.Pers/04/SJI/2026 (30 Juni 2026): tarif tidak naik untuk Triwulan III 2026.

- https://jdih.esdm.go.id/dokumen/download?id=Permen+ESDM+Nomor+7+Tahun+2024.pdf
- https://www.esdm.go.id/id/media-center/arsip-berita/jaga-daya-beli-menteri-esdm-tarif-listrik-tidak-naik

**Golongan tarif tergantung sambungan venue** — ini yang harus disebut, bukan cuma angkanya:

| Golongan | Tarif | Untuk |
|---|---:|---|
| S-2/TR | Rp 900/kWh | Sekolah, 3.500 VA – 200 kVA |
| B-2/TR | Rp 1.444,70/kWh | Bisnis kecil-menengah, 6.600 VA – 200 kVA |
| P-1/TR | Rp 1.699,53/kWh | Gedung pemerintah |
| B-3/TM | Rp 1.035,78/kWh (LWBP) | Venue besar >200 kVA; WBP = K × 1.035,78, 1,4 ≤ K ≤ 2 |

Kalau acaranya di sekolah dengan sambungan sosial, tarif yang benar Rp 900/kWh — bukan Rp 1.444,70. Model saat ini memakai B-2/TR sebagai default; sebutkan asumsi itu.

**Rekening Minimum.** RM1 = 40 jam nyala × kVA tersambung × biaya pemakaian. Biaya riil acara kecil bisa lebih tinggi dari kWh × tarif. Model belum menghitung ini — akui kalau ditanya.

**Kalimat kutipan yang disarankan:** *"Tarif listrik B-2/TR (bisnis, 6.600 VA–200 kVA) Rp 1.444,70/kWh, berlaku Triwulan III 2026 — Permen ESDM No. 7/2024 Lampiran III."*

### 3.3 Investasi awal reusable

**Investasi awal reusable** (dicatat terpisah, tidak dicampur ke biaya operasional):

| Item | Nilai | Satuan | Status |
|---|---:|---|---|
| `COST.reusableCapexPerPerson` | 25.000 | Rp/orang | `ASUMSI MODEL` |
| `COST.reusableExpectedUses` | 30 | kali pakai | `ASUMSI MODEL` |

Biaya teramortisasi = `capex / reusableExpectedUses`, tersedia sebagai `cost.reusableAmortizedRp`. Menyembunyikan investasi awal membuat reusable tampak gratis — itu tidak jujur dan akan ditanyakan.

**Harga adalah variabel paling lokal di model ini.** Angka §3.1 adalah harga Jabodetabek per 3 September 2026. Sebelum pitching, sesuaikan ke harga di kota kalian dan catat kotanya di sini. Harga yang jelas tidak masuk akal untuk daerah juri adalah target pertanyaan yang mudah.

---

## 4. Skor inklusi (0–100)

Seluruh bagian ini berstatus `ASUMSI MODEL`. Tidak ada standar tunggal yang memberi bobot numerik untuk fasilitas acara, jadi ini **rubrik desain kami** — sampaikan sebagai rubrik, bukan sebagai standar.

### 4.1 Bobot fasilitas

| Fasilitas | Bobot | Alasan bobot |
|---|---:|---|
| Ramp / jalur kursi roda | 25 | Tanpa ini, akses fisik ke lokasi tertutup sama sekali |
| Toilet difabel | 20 | Menentukan berapa lama seseorang bisa bertahan di acara |
| Penerjemah bahasa isyarat | 18 | Satu-satunya akses ke isi acara bagi tuli |
| Jalur pemandu / penanda taktil | 15 | Navigasi mandiri bagi tunanetra |
| Kursi prioritas | 12 | Melayani lansia, ibu hamil, disabilitas tak terlihat |
| Materi huruf besar / kontras tinggi | 10 | Low vision; biaya paling rendah, sering terlewat |

Total bobot = 100.

**Dasar penetapan bobot.** Fasilitas yang **memblokir akses sepenuhnya** jika tidak ada (ramp, penerjemah, jalur pemandu) diberi bobot lebih tinggi daripada yang **mengurangi kenyamanan** (kursi prioritas, materi huruf besar). Prinsip ini yang harus disampaikan saat ditanya — bukan angkanya.

### 4.2 Penyesuaian kebutuhan

```
gap        = Σ bobot fasilitas yang TIDAK tersedia
rasio      = estimatedDisabledGuests / participants
needWeight = clamp(minNeedWeight + (1 − minNeedWeight) × (rasio / needReferenceRatio),
                   minNeedWeight, 1)
skor       = clamp(100 − gap × needWeight, 0, 100)
```

| Parameter | Nilai | Status | Alasan |
|---|---:|---|---|
| `INCLUSION.needReferenceRatio` | 0,10 | `ASUMSI MODEL` | Di atas 10% tamu difabel, fasilitas yang hilang dihitung sebagai kegagalan penuh |
| `INCLUSION.minNeedWeight` | 0,55 | `ASUMSI MODEL` | Bobot kebutuhan minimum walau tidak ada tamu difabel terdata |

Artinya: **fasilitas minim lebih berat konsekuensinya** ketika proporsi tamu difabel tinggi. Acara dengan 200 tamu difabel dan tanpa ramp lebih gagal secara inklusi daripada acara dengan 2 tamu difabel dan kondisi yang sama.

> **Kenapa formulanya pengurangan, bukan perkalian.** Versi awal dokumen ini menetapkan `skor = skorDasar × (1 − penalti)`. Formula itu **tidak bekerja** justru di kasus yang jadi alasannya ada: kalau tidak ada fasilitas sama sekali, `skorDasar` = 0, dan 0 dikali apa pun tetap 0 — jadi 200 tamu difabel dan 2 tamu difabel menghasilkan skor yang persis sama. Formula pengurangan atas **celah fasilitas** memperbaiki ini: jumlah tamu difabel berpengaruh di semua tingkat ketersediaan, termasuk nol. Ada test regresi eksplisit untuk perilaku ini di `src/lib/engine.test.ts`.

**Kenapa `minNeedWeight` bukan nol.** Nol tamu difabel terdata bukan berarti nol kebutuhan aksesibilitas — disabilitas tak terlihat, lansia, ibu hamil, dan tamu yang tidak mendaftarkan kebutuhannya selalu ada. Acara tanpa fasilitas apa pun tetap menutup akses bagi mereka, jadi tetap kehilangan sebagian besar poin.

**Rentang skor yang dihasilkan** (500 peserta, 15 tamu difabel):

| Fasilitas | Skor |
|---|---:|
| Tidak ada | 32 |
| Ramp saja | 49 |
| Ramp + materi huruf besar | 55 |
| Lengkap (enam fasilitas) | 100 |

### 4.3 Biaya fasilitas

| Fasilitas | Nilai | Satuan | Status |
|---|---:|---|---|
| Ramp portabel | 1.500.000 | Rp | `ASUMSI MODEL` |
| Toilet difabel (sewa) | 2.000.000 | Rp | `ASUMSI MODEL` |
| Penerjemah isyarat | 1.200.000 | Rp | `ASUMSI MODEL` |
| Jalur pemandu | 800.000 | Rp | `ASUMSI MODEL` |
| Kursi prioritas | 300.000 | Rp | `ASUMSI MODEL` |
| Materi huruf besar | 150.000 | Rp | `ASUMSI MODEL` |

Biaya ini yang membuat rekomendasi "dampak per rupiah" bermakna. Contoh dari engine (baseline 500 peserta): materi huruf besar memberi **+6,8 poin inklusi dengan Rp 150.000** (≈ 45 poin per juta rupiah), sementara ramp memberi **+17,1 poin dengan Rp 1.500.000** (≈ 11 poin per juta). Materi huruf besar empat kali lebih efisien per rupiah — temuan yang berguna dan tidak jelas tanpa model.

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

**Cara normalisasi.** Engine mengenumerasi seluruh 108 kombinasi keputusan (kemasan × wadah × pemilahan × lampu × sumber daya) dari input numerik yang sama, lalu memetakan hasil aktual ke rentang terburuk–terbaik yang mungkin. Karena pembandingnya ikut berskala bersama jumlah peserta, skor tidak bergeser drastis hanya karena acaranya lebih besar — ada test yang mengecek ini (100 vs 5.000 peserta, selisih < 10 poin).

**Biaya fasilitas akses dikeluarkan dari dimensi biaya.** Belanja aksesibilitas sudah dihargai di dimensi inklusi; menghitungnya sebagai beban di dimensi biaya akan menghukum inklusi dua kali. Dimensi biaya hanya memakai biaya operasional (`cost.totalRp − cost.accessibilityRp`).

---

## 6. Prinsip yang harus dipegang

1. **Satu file, satu sumber.** Tidak ada koefisien di komponen UI.
2. **Setiap angka punya baris di dokumen ini** dengan status dan alasan.
3. **Asumsi disebut asumsi.** Menyebut sumber yang belum dicek jauh lebih merusak daripada mengakui asumsi dengan alasan yang jelas.
4. **Angka demo digenerate, tidak ditulis manual.** Jalankan `npm run demo:numbers` untuk menghasilkan tabel dari engine. Setiap perubahan koefisien wajib diikuti regenerasi tabel di `AGENTS.md` dan `PRD.md` — inilah yang mencegah dokumen dan aplikasi menampilkan angka berbeda saat live demo.
5. **Sisa yang masih `ASUMSI MODEL`:** tarif genset, retribusi angkut sampah, faktor emisi genset, watt pencahayaan per orang, faktor pemilahan, biaya fasilitas akses, seluruh rubrik inklusi. Prioritas berikutnya: **watt pencahayaan per orang** (menentukan seluruh dimensi energi) dan **biaya fasilitas akses** (menentukan besar trade-off inklusi). Harga konsumsi sudah dikalibrasi 3 Sep 2026 — lihat §3.1; itu 98,9% biaya operasional baseline.
