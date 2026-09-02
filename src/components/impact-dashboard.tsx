"use client";

/**
 * Impact Dashboard (F4) + delta Scenario Simulator (F3).
 *
 * Kartu menampilkan hasil skenario aktif; ketika baseline berbeda, tiap kartu
 * juga menampilkan delta terhadap baseline. `aria-live="polite"` pada wadah
 * angka membuat perubahan diumumkan screen reader — syarat PRD §7.
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
import { ImpactCard } from "@/components/impact-card";
import { WasteCompositionChart } from "@/components/waste-composition-chart";

interface ImpactDashboardProps {
  result: SimulationResult;
  /** Baseline yang dibekukan. Sama dengan `result` sebelum ada perubahan. */
  baseline: SimulationResult;
}

/** Ambang di mana delta dianggap nol, agar derau pembulatan tidak diberi warna. */
const NEUTRAL = 0.05;

function delta(
  value: number,
  base: number,
  text: string,
  lowerIsBetter: boolean,
) {
  const diff = value - base;
  return {
    text,
    neutral: Math.abs(diff) < NEUTRAL,
    better: lowerIsBetter ? diff < 0 : diff > 0,
  };
}

export function ImpactDashboard({ result, baseline }: ImpactDashboardProps) {
  const { waste, energy, cost, inclusion } = result;

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
        Sustainability score {round(result.sustainabilityScore)} dari 100.
      </p>

      <section
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Empat dimensi dampak"
      >
        <ImpactCard
          label="Timbulan sampah"
          value={decimal(waste.generatedKg)}
          unit="kg"
          // Label wajib: pemilahan hanya menggeser residu, bukan timbulan.
          detail={`residu ke TPA ${decimal(waste.landfillKg)} kg`}
          delta={delta(
            waste.generatedKg,
            baseline.waste.generatedKg,
            signedDecimal(waste.generatedKg - baseline.waste.generatedKg, "kg"),
            true,
          )}
          accent="var(--chart-1)"
        />

        <ImpactCard
          label="Konsumsi energi"
          value={decimal(energy.kwh)}
          unit="kWh"
          detail={`${decimal(energy.co2eKg)} kg CO₂`}
          delta={delta(
            energy.kwh,
            baseline.energy.kwh,
            signedDecimal(energy.kwh - baseline.energy.kwh, "kWh"),
            true,
          )}
          accent="var(--chart-2)"
        />

        <ImpactCard
          label="Biaya penyelenggaraan"
          value={rupiahCompact(cost.totalRp)}
          unit=""
          detail={rupiah(cost.totalRp)}
          delta={delta(
            cost.totalRp,
            baseline.cost.totalRp,
            signedRupiah(cost.totalRp - baseline.cost.totalRp),
            true,
          )}
          accent="var(--chart-3)"
        />

        <ImpactCard
          label="Skor inklusi"
          value={round(inclusion.score)}
          unit="/ 100"
          detail={
            inclusion.missing.length === 0
              ? "semua fasilitas tersedia"
              : `${inclusion.missing.length} fasilitas belum ada`
          }
          delta={delta(
            inclusion.score,
            baseline.inclusion.score,
            signedDecimal(
              inclusion.score - baseline.inclusion.score,
              "poin",
            ),
            false,
          )}
          accent="var(--chart-4)"
        />
      </section>

      <section className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 xl:grid-cols-[auto_1fr] xl:items-center xl:gap-6">
        <div>
          <h2 className="text-sm text-muted-foreground">Sustainability score</h2>
          <p className="flex items-baseline gap-1">
            {/* Hero figure: satu angka yang dipimpin dashboard. */}
            <span className="text-4xl font-semibold leading-none sm:text-5xl">
              {round(result.sustainabilityScore)}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {signedDecimal(
              result.sustainabilityScore - baseline.sustainabilityScore,
              "poin dari baseline",
            )}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {(
            [
              ["Sampah", result.dimensionScores.waste, "35%"],
              ["Energi", result.dimensionScores.energy, "25%"],
              ["Inklusi", result.dimensionScores.inclusion, "25%"],
              ["Biaya", result.dimensionScores.cost, "15%"],
            ] as const
          ).map(([label, score, weight]) => (
            <div key={label} className="grid gap-1">
              <dt className="text-xs text-muted-foreground">
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
              <dd className="text-sm font-medium tabular-nums">
                {round(score)}
              </dd>
              <div
                aria-hidden="true"
                className="h-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <h2 className="text-sm font-medium">Komposisi timbulan sampah</h2>
          <p className="text-xs text-muted-foreground">
            Total {decimal(waste.generatedKg)} kg. Pemilahan mengurangi residu ke
            TPA menjadi {decimal(waste.landfillKg)} kg, bukan mengurangi
            timbulan.
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
