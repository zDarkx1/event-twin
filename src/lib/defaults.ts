/**
 * Nilai awal Event Builder — PRD §4.1 kolom "Default". Dipisahkan dari komponen
 * supaya tombol "Reset" dan (nanti) decoder share-URL memakai acuan yang sama.
 */
import type { EventParams } from "./engine";

export const DEFAULT_PARAMS: EventParams = {
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
