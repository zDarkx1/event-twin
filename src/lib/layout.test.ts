import { describe, expect, it } from "vitest";
import {
  BOX_SPECS,
  DEFAULT_LAYOUT,
  GRID_LIMITS,
  clampBoxToGrid,
  countByType,
  createBox,
  deriveLayoutPatch,
  isFree,
  normalizeLayout,
  type VenueLayout,
} from "./layout";

const empty = (boxes: VenueLayout["boxes"] = []): VenueLayout => ({
  cols: 12,
  rows: 8,
  boxes,
});

describe("isFree", () => {
  it("kotak pertama selalu bebas bila di dalam grid", () => {
    expect(isFree(empty(), { x: 0, y: 0, w: 2, h: 2 })).toBe(true);
  });

  it("menolak kotak yang keluar grid", () => {
    expect(isFree(empty(), { x: 11, y: 0, w: 2, h: 1 })).toBe(false);
    expect(isFree(empty(), { x: -1, y: 0, w: 1, h: 1 })).toBe(false);
    expect(isFree(empty(), { x: 0, y: 0, w: 0, h: 1 })).toBe(false);
  });

  it("menolak tabrakan, menerima yang bersebelahan", () => {
    const layout = empty([createBox("booth", 2, 2, "a")]);
    expect(isFree(layout, { x: 3, y: 3, w: 2, h: 2 })).toBe(false);
    // Tepi bersentuhan bukan tabrakan.
    expect(isFree(layout, { x: 4, y: 2, w: 2, h: 2 })).toBe(true);
  });

  it("ignoreId mengabaikan kotak itu sendiri saat dipindah", () => {
    const layout = empty([createBox("booth", 2, 2, "a")]);
    expect(isFree(layout, { x: 2, y: 2, w: 2, h: 2 }, "a")).toBe(true);
    expect(isFree(layout, { x: 2, y: 2, w: 2, h: 2 }, "b")).toBe(false);
  });

  it("menolak NaN/undefined/fractional", () => {
    expect(isFree(empty(), { x: NaN, y: 0, w: 1, h: 1 })).toBe(false);
    expect(isFree(empty(), { x: 0, y: 0, w: NaN, h: 1 })).toBe(false);
    expect(
      isFree(empty(), {
        x: undefined as unknown as number,
        y: 0,
        w: 1,
        h: 1,
      }),
    ).toBe(false);
    expect(isFree(empty(), { x: 0.5, y: 0, w: 1, h: 1 })).toBe(false);
    expect(isFree(empty(), { x: 0, y: 0, w: 1.5, h: 1 })).toBe(false);
  });
});

describe("clampBoxToGrid", () => {
  it("menjepit posisi dan menjaga ukuran minimum 1x1", () => {
    expect(clampBoxToGrid({ x: 20, y: -3, w: 2, h: 2 }, 12, 8)).toEqual({
      x: 10,
      y: 0,
      w: 2,
      h: 2,
    });
    expect(clampBoxToGrid({ x: 0, y: 0, w: 0, h: -1 }, 12, 8)).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    });
  });

  it("menyusutkan kotak lebih besar dari grid", () => {
    expect(clampBoxToGrid({ x: 0, y: 0, w: 99, h: 99 }, 12, 8)).toEqual({
      x: 0,
      y: 0,
      w: 12,
      h: 8,
    });
  });

  it("dimensi grid degenerasi jatuh ke default, w/h tidak pernah 0", () => {
    for (const [cols, rows] of [
      [0, 0],
      [-5, -2],
      [NaN, NaN],
    ] as const) {
      const out = clampBoxToGrid({ x: 0, y: 0, w: 2, h: 2 }, cols, rows);
      expect(out).toEqual({ x: 0, y: 0, w: 2, h: 2 });
      expect(out.w).toBeGreaterThanOrEqual(1);
      expect(out.h).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("normalizeLayout", () => {
  it("input bukan objek jatuh ke default", () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT);
    expect(normalizeLayout("rusak")).toEqual(DEFAULT_LAYOUT);
  });

  it("membuang tipe asing dan menjepit posisi", () => {
    const out = normalizeLayout({
      cols: 12,
      rows: 8,
      boxes: [
        { id: "x", type: "teleporter", x: 0, y: 0, w: 1, h: 1 },
        { id: "y", type: "booth", x: 50, y: 50, w: 2, h: 2 },
      ],
    });
    expect(out.boxes.map((b) => b.id)).toEqual(["y"]);
    expect(out.boxes[0]).toMatchObject({ x: 10, y: 6, w: 2, h: 2 });
  });

  it("tabrakan diselesaikan keep-first", () => {
    const out = normalizeLayout({
      cols: 12,
      rows: 8,
      boxes: [
        { id: "first", type: "booth", x: 0, y: 0, w: 2, h: 2 },
        { id: "second", type: "stage", x: 1, y: 1, w: 2, h: 2 },
      ],
    });
    expect(out.boxes.map((b) => b.id)).toEqual(["first"]);
  });

  it("id duplikat diganti tanpa membuang kotak", () => {
    const out = normalizeLayout({
      cols: 12,
      rows: 8,
      boxes: [
        { id: "sama", type: "booth", x: 0, y: 0, w: 1, h: 1 },
        { id: "sama", type: "booth", x: 5, y: 5, w: 1, h: 1 },
      ],
    });
    expect(out.boxes).toHaveLength(2);
    expect(out.boxes[0].id).not.toBe(out.boxes[1].id);
  });

  it("dimensi grid dijepit ke batas", () => {
    const out = normalizeLayout({ cols: 99, rows: -2, boxes: [] });
    expect(out.cols).toBe(GRID_LIMITS.cols.max);
    expect(out.rows).toBe(GRID_LIMITS.rows.min);
  });

  it("menolak prototype-chain: toString/constructor/__proto__", () => {
    const out = normalizeLayout({
      cols: 12,
      rows: 8,
      boxes: [
        { id: "a", type: "toString", x: 0, y: 0, w: 1, h: 1 },
        { id: "b", type: "constructor", x: 2, y: 0, w: 1, h: 1 },
        { id: "c", type: "__proto__", x: 4, y: 0, w: 1, h: 1 },
      ],
    });
    expect(out.boxes).toEqual([]);
  });

  it("early return tidak mengaliasi array DEFAULT_LAYOUT", () => {
    const a = normalizeLayout(null);
    a.boxes.push(createBox("booth", 0, 0, "x"));
    a.cols = 99;
    const b = normalizeLayout(null);
    expect(b.boxes).toEqual([]);
    expect(b.cols).toBe(DEFAULT_LAYOUT.cols);
    expect(DEFAULT_LAYOUT.boxes).toEqual([]);
  });

  it("boxes non-array jadi []", () => {
    for (const boxes of [null, "rusak", undefined]) {
      const out = normalizeLayout({ cols: 12, rows: 8, boxes });
      expect(out.boxes).toEqual([]);
    }
  });

  it("entri null dilewati", () => {
    const out = normalizeLayout({
      cols: 12,
      rows: 8,
      boxes: [null, undefined, 42, { id: "ok", type: "booth", x: 0, y: 0, w: 1, h: 1 }],
    });
    expect(out.boxes.map((b) => b.id)).toEqual(["ok"]);
  });

  it('cols "huge"/NaN/6.9 fallback+floor', () => {
    expect(
      normalizeLayout({ cols: "huge", rows: 8, boxes: [] }).cols,
    ).toBe(DEFAULT_LAYOUT.cols);
    expect(normalizeLayout({ cols: NaN, rows: 8, boxes: [] }).cols).toBe(
      DEFAULT_LAYOUT.cols,
    );
    expect(normalizeLayout({ cols: 6.9, rows: 8, boxes: [] }).cols).toBe(6);
  });

  it('id ""/hilang diregenerasi unik', () => {
    const out = normalizeLayout({
      cols: 12,
      rows: 8,
      boxes: [
        { id: "", type: "booth", x: 0, y: 0, w: 1, h: 1 },
        { type: "booth", x: 5, y: 5, w: 1, h: 1 },
      ],
    });
    expect(out.boxes).toHaveLength(2);
    expect(out.boxes[0].id).not.toBe("");
    expect(out.boxes[1].id).not.toBe("");
    expect(out.boxes[0].id).not.toBe(out.boxes[1].id);
  });

  it("w/h NaN dinormalisasi ke 1x1 di posisi 0,0", () => {
    const out = normalizeLayout({
      cols: 12,
      rows: 8,
      boxes: [{ id: "n", type: "booth", x: NaN, y: NaN, w: NaN, h: NaN }],
    });
    expect(out.boxes[0]).toMatchObject({ x: 0, y: 0, w: 1, h: 1 });
  });
});

describe("deriveLayoutPatch", () => {
  const box = (type: Parameters<typeof createBox>[0], x: number, y: number) =>
    createBox(type, x, y, `${type}-${x}-${y}`);

  it("denah kosong tidak menyarankan apa-apa", () => {
    expect(deriveLayoutPatch(empty(), 500)).toEqual({
      extraLightingKw: 0,
      extraSoundKw: 0,
      suggestedWasteBins: null,
      suggestedAccessibility: [],
    });
  });

  it("kotak lighting/sound jadi beban kW aditif", () => {
    const layout = empty([box("lighting", 0, 0), box("lighting", 2, 0), box("sound", 4, 0)]);
    const patch = deriveLayoutPatch(layout, 500);
    expect(patch.extraLightingKw).toBeCloseTo(0.4, 10);
    expect(patch.extraSoundKw).toBeCloseTo(0.5, 10);
  });

  it("cakupan stasiun menentukan saran pemilahan", () => {
    // 4 stasiun x 150 = 600 >= 500 → terpilah.
    const cukup = empty([
      box("wasteStation", 0, 0),
      box("wasteStation", 2, 0),
      box("wasteStation", 4, 0),
      box("wasteStation", 6, 0),
    ]);
    expect(deriveLayoutPatch(cukup, 500).suggestedWasteBins).toBe("segregated");
    // 2 stasiun x 150 = 300 < 500 → campur.
    const kurang = empty([box("wasteStation", 0, 0), box("wasteStation", 2, 0)]);
    expect(deriveLayoutPatch(kurang, 500).suggestedWasteBins).toBe("mixed");
  });

  it("kotak akses jadi saran fitur yang unik", () => {
    const layout = empty([
      box("ramp", 0, 0),
      box("ramp", 3, 0),
      box("accessibleToilet", 6, 0),
    ]);
    expect(deriveLayoutPatch(layout, 500).suggestedAccessibility).toEqual([
      "ramp",
      "accessibleToilet",
    ]);
  });

  it("kotak visual tidak memengaruhi patch", () => {
    const layout = empty([box("stage", 0, 0), box("restroom", 5, 0)]);
    const patch = deriveLayoutPatch(layout, 500);
    expect(patch.extraLightingKw).toBe(0);
    expect(patch.suggestedWasteBins).toBeNull();
    expect(patch.suggestedAccessibility).toEqual([]);
  });

  it("batas 1 stasiun: 150 → segregated, 151 → mixed", () => {
    const satu = empty([box("wasteStation", 0, 0)]);
    expect(deriveLayoutPatch(satu, 150).suggestedWasteBins).toBe(
      "segregated",
    );
    expect(deriveLayoutPatch(satu, 151).suggestedWasteBins).toBe("mixed");
  });

  it("partisipan non-finite/negatif/fraksi disanitasi", () => {
    const satu = empty([box("wasteStation", 0, 0)]);
    expect(deriveLayoutPatch(satu, NaN).suggestedWasteBins).toBe(
      "segregated",
    );
    expect(deriveLayoutPatch(satu, Infinity).suggestedWasteBins).toBe(
      "segregated",
    );
    expect(deriveLayoutPatch(satu, -5).suggestedWasteBins).toBe("segregated");
    // 150.9 → floor 150 → tetap segregated.
    expect(deriveLayoutPatch(satu, 150.9).suggestedWasteBins).toBe(
      "segregated",
    );
  });

  it("layout null/undefined tidak melempar — patch kosong", () => {
    for (const bad of [null, undefined, "rusak", 42]) {
      expect(() =>
        deriveLayoutPatch(bad as unknown as VenueLayout, 500),
      ).not.toThrow();
      expect(
        deriveLayoutPatch(bad as unknown as VenueLayout, 500),
      ).toEqual({
        extraLightingKw: 0,
        extraSoundKw: 0,
        suggestedWasteBins: null,
        suggestedAccessibility: [],
      });
    }
  });

  it("kunci boxes hilang/non-array jadi patch kosong, tidak melempar", () => {
    for (const boxes of [undefined, null, "rusak"]) {
      const layout = { cols: 12, rows: 8, boxes } as unknown as VenueLayout;
      expect(() => deriveLayoutPatch(layout, 500)).not.toThrow();
      expect(deriveLayoutPatch(layout, 500)).toEqual({
        extraLightingKw: 0,
        extraSoundKw: 0,
        suggestedWasteBins: null,
        suggestedAccessibility: [],
      });
    }
  });
});

describe("createBox", () => {
  it("memakai footprint katalog dan id unik", () => {
    const a = createBox("stage", 0, 0);
    const b = createBox("stage", 0, 0);
    expect(a).toMatchObject({ type: "stage", w: 4, h: 2 });
    expect(a.id).not.toBe(b.id);
    expect(BOX_SPECS.lighting.binding).toBe("lighting");
  });

  it("tipe asing melempar RangeError yang jelas", () => {
    expect(() =>
      (createBox as (...args: unknown[]) => unknown)("teleporter", 0, 0),
    ).toThrow(RangeError);
    expect(() =>
      (createBox as (...args: unknown[]) => unknown)("toString", 0, 0),
    ).toThrow(RangeError);
  });

  it("id fallback tanpa crypto.randomUUID", () => {
    const cryptoObj = globalThis.crypto as unknown as {
      randomUUID?: unknown;
    };
    const orig = cryptoObj?.randomUUID;
    try {
      if (cryptoObj) cryptoObj.randomUUID = undefined;
      const a = createBox("booth", 0, 0);
      const b = createBox("booth", 1, 1);
      expect(a.id).toMatch(/^box-/);
      expect(a.id).not.toBe(b.id);
    } finally {
      if (cryptoObj && orig) cryptoObj.randomUUID = orig;
    }
  });
});

describe("kunci default 32x24, plafon 64x48", () => {
  it("default terkunci {32,24,[]} di bawah plafon GRID_LIMITS", () => {
    expect(DEFAULT_LAYOUT).toEqual({ cols: 32, rows: 24, boxes: [] });
    expect(GRID_LIMITS.cols.max).toBe(64);
    expect(GRID_LIMITS.rows.max).toBe(48);
  });

  it("denah lawas 12x8 yang valid tetap dipertahankan", () => {
    expect(normalizeLayout({ cols: 12, rows: 8, boxes: [] })).toEqual({
      cols: 12,
      rows: 8,
      boxes: [],
    });
  });

  it("jepit tepi pada plafon 64x48", () => {
    expect(clampBoxToGrid({ x: 63, y: 47, w: 2, h: 2 }, 64, 48)).toEqual({
      x: 62,
      y: 46,
      w: 2,
      h: 2,
    });
  });
});

describe("countByType", () => {
  it("melewati entri null dan tipe asing, boxes undefined jadi nol", () => {
    const layout = {
      cols: 12,
      rows: 8,
      boxes: [
        null,
        { id: "x", type: "toString", x: 0, y: 0, w: 1, h: 1 },
        createBox("booth", 0, 0, "ok"),
      ],
    } as unknown as VenueLayout;
    const counts = countByType(layout);
    expect(counts.booth).toBe(1);
    expect(counts.stage).toBe(0);
    expect(
      countByType({ cols: 12, rows: 8 } as unknown as VenueLayout),
    ).toMatchObject({ booth: 0, stage: 0 });
  });
});
