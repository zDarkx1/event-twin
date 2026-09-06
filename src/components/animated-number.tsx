"use client";

import { useCountUp } from "@/lib/use-count-up";

interface AnimatedNumberProps {
  /** Nilai numerik mentah — di-tween 400ms, lalu diformat per frame. */
  value: number;
  /** Formatter yang sama dipakai versi statis (decimal, round, ...). */
  format: (n: number) => string;
}

/**
 * Satu-satunya titik tampil angka animasi. Visual selalu aria-hidden:
 * ringkasan aria-live di dashboard yang mengumumkan nilai akhir ke
 * screen reader — teks yang berubah tiap frame tidak boleh dibacakan.
 */
export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const display = useCountUp(value);
  return <span aria-hidden="true">{format(display)}</span>;
}
