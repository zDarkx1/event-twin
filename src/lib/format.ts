/**
 * Format angka bahasa Indonesia. Satu tempat supaya angka yang sama tidak
 * pernah muncul dengan dua gaya berbeda di layar saat live demo.
 */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

const integer = nf(0, 0);
const oneDecimal = nf(1, 1);

/** "42,3" */
export function decimal(value: number): string {
  return oneDecimal.format(value);
}

/** "500" */
export function round(value: number): string {
  return integer.format(Math.round(value));
}

/** "Rp 8.512.400" — nilai penuh, dipakai di tabel dan rincian. */
export function rupiah(value: number): string {
  return `Rp ${integer.format(Math.round(value))}`;
}

/**
 * "Rp 8,5 jt" — dipakai di kartu dampak, tempat angka penuh membuat baris
 * terpotong di lebar 360 px. Nilai penuh tetap tersedia lewat tooltip/rincian.
 */
export function rupiahCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `Rp ${oneDecimal.format(value / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `Rp ${oneDecimal.format(value / 1_000_000)} jt`;
  if (abs >= 1_000) return `Rp ${oneDecimal.format(value / 1_000)} rb`;
  return rupiah(value);
}

/**
 * Delta bertanda, memakai minus tipografis (−) bukan hyphen supaya terbaca
 * jelas di ukuran kecil. Nol dianggap tanpa perubahan.
 */
export function signedDecimal(value: number, unit: string): string {
  if (Math.abs(value) < 0.05) return `0 ${unit}`;
  return `${value > 0 ? "+" : "−"}${oneDecimal.format(Math.abs(value))} ${unit}`;
}

export function signedRupiah(value: number): string {
  if (Math.abs(value) < 1) return "Rp 0";
  return `${value > 0 ? "+" : "−"}${rupiahCompact(Math.abs(value))}`;
}
