import { describe, expect, it } from "vitest";
import { COST, ENERGY, LIMITS, SCORE_WEIGHTS, WASTE } from "./coefficients";
import { clampParams, simulate } from "./engine";
import type { EventParams } from "./engine";

/**
 * Input acuan untuk seluruh test: festival 500 peserta, 6 jam, disposable.
 * Sama dengan default PRD §4.1 supaya angka test bisa dibandingkan dengan demo.
 */
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

describe("simulate — dimensi sampah", () => {
  it("menghitung timbulan bruto dari kemasan, wadah minum, timbulan umum, dan sisa makanan", () => {
    const r = simulate(BASE);

    // Aritmetika ditulis ulang lepas dari implementasi (PRD §4.2 dimensi 1).
    const food = 500 * 1 * WASTE.foodPackaging.disposable;
    const drink = 500 * 2 * WASTE.drinkVessel.plasticBottle;
    const general = 500 * 6 * WASTE.generalPerPersonHour;
    const organic = 500 * 1 * WASTE.foodResiduePerMeal;

    expect(r.waste.generatedKg).toBeCloseTo(food + drink + general + organic, 6);
  });

  it("membedakan timbulan bruto dari residu yang berakhir di TPA", () => {
    const r = simulate(BASE);

    // Pemilahan mengurangi residu ke TPA, BUKAN timbulan. COEFFICIENTS.md §1.4.
    expect(r.waste.landfillKg).toBeCloseTo(
      r.waste.generatedKg * WASTE.landfillFactor.mixed,
      6,
    );
    expect(r.waste.landfillKg).toBeLessThan(r.waste.generatedKg);
  });

  it("tidak mengubah timbulan bruto ketika hanya tempat sampah yang diganti", () => {
    const none = simulate({ ...BASE, wasteBins: "none" });
    const segregated = simulate({ ...BASE, wasteBins: "segregated" });

    expect(segregated.waste.generatedKg).toBeCloseTo(none.waste.generatedKg, 6);
    expect(segregated.waste.landfillKg).toBeLessThan(none.waste.landfillKg);
  });

  it("menurunkan timbulan ketika kemasan diganti ke reusable dan refill station", () => {
    const before = simulate(BASE);
    const after = simulate({
      ...BASE,
      foodPackaging: "reusable",
      drinkVessel: "refillStation",
    });

    expect(after.waste.generatedKg).toBeLessThan(before.waste.generatedKg);
  });

  it("memecah komposisi menjadi empat fraksi yang totalnya sama dengan timbulan bruto", () => {
    const r = simulate(BASE);
    const c = r.waste.composition;

    expect(c.plastic + c.organic + c.paper + c.other).toBeCloseTo(
      r.waste.generatedKg,
      6,
    );
    expect(c.organic).toBeGreaterThan(0);
    expect(c.plastic).toBeGreaterThan(0);
  });
});

describe("simulate — dimensi energi dan emisi", () => {
  it("menjumlahkan kWh pencahayaan dan sound system", () => {
    const r = simulate(BASE);

    // PRD §4.2 dimensi 2. Watt per orang → kWh butuh pembagian 1000.
    const lightingKwh = (ENERGY.lightingWattPerPerson.halogen * 500 * 6) / 1000;
    const soundKwh = 3 * 6;

    expect(r.energy.kwh).toBeCloseTo(lightingKwh + soundKwh, 6);
  });

  it("menghitung emisi dari kWh memakai faktor emisi sumber daya", () => {
    const r = simulate(BASE);

    expect(r.energy.co2eKg).toBeCloseTo(
      r.energy.kwh * ENERGY.emissionFactor.pln,
      6,
    );
  });

  it("menurunkan kWh ketika halogen diganti LED", () => {
    const halogen = simulate(BASE);
    const led = simulate({ ...BASE, lighting: "led" });

    expect(led.energy.kwh).toBeLessThan(halogen.energy.kwh);
  });

  it("tidak mengubah kWh ketika hanya sumber daya diganti, tetapi mengubah emisi", () => {
    const pln = simulate(BASE);
    const generator = simulate({ ...BASE, powerSource: "generator" });

    expect(generator.energy.kwh).toBeCloseTo(pln.energy.kwh, 6);
    expect(generator.energy.co2eKg).not.toBeCloseTo(pln.energy.co2eKg, 6);
  });
});

describe("simulate — dimensi biaya", () => {
  it("menjumlahkan biaya konsumsi, energi, angkut sampah, dan fasilitas akses", () => {
    const r = simulate(BASE);

    const consumption =
      500 * 1 * COST.mealPerPortion.disposable +
      500 * 2 * COST.drinkPerPortion.plasticBottle;
    const energy = r.energy.kwh * COST.tariffPerKwh.pln;
    // Biaya angkut mengikuti sampah yang benar-benar diangkut ke TPA.
    const hauling = r.waste.landfillKg * COST.wasteHaulingPerKg;

    expect(r.cost.consumptionRp).toBeCloseTo(consumption, 6);
    expect(r.cost.energyRp).toBeCloseTo(energy, 6);
    expect(r.cost.wasteHaulingRp).toBeCloseTo(hauling, 6);
    expect(r.cost.accessibilityRp).toBe(0);
    expect(r.cost.totalRp).toBeCloseTo(
      consumption + energy + hauling,
      6,
    );
  });

  it("menambahkan biaya setiap fasilitas akses yang dipilih", () => {
    const r = simulate({ ...BASE, accessibility: ["ramp", "largePrint"] });

    expect(r.cost.accessibilityRp).toBe(1_500_000 + 150_000);
  });

  it("mencatat investasi awal reusable terpisah dari biaya operasional", () => {
    const disposable = simulate(BASE);
    const reusable = simulate({ ...BASE, foodPackaging: "reusable" });

    // Investasi awal tidak boleh tersembunyi di dalam total operasional.
    expect(disposable.cost.reusableCapexRp).toBe(0);
    expect(reusable.cost.reusableCapexRp).toBeGreaterThan(0);
    expect(reusable.cost.reusableCapexRp).toBeCloseTo(
      500 * COST.reusableCapexPerPerson,
      6,
    );
    // Biaya teramortisasi per acara = capex / ekspektasi jumlah pemakaian.
    expect(reusable.cost.reusableAmortizedRp).toBeCloseTo(
      (500 * COST.reusableCapexPerPerson) / COST.reusableExpectedUses,
      6,
    );
  });

  it("menurunkan total biaya operasional ketika beralih ke refill station", () => {
    const bottle = simulate(BASE);
    const refill = simulate({ ...BASE, drinkVessel: "refillStation" });

    expect(refill.cost.totalRp).toBeLessThan(bottle.cost.totalRp);
  });
});

describe("simulate — skor inklusi", () => {
  const ALL_FEATURES = [
    "ramp",
    "accessibleToilet",
    "signLanguage",
    "tactilePath",
    "prioritySeating",
    "largePrint",
  ] as const;

  it("menjumlahkan bobot fasilitas yang tersedia sebagai skor dasar", () => {
    const r = simulate({
      ...BASE,
      accessibility: ["ramp", "accessibleToilet"],
    });

    expect(r.inclusion.baseScore).toBe(25 + 20);
  });

  it("memberi skor 100 ketika seluruh fasilitas tersedia", () => {
    const r = simulate({ ...BASE, accessibility: [...ALL_FEATURES] });

    expect(r.inclusion.score).toBeCloseTo(100, 6);
  });

  it("memberi skor di bawah 100 ketika ada fasilitas yang tidak tersedia", () => {
    const r = simulate({ ...BASE, accessibility: ["ramp"] });

    expect(r.inclusion.score).toBeLessThan(100);
  });

  /**
   * BUG #2 — test regresi.
   *
   * COEFFICIENTS.md §4.2 menjanjikan: "Acara dengan 200 tamu difabel dan tanpa ramp
   * lebih gagal secara inklusi daripada acara dengan 2 tamu difabel dan kondisi yang sama."
   *
   * Formula lama `skor = skorDasar × (1 − penalti)` bersifat perkalian, sehingga
   * skorDasar 0 tetap 0 berapa pun penaltinya — justru tidak berpengaruh di kasus
   * terburuk yang jadi alasan formula ini ada.
   */
  it("membedakan tingkat kegagalan inklusi antara sedikit dan banyak tamu difabel tanpa fasilitas", () => {
    const fewGuests = simulate({
      ...BASE,
      accessibility: [],
      estimatedDisabledGuests: 2,
    });
    const manyGuests = simulate({
      ...BASE,
      accessibility: [],
      estimatedDisabledGuests: 200,
    });

    expect(manyGuests.inclusion.score).toBeLessThan(fewGuests.inclusion.score);
  });

  it("tetap menurunkan skor karena proporsi kebutuhan ketika fasilitas hanya sebagian", () => {
    const fewGuests = simulate({
      ...BASE,
      accessibility: ["ramp"],
      estimatedDisabledGuests: 5,
    });
    const manyGuests = simulate({
      ...BASE,
      accessibility: ["ramp"],
      estimatedDisabledGuests: 250,
    });

    expect(manyGuests.inclusion.score).toBeLessThan(fewGuests.inclusion.score);
  });

  it("tidak memberi penalti ketika fasilitas lengkap meski tamu difabel banyak", () => {
    const few = simulate({
      ...BASE,
      accessibility: [...ALL_FEATURES],
      estimatedDisabledGuests: 5,
    });
    const many = simulate({
      ...BASE,
      accessibility: [...ALL_FEATURES],
      estimatedDisabledGuests: 300,
    });

    expect(many.inclusion.score).toBeCloseTo(few.inclusion.score, 6);
  });

  it("menaikkan skor ketika fasilitas ditambah pada profil peserta yang sama", () => {
    const withoutRamp = simulate({ ...BASE, accessibility: ["largePrint"] });
    const withRamp = simulate({
      ...BASE,
      accessibility: ["largePrint", "ramp"],
    });

    expect(withRamp.inclusion.score).toBeGreaterThan(withoutRamp.inclusion.score);
  });

  it("menjaga skor tetap dalam rentang 0-100 pada kondisi ekstrem", () => {
    const worst = simulate({
      ...BASE,
      accessibility: [],
      estimatedDisabledGuests: BASE.participants,
    });
    const best = simulate({
      ...BASE,
      accessibility: [...ALL_FEATURES],
      estimatedDisabledGuests: BASE.participants,
    });

    expect(worst.inclusion.score).toBeGreaterThanOrEqual(0);
    expect(best.inclusion.score).toBeLessThanOrEqual(100);
  });

  it("tidak memberi skor sempurna pada acara tanpa fasilitas meski tidak ada tamu difabel terdata", () => {
    // Disabilitas tak terlihat dan tamu tak terdata selalu ada; nol data
    // bukan berarti nol kebutuhan. COEFFICIENTS.md §4.2.
    const r = simulate({
      ...BASE,
      accessibility: [],
      estimatedDisabledGuests: 0,
    });

    expect(r.inclusion.score).toBeLessThan(100);
    expect(r.inclusion.needWeight).toBeGreaterThan(0);
  });
});

describe("simulate — sustainability score", () => {
  const ALL_FEATURES = [
    "ramp",
    "accessibleToilet",
    "signLanguage",
    "tactilePath",
    "prioritySeating",
    "largePrint",
  ] as const;

  const GREENEST: EventParams = {
    ...BASE,
    foodPackaging: "reusable",
    drinkVessel: "refillStation",
    wasteBins: "segregated",
    lighting: "led",
    accessibility: [...ALL_FEATURES],
  };

  it("berada dalam rentang 0-100", () => {
    for (const params of [BASE, GREENEST]) {
      const score = simulate(params).sustainabilityScore;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("memberi skor lebih tinggi pada konfigurasi yang lebih berkelanjutan", () => {
    expect(simulate(GREENEST).sustainabilityScore).toBeGreaterThan(
      simulate(BASE).sustainabilityScore,
    );
  });

  /**
   * PRD §4.2: "Normalisasi memakai skenario terburuk yang mungkin dari input
   * yang sama sebagai pembanding, sehingga skor tidak berubah drastis hanya
   * karena jumlah peserta berbeda."
   *
   * Profil peserta dijaga tetap (rasio tamu difabel 3%) supaya yang berubah
   * hanya skala acara, bukan kebutuhan aksesibilitasnya.
   */
  it("tidak berubah drastis hanya karena jumlah peserta berbeda", () => {
    const small = simulate({
      ...BASE,
      participants: 100,
      estimatedDisabledGuests: 3,
    }).sustainabilityScore;
    const large = simulate({
      ...BASE,
      participants: 5000,
      estimatedDisabledGuests: 150,
    }).sustainabilityScore;

    expect(Math.abs(large - small)).toBeLessThan(10);
  });

  it("naik ketika satu keputusan diperbaiki, tanpa mengubah input lain", () => {
    const before = simulate(BASE).sustainabilityScore;
    const afterLed = simulate({ ...BASE, lighting: "led" }).sustainabilityScore;
    const afterRamp = simulate({
      ...BASE,
      accessibility: ["ramp"],
    }).sustainabilityScore;

    expect(afterLed).toBeGreaterThan(before);
    expect(afterRamp).toBeGreaterThan(before);
  });

  it("memakai bobot dimensi dari koefisien, bukan rata-rata datar", () => {
    const r = simulate(BASE);
    const d = r.dimensionScores;

    const expected =
      d.waste * SCORE_WEIGHTS.waste +
      d.energy * SCORE_WEIGHTS.energy +
      d.inclusion * SCORE_WEIGHTS.inclusion +
      d.cost * SCORE_WEIGHTS.cost;

    expect(r.sustainabilityScore).toBeCloseTo(expected, 6);
  });

  it("menyertakan skor inklusi apa adanya sebagai dimensi inklusi", () => {
    const r = simulate(BASE);

    expect(r.dimensionScores.inclusion).toBeCloseTo(r.inclusion.score, 6);
  });
});

describe("clampParams — batas kepercayaan sistem", () => {
  it("menjepit nilai numerik di luar rentang ke batas terdekat", () => {
    const clamped = clampParams({
      ...BASE,
      participants: 99_999,
      durationHours: 0,
      mealsPerPerson: -3,
      drinksPerPerson: 50,
      soundSystemKw: 999,
    });

    expect(clamped.participants).toBe(LIMITS.participants.max);
    expect(clamped.durationHours).toBe(LIMITS.durationHours.min);
    expect(clamped.mealsPerPerson).toBe(LIMITS.mealsPerPerson.min);
    expect(clamped.drinksPerPerson).toBe(LIMITS.drinksPerPerson.max);
    expect(clamped.soundSystemKw).toBe(LIMITS.soundSystemKw.max);
  });

  it("membiarkan nilai yang sudah valid apa adanya", () => {
    expect(clampParams(BASE)).toEqual(BASE);
  });

  it("menjepit estimasi tamu difabel agar tidak melebihi jumlah peserta", () => {
    const clamped = clampParams({
      ...BASE,
      participants: 100,
      estimatedDisabledGuests: 500,
    });

    expect(clamped.estimatedDisabledGuests).toBe(100);
  });

  it("menolak nilai NaN dengan mengembalikannya ke batas bawah", () => {
    const clamped = clampParams({ ...BASE, participants: Number.NaN });

    expect(clamped.participants).toBe(LIMITS.participants.min);
  });
});

describe("simulate — beban listrik denah", () => {
  it("nol bila field ekstra tidak diisi (kompatibel mundur)", () => {
    const r = simulate(BASE);

    expect(r.energy.lightingKwh).toBeCloseTo(
      (ENERGY.lightingWattPerPerson.halogen * 500 * 6) / 1000,
      6,
    );
    expect(r.energy.soundKwh).toBeCloseTo(3 * 6, 6);
  });

  it("kotak lighting/sound menambah kWh lewat durasi", () => {
    const r = simulate({ ...BASE, extraLightingKw: 0.4, extraSoundKw: 0.5 });

    expect(r.energy.lightingKwh).toBeCloseTo(36 + 0.4 * 6, 6);
    expect(r.energy.soundKwh).toBeCloseTo(18 + 0.5 * 6, 6);
    expect(r.energy.kwh).toBeCloseTo(36 + 2.4 + 18 + 3, 6);
    // Emisi dan biaya energi ikut naik lewat kWh yang sama.
    expect(r.energy.co2eKg).toBeCloseTo(r.energy.kwh * ENERGY.emissionFactor.pln, 6);
  });

  it("beban yang sama di semua kandidat tak menggeser skor ternormalisasi", () => {
    const base = simulate(BASE);
    const loaded = simulate({ ...BASE, extraLightingKw: 1 });

    expect(loaded.energy.kwh).toBeGreaterThan(base.energy.kwh);
    // Enumerasi best/worst ikut bergeser sama → skor identik.
    expect(loaded.dimensionScores.energy).toBeCloseTo(base.dimensionScores.energy, 8);
  });

  it("extras NaN/Infinity tidak meracuni hasil — semua tetap finite", () => {
    for (const extra of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      const r = simulate({
        ...BASE,
        extraLightingKw: extra,
        extraSoundKw: extra,
      });
      expect(Number.isFinite(r.energy.kwh)).toBe(true);
      expect(Number.isFinite(r.energy.co2eKg)).toBe(true);
      expect(Number.isFinite(r.sustainabilityScore)).toBe(true);
    }
  });

  it("extras negatif dijepit — lightingKwh/soundKwh tidak pernah negatif", () => {
    const r = simulate({ ...BASE, extraLightingKw: -5, extraSoundKw: -2 });

    expect(r.energy.lightingKwh).toBeGreaterThanOrEqual(0);
    expect(r.energy.soundKwh).toBeGreaterThanOrEqual(0);
  });

  it("akses duplikat dihitung sekali — Rp dan baseScore sama dengan tunggal", () => {
    const single = simulate({ ...BASE, accessibility: ["ramp"] });
    const dupe = simulate({ ...BASE, accessibility: ["ramp", "ramp"] });

    expect(dupe.cost.accessibilityRp).toBe(single.cost.accessibilityRp);
    expect(dupe.inclusion.baseScore).toBe(single.inclusion.baseScore);
  });
});
