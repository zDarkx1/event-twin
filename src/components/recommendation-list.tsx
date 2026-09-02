"use client";

/**
 * Recommendation Engine (F6) — daftar tiga langkah berdampak terbesar.
 *
 * Setiap baris menyebutkan angka konkret, bukan anjuran umum: itu yang
 * membedakan rekomendasi dari basa-basi, dan yang bisa ditunjukkan ke juri.
 */
import { ArrowRight } from "lucide-react";
import type { EventParams } from "@/lib/engine";
import type { Recommendation } from "@/lib/recommend";
import { decimal, rupiahCompact, signedDecimal, signedRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecommendationListProps {
  items: Recommendation[];
  onApply: (params: EventParams) => void;
}

/** Ambang tampil: di bawah ini deltanya tidak layak disebut di UI. */
const SHOW_KG = 0.05;
const SHOW_KWH = 0.05;
const SHOW_POINTS = 0.05;

function effects(r: Recommendation): string[] {
  const out: string[] = [];

  if (Math.abs(r.delta.wasteGeneratedKg) >= SHOW_KG) {
    out.push(signedDecimal(r.delta.wasteGeneratedKg, "kg timbulan"));
  } else if (Math.abs(r.delta.wasteLandfillKg) >= SHOW_KG) {
    // Pemilahan tidak mengubah timbulan — yang bergerak hanya residu ke TPA.
    out.push(signedDecimal(r.delta.wasteLandfillKg, "kg residu ke TPA"));
  }

  if (Math.abs(r.delta.energyKwh) >= SHOW_KWH) {
    out.push(signedDecimal(r.delta.energyKwh, "kWh"));
  } else if (Math.abs(r.delta.co2eKg) >= SHOW_KG) {
    // Ganti sumber daya mengubah emisi tanpa mengubah kWh.
    out.push(signedDecimal(r.delta.co2eKg, "kg CO₂"));
  }

  if (Math.abs(r.delta.inclusionPoints) >= SHOW_POINTS) {
    out.push(signedDecimal(r.delta.inclusionPoints, "poin inklusi"));
  }

  out.push(signedRupiah(r.delta.costRp));
  return out;
}

export function RecommendationList({
  items,
  onApply,
}: RecommendationListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada satu langkah tunggal yang masih menaikkan sustainability score
        pada skenario ini.
      </p>
    );
  }

  return (
    <ol className="grid gap-3">
      {items.map((r, i) => (
        <li
          key={r.id}
          className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4"
        >
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground"
              >
                {i + 1}
              </span>
              <span className="text-sm font-medium">{r.label}</span>
              {r.savesMoney ? (
                <Badge variant="secondary">Menghemat biaya</Badge>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground tabular-nums">
              {effects(r).join(" · ")}
            </p>

            <p className="text-xs text-muted-foreground">
              {r.savesMoney
                ? `+${decimal(r.delta.scoreGain)} poin sustainability, tanpa tambahan biaya`
                : `+${decimal(r.delta.scoreGain)} poin sustainability per ${rupiahCompact(
                    r.delta.costRp,
                  )} — ${decimal(r.scorePerMillionRp ?? 0)} poin/juta rupiah`}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onApply(r.params)}
            aria-label={`Terapkan: ${r.label}`}
          >
            Terapkan
            <ArrowRight aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ol>
  );
}
