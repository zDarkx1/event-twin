/**
 * Model denah venue (F10) — tipe data, matematika grid, dan katalog kotak.
 * Fungsi murni tanpa akses DOM/window, supaya bisa diuji dan dipakai di server.
 *
 * Denah adalah grid sel tetap (default 32x24), bukan koordinat bebas: tabrakan
 * jadi aritmetika persegi, serialisasi ke localStorage/URL deterministik, dan
 * demo tidak bisa menghasilkan kotak setengah sel. viewport editor menumbuhkan
 * grid sampai memenuhi layar (maks 64x48); yang tersimpan hanya tumbuh saat
 * kotak benar-benar ditaruh di zona baru — zoom/pan tak pernah menulis model.
 */
import { LAYOUT } from "./coefficients";
import type { AccessibilityFeature, WasteBins } from "./engine";

export type LayoutBoxType =
  | "stage"
  | "seating"
  | "booth"
  | "entrance"
  | "generic"
  | "lighting"
  | "sound"
  | "wasteStation"
  | "restroom"
  | "ramp"
  | "accessibleToilet"
  | "prioritySeating"
  | "firstAid";

export const LAYOUT_BOX_TYPES: readonly LayoutBoxType[] = [
  "stage",
  "seating",
  "booth",
  "entrance",
  "generic",
  "lighting",
  "sound",
  "wasteStation",
  "restroom",
  "ramp",
  "accessibleToilet",
  "prioritySeating",
  "firstAid",
];

/** Kaitan kotak ke engine. "none" = visual saja, tanpa efek ke metrik. */
export type BoxBinding =
  | "none"
  | "lighting"
  | "sound"
  | "waste"
  | { access: AccessibilityFeature };

export interface BoxSpec {
  type: LayoutBoxType;
  label: string;
  /** Footprint bawaan dalam sel (lebar x tinggi). */
  defaultW: number;
  defaultH: number;
  /** Token warna latar kotak — reuse token grafik dimensi yang serumpun. */
  colorVar: string;
  binding: BoxBinding;
}

/**
 * Katalog kotak. Warna mengikuti dimensi yang dipengaruhi: lighting = energi,
 * wasteStation = sampah, kotak akses = inklusi, stage = pusat perhatian.
 * Sisanya netral (border saja, tanpa fill) supaya denah tidak gaduh.
 *
 * By-design: signLanguage/tactilePath/largePrint sengaja TIDAK punya kotak
 * (layanan, bukan tempat di denah); firstAid/restroom/stage/seating/booth/
 * entrance/generic sengaja binding "none" (visual saja, tanpa efek ke metrik).
 */
export const BOX_SPECS: Record<LayoutBoxType, BoxSpec> = {
  stage: {
    type: "stage",
    label: "Panggung",
    defaultW: 4,
    defaultH: 2,
    colorVar: "var(--chart-4)",
    binding: "none",
  },
  seating: {
    type: "seating",
    label: "Tempat duduk",
    defaultW: 3,
    defaultH: 2,
    colorVar: "var(--muted-foreground)",
    binding: "none",
  },
  booth: {
    type: "booth",
    label: "Booth / stan",
    defaultW: 2,
    defaultH: 2,
    colorVar: "var(--muted-foreground)",
    binding: "none",
  },
  entrance: {
    type: "entrance",
    label: "Pintu masuk",
    defaultW: 2,
    defaultH: 1,
    colorVar: "var(--muted-foreground)",
    binding: "none",
  },
  generic: {
    type: "generic",
    label: "Area umum",
    defaultW: 2,
    defaultH: 2,
    colorVar: "var(--muted-foreground)",
    binding: "none",
  },
  lighting: {
    type: "lighting",
    label: "Menara lighting",
    defaultW: 1,
    defaultH: 1,
    colorVar: "var(--chart-2)",
    binding: "lighting",
  },
  sound: {
    type: "sound",
    label: "Titik sound",
    defaultW: 1,
    defaultH: 1,
    colorVar: "var(--chart-5)",
    binding: "sound",
  },
  wasteStation: {
    type: "wasteStation",
    label: "Stasiun sampah",
    defaultW: 1,
    defaultH: 1,
    colorVar: "var(--chart-1)",
    binding: "waste",
  },
  restroom: {
    type: "restroom",
    label: "Toilet",
    defaultW: 2,
    defaultH: 1,
    colorVar: "var(--muted-foreground)",
    binding: "none",
  },
  ramp: {
    type: "ramp",
    label: "Ramp",
    defaultW: 2,
    defaultH: 1,
    colorVar: "var(--success)",
    binding: { access: "ramp" },
  },
  accessibleToilet: {
    type: "accessibleToilet",
    label: "Toilet difabel",
    defaultW: 1,
    defaultH: 1,
    colorVar: "var(--success)",
    binding: { access: "accessibleToilet" },
  },
  prioritySeating: {
    type: "prioritySeating",
    label: "Kursi prioritas",
    defaultW: 2,
    defaultH: 1,
    colorVar: "var(--success)",
    binding: { access: "prioritySeating" },
  },
  firstAid: {
    type: "firstAid",
    label: "P3K",
    defaultW: 1,
    defaultH: 1,
    colorVar: "var(--muted-foreground)",
    binding: "none",
  },
};

export interface LayoutBox {
  id: string;
  type: LayoutBoxType;
  /** Posisi sel kiri-atas, berbasis 0. */
  x: number;
  y: number;
  /** Footprint dalam sel, minimal 1x1. */
  w: number;
  h: number;
}

export interface VenueLayout {
  cols: number;
  rows: number;
  boxes: LayoutBox[];
}

/**
 * Denah bawaan — kosong. Dibekukan supaya tidak ada yang memutasi bersama;
 * pembaruan harus imutabel (buat objek/array baru, jangan push ke .boxes).
 */
export const DEFAULT_LAYOUT: VenueLayout = { cols: 32, rows: 24, boxes: [] };
Object.freeze(DEFAULT_LAYOUT);
Object.freeze(DEFAULT_LAYOUT.boxes);

/** Ukuran grid yang diizinkan — cukup kecil untuk ponsel, cukup besar untuk denah. */
export const GRID_LIMITS = {
  cols: { min: 6, max: 64 },
  rows: { min: 4, max: 48 },
} as const;

/**
 * ID unik untuk kotak. `crypto.randomUUID()` crash di non-secure context
 * (demo via http) / runtime lama — fallback `box-<base36 time>-<random>`.
 */
function newId(): string {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (typeof uuid === "string" && uuid.length > 0) return uuid;
  } catch {
    // Jatuh ke fallback di bawah.
  }
  return `box-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Kotak baru dari palet. Posisi TIDAK dijepit ke grid dan TIDAK dicek
 * tabrakan di sini — penolakan drop yang bertabrakan adalah urusan interaksi
 * (panggil isFree / ghost merah), bukan konstruktor, supaya logikanya bisa
 * diuji terpisah.
 */
export function createBox(
  type: LayoutBoxType,
  x: number,
  y: number,
  id: string = newId(),
): LayoutBox {
  const spec: BoxSpec | undefined = (
    BOX_SPECS as Partial<Record<LayoutBoxType, BoxSpec>>
  )[type];
  if (
    typeof type !== "string" ||
    !Object.prototype.hasOwnProperty.call(BOX_SPECS, type) ||
    !spec
  )
    throw new RangeError(`Unknown box type: ${String(type)}`);
  return { id, type, x, y, w: spec.defaultW, h: spec.defaultH };
}

function rectsOverlap(
  a: Pick<LayoutBox, "x" | "y" | "w" | "h">,
  b: Pick<LayoutBox, "x" | "y" | "w" | "h">,
): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * True bila kandidat tidak keluar grid dan tidak menabrak kotak lain.
 * `ignoreId` untuk memindahkan/mengubah ukuran kotak yang sudah ada tanpa
 * dianggap menabrak dirinya sendiri.
 */
export function isFree(
  layout: VenueLayout,
  candidate: Pick<LayoutBox, "x" | "y" | "w" | "h">,
  ignoreId?: string,
): boolean {
  if (
    !Number.isInteger(candidate.x) ||
    !Number.isInteger(candidate.y) ||
    !Number.isInteger(candidate.w) ||
    !Number.isInteger(candidate.h)
  ) {
    return false;
  }
  if (
    candidate.w < 1 ||
    candidate.h < 1 ||
    candidate.x < 0 ||
    candidate.y < 0 ||
    candidate.x + candidate.w > layout.cols ||
    candidate.y + candidate.h > layout.rows
  ) {
    return false;
  }
  return !layout.boxes.some(
    (b) => b.id !== ignoreId && rectsOverlap(b, candidate),
  );
}

/** Jepit posisi + ukuran ke dalam grid. Ukuran minimum 1x1 selalu dijaga. */
export function clampBoxToGrid(
  box: Pick<LayoutBox, "x" | "y" | "w" | "h">,
  cols: number,
  rows: number,
): Pick<LayoutBox, "x" | "y" | "w" | "h"> {
  const safeCols =
    typeof cols === "number" && Number.isFinite(cols) && cols >= 1
      ? Math.floor(cols)
      : DEFAULT_LAYOUT.cols;
  const safeRows =
    typeof rows === "number" && Number.isFinite(rows) && rows >= 1
      ? Math.floor(rows)
      : DEFAULT_LAYOUT.rows;
  const w = Math.min(Math.max(1, Math.floor(box.w)), safeCols);
  const h = Math.min(Math.max(1, Math.floor(box.h)), safeRows);
  return {
    w,
    h,
    x: Math.min(Math.max(0, Math.floor(box.x)), safeCols - w),
    y: Math.min(Math.max(0, Math.floor(box.y)), safeRows - h),
  };
}

/**
 * Normalisasi denah dari sumber tak tepercaya (localStorage, versi lama).
 * Tidak pernah melempar: tipe asing dibuang, posisi dijepit, tabrakan
 * diselesaikan keep-first, id duplikat diganti.
 */
export function normalizeLayout(raw: unknown): VenueLayout {
  if (typeof raw !== "object" || raw === null)
    return {
      cols: DEFAULT_LAYOUT.cols,
      rows: DEFAULT_LAYOUT.rows,
      boxes: [],
    };
  const input = raw as Partial<VenueLayout>;

  const cols = clampInt(
    input.cols,
    GRID_LIMITS.cols.min,
    GRID_LIMITS.cols.max,
    DEFAULT_LAYOUT.cols,
  );
  const rows = clampInt(
    input.rows,
    GRID_LIMITS.rows.min,
    GRID_LIMITS.rows.max,
    DEFAULT_LAYOUT.rows,
  );

  const boxes: LayoutBox[] = [];
  const seenIds = new Set<string>();
  if (Array.isArray(input.boxes)) {
    for (const item of input.boxes) {
      if (typeof item !== "object" || item === null) continue;
      const candidate = item as Partial<LayoutBox>;
      if (
        typeof candidate.type !== "string" ||
        !Object.prototype.hasOwnProperty.call(BOX_SPECS, candidate.type)
      ) {
        continue;
      }
      const clamped = clampBoxToGrid(
        {
          x: toFinite(candidate.x),
          y: toFinite(candidate.y),
          w: toFinite(candidate.w, 1),
          h: toFinite(candidate.h, 1),
        },
        cols,
        rows,
      );
      let id = typeof candidate.id === "string" ? candidate.id : "";
      if (id === "" || seenIds.has(id)) id = newId();
      seenIds.add(id);
      const box: LayoutBox = {
        id,
        type: candidate.type as LayoutBoxType,
        ...clamped,
      };
      // Keep-first: kotak yang bertabrakan dengan yang sudah diterima dibuang.
      if (isFree({ cols, rows, boxes }, box)) boxes.push(box);
    }
  }
  return { cols, rows, boxes };
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), min), max)
    : fallback;
}

function toFinite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Hitung kotak per tipe — dasar derivasi ke engine. */
export function countByType(layout: VenueLayout): Record<LayoutBoxType, number> {
  const counts = Object.fromEntries(
    LAYOUT_BOX_TYPES.map((t) => [t, 0]),
  ) as Record<LayoutBoxType, number>;
  const boxes = Array.isArray((layout as VenueLayout | null | undefined)?.boxes)
    ? (layout as VenueLayout).boxes
    : [];
  for (const box of boxes) {
    if (typeof box !== "object" || box === null) continue;
    const t = (box as { type?: unknown }).type;
    if (
      typeof t !== "string" ||
      !Object.prototype.hasOwnProperty.call(BOX_SPECS, t)
    ) {
      continue;
    }
    counts[t as LayoutBoxType] += 1;
  }
  return counts;
}

export interface LayoutPatch {
  /** kW lighting tambahan dari menara di denah (dikalikan durasi di engine). */
  extraLightingKw: number;
  /** kW sound tambahan dari titik sound di denah. */
  extraSoundKw: number;
  /**
   * Saran pemilahan dari cakupan stasiun, null bila denah tidak menyarankan
   * apa-apa (tidak ada stasiun sama sekali — jangan timpa pilihan form).
   */
  suggestedWasteBins: WasteBins | null;
  /** Fitur akses yang tersirat dari kotak akses di denah (unik, terurut). */
  suggestedAccessibility: AccessibilityFeature[];
}

/**
 * Turunan denah ke engine. Beban listrik bersifat ADITIF (tidak ada kontrol
 * form yang dilawan), sedangkan sampah + akses hanya SARAN yang diterapkan
 * lewat tombol "Terapkan" — tidak ada konflik dua penulis.
 */
export function deriveLayoutPatch(
  layout: VenueLayout,
  participants: number,
): LayoutPatch {
  if (typeof layout !== "object" || layout === null) {
    return {
      extraLightingKw: 0,
      extraSoundKw: 0,
      suggestedWasteBins: null,
      suggestedAccessibility: [],
    };
  }
  const counts = countByType(layout);
  const safeParticipants =
    typeof participants === "number" && Number.isFinite(participants)
      ? Math.max(0, Math.floor(participants))
      : 0;

  const suggestedAccessibility: AccessibilityFeature[] = [];
  for (const type of LAYOUT_BOX_TYPES) {
    if (counts[type] === 0) continue;
    const binding = BOX_SPECS[type].binding;
    if (typeof binding === "object" && !suggestedAccessibility.includes(binding.access)) {
      suggestedAccessibility.push(binding.access);
    }
  }

  const stations = counts.wasteStation;
  const suggestedWasteBins: WasteBins | null =
    stations === 0
      ? null
      : stations * LAYOUT.wasteStationCoverage >= safeParticipants
        ? "segregated"
        : "mixed";

  return {
    extraLightingKw: counts.lighting * LAYOUT.lightingKwPerBox,
    extraSoundKw: counts.sound * LAYOUT.soundKwPerBox,
    suggestedWasteBins,
    suggestedAccessibility,
  };
}
