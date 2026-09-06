/**
 * Recommendation Engine (F6) — PRD §4.4.
 *
 * Menghitung ulang engine untuk setiap PERUBAHAN TUNGGAL yang mungkin dari
 * skenario aktif, lalu mengurutkan berdasarkan perbaikan dampak per rupiah.
 * Tidak ada koefisien baru di sini: seluruh penilaian memakai
 * `sustainabilityScore` dari engine, yang bobotnya sudah terdokumentasi di
 * COEFFICIENTS.md §5. Menambah skema bobot kedua di lapisan rekomendasi akan
 * membuat dua bagian aplikasi memberi peringkat yang berbeda.
 */
import { ACCESSIBILITY } from "./coefficients";
import {
  DRINK_VESSEL_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  LIGHTING_OPTIONS,
  POWER_SOURCE_OPTIONS,
  WASTE_BINS_OPTIONS,
  simulate,
} from "./engine";
import type { EventParams, SimulationResult } from "./engine";
import {
  DRINK_VESSEL_LABELS,
  FOOD_PACKAGING_LABELS,
  LIGHTING_LABELS,
  POWER_SOURCE_LABELS,
  WASTE_BINS_LABELS,
} from "./labels";

export interface RecommendationDelta {
  /** Timbulan sampah (kg). Negatif = berkurang. */
  wasteGeneratedKg: number;
  /** Residu ke TPA (kg). Negatif = berkurang. */
  wasteLandfillKg: number;
  energyKwh: number;
  co2eKg: number;
  /** Biaya per acara, termasuk amortisasi peralatan guna ulang (Rp). */
  costRp: number;
  /** Poin skor inklusi. */
  inclusionPoints: number;
  /** Poin sustainability score — ukuran dampak gabungan yang dipakai mengurutkan. */
  scoreGain: number;
}

export interface Recommendation {
  /** Kunci stabil untuk React dan pengujian. */
  id: string;
  /** Kalimat siap tampil, mis. "Ganti botol plastik → refill station". */
  label: string;
  /** Parameter hasil penerapan — dipakai tombol "Terapkan rekomendasi". */
  params: EventParams;
  delta: RecommendationDelta;
  /**
   * Poin sustainability per juta rupiah yang dikeluarkan. `null` bila
   * perubahan justru menghemat biaya — penghematan tidak punya pembagi yang
   * bermakna, dan perubahan seperti itu selalu diprioritaskan.
   */
  scorePerMillionRp: number | null;
  /** True bila perubahan memperbaiki dampak sekaligus menurunkan biaya. */
  savesMoney: boolean;
}

/** Satu kandidat perubahan sebelum dampaknya dihitung. */
interface Candidate {
  id: string;
  label: string;
  params: EventParams;
}

/** Beban denah tidak boleh bocor ke kandidat — rekomendasi hanya mengubah keputusan form. */
function stripExtras(p: EventParams): EventParams {
  const clean = { ...p };
  delete clean.extraLightingKw;
  delete clean.extraSoundKw;
  return clean;
}

/**
 * Semua perubahan satu-langkah dari `params`: lima keputusan enum (setiap nilai
 * selain yang sedang dipakai) dan penambahan fasilitas akses yang belum ada.
 * Pengurangan fasilitas tidak diusulkan — mencabut akses bukan rekomendasi.
 */
function enumerateCandidates(params: EventParams): Candidate[] {
  const candidates: Candidate[] = [];

  for (const value of FOOD_PACKAGING_OPTIONS) {
    if (value === params.foodPackaging) continue;
    candidates.push({
      id: `foodPackaging:${value}`,
      label: `Ganti ${FOOD_PACKAGING_LABELS[
        params.foodPackaging
      ].toLowerCase()} → ${FOOD_PACKAGING_LABELS[value].toLowerCase()}`,
      params: { ...params, foodPackaging: value },
    });
  }

  for (const value of DRINK_VESSEL_OPTIONS) {
    if (value === params.drinkVessel) continue;
    candidates.push({
      id: `drinkVessel:${value}`,
      label: `Ganti ${DRINK_VESSEL_LABELS[
        params.drinkVessel
      ].toLowerCase()} → ${DRINK_VESSEL_LABELS[value].toLowerCase()}`,
      params: { ...params, drinkVessel: value },
    });
  }

  for (const value of WASTE_BINS_OPTIONS) {
    if (value === params.wasteBins) continue;
    candidates.push({
      id: `wasteBins:${value}`,
      label: `Ubah pengelolaan sampah → ${WASTE_BINS_LABELS[value].toLowerCase()}`,
      params: { ...params, wasteBins: value },
    });
  }

  for (const value of LIGHTING_OPTIONS) {
    if (value === params.lighting) continue;
    candidates.push({
      id: `lighting:${value}`,
      label: `Ganti ${LIGHTING_LABELS[params.lighting].toLowerCase()} → ${
        LIGHTING_LABELS[value].toLowerCase()
      }`,
      params: { ...params, lighting: value },
    });
  }

  for (const value of POWER_SOURCE_OPTIONS) {
    if (value === params.powerSource) continue;
    candidates.push({
      id: `powerSource:${value}`,
      label: `Ganti sumber daya → ${POWER_SOURCE_LABELS[value]}`,
      params: { ...params, powerSource: value },
    });
  }

  // `inclusion.missing` sudah berisi fasilitas yang belum tersedia.
  for (const feature of simulate(params).inclusion.missing) {
    candidates.push({
      id: `accessibility:${feature}`,
      label: `Tambah ${ACCESSIBILITY[feature].label.toLowerCase()}`,
      params: {
        ...params,
        accessibility: [...params.accessibility, feature],
      },
    });
  }

  return candidates;
}

/**
 * Biaya satu acara. Investasi peralatan guna ulang dipakai versi teramortisasi:
 * membebankan seluruh capex ke satu acara membuat opsi guna ulang tampak jauh
 * lebih mahal daripada kenyataannya, dan itu justru menjatuhkan rekomendasi
 * yang paling ingin kita usulkan.
 */
function eventCostRp(result: SimulationResult): number {
  return result.cost.totalRp + result.cost.reusableAmortizedRp;
}

function computeDelta(
  before: SimulationResult,
  after: SimulationResult,
): RecommendationDelta {
  return {
    wasteGeneratedKg: after.waste.generatedKg - before.waste.generatedKg,
    wasteLandfillKg: after.waste.landfillKg - before.waste.landfillKg,
    energyKwh: after.energy.kwh - before.energy.kwh,
    co2eKg: after.energy.co2eKg - before.energy.co2eKg,
    costRp: eventCostRp(after) - eventCostRp(before),
    inclusionPoints: after.inclusion.score - before.inclusion.score,
    scoreGain: after.sustainabilityScore - before.sustainabilityScore,
  };
}

/**
 * Toleransi float. Perubahan yang hanya menggeser skor sepersejuta poin adalah
 * derau pembulatan, bukan rekomendasi.
 */
const EPSILON = 1e-9;

const RUPIAH_PER_MILLION = 1_000_000;

/**
 * Rekomendasi teratas dari skenario aktif, terurut dari yang paling layak
 * dikerjakan lebih dulu.
 *
 * Urutan: perubahan yang memperbaiki dampak SEKALIGUS menghemat biaya lebih
 * dulu — tidak ada trade-off yang perlu ditimbang, jadi tidak masuk akal
 * menaruhnya di bawah perubahan berbayar. Sisanya diurutkan berdasarkan poin
 * sustainability per juta rupiah, sesuai PRD §4.4 "dampak terbesar per rupiah".
 */
export function recommend(
  params: EventParams,
  limit = 3,
): Recommendation[] {
  const cleanParams = stripExtras(params);
  const baseline = simulate(cleanParams);

  const ranked = enumerateCandidates(cleanParams)
    .map((candidate): Recommendation => {
      const delta = computeDelta(baseline, simulate(candidate.params));
      const savesMoney = delta.costRp < -EPSILON;

      return {
        id: candidate.id,
        label: candidate.label,
        params: candidate.params,
        delta,
        savesMoney,
        scorePerMillionRp: savesMoney
          ? null
          : (delta.scoreGain * RUPIAH_PER_MILLION) /
            Math.max(delta.costRp, EPSILON),
      };
    })
    // Hanya usulkan yang benar-benar memperbaiki dampak gabungan.
    .filter((r) => r.delta.scoreGain > EPSILON)
    .sort((a, b) => {
      if (a.savesMoney !== b.savesMoney) return a.savesMoney ? -1 : 1;
      if (a.savesMoney) return b.delta.scoreGain - a.delta.scoreGain;
      return (b.scorePerMillionRp ?? 0) - (a.scorePerMillionRp ?? 0);
    });

  return ranked.slice(0, limit);
}
