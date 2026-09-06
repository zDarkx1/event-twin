/**
 * Share via URL (F8) — encode/decode parameter simulasi ke query string.
 * Fungsi murni, tanpa akses `window`, supaya bisa diuji dan dipakai di server.
 *
 * Dua prinsip:
 *
 * 1. **Tautan pendek.** Kunci disingkat dan hanya nilai yang berbeda dari
 *    default yang ditulis. Tautan yang dibagikan lewat WhatsApp sering dipotong
 *    saat ditampilkan, jadi panjangnya bukan hal kosmetik.
 * 2. **Decode tidak pernah gagal.** Nilai rusak, enum asing, atau angka di luar
 *    rentang jatuh ke default, bukan melempar error. Tautan yang dibuat versi
 *    lama harus tetap membuka aplikasi — lebih baik terjepit daripada blank.
 */
import { DEFAULT_PARAMS } from "./defaults";
import {
  ACCESSIBILITY_FEATURES,
  DRINK_VESSEL_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  LIGHTING_OPTIONS,
  POWER_SOURCE_OPTIONS,
  WASTE_BINS_OPTIONS,
  clampParams,
} from "./engine";
import type {
  AccessibilityFeature,
  DrinkVessel,
  EventParams,
  EventType,
  FoodPackaging,
  Lighting,
  PowerSource,
  WasteBins,
} from "./engine";
import { EVENT_TYPE_OPTIONS } from "./insight-request";

/**
 * Kunci query. Sengaja pendek. Prefiks `b` menandai keputusan baseline.
 * Field ukuran acara (peserta, durasi, konsumsi, tamu difabel) tidak punya
 * pasangan baseline: baseline hanya membekukan KEPUTUSAN, ukurannya selalu
 * ikut skenario supaya perbandingannya adil.
 */
const KEYS = {
  participants: "p",
  durationHours: "h",
  eventType: "t",
  mealsPerPerson: "m",
  drinksPerPerson: "d",
  soundSystemKw: "sk",
  estimatedDisabledGuests: "dg",
  foodPackaging: "fp",
  drinkVessel: "dv",
  wasteBins: "wb",
  lighting: "lt",
  powerSource: "ps",
  accessibility: "ac",
} as const;

const BASELINE_PREFIX = "b";

/** Keputusan penyelenggaraan — satu-satunya yang punya versi baseline. */
const DECISION_KEYS = [
  "foodPackaging",
  "drinkVessel",
  "wasteBins",
  "lighting",
  "powerSource",
] as const;

export interface DecodedShare {
  scenario: EventParams;
  baseline: EventParams;
  /** True kalau query string memuat setidaknya satu kunci yang dikenal. */
  hasParams: boolean;
}

function numberText(value: number): string {
  // Hindari "6.5" jadi "6.5000001" dan buang ".0" yang tidak perlu.
  return String(Number(value.toFixed(4)));
}

function parseNumber(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return raw !== null && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

function parseAccessibility(
  raw: string | null,
  fallback: AccessibilityFeature[],
): AccessibilityFeature[] {
  if (raw === null) return fallback;
  if (raw.trim() === "") return []; // kunci ada tapi kosong = sengaja tanpa fasilitas
  const seen = new Set<string>();
  const out: AccessibilityFeature[] = [];
  for (const piece of raw.split(",")) {
    const item = piece.trim();
    if (!(ACCESSIBILITY_FEATURES as readonly string[]).includes(item)) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item as AccessibilityFeature);
  }
  return out;
}

/**
 * Urutan kanonik daftar fasilitas: mengikuti urutan di `ACCESSIBILITY_FEATURES`
 * (urutan bobot, sama dengan urutan tampil di form). Daftar fasilitas adalah
 * himpunan — urutan klik tidak bermakna — jadi dinormalisasi supaya dua pengguna
 * yang memilih fasilitas sama menghasilkan tautan yang identik.
 */
function canonicalAccessibility(
  list: readonly AccessibilityFeature[],
): AccessibilityFeature[] {
  const chosen = new Set(list);
  return ACCESSIBILITY_FEATURES.filter((f) => chosen.has(f));
}

/**
 * Membangun query string dari skenario aktif dan keputusan baseline.
 * Nilai yang sama dengan default dilewati agar tautan tetap pendek.
 */
export function encodeShareParams(
  scenario: EventParams,
  baselineDecisions: EventParams,
): string {
  const qs = new URLSearchParams();

  const putNumber = (key: string, value: number, fallback: number) => {
    if (value !== fallback) qs.set(key, numberText(value));
  };
  const putText = (key: string, value: string, fallback: string) => {
    if (value !== fallback) qs.set(key, value);
  };

  putNumber(KEYS.participants, scenario.participants, DEFAULT_PARAMS.participants);
  putNumber(KEYS.durationHours, scenario.durationHours, DEFAULT_PARAMS.durationHours);
  putText(KEYS.eventType, scenario.eventType, DEFAULT_PARAMS.eventType);
  putNumber(KEYS.mealsPerPerson, scenario.mealsPerPerson, DEFAULT_PARAMS.mealsPerPerson);
  putNumber(KEYS.drinksPerPerson, scenario.drinksPerPerson, DEFAULT_PARAMS.drinksPerPerson);
  putNumber(KEYS.soundSystemKw, scenario.soundSystemKw, DEFAULT_PARAMS.soundSystemKw);
  putNumber(
    KEYS.estimatedDisabledGuests,
    scenario.estimatedDisabledGuests,
    DEFAULT_PARAMS.estimatedDisabledGuests,
  );

  for (const key of DECISION_KEYS) {
    putText(KEYS[key], scenario[key], DEFAULT_PARAMS[key]);
  }

  const scenarioAccess = canonicalAccessibility(scenario.accessibility).join(",");
  const defaultAccess = canonicalAccessibility(DEFAULT_PARAMS.accessibility).join(",");
  if (scenarioAccess !== defaultAccess) qs.set(KEYS.accessibility, scenarioAccess);

  // Baseline hanya ditulis untuk keputusan yang benar-benar berbeda dari
  // skenario. Saat pengguna belum mengubah apa pun, blok ini tidak menghasilkan
  // satu kunci pun.
  for (const key of DECISION_KEYS) {
    if (baselineDecisions[key] !== scenario[key]) {
      qs.set(BASELINE_PREFIX + KEYS[key], baselineDecisions[key]);
    }
  }
  const baselineAccess = canonicalAccessibility(baselineDecisions.accessibility).join(",");
  if (baselineAccess !== scenarioAccess) {
    qs.set(BASELINE_PREFIX + KEYS.accessibility, baselineAccess);
  }

  return qs.toString();
}

/**
 * Membaca query string menjadi skenario + baseline. Tidak pernah melempar:
 * nilai yang tidak dikenal jatuh ke default, angka di luar rentang dijepit
 * oleh `clampParams()`.
 */
export function decodeShareParams(qs: URLSearchParams): DecodedShare {
  const known = [
    ...Object.values(KEYS),
    ...DECISION_KEYS.map((k) => BASELINE_PREFIX + KEYS[k]),
    BASELINE_PREFIX + KEYS.accessibility,
  ];
  // Kunci kosong (?p=) bukan intent — kecuali aksesibilitas (?ac= = tanpa fasilitas).
  const emptyOk = new Set([KEYS.accessibility, BASELINE_PREFIX + KEYS.accessibility]);
  const hasParams = known.some((key) => {
    const v = qs.get(key);
    if (v === null) return false;
    if (emptyOk.has(key)) return true;
    return v !== "";
  });

  const scenario = clampParams({
    participants: Math.round(
      parseNumber(qs.get(KEYS.participants), DEFAULT_PARAMS.participants),
    ),
    durationHours: parseNumber(qs.get(KEYS.durationHours), DEFAULT_PARAMS.durationHours),
    eventType: parseEnum<EventType>(
      qs.get(KEYS.eventType),
      EVENT_TYPE_OPTIONS,
      DEFAULT_PARAMS.eventType,
    ),
    mealsPerPerson: parseNumber(
      qs.get(KEYS.mealsPerPerson),
      DEFAULT_PARAMS.mealsPerPerson,
    ),
    drinksPerPerson: parseNumber(
      qs.get(KEYS.drinksPerPerson),
      DEFAULT_PARAMS.drinksPerPerson,
    ),
    soundSystemKw: parseNumber(qs.get(KEYS.soundSystemKw), DEFAULT_PARAMS.soundSystemKw),
    estimatedDisabledGuests: Math.round(
      parseNumber(
        qs.get(KEYS.estimatedDisabledGuests),
        DEFAULT_PARAMS.estimatedDisabledGuests,
      ),
    ),
    foodPackaging: parseEnum<FoodPackaging>(
      qs.get(KEYS.foodPackaging),
      FOOD_PACKAGING_OPTIONS,
      DEFAULT_PARAMS.foodPackaging,
    ),
    drinkVessel: parseEnum<DrinkVessel>(
      qs.get(KEYS.drinkVessel),
      DRINK_VESSEL_OPTIONS,
      DEFAULT_PARAMS.drinkVessel,
    ),
    wasteBins: parseEnum<WasteBins>(
      qs.get(KEYS.wasteBins),
      WASTE_BINS_OPTIONS,
      DEFAULT_PARAMS.wasteBins,
    ),
    lighting: parseEnum<Lighting>(
      qs.get(KEYS.lighting),
      LIGHTING_OPTIONS,
      DEFAULT_PARAMS.lighting,
    ),
    powerSource: parseEnum<PowerSource>(
      qs.get(KEYS.powerSource),
      POWER_SOURCE_OPTIONS,
      DEFAULT_PARAMS.powerSource,
    ),
    accessibility: parseAccessibility(qs.get(KEYS.accessibility), [
      ...DEFAULT_PARAMS.accessibility,
    ]),
  });

  // Keputusan baseline: pakai kunci `b*` bila ada, kalau tidak ikut skenario.
  // Ukuran acara selalu menyalin skenario supaya perbandingannya adil.
  const baseline = clampParams({
    ...scenario,
    foodPackaging: parseEnum<FoodPackaging>(
      qs.get(BASELINE_PREFIX + KEYS.foodPackaging),
      FOOD_PACKAGING_OPTIONS,
      scenario.foodPackaging,
    ),
    drinkVessel: parseEnum<DrinkVessel>(
      qs.get(BASELINE_PREFIX + KEYS.drinkVessel),
      DRINK_VESSEL_OPTIONS,
      scenario.drinkVessel,
    ),
    wasteBins: parseEnum<WasteBins>(
      qs.get(BASELINE_PREFIX + KEYS.wasteBins),
      WASTE_BINS_OPTIONS,
      scenario.wasteBins,
    ),
    lighting: parseEnum<Lighting>(
      qs.get(BASELINE_PREFIX + KEYS.lighting),
      LIGHTING_OPTIONS,
      scenario.lighting,
    ),
    powerSource: parseEnum<PowerSource>(
      qs.get(BASELINE_PREFIX + KEYS.powerSource),
      POWER_SOURCE_OPTIONS,
      scenario.powerSource,
    ),
    accessibility: parseAccessibility(
      qs.get(BASELINE_PREFIX + KEYS.accessibility),
      [...scenario.accessibility],
    ),
  });

  return { scenario, baseline, hasParams };
}
