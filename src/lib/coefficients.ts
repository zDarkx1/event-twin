// Satu-satunya sumber koefisien. Setiap angka punya baris di COEFFICIENTS.md
// dengan status verifikasi dan alasannya. Jangan tulis koefisien di komponen UI.

export const WASTE = {
  generalPerPersonHour: 0.028,
  foodResiduePerMeal: 0.12,
  foodPackaging: { disposable: 0.035, mixed: 0.018, reusable: 0.004 },
  drinkVessel: { plasticBottle: 0.021, mixed: 0.011, refillStation: 0.001 },
  // Faktor residu: pemilahan tidak mengurangi timbulan, hanya yang berakhir di TPA.
  landfillFactor: { none: 1.0, mixed: 0.92, segregated: 0.74 },
} as const;

export const ENERGY = {
  lightingWattPerPerson: { halogen: 12, led: 4 },
  emissionFactor: { pln: 0.87, generator: 0.72 },
} as const;

export const COST = {
  mealPerPortion: { disposable: 15000, mixed: 14500, reusable: 14000 },
  drinkPerPortion: { plasticBottle: 4000, mixed: 2450, refillStation: 900 },
  tariffPerKwh: { pln: 1444.7, generator: 3200 },
  wasteHaulingPerKg: 700,
  reusableCapexPerPerson: 25000,
  reusableExpectedUses: 30,
} as const;

export const ACCESSIBILITY = {
  ramp: { weight: 25, cost: 1_500_000, label: "Ramp / jalur kursi roda" },
  accessibleToilet: { weight: 20, cost: 2_000_000, label: "Toilet difabel" },
  signLanguage: { weight: 18, cost: 1_200_000, label: "Penerjemah bahasa isyarat" },
  tactilePath: { weight: 15, cost: 800_000, label: "Jalur pemandu / penanda taktil" },
  prioritySeating: { weight: 12, cost: 300_000, label: "Kursi prioritas" },
  largePrint: { weight: 10, cost: 150_000, label: "Materi huruf besar" },
} as const;

// Bobot sustainability score. Alasan urutan ada di COEFFICIENTS.md §5.
export const SCORE_WEIGHTS = {
  waste: 0.35,
  energy: 0.25,
  inclusion: 0.25,
  cost: 0.15,
} as const;

export const LIMITS = {
  participants: { min: 10, max: 10_000 },
  durationHours: { min: 1, max: 24 },
  mealsPerPerson: { min: 0, max: 5 },
  drinksPerPerson: { min: 0, max: 8 },
  soundSystemKw: { min: 0, max: 20 },
} as const;
