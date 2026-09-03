import { describe, expect, it } from "vitest";
import { buildInsightPrompt, SYSTEM_PROMPT } from "./ai-prompt";
import { clampParams, simulate } from "./engine";
import type { EventParams } from "./engine";
import { decimal, round, rupiah, signedDecimal, signedRupiah } from "./format";

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

const GREEN: EventParams = {
  ...BASE,
  foodPackaging: "reusable",
  drinkVessel: "refillStation",
  wasteBins: "segregated",
  lighting: "led",
  accessibility: [
    "ramp",
    "accessibleToilet",
    "signLanguage",
    "tactilePath",
    "prioritySeating",
    "largePrint",
  ],
};

describe("buildInsightPrompt", () => {
  it("memasukkan angka skenario & baseline persis dari engine (tidak dihitung ulang)", () => {
    const scenario = { params: clampParams(GREEN), result: simulate(clampParams(GREEN)) };
    const baseline = { params: clampParams(BASE), result: simulate(clampParams(BASE)) };
    const { user } = buildInsightPrompt(scenario, baseline);

    // Sampah + komposisi lengkap (generated, landfill, 4 komponen)
    expect(user).toContain(decimal(scenario.result.waste.generatedKg));
    expect(user).toContain(decimal(scenario.result.waste.landfillKg));
    expect(user).toContain(decimal(scenario.result.waste.composition.plastic));
    expect(user).toContain(decimal(scenario.result.waste.composition.organic));
    expect(user).toContain(decimal(scenario.result.waste.composition.paper));
    expect(user).toContain(decimal(scenario.result.waste.composition.other));

    // Energi rincian
    expect(user).toContain(decimal(scenario.result.energy.kwh));
    expect(user).toContain(decimal(scenario.result.energy.lightingKwh));
    expect(user).toContain(decimal(scenario.result.energy.soundKwh));
    expect(user).toContain(decimal(scenario.result.energy.co2eKg));

    // Biaya rincian lengkap
    expect(user).toContain(rupiah(scenario.result.cost.totalRp));
    expect(user).toContain(rupiah(scenario.result.cost.consumptionRp));
    expect(user).toContain(rupiah(scenario.result.cost.energyRp));
    expect(user).toContain(rupiah(scenario.result.cost.wasteHaulingRp));
    expect(user).toContain(rupiah(scenario.result.cost.accessibilityRp));
    expect(user).toContain(rupiah(scenario.result.cost.reusableAmortizedRp));
    expect(user).toContain(rupiah(scenario.result.cost.reusableCapexRp));

    // Inklusi + sustainability + dimensionScores (4 dimensi)
    expect(user).toContain(`${round(scenario.result.inclusion.score)}/100`);
    expect(user).toContain(`${round(scenario.result.sustainabilityScore)}/100`);
    expect(user).toContain(round(scenario.result.dimensionScores.waste));
    expect(user).toContain(round(scenario.result.dimensionScores.energy));
    expect(user).toContain(round(scenario.result.dimensionScores.cost));
    expect(user).toContain(round(scenario.result.dimensionScores.inclusion));

    // Baseline juga harus ada (bukan hanya skenario)
    expect(user).toContain(decimal(baseline.result.waste.generatedKg));
    expect(user).toContain(decimal(baseline.result.waste.composition.paper));
    expect(user).toContain(decimal(baseline.result.waste.composition.other));
    expect(user).toContain(decimal(baseline.result.energy.lightingKwh));
    expect(user).toContain(decimal(baseline.result.energy.soundKwh));
    expect(user).toContain(rupiah(baseline.result.cost.totalRp));
    expect(user).toContain(rupiah(baseline.result.cost.consumptionRp));
    expect(user).toContain(rupiah(baseline.result.cost.energyRp));
    expect(user).toContain(rupiah(baseline.result.cost.wasteHaulingRp));
    expect(user).toContain(rupiah(baseline.result.cost.reusableCapexRp));
    expect(user).toContain(`${round(baseline.result.inclusion.score)}/100`);
    expect(user).toContain(`${round(baseline.result.sustainabilityScore)}/100`);

    // Dua blok label harus ada
    expect(user).toContain("SKENARIO AKTIF");
    expect(user).toContain("BASELINE");
    expect(user).not.toContain("undefined");
  });

  it("mengandung delta bertanda vs baseline untuk semua dimensi", () => {
    const scenario = { params: clampParams(GREEN), result: simulate(clampParams(GREEN)) };
    const baseline = { params: clampParams(BASE), result: simulate(clampParams(BASE)) };
    const { user } = buildInsightPrompt(scenario, baseline);

    const deltaGenerated = scenario.result.waste.generatedKg - baseline.result.waste.generatedKg;
    const deltaLandfill = scenario.result.waste.landfillKg - baseline.result.waste.landfillKg;
    const deltaKwh = scenario.result.energy.kwh - baseline.result.energy.kwh;
    const deltaCo2 = scenario.result.energy.co2eKg - baseline.result.energy.co2eKg;
    const deltaCost = scenario.result.cost.totalRp - baseline.result.cost.totalRp;
    const deltaAccess = scenario.result.cost.accessibilityRp - baseline.result.cost.accessibilityRp;
    const deltaInclusion = scenario.result.inclusion.score - baseline.result.inclusion.score;
    const deltaSustainability = scenario.result.sustainabilityScore - baseline.result.sustainabilityScore;

    expect(user).toContain(signedDecimal(deltaGenerated, "kg"));
    expect(user).toContain(signedDecimal(deltaLandfill, "kg"));
    expect(user).toContain(signedDecimal(deltaKwh, "kWh"));
    expect(user).toContain(signedDecimal(deltaCo2, "kg CO₂"));
    expect(user).toContain(signedRupiah(deltaCost));
    expect(user).toContain(signedRupiah(deltaAccess));
    expect(user).toContain(signedDecimal(deltaInclusion, "poin"));
    expect(user).toContain(signedDecimal(deltaSustainability, "poin"));
    // 4 delta dimensi harus hadir
    expect(user).toContain(signedDecimal(scenario.result.dimensionScores.waste - baseline.result.dimensionScores.waste, "poin"));
    expect(user).toContain(signedDecimal(scenario.result.dimensionScores.energy - baseline.result.dimensionScores.energy, "poin"));
    expect(user).toContain(signedDecimal(scenario.result.dimensionScores.cost - baseline.result.dimensionScores.cost, "poin"));
    expect(user).toContain(signedDecimal(scenario.result.dimensionScores.inclusion - baseline.result.dimensionScores.inclusion, "poin"));
    expect(user).toContain("DELTA vs BASELINE");
  });

  it("delta 0 tidak menampilkan −0,0", () => {
    const p = clampParams(BASE);
    const r = simulate(p);
    const { user } = buildInsightPrompt({ params: p, result: r }, { params: p, result: r });
    // signedDecimal(0) -> "0 poin" / "0 kg", bukan "−0,0"
    expect(user).toContain("0 kg");
    expect(user).toContain("0 poin");
    expect(user).toContain("Rp 0");
    expect(user).not.toContain("−0,0");
    expect(user).not.toContain("+0,0");
    expect(user).not.toContain("undefined");
  });

  it("delta block memuat 4 dimensi (sampah, energi, inklusi, biaya)", () => {
    const scenario = { params: clampParams(GREEN), result: simulate(clampParams(GREEN)) };
    const baseline = { params: clampParams(BASE), result: simulate(clampParams(BASE)) };
    const { user } = buildInsightPrompt(scenario, baseline);
    const deltaLine = user.split("\n").find((l) => l.includes("Dimensi sampah"));
    expect(deltaLine).toBeDefined();
    expect(deltaLine).toContain("sampah");
    expect(deltaLine).toContain("energi");
    expect(deltaLine).toContain("inklusi");
    expect(deltaLine).toContain("biaya");
    // pastikan 4 nilai poin ada di baris dimensi
    const poinMatches = (deltaLine!.match(/poin/g) || []).length;
    expect(poinMatches).toBeGreaterThanOrEqual(4);
  });

  it("system prompt melarang kalkulasi dan mewajibkan pakai angka konteks", () => {
    const { system } = buildInsightPrompt(
      { params: clampParams(BASE), result: simulate(clampParams(BASE)) },
      { params: clampParams(BASE), result: simulate(clampParams(BASE)) },
    );

    expect(system).toBe(SYSTEM_PROMPT);
    expect(system).toContain("jangan hitung");
    expect(system).toContain("Hanya pakai angka konteks");
    expect(system).toContain("ubah angka");
    expect(system).toContain("trade-off biaya inklusi");
    expect(system).toContain("Akhiri 1 kalimat aksi");
  });

  it("mencantumkan caveats emisi & tarif sebagai konteks tanpa hitung ulang", () => {
    const scenario = { params: clampParams(BASE), result: simulate(clampParams(BASE)) };
    const baseline = { params: clampParams(BASE), result: simulate(clampParams(BASE)) };
    const { user } = buildInsightPrompt(scenario, baseline);

    expect(user).toContain("0,87 kg CO");
    expect(user).toContain("JAMALI");
    expect(user).toContain("Kepmen");
    expect(user).toContain("163");
    expect(user).toContain("Rp1.444,70");
    expect(user).toContain("B-2/TR");
    expect(user).toContain("jangan hitung ulang");
  });

  it("akses kosong → 'tidak ada' dan inklusi lengkap → 'tidak ada (semua tersedia)'", () => {
    const emptyAcc = { params: clampParams(BASE), result: simulate(clampParams(BASE)) };
    const fullAcc = { params: clampParams(GREEN), result: simulate(clampParams(GREEN)) };
    const { user: userEmpty } = buildInsightPrompt(emptyAcc, emptyAcc);
    const { user: userFull } = buildInsightPrompt(fullAcc, emptyAcc);

    // akses kosong harus render "tidak ada"
    expect(userEmpty).toContain("akses [tidak ada]");
    // missing kosong harus render "tidak ada (semua tersedia)" untuk GREEN
    expect(userFull).toContain("tidak ada (semua tersedia)");
    // missing penuh harus list label, bukan undefined
    expect(userEmpty).toContain("Ramp");
    expect(userEmpty).not.toContain("undefined");
  });

  it("tidak pernah mengandung literal 'undefined' bahkan dengan enum invalid", () => {
    const evilParams = {
      ...BASE,
      eventType: "EVIL_EVENT" as unknown as EventParams["eventType"],
      foodPackaging: "hacked" as unknown as EventParams["foodPackaging"],
      drinkVessel: "injected" as unknown as EventParams["drinkVessel"],
      wasteBins: "evil" as unknown as EventParams["wasteBins"],
      lighting: "bad" as unknown as EventParams["lighting"],
      powerSource: "nuclear" as unknown as EventParams["powerSource"],
      accessibility: ["ramp", "EVIL_INJECTION" as unknown as EventParams["accessibility"][number], "nope" as unknown as EventParams["accessibility"][number]],
    } as unknown as EventParams;

    const evilResult = simulate(clampParams({ ...BASE, accessibility: ["ramp"] }));
    // inject invalid missing too
    const evilResultWithBadMissing = {
      ...evilResult,
      inclusion: {
        ...evilResult.inclusion,
        missing: ["EVIL_MISSING" as unknown as EventParams["accessibility"][number], "ramp" as unknown as EventParams["accessibility"][number]],
      },
    } as unknown as typeof evilResult;

    let user: string = "";
    expect(() => {
      const out = buildInsightPrompt(
        { params: evilParams, result: evilResultWithBadMissing },
        { params: clampParams(BASE), result: simulate(clampParams(BASE)) },
      );
      user = out.user;
    }).not.toThrow();

    expect(user).not.toContain("undefined");
    expect(user).not.toContain("EVIL_EVENT");
    expect(user).not.toContain("EVIL_INJECTION");
    expect(user).not.toContain("EVIL_MISSING");
    expect(user).not.toContain("hacked");
    expect(user).not.toContain("injected");
    // valid label harus tetap ada, invalid terfilter
    expect(user).toContain("Ramp / jalur kursi roda");
    // fallback untuk enum invalid
    expect(user).toContain("tidak diketahui");
  });

  it("memfilter daftar aksesibilitas invalid dan tidak bocor ke prompt", () => {
    const mixedParams: EventParams = {
      ...BASE,
      accessibility: ["ramp", "DROP TABLE" as unknown as EventParams["accessibility"][number]],
    };
    const res = simulate(clampParams({ ...BASE, accessibility: ["ramp"] }));
    const { user } = buildInsightPrompt(
      { params: mixedParams, result: res },
      { params: clampParams(BASE), result: simulate(clampParams(BASE)) },
    );
    expect(user).not.toContain("DROP TABLE");
    expect(user).not.toContain("undefined");
    expect(user).toContain("Ramp / jalur kursi roda");
  });

  it("prompt never contains 'undefined' untuk input valid manapun", () => {
    const cases: EventParams[] = [
      BASE,
      GREEN,
      { ...BASE, accessibility: ["prioritySeating"] },
      { ...BASE, foodPackaging: "mixed", drinkVessel: "mixed", wasteBins: "none", lighting: "led", powerSource: "generator" },
    ];
    for (const c of cases) {
      const p = clampParams(c);
      const r = simulate(p);
      const { user, system } = buildInsightPrompt({ params: p, result: r }, { params: p, result: r });
      expect(user).not.toContain("undefined");
      expect(system).not.toContain("undefined");
      // composition & biaya harus ada di setiap case
      expect(user).toContain(decimal(r.waste.composition.paper));
      expect(user).toContain(decimal(r.waste.composition.other));
      expect(user).toContain(rupiah(r.cost.reusableAmortizedRp));
      expect(user).toContain(rupiah(r.cost.reusableCapexRp));
    }
  });
});
