"use client";

/**
 * Satu kartu dampak: satu angka utama, rinciannya, dan delta terhadap baseline.
 *
 * Angka di-tween 400ms mengikuti kurva reveal; warna delta ikut nilai akhir
 * (bukan nilai tween) supaya tidak berkedip di tengah jalan. Delta selalu
 * membawa tanda (+/−) dan kata "membaik"/"memburuk" di teks tersembunyi, jadi
 * arahnya tidak pernah dibawa warna saja — pembaca dengan defisiensi
 * penglihatan warna tetap bisa membacanya.
 */
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { useReveal } from "@/lib/use-reveal";
import { cn } from "@/lib/utils";

interface ImpactCardProps {
  label: string;
  /** Nilai mentah — di-tween, diformat per frame. */
  rawValue: number;
  format: (n: number) => string;
  unit: string;
  /**
   * Baris rincian. Bungkus angka dengan <AnimatedNumber> bila ikut di-tween,
   * atau kirim string polos untuk teks statis.
   */
  detail?: ReactNode;
  delta?: {
    /** Selisih mentah terhadap baseline — teksnya di-tween. */
    rawDiff: number;
    formatDiff: (n: number) => string;
    /** True bila perubahan ini menguntungkan (dari nilai akhir). */
    better: boolean;
    /** True bila tidak ada perubahan berarti. */
    neutral: boolean;
  };
  /** Warna penanda dimensi — sejajar dengan warna segmen di grafik komposisi. */
  accent?: string;
}

export function ImpactCard({
  label,
  rawValue,
  format,
  unit,
  detail,
  delta,
  accent,
}: ImpactCardProps) {
  const { ref, visible } = useReveal();

  return (
    <div
      ref={ref}
      className={cn(
        "reveal flex flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4",
        visible && "is-visible",
      )}
    >
      <div className="flex items-center gap-2">
        {accent ? (
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: accent }}
          />
        ) : null}
        <h3 className="text-xs text-muted-foreground sm:text-sm">{label}</h3>
      </div>

      <p className="flex items-baseline gap-1 tabular-nums">
        <span className="text-xl font-semibold leading-none sm:text-2xl">
          <AnimatedNumber value={rawValue} format={format} />
        </span>
        {unit ? (
          <span className="text-sm text-muted-foreground">{unit}</span>
        ) : null}
      </p>

      {detail ? (
        <p className="text-xs text-muted-foreground tabular-nums">{detail}</p>
      ) : null}

      {delta ? (
        <p
          className={cn(
            "mt-auto pt-2 text-xs font-medium tabular-nums",
            delta.neutral
              ? "text-muted-foreground"
              : delta.better
                ? "text-success"
                : "text-destructive",
          )}
        >
          <AnimatedNumber value={delta.rawDiff} format={delta.formatDiff} />
          <span className="sr-only">
            {delta.formatDiff(delta.rawDiff)}
            {delta.neutral
              ? " — tidak berubah dari baseline"
              : delta.better
                ? " — membaik dari baseline"
                : " — memburuk dari baseline"}
          </span>
        </p>
      ) : null}
    </div>
  );
}
