/**
 * Label bahasa Indonesia untuk setiap opsi keputusan. Satu sumber, dipakai
 * bersama oleh dropdown form (F1) dan teks rekomendasi (F6) supaya kalimat
 * yang dilihat juri di kedua tempat tidak pernah berbeda.
 *
 * Label fasilitas aksesibilitas tinggal di `coefficients.ts` karena menempel
 * pada bobot dan biayanya.
 */
import type {
  DrinkVessel,
  EventType,
  FoodPackaging,
  Lighting,
  PowerSource,
  WasteBins,
} from "./engine";

export const FOOD_PACKAGING_LABELS: Record<FoodPackaging, string> = {
  disposable: "Kemasan sekali pakai",
  mixed: "Campuran",
  reusable: "Wadah guna ulang",
};

export const DRINK_VESSEL_LABELS: Record<DrinkVessel, string> = {
  plasticBottle: "Botol plastik",
  mixed: "Campuran",
  refillStation: "Refill station",
};

export const WASTE_BINS_LABELS: Record<WasteBins, string> = {
  none: "Tanpa pemilahan",
  mixed: "Tempat sampah campur",
  segregated: "Tempat sampah terpilah",
};

export const LIGHTING_LABELS: Record<Lighting, string> = {
  halogen: "Lampu halogen",
  led: "Lampu LED",
};

export const POWER_SOURCE_LABELS: Record<PowerSource, string> = {
  pln: "PLN",
  generator: "Genset",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  festival: "Festival / pentas seni",
  seminar: "Seminar",
  competition: "Lomba",
  bazaar: "Bazar",
};
