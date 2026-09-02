"use client";

/**
 * Satu kartu dampak: satu angka utama, rinciannya, dan delta terhadap baseline.
 *
 * Delta selalu membawa tanda (+/−) dan kata "membaik"/"memburuk" di teks
 * tersembunyi, jadi arahnya tidak pernah dibawa warna saja — pembaca dengan
 * defisiensi penglihatan warna tetap bisa membacanya.
 */
import { cn } from "@/lib/utils";

interface ImpactCardProps {
  label: string;
  value: string;
  unit: string;
  /** Baris rincian di bawah angka, mis. "residu ke TPA 34,1 kg". */
  detail?: string;
  delta?: {
    text: string;
    /** True bila perubahan ini menguntungkan. */
    better: boolean;
    /** True bila tidak ada perubahan berarti. */
    neutral: boolean;
  };
  /** Warna penanda dimensi — sejajar dengan warna segmen di grafik komposisi. */
  accent?: string;
}

export function ImpactCard({
  label,
  value,
  unit,
  detail,
  delta,
  accent,
}: ImpactCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
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

      <p className="flex items-baseline gap-1">
        <span className="text-xl font-semibold leading-none sm:text-2xl">
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
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
          {delta.text}
          <span className="sr-only">
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
