"use client";

/**
 * Recommendation Engine (F6) — daftar tiga langkah berdampak terbesar.
 *
 * Setiap langkah diringkas jadi chip kompak per dimensi (sampah, energi,
 * biaya, inklusi, sustainability) — angka + arah terbaca sekilas lewat teks
 * dan tanda, bukan warna saja. Alasan di balik tiap angka hanya muncul di
 * tooltip saat hover/fokus; screen reader mendapatkannya lewat teks sr-only.
 */
import { ArrowRight } from "lucide-react";
import type { EventParams } from "@/lib/engine";
import type { Recommendation } from "@/lib/recommend";
import { decimal, signedDecimal, signedRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RecommendationListProps {
  items: Recommendation[];
  onApply: (params: EventParams) => void;
}

/** Ambang tampil: di bawah ini deltanya tidak layak disebut di UI. */
const SHOW_KG = 0.05;
const SHOW_KWH = 0.05;
const SHOW_POINTS = 0.05;

interface Chip {
  key: string;
  text: string;
  /** Warna titik tipe dimensi — null untuk chip agregat sustainability. */
  color: string | null;
  better: boolean;
  /** Netral (abu) saat delta nol — saat ini hanya chip biaya. */
  neutral: boolean;
  /** Alasan di balik angka — isi tooltip + teks sr-only. */
  tip: string;
}

function chips(r: Recommendation): Chip[] {
  const out: Chip[] = [];

  // Chip utama: gabungan seluruh dimensi, selalu membaik (filter di engine).
  out.push({
    key: "score",
    text: `+${decimal(r.delta.scoreGain)} sustainability`,
    color: null,
    better: true,
    neutral: false,
    tip: r.savesMoney
      ? "Agregat berbobot — sampah 35%, energi 25%, inklusi 25%, biaya 15%. Tanpa tambahan biaya."
      : `Agregat berbobot — sampah 35%, energi 25%, inklusi 25%, biaya 15%. ${decimal(r.scorePerMillionRp ?? 0)} poin per juta rupiah.`,
  });

  if (Math.abs(r.delta.wasteGeneratedKg) >= SHOW_KG) {
    out.push({
      key: "waste",
      text: `${signedDecimal(r.delta.wasteGeneratedKg, "kg")} sampah`,
      color: "var(--chart-1)",
      better: r.delta.wasteGeneratedKg < 0,
      neutral: false,
      tip: "Kemasan menentukan timbulan — guna ulang memangkas sekali pakai; harga porsi dan amortisasi peralatan guna ulang sudah masuk hitungan.",
    });
  } else if (Math.abs(r.delta.wasteLandfillKg) >= SHOW_KG) {
    // Pemilahan tidak mengubah timbulan — yang bergerak hanya residu ke TPA.
    out.push({
      key: "waste",
      text: `${signedDecimal(r.delta.wasteLandfillKg, "kg")} ke TPA`,
      color: "var(--chart-1)",
      better: r.delta.wasteLandfillKg < 0,
      neutral: false,
      tip: "Pemilahan tidak mengurangi timbulan — sampah dipilah sehingga residu ke TPA turun.",
    });
  }

  if (Math.abs(r.delta.energyKwh) >= SHOW_KWH) {
    out.push({
      key: "energy",
      text: signedDecimal(r.delta.energyKwh, "kWh"),
      color: "var(--chart-2)",
      better: r.delta.energyKwh < 0,
      neutral: false,
      tip: r.id === "lighting:led"
        ? "LED menggantikan halogen — watt pencahayaan per orang turun."
        : "Konsumsi energi per acara berubah akibat langkah ini.",
    });
  } else if (Math.abs(r.delta.co2eKg) >= SHOW_KG) {
    // Ganti sumber daya mengubah emisi tanpa mengubah kWh.
    out.push({
      key: "energy",
      text: signedDecimal(r.delta.co2eKg, "kg CO₂"),
      color: "var(--chart-2)",
      better: r.delta.co2eKg < 0,
      neutral: false,
      tip: "Sumber daya diganti — emisi berubah walau konsumsi kWh sama.",
    });
  }

  if (Math.abs(r.delta.inclusionPoints) >= SHOW_POINTS) {
    out.push({
      key: "inclusion",
      text: signedDecimal(r.delta.inclusionPoints, "poin inklusi"),
      color: "var(--chart-4)",
      better: r.delta.inclusionPoints > 0,
      neutral: false,
      tip: "Satu fasilitas akses ditambah — biayanya dihitung apa adanya, bukan disembunyikan.",
    });
  }

  out.push({
    key: "cost",
    text: `${signedRupiah(r.delta.costRp)} biaya`,
    color: "var(--chart-3)",
    better: r.delta.costRp < 0,
    // Nol biaya netral — tidak merah walau better false.
    neutral: Math.abs(r.delta.costRp) < 1,
    tip: r.savesMoney
      ? "Menghemat biaya sekaligus memperbaiki dampak — tanpa trade-off."
      : r.id.startsWith("foodPackaging:") || r.id.startsWith("drinkVessel:")
        ? "Kenaikan biaya per acara, termasuk amortisasi peralatan guna ulang."
        : "Kenaikan biaya per acara dihitung apa adanya.",
  });

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
    <TooltipProvider>
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
                  className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[0.6875rem] font-medium text-primary-foreground"
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{r.label}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {chips(r).map((c) => (
                  <Tooltip key={c.key}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        tabIndex={0}
                        className={cn(
                          "gap-1 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          c.neutral
                            ? "text-muted-foreground"
                            : c.better
                              ? "text-success"
                              : "text-destructive",
                        )}
                      >
                        {c.color ? (
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ background: c.color }}
                          />
                        ) : null}
                        {c.text}
                        <span className="sr-only">. {c.tip}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{c.tip}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
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
    </TooltipProvider>
  );
}
