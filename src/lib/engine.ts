/**
 * Engine simulasi EventTwin — fungsi murni, deterministik, tanpa panggilan jaringan.
 * Seluruh koefisien berasal dari `coefficients.ts`; tidak ada angka perhitungan di sini.
 * Formula mengikuti PRD.md §4.2.
 */
import {
  ACCESSIBILITY,
  COST,
  ENERGY,
  INCLUSION,
  LIMITS,
  SCORE_WEIGHTS,
  WASTE,
} from "./coefficients";

export type FoodPackaging = "disposable" | "mixed" | "reusable";
export type DrinkVessel = "plasticBottle" | "mixed" | "refillStation";
export type WasteBins = "none" | "mixed" | "segregated";
export type Lighting = "halogen" | "led";
export type PowerSource = "pln" | "generator";
export type EventType = "festival" | "seminar" | "competition" | "bazaar";
export type AccessibilityFeature = keyof typeof ACCESSIBILITY;

/** Daftar opsi tiap keputusan — dipakai untuk enumerasi skenario dan UI. */
export const FOOD_PACKAGING_OPTIONS: readonly FoodPackaging[] = [
  "disposable",
  "mixed",
  "reusable",
];
export const DRINK_VESSEL_OPTIONS: readonly DrinkVessel[] = [
  "plasticBottle",
  "mixed",
  "refillStation",
];
export const WASTE_BINS_OPTIONS: readonly WasteBins[] = [
  "none",
  "mixed",
  "segregated",
];
export const LIGHTING_OPTIONS: readonly Lighting[] = ["halogen", "led"];
export const POWER_SOURCE_OPTIONS: readonly PowerSource[] = ["pln", "generator"];
export const ACCESSIBILITY_FEATURES = Object.keys(
  ACCESSIBILITY,
) as AccessibilityFeature[];

/**
 * Beban listrik denah (kW) dari sumber tak tepercaya. Hanya bilangan finite
 * > 0 yang lolos; NaN/Infinity/negatif/non-angka jadi 0. Tepat 0 tetap 0
 * (kedua cabang menghasilkan 0, jadi tidak ada kasus khusus).
 */
export function safeExtraKw(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Daftar akses unik yang dikenal — dedupe via Set + filter ke kunci yang
 * dikenal. Array akses bisa berisi string asing saat runtime dari params
 * rakitan tangan; yang asing dibuang, duplikat dihitung sekali.
 */
function uniqueKnownAccess(list: readonly unknown[]): AccessibilityFeature[] {
  const seen = new Set<string>();
  const out: AccessibilityFeature[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    if (!Object.prototype.hasOwnProperty.call(ACCESSIBILITY, item)) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item as AccessibilityFeature);
  }
  return out;
}

export interface EventParams {
  participants: number;
  durationHours: number;
  eventType: EventType;
  mealsPerPerson: number;
  drinksPerPerson: number;
  foodPackaging: FoodPackaging;
  drinkVessel: DrinkVessel;
  wasteBins: WasteBins;
  lighting: Lighting;
  soundSystemKw: number;
  powerSource: PowerSource;
  accessibility: AccessibilityFeature[];
  estimatedDisabledGuests: number;
  /**
   * Beban listrik denah venue (kW) — kotak lighting/sound. Opsional, default 0.
   * Hanya diisi dari turunan denah (deriveLayoutPatch), tidak dari form/URL/
   * draf: selalu dihitung ulang dari kotak, bukan disimpan. Diterapkan
   * SETELAH clampParams supaya nilai turunan (selalu finite ≥ 0) tidak
   * tersentuh batas form.
   */
  extraLightingKw?: number;
  extraSoundKw?: number;
}

export interface WasteComposition {
  plastic: number;
  organic: number;
  paper: number;
  other: number;
}

export interface WasteResult {
  /** Total timbulan sampah acara (kg). Tidak dipengaruhi pemilahan. */
  generatedKg: number;
  /** Bagian timbulan yang berakhir di TPA (kg), setelah efek pemilahan. */
  landfillKg: number;
  composition: WasteComposition;
}

export interface EnergyResult {
  /** Konsumsi listrik total acara (kWh). */
  kwh: number;
  /** Rincian per sumber beban, untuk dashboard. */
  lightingKwh: number;
  soundKwh: number;
  /** Emisi setara CO₂ dari kWh di atas (kg CO₂e). */
  co2eKg: number;
}

export interface CostResult {
  consumptionRp: number;
  energyRp: number;
  wasteHaulingRp: number;
  accessibilityRp: number;
  /** Total biaya operasional acara ini. Tidak termasuk investasi awal reusable. */
  totalRp: number;
  /** Investasi awal peralatan reusable — dicatat terpisah agar tidak menyesatkan. */
  reusableCapexRp: number;
  /** Porsi investasi awal yang dibebankan ke satu acara. */
  reusableAmortizedRp: number;
}

export interface InclusionResult {
  /** Jumlah bobot fasilitas yang tersedia (0-100), sebelum penyesuaian kebutuhan. */
  baseScore: number;
  /** Bobot kebutuhan aksesibilitas dari profil peserta (0-1). */
  needWeight: number;
  /** Skor inklusi akhir (0-100). */
  score: number;
  /** Fasilitas yang belum tersedia, untuk rekomendasi. */
  missing: AccessibilityFeature[];
}

export interface DimensionScores {
  waste: number;
  energy: number;
  cost: number;
  inclusion: number;
}

export interface SimulationResult {
  waste: WasteResult;
  energy: EnergyResult;
  cost: CostResult;
  inclusion: InclusionResult;
  /** Skor per dimensi (0-100, makin tinggi makin baik). */
  dimensionScores: DimensionScores;
  /** Agregat berbobot dari dimensionScores (0-100). */
  sustainabilityScore: number;
}

/**
 * Batas kepercayaan sistem — PRD §4.1. Semua input numerik dijepit ke rentang
 * di `LIMITS` sebelum masuk engine; nilai di luar rentang menghasilkan angka
 * yang tidak masuk akal dan merusak kredibilitas saat demo.
 */
export function clampParams(p: EventParams): EventParams {
  const participants = clampRange(p.participants, LIMITS.participants);

  return {
    ...p,
    participants,
    durationHours: clampRange(p.durationHours, LIMITS.durationHours),
    mealsPerPerson: clampRange(p.mealsPerPerson, LIMITS.mealsPerPerson),
    drinksPerPerson: clampRange(p.drinksPerPerson, LIMITS.drinksPerPerson),
    soundSystemKw: clampRange(p.soundSystemKw, LIMITS.soundSystemKw),
    // Tamu difabel tidak mungkin melebihi jumlah peserta.
    estimatedDisabledGuests: clampRange(p.estimatedDisabledGuests, {
      min: 0,
      max: participants,
    }),
  };
}

function clampRange(
  value: number,
  range: { min: number; max: number },
): number {
  // NaN tidak bisa dibandingkan; kembalikan ke batas bawah agar engine aman.
  if (!Number.isFinite(value)) return range.min;
  return clamp(value, range.min, range.max);
}

export function simulate(params: EventParams): SimulationResult {
  const waste = computeWaste(params);
  const energy = computeEnergy(params);
  const cost = computeCost(params, waste, energy);
  const inclusion = computeInclusion(params);

  const dimensionScores = computeDimensionScores(params, {
    waste,
    energy,
    cost,
    inclusion,
  });

  return {
    waste,
    energy,
    cost,
    inclusion,
    dimensionScores,
    sustainabilityScore:
      dimensionScores.waste * SCORE_WEIGHTS.waste +
      dimensionScores.energy * SCORE_WEIGHTS.energy +
      dimensionScores.inclusion * SCORE_WEIGHTS.inclusion +
      dimensionScores.cost * SCORE_WEIGHTS.cost,
  };
}

function computeWaste(p: EventParams): WasteResult {
  const packagingKg =
    p.participants * p.mealsPerPerson * WASTE.foodPackaging[p.foodPackaging];
  const drinkKg =
    p.participants * p.drinksPerPerson * WASTE.drinkVessel[p.drinkVessel];
  const generalKg =
    p.participants * p.durationHours * WASTE.generalPerPersonHour;
  const organicKg =
    p.participants * p.mealsPerPerson * WASTE.foodResiduePerMeal;

  const generatedKg = packagingKg + drinkKg + generalKg + organicKg;
  const landfillKg = generatedKg * WASTE.landfillFactor[p.wasteBins];

  const paperShare = WASTE.packagingPaperShare[p.foodPackaging];
  const composition: WasteComposition = {
    paper: packagingKg * paperShare,
    plastic: packagingKg * (1 - paperShare) + drinkKg,
    organic: organicKg,
    other: generalKg,
  };

  return { generatedKg, landfillKg, composition };
}

function computeCost(
  p: EventParams,
  waste: WasteResult,
  energy: EnergyResult,
): CostResult {
  const consumptionRp =
    p.participants *
    (p.mealsPerPerson * COST.mealPerPortion[p.foodPackaging] +
      p.drinksPerPerson * COST.drinkPerPortion[p.drinkVessel]);
  const energyRp = energy.kwh * COST.tariffPerKwh[p.powerSource];
  // Yang diangkut ke TPA yang menimbulkan retribusi, bukan timbulan bruto.
  const wasteHaulingRp = waste.landfillKg * COST.wasteHaulingPerKg;
  const accessibilityRp = uniqueKnownAccess(p.accessibility).reduce(
    (sum, feature) => sum + ACCESSIBILITY[feature].cost,
    0,
  );

  // Investasi awal hanya muncul jika ada peralatan reusable yang harus dibeli.
  const needsReusableKit =
    p.foodPackaging === "reusable" || p.foodPackaging === "mixed";
  const reusableCapexRp = needsReusableKit
    ? p.participants * COST.reusableCapexPerPerson
    : 0;

  return {
    consumptionRp,
    energyRp,
    wasteHaulingRp,
    accessibilityRp,
    totalRp: consumptionRp + energyRp + wasteHaulingRp + accessibilityRp,
    reusableCapexRp,
    reusableAmortizedRp: reusableCapexRp / COST.reusableExpectedUses,
  };
}

/**
 * Normalisasi setiap dimensi ke 0-100 (makin tinggi makin baik) dengan
 * membandingkan hasil aktual terhadap skenario TERBAIK dan TERBURUK yang
 * mungkin dari input numerik yang sama — PRD §4.2. Karena pembandingnya ikut
 * berskala bersama jumlah peserta, skor tidak bergeser hanya karena acaranya
 * lebih besar.
 */
function computeDimensionScores(
  p: EventParams,
  actual: {
    waste: WasteResult;
    energy: EnergyResult;
    cost: CostResult;
    inclusion: InclusionResult;
  },
): DimensionScores {
  const landfill: number[] = [];
  const co2e: number[] = [];
  const operational: number[] = [];

  // Enumerasi seluruh kombinasi keputusan yang mungkin. Batas atas dan bawah
  // dihitung, bukan diasumsikan — jika koefisien berubah, rentang ikut benar.
  for (const foodPackaging of FOOD_PACKAGING_OPTIONS) {
    for (const drinkVessel of DRINK_VESSEL_OPTIONS) {
      for (const wasteBins of WASTE_BINS_OPTIONS) {
        for (const lighting of LIGHTING_OPTIONS) {
          for (const powerSource of POWER_SOURCE_OPTIONS) {
            const candidate: EventParams = {
              ...p,
              foodPackaging,
              drinkVessel,
              wasteBins,
              lighting,
              powerSource,
            };
            const waste = computeWaste(candidate);
            const energy = computeEnergy(candidate);
            const cost = computeCost(candidate, waste, energy);

            landfill.push(waste.landfillKg);
            co2e.push(energy.co2eKg);
            operational.push(operationalCostRp(cost));
          }
        }
      }
    }
  }

  return {
    waste: normalizeLowerIsBetter(actual.waste.landfillKg, landfill),
    energy: normalizeLowerIsBetter(actual.energy.co2eKg, co2e),
    // Biaya fasilitas akses dikeluarkan dari dimensi biaya: belanja
    // aksesibilitas sudah dihargai di dimensi inklusi, dan menghitungnya
    // sebagai beban di sini akan menghukum inklusi dua kali.
    cost: normalizeLowerIsBetter(operationalCostRp(actual.cost), operational),
    inclusion: actual.inclusion.score,
  };
}

function operationalCostRp(cost: CostResult): number {
  return cost.totalRp - cost.accessibilityRp;
}

function normalizeLowerIsBetter(value: number, samples: number[]): number {
  const worst = Math.max(...samples);
  const best = Math.min(...samples);
  if (worst === best) return 100;
  return clamp(((worst - value) / (worst - best)) * 100, 0, 100);
}

function computeInclusion(p: EventParams): InclusionResult {
  const unique = uniqueKnownAccess(p.accessibility);
  const available = new Set(unique);
  const missing = ACCESSIBILITY_FEATURES.filter((f) => !available.has(f));

  const baseScore = unique.reduce(
    (sum, feature) => sum + ACCESSIBILITY[feature].weight,
    0,
  );

  // Bobot fasilitas yang TIDAK tersedia. Inilah yang dikenai penalti.
  const gap = missing.reduce(
    (sum, feature) => sum + ACCESSIBILITY[feature].weight,
    0,
  );

  // Proporsi tamu yang membutuhkan aksesibilitas menentukan seberapa berat
  // konsekuensi fasilitas yang tidak ada. Di atas rasio acuan, fasilitas yang
  // hilang dihitung sebagai kegagalan penuh.
  const ratio =
    p.participants > 0 ? p.estimatedDisabledGuests / p.participants : 0;
  const needWeight = clamp(
    INCLUSION.minNeedWeight +
      (1 - INCLUSION.minNeedWeight) *
        (ratio / INCLUSION.needReferenceRatio),
    INCLUSION.minNeedWeight,
    1,
  );

  // Penalti bersifat pengurangan atas celah fasilitas, bukan perkalian atas
  // skor dasar. Dengan begitu jumlah tamu difabel tetap berpengaruh walau
  // tidak ada fasilitas sama sekali (skor dasar 0).
  const score = clamp(100 - gap * needWeight, 0, 100);

  return { baseScore, needWeight, score, missing };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeEnergy(p: EventParams): EnergyResult {
  // Watt per orang → kWh: (W × orang × jam) / 1000.
  const lightingKwh =
    (ENERGY.lightingWattPerPerson[p.lighting] * p.participants * p.durationHours) /
    1000 +
    // Beban denah: kW × jam. Lihat komentar di EventParams soal asalnya.
    safeExtraKw(p.extraLightingKw) * p.durationHours;
  const soundKwh =
    (p.soundSystemKw + safeExtraKw(p.extraSoundKw)) * p.durationHours;
  const kwh = lightingKwh + soundKwh;

  return {
    kwh,
    lightingKwh,
    soundKwh,
    co2eKg: kwh * ENERGY.emissionFactor[p.powerSource],
  };
}
