/**
 * Menghasilkan tabel angka demo dari engine yang sebenarnya.
 * Dipakai untuk menyinkronkan tabel di AGENTS.md dan PRD.md — angka di dokumen
 * harus berasal dari sini, bukan ditulis manual.
 *
 * Jalankan: npm run demo:numbers
 */
import { simulate } from "../src/lib/engine";
import type { AccessibilityFeature, EventParams } from "../src/lib/engine";

const ALL_FEATURES: AccessibilityFeature[] = [
  "ramp",
  "accessibleToilet",
  "signLanguage",
  "tactilePath",
  "prioritySeating",
  "largePrint",
];

/** Baseline = default PRD §4.1: festival 500 orang, 6 jam, disposable. */
const BASELINE: EventParams = {
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

const SCENARIOS: Array<{ label: string; params: EventParams }> = [
  { label: "Disposable (baseline)", params: BASELINE },
  {
    label: "Reusable",
    params: {
      ...BASELINE,
      foodPackaging: "reusable",
      drinkVessel: "refillStation",
    },
  },
  {
    label: "Reusable + akses & energi efisien",
    params: {
      ...BASELINE,
      foodPackaging: "reusable",
      drinkVessel: "refillStation",
      wasteBins: "segregated",
      lighting: "led",
      accessibility: ALL_FEATURES,
    },
  },
];

const rupiah = (n: number) =>
  "Rp " + Math.round(n).toLocaleString("id-ID");
const oneDecimal = (n: number) => n.toFixed(1).replace(".", ",");

console.log(
  `Angka demo EventTwin — ${BASELINE.participants} peserta, ${BASELINE.durationHours} jam\n`,
);
console.log(
  "| Skenario | Timbulan | Residu ke TPA | Energi | Emisi | Biaya operasional | Inklusi | Sustainability |",
);
console.log(
  "|---|---:|---:|---:|---:|---:|---:|---:|",
);

for (const { label, params } of SCENARIOS) {
  const r = simulate(params);
  console.log(
    `| ${label} | ${oneDecimal(r.waste.generatedKg)} kg | ${oneDecimal(
      r.waste.landfillKg,
    )} kg | ${oneDecimal(r.energy.kwh)} kWh | ${oneDecimal(
      r.energy.co2eKg,
    )} kg CO₂e | ${rupiah(r.cost.totalRp)} | ${Math.round(
      r.inclusion.score,
    )} / 100 | ${Math.round(r.sustainabilityScore)} / 100 |`,
  );
}

console.log("\nRincian baseline:");
const b = simulate(BASELINE);
console.log(`  komposisi sampah (kg):`);
console.log(`    plastik : ${oneDecimal(b.waste.composition.plastic)}`);
console.log(`    organik : ${oneDecimal(b.waste.composition.organic)}`);
console.log(`    kertas  : ${oneDecimal(b.waste.composition.paper)}`);
console.log(`    lain    : ${oneDecimal(b.waste.composition.other)}`);
console.log(`  rincian biaya:`);
console.log(`    konsumsi     : ${rupiah(b.cost.consumptionRp)}`);
console.log(`    energi       : ${rupiah(b.cost.energyRp)}`);
console.log(`    angkut sampah: ${rupiah(b.cost.wasteHaulingRp)}`);
console.log(`    akses        : ${rupiah(b.cost.accessibilityRp)}`);
console.log(`  skor dimensi:`);
console.log(`    sampah=${Math.round(b.dimensionScores.waste)} energi=${Math.round(b.dimensionScores.energy)} biaya=${Math.round(b.dimensionScores.cost)} inklusi=${Math.round(b.dimensionScores.inclusion)}`);
