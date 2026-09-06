// Satu-satunya sumber koefisien. Setiap angka punya baris di COEFFICIENTS.md
// dengan status verifikasi dan alasannya. Jangan tulis koefisien di komponen UI.

export const WASTE = {
  /**
   * TERVERIFIKASI (turunan). SIPSN 0,48 kg/orang/hari x 16,84% fraksi
   * non-makanan-non-kemasan (komposisi SIPSN 2025) / 16 jam aktif.
   * Kemasan, wadah minum, dan sisa makanan dihitung terpisah di bawah,
   * jadi baris ini HANYA sampah umum (tisu, brosur, tiket, dll).
   */
  generalPerPersonHour: 0.005,
  /** TERVERIFIKASI. WRAP 2013: 920.000 t / 8 miliar porsi = 0,115 kg/porsi. */
  foodResiduePerMeal: 0.115,
  foodPackaging: {
    /** TERVERIFIKASI. Kotak kertas 750 ml 20 g + sendok plastik 2,2 g. */
    disposable: 0.022,
    mixed: 0.013,
    reusable: 0.004,
  },
  drinkVessel: {
    /** TERVERIFIKASI. Botol PET 600 ml badan+tutup 14,5 g + label 0,3 g. */
    plasticBottle: 0.016,
    mixed: 0.0085,
    /** Cup PP 2,5 g dibagi ~3 kali pakai di refill station. */
    refillStation: 0.001,
  },
  // Faktor residu: pemilahan tidak mengurangi timbulan, hanya yang berakhir di TPA.
  landfillFactor: { none: 1.0, mixed: 0.92, segregated: 0.74 },
  /**
   * Proporsi massa kemasan makanan yang berbahan kertas (sisanya plastik).
   * Disposable: kotak kertas 20 g dari total 22,2 g = 0,90.
   */
  packagingPaperShare: { disposable: 0.9, mixed: 0.9, reusable: 0.5 },
} as const;

export const ENERGY = {
  lightingWattPerPerson: { halogen: 12, led: 4 },
  /**
   * kg CO2/kWh (= ton CO2/MWh). CO2 pembakaran, BUKAN CO2e penuh.
   * pln: TERVERIFIKASI — grid Jawa-Madura-Bali (JAMALI), Combined Margin
   * ex-post, data 2019, Kepmen ESDM No. 163.K/HK.02/MEM.S/2021.
   * Luar Jawa-Bali berbeda jauh (Sumatera 0,94; Kalbar 1,63; Lombok 1,61).
   */
  emissionFactor: { pln: 0.87, generator: 0.72 },
} as const;

export const COST = {
  /**
   * Rp/porsi. TERVERIFIKASI ke daftar harga katering Jabodetabek terbitan,
   * September 2026 (rincian COEFFICIENTS.md §3.1).
   * - disposable: nasi box paket ekonomis, rentang terbit Rp 19.000-23.000.
   * - reusable: prasmanan tier terendah Rp 20.000, yang sudah TERMASUK
   *   peralatan makan, meja, dan waiters — karena itu wajar lebih murah dari
   *   nasi box: katering tidak membeli kotak sekali pakai.
   */
  mealPerPortion: { disposable: 21000, mixed: 20500, reusable: 20000 },
  /**
   * Rp/porsi (satu porsi = satu botol 600 ml, atau satu cup ~250 ml dari
   * refill station). Rincian dan sumber di COEFFICIENTS.md §3.1.
   * - plasticBottle: harga karton 24 x 600 ml, bukan ritel satuan — acara
   *   500 orang membeli per karton.
   * - refillStation: air isi ulang Rp 1.000/liter x 0,25 L = Rp 250, plus cup
   *   PP Rp 180 dibagi ~3 kali pakai = Rp 60. Hanya bahan habis pakai; sewa
   *   dispenser belum dimodelkan.
   */
  drinkPerPortion: { plasticBottle: 2600, mixed: 1455, refillStation: 310 },
  /**
   * Rp/kWh. pln: TERVERIFIKASI — golongan B-2/TR (bisnis tegangan rendah,
   * 6.600 VA-200 kVA), Permen ESDM No. 7/2024 Lampiran III, berlaku
   * Triwulan III 2026. Venue lain: S-2/TR sekolah Rp 900; P-1/TR gedung
   * pemerintah Rp 1.699,53; B-3/TM >200 kVA Rp 1.035,78 (LWBP).
   */
  tariffPerKwh: { pln: 1444.7, generator: 3200 },
  wasteHaulingPerKg: 700,
  reusableCapexPerPerson: 25000,
  reusableExpectedUses: 30,
} as const;

export const ACCESSIBILITY = {
  ramp: { weight: 25, cost: 1_500_000, label: "Ramp / jalur kursi roda" },
  accessibleToilet: { weight: 20, cost: 2_000_000, label: "Toilet difabel" },
  signLanguage: { weight: 18, cost: 1_200_000, label: "Penerjemah bahasa isyarat" },
  tactilePath: { weight: 15, cost: 800_000, label: "Jalur pemandu / penanda taktil" },
  prioritySeating: { weight: 12, cost: 300_000, label: "Kursi prioritas" },
  largePrint: { weight: 10, cost: 150_000, label: "Materi huruf besar" },
} as const;

// Bobot sustainability score. Alasan urutan ada di COEFFICIENTS.md §5.
export const SCORE_WEIGHTS = {
  waste: 0.35,
  energy: 0.25,
  inclusion: 0.25,
  cost: 0.15,
} as const;

// Parameter penyesuaian kebutuhan pada skor inklusi. Alasan ada di COEFFICIENTS.md §4.2.
export const INCLUSION = {
  /**
   * Proporsi tamu difabel yang dianggap "kebutuhan aksesibilitas penuh".
   * Di atas rasio ini, fasilitas yang tidak tersedia dihitung sebagai
   * kegagalan sepenuhnya.
   */
  needReferenceRatio: 0.1,
  /**
   * Bobot kebutuhan minimum, dipakai bahkan ketika tidak ada tamu difabel
   * yang didata. Bukan nol karena disabilitas tak terlihat dan tamu tak
   * terdata selalu ada — acara tanpa fasilitas tetap menutup akses bagi mereka.
   */
  minNeedWeight: 0.55,
} as const;

export const LIMITS = {
  participants: { min: 10, max: 10_000 },
  durationHours: { min: 1, max: 24 },
  mealsPerPerson: { min: 0, max: 5 },
  drinksPerPerson: { min: 0, max: 8 },
  soundSystemKw: { min: 0, max: 20 },
} as const;

/**
 * ASUMSI MODEL (belum terverifikasi — lihat COEFFICIENTS.md §7). Jembatan
 * antara kotak di denah venue dan engine: tiap kotak lighting/sound adalah
 * beban listrik nyata, tiap stasiun sampah melayani sekian peserta.
 */
export const LAYOUT = {
  /** Satu menara lighting = 4 sorot LED 50 W. */
  lightingKwPerBox: 0.2,
  /** Satu titik sound tambahan = sepasang speaker aktif 250 W. */
  soundKwPerBox: 0.5,
  /** Satu stasiun pilah melayani 150 peserta sebelum antrean menumpuk. */
  wasteStationCoverage: 150,
} as const;
