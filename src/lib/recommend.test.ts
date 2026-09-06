import { describe, expect, it } from "vitest";
import { ACCESSIBILITY } from "./coefficients";
import { simulate } from "./engine";
import type { EventParams } from "./engine";
import { recommend } from "./recommend";

/** Sama dengan BASE di engine.test.ts dan baseline demo-numbers.ts. */
const BASE: EventParams = {
  participants: 500,
  durationHours: 6,
  eventType: "festival",
  mealsPerPerson: 1,
  drinksPerPerson: 2,
  foodPackaging: "disposable",
  drinkVessel: "plasticBottle",
  wasteBins: "mixed",
  lighting: "halogen",
  soundSystemKw: 3,
  powerSource: "pln",
  accessibility: [],
  estimatedDisabledGuests: 15,
};

const ALL_FEATURES = Object.keys(ACCESSIBILITY) as Array<
  keyof typeof ACCESSIBILITY
>;

describe("recommend — bentuk keluaran", () => {
  it("mengembalikan tiga teratas secara baku", () => {
    expect(recommend(BASE)).toHaveLength(3);
  });

  it("menghormati batas jumlah yang diminta", () => {
    expect(recommend(BASE, 1)).toHaveLength(1);
    expect(recommend(BASE, 5)).toHaveLength(5);
  });

  it("tidak pernah mengusulkan nilai yang sudah dipakai", () => {
    for (const r of recommend(BASE, 99)) {
      expect(r.id).not.toBe("foodPackaging:disposable");
      expect(r.id).not.toBe("drinkVessel:plasticBottle");
      expect(r.id).not.toBe("wasteBins:mixed");
      expect(r.id).not.toBe("lighting:halogen");
      expect(r.id).not.toBe("powerSource:pln");
    }
  });

  it("tidak pernah mengusulkan mencabut fasilitas akses yang sudah ada", () => {
    const withAll = recommend({ ...BASE, accessibility: ALL_FEATURES }, 99);

    for (const r of withAll) {
      expect(r.id.startsWith("accessibility:")).toBe(false);
      expect(r.params.accessibility).toHaveLength(ALL_FEATURES.length);
    }
  });

  it("params tiap rekomendasi berbeda dari baseline hanya pada satu keputusan", () => {
    for (const r of recommend(BASE, 99)) {
      const changed = (
        [
          "foodPackaging",
          "drinkVessel",
          "wasteBins",
          "lighting",
          "powerSource",
        ] as const
      ).filter((key) => r.params[key] !== BASE[key]);
      const accessAdded =
        r.params.accessibility.length - BASE.accessibility.length;

      expect(changed.length + accessAdded).toBe(1);
    }
  });
});

describe("recommend — kebenaran delta", () => {
  it("delta cocok dengan hasil simulate atas params yang diusulkan", () => {
    const before = simulate(BASE);

    for (const r of recommend(BASE, 99)) {
      const after = simulate(r.params);

      expect(r.delta.wasteGeneratedKg).toBeCloseTo(
        after.waste.generatedKg - before.waste.generatedKg,
        6,
      );
      expect(r.delta.wasteLandfillKg).toBeCloseTo(
        after.waste.landfillKg - before.waste.landfillKg,
        6,
      );
      expect(r.delta.energyKwh).toBeCloseTo(
        after.energy.kwh - before.energy.kwh,
        6,
      );
      expect(r.delta.inclusionPoints).toBeCloseTo(
        after.inclusion.score - before.inclusion.score,
        6,
      );
      expect(r.delta.scoreGain).toBeCloseTo(
        after.sustainabilityScore - before.sustainabilityScore,
        6,
      );
    }
  });

  it("biaya memakai amortisasi peralatan guna ulang, bukan capex penuh", () => {
    const reusable = recommend(BASE, 99).find(
      (r) => r.id === "foodPackaging:reusable",
    );
    expect(reusable).toBeDefined();

    const before = simulate(BASE);
    const after = simulate(reusable!.params);
    const capex = after.cost.reusableCapexRp;

    expect(capex).toBeGreaterThan(0);
    expect(reusable!.delta.costRp).toBeCloseTo(
      after.cost.totalRp +
        after.cost.reusableAmortizedRp -
        (before.cost.totalRp + before.cost.reusableAmortizedRp),
      6,
    );
    // Membebankan capex penuh ke satu acara akan melebihkan biaya ~29x.
    expect(reusable!.delta.costRp).toBeLessThan(capex);
  });
});

describe("recommend — pengurutan", () => {
  it("hanya mengusulkan perubahan yang memperbaiki sustainability score", () => {
    for (const r of recommend(BASE, 99)) {
      expect(r.delta.scoreGain).toBeGreaterThan(0);
    }
  });

  it("menaruh perubahan yang sekaligus menghemat biaya di atas yang berbayar", () => {
    const all = recommend(BASE, 99);
    const lastSaving = all.map((r) => r.savesMoney).lastIndexOf(true);
    const firstPaid = all.map((r) => r.savesMoney).indexOf(false);

    expect(lastSaving).toBeGreaterThanOrEqual(0);
    expect(firstPaid).toBeGreaterThan(lastSaving);
  });

  it("mengurutkan perubahan berbayar dari poin per rupiah tertinggi", () => {
    const paid = recommend(BASE, 99).filter((r) => !r.savesMoney);

    for (let i = 1; i < paid.length; i++) {
      expect(paid[i - 1].scorePerMillionRp).toBeGreaterThanOrEqual(
        paid[i].scorePerMillionRp!,
      );
    }
  });

  it("menilai materi huruf besar lebih efisien per rupiah daripada ramp", () => {
    const all = recommend(BASE, 99);
    const largePrint = all.find((r) => r.id === "accessibility:largePrint")!;
    const ramp = all.find((r) => r.id === "accessibility:ramp")!;

    // PRD §4.4: bobot lebih kecil tapi biaya jauh lebih murah.
    expect(largePrint.scorePerMillionRp).toBeGreaterThan(
      ramp.scorePerMillionRp!,
    );
    expect(all.indexOf(largePrint)).toBeLessThan(all.indexOf(ramp));
  });

  it("scorePerMillionRp bernilai null tepat ketika perubahan menghemat biaya", () => {
    for (const r of recommend(BASE, 99)) {
      expect(r.scorePerMillionRp === null).toBe(r.savesMoney);
      if (r.savesMoney) expect(r.delta.costRp).toBeLessThan(0);
      else expect(r.delta.costRp).toBeGreaterThanOrEqual(0);
    }
  });

  it("mengosongkan daftar setelah seluruh perbaikan diterapkan berturut-turut", () => {
    // Invarian penting: menerapkan rekomendasi teratas berulang kali harus
    // berhenti. Kalau `recommend` pernah mengusulkan perubahan yang tidak
    // benar-benar menaikkan skor, loop ini tidak akan pernah selesai.
    let params: EventParams = { ...BASE };
    let steps = 0;

    for (;;) {
      const top = recommend(params, 1)[0];
      if (!top) break;

      const before = simulate(params).sustainabilityScore;
      params = top.params;
      expect(simulate(params).sustainabilityScore).toBeGreaterThan(before);

      steps++;
      // 5 keputusan enum + 6 fasilitas akses = batas atas langkah yang wajar.
      expect(steps).toBeLessThanOrEqual(20);
    }

    expect(steps).toBeGreaterThan(0);
    expect(recommend(params)).toHaveLength(0);
  });
});

describe("recommend — tripwire beban denah", () => {
  const energized: EventParams = {
    ...BASE,
    extraLightingKw: 0.4,
    extraSoundKw: 0.5,
  };

  it("id rekomendasi identik dengan/tanpa beban denah", () => {
    const cleanIds = recommend(BASE, 99).map((r) => r.id);
    const loadedIds = recommend(energized, 99).map((r) => r.id);

    expect(loadedIds).toEqual(cleanIds);
  });

  it("params kandidat tidak membawa extras denah", () => {
    for (const r of recommend(energized, 99)) {
      expect(r.params.extraLightingKw).toBeUndefined();
      expect(r.params.extraSoundKw).toBeUndefined();
    }
  });
});
