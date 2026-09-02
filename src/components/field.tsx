"use client";

/**
 * Field pembungkus: label yang benar-benar terhubung ke kontrol, plus slot
 * keterangan yang dirujuk `aria-describedby`. Semua field form memakai ini
 * supaya tidak ada kontrol yang lolos tanpa label — aplikasi yang mengukur
 * inklusi tidak boleh punya form yang tak terbaca screen reader.
 */
import { Label } from "@/components/ui/label";

interface FieldProps {
  id: string;
  label: string;
  /** Keterangan singkat di bawah kontrol; dihubungkan lewat aria-describedby. */
  hint?: string;
  /** Nilai terbaca di kanan label, mis. "500 orang" untuk slider. */
  valueLabel?: string;
  /**
   * False untuk kontrol yang bukan elemen form asli (slider Radix merender
   * `span`, yang tidak bisa dijadikan target `htmlFor`). Kontrol seperti itu
   * memakai `aria-labelledby="{id}-label"` sebagai penggantinya.
   */
  nativeControl?: boolean;
  children: React.ReactNode;
}

export function Field({
  id,
  label,
  hint,
  valueLabel,
  nativeControl = true,
  children,
}: FieldProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label id={`${id}-label`} htmlFor={nativeControl ? id : undefined}>
          {label}
        </Label>
        {valueLabel ? (
          <span className="text-sm text-muted-foreground tabular-nums">
            {valueLabel}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
