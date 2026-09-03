import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "./defaults";
import { parseInsightRequest } from "./insight-request";

const VALID = { ...DEFAULT_PARAMS, accessibility: [...DEFAULT_PARAMS.accessibility] };

function body(overrides: Record<string, unknown> = {}) {
  return { params: { ...VALID, ...overrides }, baselineDecisions: { ...VALID } };
}

describe("parseInsightRequest — bentuk request", () => {
  it("menerima body yang valid", () => {
    const r = parseInsightRequest(body());
    expect(r.ok).toBe(true);
  });

  it("menolak body yang bukan objek", () => {
    for (const bad of [null, undefined, "teks", 42, true, []]) {
      expect(parseInsightRequest(bad).ok).toBe(false);
    }
  });

  it("menolak body tanpa baselineDecisions", () => {
    expect(parseInsightRequest({ params: VALID }).ok).toBe(false);
  });

  it("menolak body tanpa params", () => {
    expect(parseInsightRequest({ baselineDecisions: VALID }).ok).toBe(false);
  });
});

describe("parseInsightRequest — field numerik", () => {
  it("menolak participants non-integer", () => {
    expect(parseInsightRequest(body({ participants: 500.5 })).ok).toBe(false);
  });

  it("menolak estimatedDisabledGuests non-integer", () => {
    expect(parseInsightRequest(body({ estimatedDisabledGuests: 1.5 })).ok).toBe(false);
  });

  it("menolak angka berbentuk string", () => {
    expect(parseInsightRequest(body({ participants: "500" })).ok).toBe(false);
    expect(parseInsightRequest(body({ durationHours: "6" })).ok).toBe(false);
  });

  it("menolak NaN dan Infinity", () => {
    expect(parseInsightRequest(body({ participants: Number.NaN })).ok).toBe(false);
    expect(parseInsightRequest(body({ durationHours: Number.POSITIVE_INFINITY })).ok).toBe(false);
    expect(parseInsightRequest(body({ soundSystemKw: Number.NEGATIVE_INFINITY })).ok).toBe(false);
  });

  it("menolak null pada field numerik", () => {
    expect(parseInsightRequest(body({ participants: null })).ok).toBe(false);
  });

  it("menerima float pada field yang memang float", () => {
    const r = parseInsightRequest(body({ durationHours: 6.5, mealsPerPerson: 1.5 }));
    expect(r.ok).toBe(true);
  });

  it("menerima nilai di luar rentang — clamp adalah tugas engine, bukan validator", () => {
    const r = parseInsightRequest(body({ participants: 1_000_000_000 }));
    expect(r.ok).toBe(true);
  });
});

describe("parseInsightRequest — enum", () => {
  it("menolak nilai enum di luar daftar", () => {
    expect(parseInsightRequest(body({ foodPackaging: "emas" })).ok).toBe(false);
    expect(parseInsightRequest(body({ drinkVessel: "termos" })).ok).toBe(false);
    expect(parseInsightRequest(body({ wasteBins: "banyak" })).ok).toBe(false);
    expect(parseInsightRequest(body({ lighting: "obor" })).ok).toBe(false);
    expect(parseInsightRequest(body({ powerSource: "surya" })).ok).toBe(false);
    expect(parseInsightRequest(body({ eventType: "konser" })).ok).toBe(false);
  });

  it("menerima setiap nilai enum yang sah", () => {
    expect(parseInsightRequest(body({ foodPackaging: "reusable" })).ok).toBe(true);
    expect(parseInsightRequest(body({ drinkVessel: "refillStation" })).ok).toBe(true);
    expect(parseInsightRequest(body({ wasteBins: "segregated" })).ok).toBe(true);
    expect(parseInsightRequest(body({ lighting: "led" })).ok).toBe(true);
    expect(parseInsightRequest(body({ powerSource: "generator" })).ok).toBe(true);
    expect(parseInsightRequest(body({ eventType: "seminar" })).ok).toBe(true);
  });
});

describe("parseInsightRequest — daftar fasilitas akses", () => {
  it("menolak yang bukan array", () => {
    expect(parseInsightRequest(body({ accessibility: "ramp" })).ok).toBe(false);
    expect(parseInsightRequest(body({ accessibility: null })).ok).toBe(false);
  });

  it("menolak fasilitas yang tidak dikenal", () => {
    expect(parseInsightRequest(body({ accessibility: ["helipad"] })).ok).toBe(false);
  });

  it("menolak entri duplikat", () => {
    expect(parseInsightRequest(body({ accessibility: ["ramp", "ramp"] })).ok).toBe(false);
  });

  it("menolak daftar lebih panjang daripada jumlah fasilitas yang ada", () => {
    const tujuh = ["ramp", "accessibleToilet", "signLanguage", "tactilePath",
      "prioritySeating", "largePrint", "ramp"];
    expect(parseInsightRequest(body({ accessibility: tujuh })).ok).toBe(false);
  });

  it("menerima daftar kosong dan daftar lengkap", () => {
    expect(parseInsightRequest(body({ accessibility: [] })).ok).toBe(true);
    expect(
      parseInsightRequest(
        body({
          accessibility: [
            "ramp", "accessibleToilet", "signLanguage",
            "tactilePath", "prioritySeating", "largePrint",
          ],
        }),
      ).ok,
    ).toBe(true);
  });
});

describe("parseInsightRequest — hasil parse", () => {
  it("mengembalikan params yang sudah di-clamp, bukan mentah", () => {
    const r = parseInsightRequest(body({ participants: 1_000_000_000 }));
    if (!r.ok) throw new Error("seharusnya valid");
    // LIMITS.participants.max = 10_000
    expect(r.value.params.participants).toBe(10_000);
  });

  it("tidak membocorkan field asing dari body ke params", () => {
    const raw = body();
    (raw.params as Record<string, unknown>).__proto__polluted = true;
    (raw.params as Record<string, unknown>).jahat = "muatan";
    const r = parseInsightRequest(raw);
    if (!r.ok) throw new Error("seharusnya valid");
    expect(r.value.params).not.toHaveProperty("jahat");
    expect(r.value.params).not.toHaveProperty("__proto__polluted");
  });

  it("params dan baseline diparse terpisah", () => {
    const r = parseInsightRequest({
      params: { ...VALID, lighting: "led" },
      baselineDecisions: { ...VALID, lighting: "halogen" },
    });
    if (!r.ok) throw new Error("seharusnya valid");
    expect(r.value.params.lighting).toBe("led");
    expect(r.value.baseline.lighting).toBe("halogen");
  });
});
