/**
 * Single auditable prompt source for F7 AI Insight — PRD §6.
 * Pure function, no network, no side effects. Server recomputes numbers;
 * AI must not calculate, only narrate.
 */
import { ACCESSIBILITY } from "./coefficients";
import type { EventParams, SimulationResult } from "./engine";
import { decimal, round, rupiah, signedDecimal, signedRupiah } from "./format";
import {
  DRINK_VESSEL_LABELS,
  EVENT_TYPE_LABELS,
  FOOD_PACKAGING_LABELS,
  LIGHTING_LABELS,
  POWER_SOURCE_LABELS,
  WASTE_BINS_LABELS,
} from "./labels";

export const SYSTEM_PROMPT =
  "Kamu narator EventTwin untuk panitia sekolah tanpa latar lingkungan. Bahasa Indonesia, 120–180 kata, 3 paragraf: 1) ringkasan vs baseline, 2) sampah+energi, 3) biaya+inklusi + 1 aksi paling efisien per rupiah. ATURAN KERAS: jangan hitung/perkirakan/ubah angka. Hanya pakai angka konteks & delta yang diberikan. Sebut trade-off biaya inklusi apa adanya. Referensikan komposisi & sustainability score jika relevan. Akhiri 1 kalimat aksi.";

export interface PromptInput {
  params: EventParams;
  result: SimulationResult;
}

function safeLabel(map: Record<string, string>, key: string): string {
  return map[key] ?? "tidak diketahui";
}

function formatAccessibility(params: EventParams): string {
  const list = params.accessibility as unknown as string[];
  if (!Array.isArray(list) || list.length === 0) return "tidak ada";
  const labels = list
    .map((f) => (ACCESSIBILITY as Record<string, { label: string }>)[f]?.label)
    .filter((v): v is string => Boolean(v));
  if (labels.length === 0) return "tidak ada";
  return labels.join(", ");
}

function formatMissing(result: SimulationResult): string {
  const list = result.inclusion.missing as unknown as string[];
  if (!Array.isArray(list) || list.length === 0) return "tidak ada (semua tersedia)";
  const labels = list
    .map((f) => (ACCESSIBILITY as Record<string, { label: string }>)[f]?.label)
    .filter((v): v is string => Boolean(v));
  if (labels.length === 0) return "tidak ada (semua tersedia)";
  return labels.join(", ");
}

function formatScenarioBlock(
  label: string,
  params: EventParams,
  result: SimulationResult,
): string {
  return [
    `${label}:`,
    `- Peserta ${params.participants} orang, durasi ${params.durationHours} jam, tipe ${safeLabel(EVENT_TYPE_LABELS as Record<string, string>, params.eventType as unknown as string)}, makan ${params.mealsPerPerson}/orang, minum ${params.drinksPerPerson}/orang, sound ${params.soundSystemKw} kW, tamu difabel terdata ${params.estimatedDisabledGuests} orang`,
    `- Kemasan ${safeLabel(FOOD_PACKAGING_LABELS as Record<string, string>, params.foodPackaging as unknown as string)}, minuman ${safeLabel(DRINK_VESSEL_LABELS as Record<string, string>, params.drinkVessel as unknown as string)}, sampah ${safeLabel(WASTE_BINS_LABELS as Record<string, string>, params.wasteBins as unknown as string)}, lampu ${safeLabel(LIGHTING_LABELS as Record<string, string>, params.lighting as unknown as string)}, sumber ${safeLabel(POWER_SOURCE_LABELS as Record<string, string>, params.powerSource as unknown as string)}, akses [${formatAccessibility(params)}]`,
    `- Sampah timbulan ${decimal(result.waste.generatedKg)} kg, residu TPA ${decimal(result.waste.landfillKg)} kg (komposisi: plastik ${decimal(result.waste.composition.plastic)} kg, organik ${decimal(result.waste.composition.organic)} kg, kertas ${decimal(result.waste.composition.paper)} kg, lain ${decimal(result.waste.composition.other)} kg)`,
    `- Energi ${decimal(result.energy.kwh)} kWh (lampu ${decimal(result.energy.lightingKwh)} kWh + sound ${decimal(result.energy.soundKwh)} kWh), emisi ${decimal(result.energy.co2eKg)} kg CO₂`,
    `- Biaya total ${rupiah(result.cost.totalRp)} (konsumsi ${rupiah(result.cost.consumptionRp)}, energi ${rupiah(result.cost.energyRp)}, angkut ${rupiah(result.cost.wasteHaulingRp)}, akses ${rupiah(result.cost.accessibilityRp)}, amortisasi reusable ${rupiah(result.cost.reusableAmortizedRp)}, capex reusable ${rupiah(result.cost.reusableCapexRp)})`,
    `- Inklusi ${round(result.inclusion.score)}/100 (hilang: ${formatMissing(result)}), sustainability ${round(result.sustainabilityScore)}/100 (sampah ${round(result.dimensionScores.waste)}, energi ${round(result.dimensionScores.energy)}, inklusi ${round(result.dimensionScores.inclusion)}, biaya ${round(result.dimensionScores.cost)})`,
  ].join("\n");
}

export function buildInsightPrompt(
  scenario: PromptInput,
  baseline: PromptInput,
): { system: string; user: string } {
  const s = scenario.result;
  const b = baseline.result;

  const deltaGenerated = s.waste.generatedKg - b.waste.generatedKg;
  const deltaLandfill = s.waste.landfillKg - b.waste.landfillKg;
  const deltaKwh = s.energy.kwh - b.energy.kwh;
  const deltaCo2 = s.energy.co2eKg - b.energy.co2eKg;
  const deltaCost = s.cost.totalRp - b.cost.totalRp;
  const deltaAccess = s.cost.accessibilityRp - b.cost.accessibilityRp;
  const deltaInclusion = s.inclusion.score - b.inclusion.score;
  const deltaSustainability = s.sustainabilityScore - b.sustainabilityScore;

  const deltaBlock = [
    "DELTA vs BASELINE (skenario − baseline):",
    `- Timbulan ${signedDecimal(deltaGenerated, "kg")}, residu TPA ${signedDecimal(deltaLandfill, "kg")}, energi ${signedDecimal(deltaKwh, "kWh")}, emisi ${signedDecimal(deltaCo2, "kg CO₂")}`,
    `- Biaya total ${signedRupiah(deltaCost)} (akses ${signedRupiah(deltaAccess)}), inklusi ${signedDecimal(deltaInclusion, "poin")}, sustainability ${signedDecimal(deltaSustainability, "poin")}`,
    `- Dimensi sampah ${signedDecimal(s.dimensionScores.waste - b.dimensionScores.waste, "poin")}, energi ${signedDecimal(s.dimensionScores.energy - b.dimensionScores.energy, "poin")}, inklusi ${signedDecimal(s.dimensionScores.inclusion - b.dimensionScores.inclusion, "poin")}, biaya ${signedDecimal(s.dimensionScores.cost - b.dimensionScores.cost, "poin")}`,
  ].join("\n");

  const caveats =
    "CATATAN KOEFISIEN (konteks, jangan hitung ulang): Emisi 0,87 kg CO₂/kWh JAMALI (Kepmen ESDM No. 163.K/HK.02/MEM.S/2021), Tarif Rp1.444,70/kWh B-2/TR — sebut sebagai konteks, jangan hitung ulang.";

  const user = [
    "Konteks EventTwin — angka sudah dihitung engine, tugasmu hanya menarasikan. Jangan hitung ulang.",
    "",
    formatScenarioBlock("SKENARIO AKTIF", scenario.params, scenario.result),
    "",
    formatScenarioBlock("BASELINE", baseline.params, baseline.result),
    "",
    deltaBlock,
    "",
    caveats,
  ].join("\n");

  return { system: SYSTEM_PROMPT, user };
}
