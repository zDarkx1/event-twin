/**
 * Validasi dan normalisasi body request `/api/insight` — fungsi murni, tanpa
 * jaringan, supaya bisa diuji lepas dari Route Handler.
 *
 * Batas kepercayaan: apa pun yang datang dari klien dianggap tidak dipercaya.
 * Enum diambil dari konstanta engine, jadi validator tidak bisa lepas sinkron
 * kalau nanti ada opsi baru. Field asing dibuang — hanya field yang dikenal
 * yang diteruskan ke engine.
 */
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

export const EVENT_TYPE_OPTIONS: readonly EventType[] = [
  "festival",
  "seminar",
  "competition",
  "bazaar",
];

export type ParseResult =
  | { ok: true; value: { params: EventParams; baseline: EventParams } }
  | { ok: false };

const FAIL: ParseResult = { ok: false };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function finiteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function integer(v: unknown): number | null {
  const n = finiteNumber(v);
  return n !== null && Number.isInteger(n) ? n : null;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : null;
}

/** kW denah: angka berhingga non-negatif, atau null kalau bentuknya salah. */
function extraKw(v: unknown): number | null {
  const n = finiteNumber(v);
  return n !== null && n >= 0 ? n : null;
}

function accessibilityList(v: unknown): AccessibilityFeature[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length > ACCESSIBILITY_FEATURES.length) return null;
  const seen = new Set<string>();
  const out: AccessibilityFeature[] = [];
  for (const item of v) {
    const feature = oneOf(item, ACCESSIBILITY_FEATURES);
    if (feature === null) return null;
    if (seen.has(feature)) return null; // duplikat membuat bobot dihitung ganda
    seen.add(feature);
    out.push(feature);
  }
  return out;
}

/**
 * Membangun EventParams dari objek tidak dipercaya. Mengembalikan null kalau
 * ada satu saja field yang tidak memenuhi bentuknya — bukan diperbaiki diam-diam,
 * karena request yang salah bentuk lebih baik ditolak daripada ditebak.
 */
function toEventParams(raw: unknown): EventParams | null {
  if (!isPlainObject(raw)) return null;

  const participants = integer(raw.participants);
  const estimatedDisabledGuests = integer(raw.estimatedDisabledGuests);
  const durationHours = finiteNumber(raw.durationHours);
  const mealsPerPerson = finiteNumber(raw.mealsPerPerson);
  const drinksPerPerson = finiteNumber(raw.drinksPerPerson);
  const soundSystemKw = finiteNumber(raw.soundSystemKw);

  if (
    participants === null ||
    estimatedDisabledGuests === null ||
    durationHours === null ||
    mealsPerPerson === null ||
    drinksPerPerson === null ||
    soundSystemKw === null
  ) {
    return null;
  }

  const eventType = oneOf<EventType>(raw.eventType, EVENT_TYPE_OPTIONS);
  const foodPackaging = oneOf<FoodPackaging>(raw.foodPackaging, FOOD_PACKAGING_OPTIONS);
  const drinkVessel = oneOf<DrinkVessel>(raw.drinkVessel, DRINK_VESSEL_OPTIONS);
  const wasteBins = oneOf<WasteBins>(raw.wasteBins, WASTE_BINS_OPTIONS);
  const lighting = oneOf<Lighting>(raw.lighting, LIGHTING_OPTIONS);
  const powerSource = oneOf<PowerSource>(raw.powerSource, POWER_SOURCE_OPTIONS);
  const accessibility = accessibilityList(raw.accessibility);

  if (
    eventType === null ||
    foodPackaging === null ||
    drinkVessel === null ||
    wasteBins === null ||
    lighting === null ||
    powerSource === null ||
    accessibility === null
  ) {
    return null;
  }

  // Beban listrik denah venue (F10) — opsional. Kalau ada, harus angka berhingga
  // non-negatif; ditolak, bukan ditebak, konsisten dengan filosofi validator.
  // Tanpa ini, narasi AI menghitung ulang energi TANPA beban denah dan angkanya
  // berbeda dari dashboard di sampingnya.
  const extraLightingKw = raw.extraLightingKw === undefined ? undefined : extraKw(raw.extraLightingKw);
  const extraSoundKw = raw.extraSoundKw === undefined ? undefined : extraKw(raw.extraSoundKw);
  if (extraLightingKw === null || extraSoundKw === null) return null;

  // Objek dibangun ulang dari field yang dikenal saja — field asing tidak lolos.
  return {
    participants,
    durationHours,
    eventType,
    mealsPerPerson,
    drinksPerPerson,
    foodPackaging,
    drinkVessel,
    wasteBins,
    lighting,
    soundSystemKw,
    powerSource,
    accessibility,
    estimatedDisabledGuests,
    ...(extraLightingKw !== undefined && { extraLightingKw }),
    ...(extraSoundKw !== undefined && { extraSoundKw }),
  };
}

export function parseInsightRequest(body: unknown): ParseResult {
  if (!isPlainObject(body)) return FAIL;

  const params = toEventParams(body.params);
  const baseline = toEventParams(body.baselineDecisions);
  if (params === null || baseline === null) return FAIL;

  // Clamp di sini, bukan di Route Handler, supaya jaminan rentang ikut teruji.
  return { ok: true, value: { params: clampParams(params), baseline: clampParams(baseline) } };
}
