"use client";

/**
 * Impact Dashboard (F4) + delta Scenario Simulator (F3).
 *
 * Kartu menampilkan hasil skenario aktif; ketika baseline berbeda, tiap kartu
 * juga menampilkan delta terhadap baseline. `aria-live="polite"` pada wadah
 * angka membuat perubahan diumumkan screen reader — syarat PRD §7.
 *
 * Seluruh angka visual di-tween 400ms (AnimatedNumber) mengikuti kurva reveal;
 * ringkasan live mengumumkan nilai akhir. Seksi masuk lewat reveal saat
 * scroll, sekali saja — tidak pernah diputar ulang oleh pembaruan data.
 */
import type { SimulationResult } from "@/lib/engine";
import {
  decimal,
  round,
  rupiah,
  rupiahCompact,
  signedDecimal,
  signedRupiah,
} from "@/lib/format";
import { AnimatedNumber } from "@/components/animated-number";
import { ImpactCard } from "@/components/impact-card";
import { useReveal } from "@/lib/use-reveal";
import { cn } from "@/lib/utils";
import { WasteCompositionChart } from "@/components/waste-composition-chart";

interface ImpactDashboardProps {
  result: SimulationResult;
  /** Baseline yang dibekukan. Sama dengan `result` sebelum ada perubahan. */
  baseline: SimulationResult;
}

/** Ambang di mana delta dianggap nol, agar derau pembulatan tidak diberi warna. */
function delta(
  value: number,
  base: number,
  lowerIsBetter: boolean,
  eps = 0.05,
) {
  const diff = value - base;
  return {
    rawDiff: diff,
    neutral: Math.abs(diff) < eps,
    better: lowerIsBetter ? diff < 0 : diff > 0,
  };
}

export function ImpactDashboard({ result, baseline }: ImpactDashboardProps) {
  const { waste, energy, cost, inclusion } = result;
  const { ref: heroRef, visible: heroVisible } = useReveal<HTMLElement>();
  const { ref: compositionRef, visible: compositionVisible } =
    useReveal<HTMLElement>();

  return (
    <div className="grid gap-4">
      {/*
        Pengumuman satu kalimat, bukan `aria-live` pada seluruh dashboard:
        wadah live yang membungkus 4 kartu + hero + grafik akan membacakan
        ulang semuanya tiap satu tekan tombol. Ringkasan pendek ini yang
        diumumkan; kartu visual tidak live. Syarat PRD §7 terpenuhi tanpa
        membuat pemakai screen reader mendengar dashboard dibaca berkali-kali.
      */}
      <p aria-live="polite" className="sr-only">
        Timbulan sampah {decimal(waste.generatedKg)} kilogram, residu ke TPA{" "}
        {decimal(waste.landfillKg)} kilogram. Energi {decimal(energy.kwh)}{" "}
        kilowatt jam, emisi {decimal(energy.co2eKg)} kilogram CO2. Biaya{" "}
        {rupiah(cost.totalRp)}. Skor inklusi {round(inclusion.score)} dari 100.
        Sustainability score {round(result.sustainabilityScore)} dari 100. Delta
        dari baseline:{" "}
        {signedDecimal(waste.generatedKg - baseline.waste.generatedKg, "kg")}{" "}
        timbulan, {signedDecimal(energy.kwh - baseline.energy.kwh, "kWh")},{" "}
        {signedRupiah(cost.totalRp - baseline.cost.totalRp)},{" "}
        {signedDecimal(inclusion.score - baseline.inclusion.score, "poin")}{" "}
        inklusi,{" "}
        {signedDecimal(
          result.sustainabilityScore - baseline.sustainabilityScore,
          "poin",
        )}{" "}
        sustainability.{" "}
        {inclusion.missing.length === 0
          ? "Semua fasilitas tersedia."
          : `${inclusion.missing.length} fasilitas belum ada.`}{" "}
        Dimensi: sampah {round(result.dimensionScores.waste)}, energi{" "}
        {round(result.dimensionScores.energy)}, inklusi{" "}
        {round(result.dimensionScores.inclusion)}, biaya{" "}
        {round(result.dimensionScores.cost)}.
      </p>

      <section
        className="reveal-group grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Empat dimensi dampak"
      >
        <ImpactCard
          label="Timbulan sampah"
          rawValue={waste.generatedKg}
          format={decimal}
          unit="kg"
          // Label wajib: pemilahan hanya menggeser residu, bukan timbulan.
          detail={
            <>
              residu ke TPA{" "}
              <AnimatedNumber value={waste.landfillKg} format={decimal} /> kg
            </>
          }
          delta={{
            ...delta(
              waste.generatedKg,
              baseline.waste.generatedKg,
              true,
            ),
            formatDiff: (n) => signedDecimal(n, "kg"),
          }}
          accent="var(--chart-1)"
        />

        <ImpactCard
          label="Konsumsi energi"
          rawValue={energy.kwh}
          format={decimal}
          unit="kWh"
          detail={
            <>
              <AnimatedNumber value={energy.co2eKg} format={decimal} /> kg CO₂
            </>
          }
          delta={{
            ...delta(energy.kwh, baseline.energy.kwh, true),
            formatDiff: (n) => signedDecimal(n, "kWh"),
          }}
          accent="var(--chart-2)"
        />

        <ImpactCard
          label="Biaya penyelenggaraan"
          rawValue={cost.totalRp}
          format={rupiahCompact}
          unit=""
          detail={<AnimatedNumber value={cost.totalRp} format={rupiah} />}
          delta={{
            // Ambang Rp 1 menyamai aturan nol signedRupiah.
            ...delta(cost.totalRp, baseline.cost.totalRp, true, 1),
            formatDiff: (n) => signedRupiah(n),
          }}
          accent="var(--chart-3)"
        />

        <ImpactCard
          label="Skor inklusi"
          rawValue={inclusion.score}
          format={round}
          unit="/ 100"
          detail={
            inclusion.missing.length === 0 ? (
              "semua fasilitas tersedia"
            ) : (
              <>
                <AnimatedNumber
                  value={inclusion.missing.length}
                  format={round}
                />{" "}
                fasilitas belum ada
              </>
            )
          }
          delta={{
            ...delta(inclusion.score, baseline.inclusion.score, false),
            formatDiff: (n) => signedDecimal(n, "poin"),
          }}
          accent="var(--chart-4)"
        />
      </section>

      <section
        ref={heroRef}
        className={cn(
          "reveal grid gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 xl:grid-cols-[auto_1fr] xl:items-center xl:gap-6",
          heroVisible && "is-visible",
        )}
      >
        <div>
          <h2 className="text-sm text-muted-foreground">Sustainability score</h2>
          <p className="flex items-baseline gap-1">
            {/* Hero figure: satu angka yang dipimpin dashboard. */}
            <span className="text-4xl font-semibold leading-none sm:text-5xl">
              <AnimatedNumber
                value={result.sustainabilityScore}
                format={round}
              />
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            <AnimatedNumber
              value={
                result.sustainabilityScore - baseline.sustainabilityScore
              }
              format={(n) => signedDecimal(n, "poin dari baseline")}
            />
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {(
            [
              // Warna per tipe dimensi — sama dengan aksen ImpactCard
              // (sampah chart-1, energi chart-2, inklusi chart-4, biaya chart-3).
              ["Sampah", result.dimensionScores.waste, "35%", "var(--chart-1)"],
              ["Energi", result.dimensionScores.energy, "25%", "var(--chart-2)"],
              [
                "Inklusi",
                result.dimensionScores.inclusion,
                "25%",
                "var(--chart-4)",
              ],
              ["Biaya", result.dimensionScores.cost, "15%", "var(--chart-3)"],
            ] as const
          ).map(([label, score, weight, color]) => (
            <div key={label} className="grid gap-1">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                {label}{" "}
                {/*
                  Bobot adalah isi, bukan hiasan — jadi tidak boleh diredupkan
                  lagi. `text-muted-foreground` = oklch(0.556 0 0) ≈ 4,7:1 di
                  atas permukaan terang, lolos AA untuk teks 12 px. Menambah
                  /70 mencampurnya dengan permukaan dan menjatuhkan kontras ke
                  bawah 3:1 — gagal AA.
                */}
                <span className="text-muted-foreground">({weight})</span>
              </dt>
              <dd className="grid gap-1 text-sm font-medium tabular-nums">
                <AnimatedNumber value={score} format={round} />
                <div
                  aria-hidden="true"
                  className="h-1 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="bar-fill h-full rounded-full"
                    style={{ width: `${score}%`, background: color }}
                  />
                </div>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        ref={compositionRef}
        className={cn(
          "reveal grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
          compositionVisible && "is-visible",
        )}
      >
        <div>
          <h2 className="text-sm font-medium">Komposisi timbulan sampah</h2>
          <p className="text-xs text-muted-foreground">
            Total <AnimatedNumber value={waste.generatedKg} format={decimal} />{" "}
            kg. Pemilahan mengurangi residu ke TPA menjadi{" "}
            <AnimatedNumber value={waste.landfillKg} format={decimal} /> kg,
            bukan mengurangi timbulan.
          </p>
        </div>
        <WasteCompositionChart
          composition={waste.composition}
          totalKg={waste.generatedKg}
        />
      </section>
    </div>
  );
}
