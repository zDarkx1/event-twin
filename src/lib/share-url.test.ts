import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "./defaults";
import { LIMITS } from "./coefficients";
import { decodeShareParams, encodeShareParams } from "./share-url";
import type { EventParams } from "./engine";

const BASE: EventParams = { ...DEFAULT_PARAMS, accessibility: [] };

/** Skenario yang berbeda dari baseline di setiap dimensi keputusan. */
const SCENARIO: EventParams = {
  ...BASE,
  participants: 1200,
  durationHours: 8,
  eventType: "bazaar",
  mealsPerPerson: 2,
  drinksPerPerson: 3,
  soundSystemKw: 7.5,
  estimatedDisabledGuests: 40,
  foodPackaging: "reusable",
  drinkVessel: "refillStation",
  wasteBins: "segregated",
  lighting: "led",
  powerSource: "generator",
  accessibility: ["ramp", "largePrint"],
};

describe("encodeShareParams / decodeShareParams — bolak-balik", () => {
  it("memulihkan seluruh field skenario", () => {
    const qs = encodeShareParams(SCENARIO, BASE);
    const decoded = decodeShareParams(new URLSearchParams(qs));

    expect(decoded.scenario).toEqual(SCENARIO);
  });

  it("memulihkan keputusan baseline, bukan hanya skenario", () => {
    const baseline: EventParams = {
      ...BASE,
      foodPackaging: "mixed",
      lighting: "led",
      accessibility: ["ramp"],
    };
    const qs = encodeShareParams(SCENARIO, baseline);
    const decoded = decodeShareParams(new URLSearchParams(qs));

    expect(decoded.baseline.foodPackaging).toBe("mixed");
    expect(decoded.baseline.lighting).toBe("led");
    expect(decoded.baseline.accessibility).toEqual(["ramp"]);
  });

  it("mempertahankan daftar fasilitas kosong", () => {
    const qs = encodeShareParams(BASE, BASE);
    const decoded = decodeShareParams(new URLSearchParams(qs));

    expect(decoded.scenario.accessibility).toEqual([]);
  });

  it("mempertahankan daftar fasilitas lengkap", () => {
    const semua: EventParams["accessibility"] = [
      "ramp",
      "accessibleToilet",
      "signLanguage",
      "tactilePath",
      "prioritySeating",
      "largePrint",
    ];
    const qs = encodeShareParams({ ...BASE, accessibility: semua }, BASE);
    const decoded = decodeShareParams(new URLSearchParams(qs));

    expect(decoded.scenario.accessibility).toEqual(semua);
  });

  it("mempertahankan nilai desimal", () => {
    const qs = encodeShareParams(
      { ...BASE, durationHours: 6.5, mealsPerPerson: 1.5, soundSystemKw: 2.25 },
      BASE,
    );
    const decoded = decodeShareParams(new URLSearchParams(qs));

    expect(decoded.scenario.durationHours).toBe(6.5);
    expect(decoded.scenario.mealsPerPerson).toBe(1.5);
    expect(decoded.scenario.soundSystemKw).toBe(2.25);
  });
});

describe("encodeShareParams — bentuk keluaran", () => {
  it("menghasilkan query string tanpa tanda tanya di depan", () => {
    const qs = encodeShareParams(SCENARIO, BASE);
    expect(qs.startsWith("?")).toBe(false);
    expect(qs.length).toBeGreaterThan(0);
  });

  it("menghilangkan kunci baseline ketika keputusannya sama dengan skenario", () => {
    // Kasus paling umum: pengguna belum mengubah apa pun. Tautan tidak perlu
    // memuat baseline dua kali.
    const qs = encodeShareParams(BASE, BASE);
    expect(qs).not.toContain("bfp=");
    expect(qs).not.toContain("bdv=");
    expect(qs).not.toContain("bac=");
  });

  it("menyertakan kunci baseline hanya untuk keputusan yang berbeda", () => {
    const baseline: EventParams = { ...BASE, lighting: "led" };
    const qs = encodeShareParams(BASE, baseline);

    expect(qs).toContain("blt=led");
    expect(qs).not.toContain("bfp=");
  });

  it("tidak menyertakan field ukuran acara pada baseline", () => {
    // Baseline hanya membekukan KEPUTUSAN; ukuran acara selalu ikut skenario.
    const baseline: EventParams = { ...BASE, participants: 999 };
    const qs = encodeShareParams(SCENARIO, baseline);

    expect(qs).not.toContain("bp=");
    expect(qs).not.toContain("bh=");
  });
});

describe("decodeShareParams — toleran terhadap masukan rusak", () => {
  it("mengembalikan default ketika query string kosong", () => {
    const decoded = decodeShareParams(new URLSearchParams(""));

    expect(decoded.scenario).toEqual(DEFAULT_PARAMS);
    expect(decoded.baseline).toEqual(DEFAULT_PARAMS);
    expect(decoded.hasParams).toBe(false);
  });

  it("menandai hasParams true hanya ketika ada kunci yang dikenal", () => {
    expect(decodeShareParams(new URLSearchParams("p=800")).hasParams).toBe(true);
    expect(decodeShareParams(new URLSearchParams("utm_source=wa")).hasParams).toBe(
      false,
    );
  });

  it("mengabaikan kunci asing tanpa merusak sisanya", () => {
    const decoded = decodeShareParams(
      new URLSearchParams("p=800&utm_source=wa&fbclid=abc&lt=led"),
    );

    expect(decoded.scenario.participants).toBe(800);
    expect(decoded.scenario.lighting).toBe("led");
  });

  it("memakai default ketika nilai enum tidak dikenal", () => {
    const decoded = decodeShareParams(
      new URLSearchParams("fp=emas&dv=termos&lt=obor&ps=nuklir&wb=banyak&t=konser"),
    );

    expect(decoded.scenario.foodPackaging).toBe(DEFAULT_PARAMS.foodPackaging);
    expect(decoded.scenario.drinkVessel).toBe(DEFAULT_PARAMS.drinkVessel);
    expect(decoded.scenario.lighting).toBe(DEFAULT_PARAMS.lighting);
    expect(decoded.scenario.powerSource).toBe(DEFAULT_PARAMS.powerSource);
    expect(decoded.scenario.wasteBins).toBe(DEFAULT_PARAMS.wasteBins);
    expect(decoded.scenario.eventType).toBe(DEFAULT_PARAMS.eventType);
  });

  it("memakai default ketika angka tidak bisa diparse", () => {
    const decoded = decodeShareParams(
      new URLSearchParams("p=banyak&h=&m=NaN&sk=abc"),
    );

    expect(decoded.scenario.participants).toBe(DEFAULT_PARAMS.participants);
    expect(decoded.scenario.durationHours).toBe(DEFAULT_PARAMS.durationHours);
    expect(decoded.scenario.mealsPerPerson).toBe(DEFAULT_PARAMS.mealsPerPerson);
    expect(decoded.scenario.soundSystemKw).toBe(DEFAULT_PARAMS.soundSystemKw);
  });

  it("menjepit angka di luar rentang, tidak menolaknya", () => {
    // Tautan lama bisa memuat nilai di luar LIMITS setelah rentang diubah;
    // membuka aplikasi dengan angka terjepit lebih baik daripada gagal.
    const decoded = decodeShareParams(new URLSearchParams("p=999999999&h=100"));

    expect(decoded.scenario.participants).toBe(LIMITS.participants.max);
    expect(decoded.scenario.durationHours).toBe(LIMITS.durationHours.max);
  });

  it("membuang fasilitas yang tidak dikenal dan duplikat", () => {
    const decoded = decodeShareParams(
      new URLSearchParams("ac=ramp,helipad,ramp,largePrint"),
    );

    expect(decoded.scenario.accessibility).toEqual(["ramp", "largePrint"]);
  });

  it("memakai keputusan skenario sebagai baseline ketika kunci baseline tidak ada", () => {
    const decoded = decodeShareParams(new URLSearchParams("lt=led&fp=reusable"));

    expect(decoded.baseline.lighting).toBe("led");
    expect(decoded.baseline.foodPackaging).toBe("reusable");
  });

  it("memakai kunci baseline ketika tersedia", () => {
    const decoded = decodeShareParams(
      new URLSearchParams("lt=led&blt=halogen&ac=ramp&bac="),
    );

    expect(decoded.scenario.lighting).toBe("led");
    expect(decoded.baseline.lighting).toBe("halogen");
    expect(decoded.scenario.accessibility).toEqual(["ramp"]);
    expect(decoded.baseline.accessibility).toEqual([]);
  });

  it("menyalin ukuran acara skenario ke baseline", () => {
    // Perbandingan harus adil: baseline dievaluasi pada ukuran acara yang sama.
    const decoded = decodeShareParams(new URLSearchParams("p=1200&h=8&dg=40"));

    expect(decoded.baseline.participants).toBe(1200);
    expect(decoded.baseline.durationHours).toBe(8);
    expect(decoded.baseline.estimatedDisabledGuests).toBe(40);
  });

  it("menjepit tamu difabel agar tidak melebihi jumlah peserta", () => {
    const decoded = decodeShareParams(new URLSearchParams("p=100&dg=900"));

    expect(decoded.scenario.estimatedDisabledGuests).toBe(100);
  });
});
