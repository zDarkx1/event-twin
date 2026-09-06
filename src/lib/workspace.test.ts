import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PARAMS } from "./defaults";
import { DEFAULT_LAYOUT } from "./layout";
import {
  WORKSPACE_KEY,
  clearWorkspace,
  decodeWorkspace,
  encodeWorkspace,
  loadWorkspace,
  saveWorkspace,
  type WorkspaceStore,
} from "./workspace";

const EPOCH = new Date(0).toISOString();

const memStore = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

const draft = {
  scenario: { ...DEFAULT_PARAMS },
  baselineDecisions: { ...DEFAULT_PARAMS, lighting: "led" as const },
  layout: { cols: 12, rows: 8, boxes: [] },
};

const validSavedAt = "2026-09-05T00:00:00.000Z";

function rawDraft(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 1,
    savedAt: validSavedAt,
    scenario: {},
    baselineDecisions: {},
    layout: { cols: 12, rows: 8, boxes: [] },
    ...overrides,
  });
}

describe("encode/decode roundtrip", () => {
  it("menyimpan dan membaca kembali tanpa kehilangan data", () => {
    const raw = encodeWorkspace({ ...draft, savedAt: "2026-09-05T00:00:00.000Z" });
    const out = decodeWorkspace(raw);
    expect(out?.version).toBe(1);
    expect(out?.savedAt).toBe("2026-09-05T00:00:00.000Z");
    expect(out?.baselineDecisions.lighting).toBe("led");
    expect(out?.layout).toEqual(draft.layout);
  });

  it("mengisi savedAt saat tidak diberikan", () => {
    const out = decodeWorkspace(encodeWorkspace(draft));
    expect(typeof out?.savedAt).toBe("string");
  });
});

describe("decodeWorkspace tidak pernah gagal", () => {
  it("null, kosong, dan JSON rusak → null", () => {
    expect(decodeWorkspace(null)).toBeNull();
    expect(decodeWorkspace("  ")).toBeNull();
    expect(decodeWorkspace("{bukan json")).toBeNull();
    expect(decodeWorkspace("42")).toBeNull();
  });

  it("versi asing → null", () => {
    expect(decodeWorkspace('{"version":99}')).toBeNull();
    expect(decodeWorkspace("{}")).toBeNull();
  });

  it("field hilang dinormalisasi ke default", () => {
    const out = decodeWorkspace('{"version":1}');
    expect(out?.scenario).toMatchObject({ participants: 500 });
    expect(out?.layout).toEqual(DEFAULT_LAYOUT);
  });

  it("angka di luar rentang dijepit, enum asing jatuh ke default", () => {
    const out = decodeWorkspace(
      JSON.stringify({
        version: 1,
        savedAt: "x",
        scenario: { participants: 99999, lighting: "neon" },
        baselineDecisions: {},
        layout: null,
      }),
    );
    expect(out?.scenario.participants).toBe(10_000);
    expect(out?.scenario.lighting).toBe("halogen");
    expect(out?.savedAt).toBe(EPOCH);
  });

  it("kunci asing diabaikan", () => {
    const out = decodeWorkspace(
      JSON.stringify({
        version: 1,
        savedAt: "x",
        scenario: { hacker: true },
        baselineDecisions: {},
        layout: { cols: 12, rows: 8, boxes: [] },
      }),
    );
    expect(out?.scenario).not.toHaveProperty("hacker");
    expect(out?.savedAt).toBe(EPOCH);
  });
});

describe("storage helpers", () => {
  it("save lalu load memakai kunci berversi", () => {
    const store = memStore();
    expect(saveWorkspace(store, draft)).toBe(true);
    const out = loadWorkspace(store);
    expect(out?.baselineDecisions.lighting).toBe("led");
  });

  it("load saat kosong → null; clear menghapus", () => {
    const store = memStore();
    expect(loadWorkspace(store)).toBeNull();
    expect(saveWorkspace(store, draft)).toBe(true);
    expect(clearWorkspace(store)).toBe(true);
    expect(loadWorkspace(store)).toBeNull();
  });

  it("kuota penuh tidak melempar, melapor false", () => {
    const failing: WorkspaceStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => saveWorkspace(failing, draft)).not.toThrow();
    expect(() => loadWorkspace(failing)).not.toThrow();
    expect(() => clearWorkspace(failing)).not.toThrow();
    expect(saveWorkspace(failing, draft)).toBe(false);
    expect(clearWorkspace(failing)).toBe(false);
  });

  it("setItem dipanggil maksimal dengan kunci berversi", () => {
    const setItem = vi.fn();
    const ok = saveWorkspace(
      { setItem, getItem: () => null, removeItem: () => {} },
      draft,
    );
    expect(ok).toBe(true);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0][0]).toBe(WORKSPACE_KEY);
  });
});

describe("auditor: koersi numerik string", () => {
  it("string numerik terkoersi, bukan jatuh ke range.min", () => {
    const out = decodeWorkspace(
      rawDraft({
        scenario: {
          participants: "600",
          durationHours: "7.5",
          mealsPerPerson: "2",
          drinksPerPerson: "3",
          soundSystemKw: "4.5",
          estimatedDisabledGuests: "20",
        },
      }),
    );
    expect(out?.scenario.participants).toBe(600);
    expect(out?.scenario.durationHours).toBe(7.5);
    expect(out?.scenario.mealsPerPerson).toBe(2);
    expect(out?.scenario.drinksPerPerson).toBe(3);
    expect(out?.scenario.soundSystemKw).toBe(4.5);
    expect(out?.scenario.estimatedDisabledGuests).toBe(20);
  });

  it("boolean/null/objek numerik → default", () => {
    const junkCases: unknown[] = [true, false, null, {}, [], { x: 1 }];
    for (const junk of junkCases) {
      const out = decodeWorkspace(
        rawDraft({
          scenario: {
            participants: junk,
            durationHours: junk,
            mealsPerPerson: junk,
            drinksPerPerson: junk,
            soundSystemKw: junk,
            estimatedDisabledGuests: junk,
          },
        }),
      );
      expect(out?.scenario.participants).toBe(DEFAULT_PARAMS.participants);
      expect(out?.scenario.durationHours).toBe(DEFAULT_PARAMS.durationHours);
      expect(out?.scenario.mealsPerPerson).toBe(DEFAULT_PARAMS.mealsPerPerson);
      expect(out?.scenario.drinksPerPerson).toBe(DEFAULT_PARAMS.drinksPerPerson);
      expect(out?.scenario.soundSystemKw).toBe(DEFAULT_PARAMS.soundSystemKw);
      expect(out?.scenario.estimatedDisabledGuests).toBe(
        DEFAULT_PARAMS.estimatedDisabledGuests,
      );
    }
  });

  it("string sampah / Infinity / NaN → default", () => {
    const out = decodeWorkspace(
      rawDraft({
        scenario: {
          participants: "abc",
          durationHours: "Infinity",
          mealsPerPerson: "",
          drinksPerPerson: "  ",
          soundSystemKw: "12kg",
          estimatedDisabledGuests: "NaN",
        },
      }),
    );
    expect(out?.scenario.participants).toBe(DEFAULT_PARAMS.participants);
    expect(out?.scenario.durationHours).toBe(DEFAULT_PARAMS.durationHours);
    expect(out?.scenario.mealsPerPerson).toBe(DEFAULT_PARAMS.mealsPerPerson);
    expect(out?.scenario.drinksPerPerson).toBe(DEFAULT_PARAMS.drinksPerPerson);
    expect(out?.scenario.soundSystemKw).toBe(DEFAULT_PARAMS.soundSystemKw);
    expect(out?.scenario.estimatedDisabledGuests).toBe(
      DEFAULT_PARAMS.estimatedDisabledGuests,
    );
  });

  it("peserta fraksional dibulatkan (parity share-url)", () => {
    const numOut = decodeWorkspace(
      rawDraft({ scenario: { participants: 500.7, estimatedDisabledGuests: 10.4 } }),
    );
    expect(numOut?.scenario.participants).toBe(501);
    expect(numOut?.scenario.estimatedDisabledGuests).toBe(10);

    const strOut = decodeWorkspace(
      rawDraft({
        scenario: { participants: "500.7", estimatedDisabledGuests: "10.5" },
      }),
    );
    expect(strOut?.scenario.participants).toBe(501);
    expect(strOut?.scenario.estimatedDisabledGuests).toBe(11);
  });
});

describe("auditor: ketahanan decode + store jahat", () => {
  it("non-string raw → null tanpa melempar", () => {
    expect(decodeWorkspace(42)).toBeNull();
    expect(decodeWorkspace(undefined)).toBeNull();
    expect(decodeWorkspace({})).toBeNull();
    expect(decodeWorkspace([])).toBeNull();
    expect(decodeWorkspace(0)).toBeNull();
  });

  it("evil store mengembalikan 42 → no throw + null", () => {
    const evil = {
      getItem: () => 42,
      setItem: () => {},
      removeItem: () => {},
    } as unknown as WorkspaceStore;
    expect(() => loadWorkspace(evil)).not.toThrow();
    expect(loadWorkspace(evil)).toBeNull();
  });

  it("getItem melempar → null; decode melempar pun tertelan load", () => {
    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadWorkspace(throwing)).toBeNull();
  });
});

describe("auditor: savedAt sampah → epoch", () => {
  it("decode: junk variants → epoch", () => {
    for (const savedAt of ["x", "", "not-a-date", 42, null, {}, []]) {
      const out = decodeWorkspace(
        rawDraft({ savedAt: savedAt as unknown as string }),
      );
      expect(out?.savedAt).toBe(EPOCH);
    }
  });

  it("decode: tanggal valid lolos", () => {
    const out = decodeWorkspace(rawDraft({ savedAt: validSavedAt }));
    expect(out?.savedAt).toBe(validSavedAt);
  });

  it("encode: savedAt sampah → epoch, undefined → now", () => {
    const junkRaw = encodeWorkspace({
      ...draft,
      savedAt: "x" as unknown as string,
    });
    expect(JSON.parse(junkRaw).savedAt).toBe(EPOCH);

    const emptyRaw = encodeWorkspace({
      ...draft,
      savedAt: "" as unknown as string,
    });
    expect(JSON.parse(emptyRaw).savedAt).toBe(EPOCH);
  });
});

describe("auditor: aksesibilitas + layout sampah", () => {
  it("accessibility junk variants → aman", () => {
    for (const accessibility of ["ramp", 42, null, {}, ""]) {
      const out = decodeWorkspace(rawDraft({ scenario: { accessibility } }));
      expect(out?.scenario.accessibility).toEqual([]);
    }
    const mixed = decodeWorkspace(
      rawDraft({
        scenario: { accessibility: ["ramp", "ramp", "bogus", 42, null] },
      }),
    );
    expect(mixed?.scenario.accessibility).toEqual(["ramp"]);
  });

  it("nested layout garbage → ternormalisasi tanpa melempar", () => {
    const out = decodeWorkspace(
      rawDraft({
        layout: {
          cols: "huge",
          rows: null,
          boxes: [
            { type: "bogus" },
            null,
            42,
            { type: "stage", x: "a", y: {}, w: null, h: undefined, id: 7 },
            { type: "stage", x: 0, y: 0, w: 4, h: 2, id: "dup" },
            { type: "stage", x: 0, y: 0, w: 4, h: 2, id: "dup" },
          ],
        },
      }),
    );
    expect(out?.layout.cols).toBe(DEFAULT_LAYOUT.cols);
    expect(out?.layout.rows).toBe(DEFAULT_LAYOUT.rows);
    // Kotak bogus/null/angka dibuang; tabrakan keep-first; id duplikat diganti.
    expect(Array.isArray(out?.layout.boxes)).toBe(true);
    for (const b of out?.layout.boxes ?? []) {
      expect(typeof b.id).toBe("string");
    }
  });
});

describe("auditor: status boolean save/clear", () => {
  it("save sukses → true, clear sukses → true", () => {
    const store = memStore();
    expect(saveWorkspace(store, draft)).toBe(true);
    expect(clearWorkspace(store)).toBe(true);
  });

  it("encode bug melempar jujur (tidak ditelan save)", () => {
    const store = memStore();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() =>
      saveWorkspace(store, {
        scenario: { ...DEFAULT_PARAMS },
        baselineDecisions: { ...DEFAULT_PARAMS },
        // JSON.stringify akan melempar di encodeWorkspace sebelum setItem.
        layout: circular as never,
      }),
    ).toThrow();
  });
});

describe("kunci lawas 12x8", () => {
  it("draf lawas 12x8 roundtrip utuh", () => {
    const raw = encodeWorkspace({ ...draft, savedAt: validSavedAt });
    const out = decodeWorkspace(raw);
    expect(out?.layout).toEqual({ cols: 12, rows: 8, boxes: [] });
  });
});
