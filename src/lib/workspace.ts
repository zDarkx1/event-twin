/**
 * Workspace draft (F10) — persistensi lokal eksplisit: skenario, baseline,
 * dan denah venue tersimpan otomatis di localStorage sebagai JSON berversi.
 *
 * Aturan preseden (lihat pemakai di scenario-simulator): tautan berbagi
 * (URL) selalu menang atas draf; draf hanya dipakai saat URL tidak membawa
 * parameter. Indikator "Draf tersimpan" di UI membuat state ini terlihat —
 * tidak ada persistensi tersembunyi.
 */
import {
  ACCESSIBILITY_FEATURES,
  DRINK_VESSEL_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  LIGHTING_OPTIONS,
  POWER_SOURCE_OPTIONS,
  WASTE_BINS_OPTIONS,
  clampParams,
  type AccessibilityFeature,
  type EventParams,
} from "./engine";
import { DEFAULT_PARAMS } from "./defaults";
// Allowlist tipe acara yang sama dengan share-url.ts. Aman dari siklus:
// insight-request hanya mengimpor tipe + konstanta dari engine.
import { EVENT_TYPE_OPTIONS } from "./insight-request";
import { normalizeLayout, type VenueLayout } from "./layout";

const WORKSPACE_VERSION = 1;
export const WORKSPACE_KEY = `eventtwin.workspace.v${WORKSPACE_VERSION}`;

export interface WorkspaceDraft {
  version: number;
  /** ISO timestamp penyimpanan terakhir, untuk indikator UI. */
  savedAt: string;
  scenario: EventParams;
  baselineDecisions: EventParams;
  layout: VenueLayout;
}

/** True bila string ISO date yang bisa diparse. */
function isValidSavedAt(v: unknown): v is string {
  return (
    typeof v === "string" && v !== "" && !Number.isNaN(Date.parse(v))
  );
}

/**
 * Encode draf ke JSON. `savedAt` diisi saat ini bila tidak diberikan —
 * mempermudah pengujian deterministik dengan mengopernya eksplisit.
 * `savedAt` pemberian pemanggil yang bukan tanggal valid dinormalisasi ke epoch.
 */
export function encodeWorkspace(
  draft: Omit<WorkspaceDraft, "version" | "savedAt"> & {
    savedAt?: string;
  },
): string {
  const out: WorkspaceDraft = {
    version: WORKSPACE_VERSION,
    savedAt:
      draft.savedAt === undefined
        ? new Date().toISOString()
        : isValidSavedAt(draft.savedAt)
          ? draft.savedAt
          : new Date(0).toISOString(),
    scenario: draft.scenario,
    baselineDecisions: draft.baselineDecisions,
    layout: draft.layout,
  };
  return JSON.stringify(out);
}

/**
 * Decode draf dari sumber tak tepercaya. Tidak pernah melempar: JSON rusak,
 * versi asing, atau field hilang menghasilkan null (pemakai jatuh ke default)
 * atau dinormalisasi lewat `clampParams`/`normalizeLayout`.
 */
export function decodeWorkspace(raw: unknown): WorkspaceDraft | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const input = parsed as Partial<WorkspaceDraft>;
  if (input.version !== WORKSPACE_VERSION) return null;

  return {
    version: WORKSPACE_VERSION,
    savedAt: isValidSavedAt(input.savedAt)
      ? input.savedAt
      : new Date(0).toISOString(),
    scenario: clampParams(
      sanitizeParams({ ...DEFAULT_PARAMS, ...pickParams(input.scenario) }),
    ),
    baselineDecisions: clampParams(
      sanitizeParams({
        ...DEFAULT_PARAMS,
        ...pickParams(input.baselineDecisions),
      }),
    ),
    layout: normalizeLayout(input.layout),
  };
}

/**
 * Koersi angka ala share-url parseNumber: angka finite → apa adanya;
 * string numerik tak-kosong → Number(v) bila finite; selain itu (boolean,
 * null, objek, NaN, Infinity, string sampah) → fallback DEFAULT_PARAMS.
 * Tanpa ini string "600" jatuh ke range.min lewat clampRange.
 */
function num(v: unknown, fallback: number): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * clampParams hanya menjepit angka — enum asing dan array fasilitas rusak
 * lolos dan meracuni engine (index undefined → NaN). Dibersihkan di sini
 * supaya draf versi lama / editan tangan tetap aman dibuka.
 */
function sanitizeParams(p: EventParams): EventParams {
  const keep = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
    (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  const access = Array.isArray(p.accessibility)
    ? p.accessibility.filter((f): f is AccessibilityFeature =>
        (ACCESSIBILITY_FEATURES as readonly string[]).includes(f),
      )
    : [];
  return {
    ...p,
    participants: Math.round(num(p.participants, DEFAULT_PARAMS.participants)),
    durationHours: num(p.durationHours, DEFAULT_PARAMS.durationHours),
    mealsPerPerson: num(p.mealsPerPerson, DEFAULT_PARAMS.mealsPerPerson),
    drinksPerPerson: num(p.drinksPerPerson, DEFAULT_PARAMS.drinksPerPerson),
    soundSystemKw: num(p.soundSystemKw, DEFAULT_PARAMS.soundSystemKw),
    estimatedDisabledGuests: Math.round(
      num(p.estimatedDisabledGuests, DEFAULT_PARAMS.estimatedDisabledGuests),
    ),
    eventType: keep(p.eventType, EVENT_TYPE_OPTIONS, DEFAULT_PARAMS.eventType),
    foodPackaging: keep(p.foodPackaging, FOOD_PACKAGING_OPTIONS, DEFAULT_PARAMS.foodPackaging),
    drinkVessel: keep(p.drinkVessel, DRINK_VESSEL_OPTIONS, DEFAULT_PARAMS.drinkVessel),
    wasteBins: keep(p.wasteBins, WASTE_BINS_OPTIONS, DEFAULT_PARAMS.wasteBins),
    lighting: keep(p.lighting, LIGHTING_OPTIONS, DEFAULT_PARAMS.lighting),
    powerSource: keep(p.powerSource, POWER_SOURCE_OPTIONS, DEFAULT_PARAMS.powerSource),
    accessibility: [...new Set(access)],
  };
}

/**
 * Hanya kunci EventParams yang dikenal yang diambil — kunci asing dari versi
 * lain diabaikan, bukan disimpan buta.
 */
function pickParams(raw: unknown): Partial<EventParams> {
  if (typeof raw !== "object" || raw === null) return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<EventParams> = {};
  for (const key of Object.keys(DEFAULT_PARAMS) as Array<keyof EventParams>) {
    if (Object.prototype.hasOwnProperty.call(input, key))
      (out as Record<string, unknown>)[key] = input[key];
  }
  return out;
}

/**
 * Storage minimal yang dibutuhkan draf — satu interface untuk ketiga operasi
 * supaya fake di test dan localStorage produksi bisa dipakai bergantian.
 */
export interface WorkspaceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Simpan draf. Encode di luar try supaya bug programmer melempar jujur;
 * hanya kegagalan storage (kuota penuh / mode privat) yang ditelan dan
 * dilaporkan sebagai false. True = tersimpan.
 */
export function saveWorkspace(
  storage: WorkspaceStore,
  draft: Omit<WorkspaceDraft, "version" | "savedAt"> & { savedAt?: string },
): boolean {
  const raw = encodeWorkspace(draft);
  try {
    storage.setItem(WORKSPACE_KEY, raw);
    return true;
  } catch {
    // Sengaja ditelan — draf adalah kemudahan, bukan data kritis.
    return false;
  }
}

export function loadWorkspace(storage: WorkspaceStore): WorkspaceDraft | null {
  try {
    return decodeWorkspace(storage.getItem(WORKSPACE_KEY));
  } catch {
    return null;
  }
}

export function clearWorkspace(storage: WorkspaceStore): boolean {
  try {
    storage.removeItem(WORKSPACE_KEY);
    return true;
  } catch {
    // Sama seperti save: kegagalan penyimpanan lokal bukan error aplikasi.
    return false;
  }
}
