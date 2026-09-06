"use client";

/**
 * Scenario Comparison (F5) — baseline vs skenario aktif berdampingan.
 *
 * Bentuknya tabel, bukan grafik: empat dimensi dengan satuan yang berbeda-beda
 * tidak bisa dibandingkan pada satu sumbu, dan memaksanya jadi grafik akan
 * menuntut dua skala pada satu bidang. Tabel juga sekaligus jadi "table view"
 * yang membuat seluruh angka terbaca tanpa bergantung pada warna.
 *
 * Kolom skenario dan selisih di-tween 400ms mengikuti kurva reveal; kolom
 * baseline ikut supaya seragam. Teks selisih yang terbaca screen reader selalu
 * nilai akhir — angka tween disembunyikan dari AT.
 */
import type { SimulationResult } from "@/lib/engine";
import {
  decimal,
  round,
  rupiah,
  signedDecimal,
  signedRupiah,
} from "@/lib/format";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

interface ScenarioComparisonProps {
  baseline: SimulationResult;
  scenario: SimulationResult;
}

interface Row {
  label: string;
  baseValue: number;
  activeValue: number;
  format: (n: number) => string;
  formatDiff: (n: number) => string;
  diff: number;
  lowerIsBetter: boolean;
  neutralEps: number;
}

function buildRows(b: SimulationResult, s: SimulationResult): Row[] {
  const poinDiff = (n: number) => signedDecimal(n, "poin");
  return [
    {
      label: "Timbulan sampah",
      baseValue: b.waste.generatedKg,
      activeValue: s.waste.generatedKg,
      format: decimal,
      formatDiff: (n) => signedDecimal(n, "kg"),
      diff: s.waste.generatedKg - b.waste.generatedKg,
      lowerIsBetter: true,
      neutralEps: 0.05,
    },
    {
      label: "Residu ke TPA",
      baseValue: b.waste.landfillKg,
      activeValue: s.waste.landfillKg,
      format: decimal,
      formatDiff: (n) => signedDecimal(n, "kg"),
      diff: s.waste.landfillKg - b.waste.landfillKg,
      lowerIsBetter: true,
      neutralEps: 0.05,
    },
    {
      label: "Energi",
      baseValue: b.energy.kwh,
      activeValue: s.energy.kwh,
      format: decimal,
      formatDiff: (n) => signedDecimal(n, "kWh"),
      diff: s.energy.kwh - b.energy.kwh,
      lowerIsBetter: true,
      neutralEps: 0.05,
    },
    {
      label: "Emisi",
      baseValue: b.energy.co2eKg,
      activeValue: s.energy.co2eKg,
      format: decimal,
      formatDiff: (n) => signedDecimal(n, "kg"),
      diff: s.energy.co2eKg - b.energy.co2eKg,
      lowerIsBetter: true,
      neutralEps: 0.05,
    },
    {
      label: "Biaya penyelenggaraan",
      baseValue: b.cost.totalRp,
      activeValue: s.cost.totalRp,
      format: rupiah,
      formatDiff: signedRupiah,
      diff: s.cost.totalRp - b.cost.totalRp,
      lowerIsBetter: true,
      // Ambang Rp 1 menyamai aturan nol signedRupiah.
      neutralEps: 1,
    },
    {
      label: "Skor inklusi",
      baseValue: b.inclusion.score,
      activeValue: s.inclusion.score,
      format: round,
      formatDiff: poinDiff,
      diff: s.inclusion.score - b.inclusion.score,
      lowerIsBetter: false,
      neutralEps: 0.05,
    },
    {
      label: "Sustainability score",
      baseValue: b.sustainabilityScore,
      activeValue: s.sustainabilityScore,
      format: round,
      formatDiff: poinDiff,
      diff: s.sustainabilityScore - b.sustainabilityScore,
      lowerIsBetter: false,
      neutralEps: 0.05,
    },
  ];
}

export function ScenarioComparison({
  baseline,
  scenario,
}: ScenarioComparisonProps) {
  const rows = buildRows(baseline, scenario);

  return (
    /*
      Di 360 px tabel ini melebihi layar dan harus digeser mendatar. Wadah yang
      bisa di-scroll wajib bisa difokus keyboard — kalau tidak, pemakai tanpa
      mouse tidak punya cara menggeser isinya (WCAG 2.1.1).
    */
    <div
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      tabIndex={0}
      role="region"
      aria-label="Tabel perbandingan baseline dan skenario"
    >
      {/*
        Kolom angka tidak boleh dibungkus — "Rp 11.640.000" yang terpotong dua
        baris tidak terbaca. Kolom label boleh membungkus, jadi lebar minimum
        tabel ditentukan tiga kolom angka, bukan kalimat terpanjang.
      */}
      <table className="w-full min-w-[26rem] border-collapse text-sm">
        <caption className="sr-only">
          Perbandingan baseline dan skenario aktif pada empat dimensi dampak.
          Geser mendatar bila tabel melebihi lebar layar.
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="py-2 pr-3 font-medium">
              Dimensi
            </th>
            <th
              scope="col"
              className="py-2 pr-3 text-right font-normal text-muted-foreground"
            >
              Baseline
            </th>
            <th
              scope="col"
              className="bg-muted/40 py-2 pr-3 text-right font-medium"
            >
              Skenario
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Selisih
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const neutral = Math.abs(row.diff) < row.neutralEps;
            const better = row.lowerIsBetter ? row.diff < 0 : row.diff > 0;

            return (
              <tr key={row.label} className="border-b border-border/60">
                <th
                  scope="row"
                  className="py-2 pr-3 text-left font-normal text-muted-foreground"
                >
                  {row.label}
                </th>
                <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                  <AnimatedNumber value={row.baseValue} format={row.format} />
                  <span className="sr-only">{row.format(row.baseValue)}</span>
                </td>
                <td className="bg-muted/40 py-2 pr-3 text-right font-medium whitespace-nowrap tabular-nums">
                  <AnimatedNumber
                    value={row.activeValue}
                    format={row.format}
                  />
                  <span className="sr-only">
                    {row.format(row.activeValue)}
                  </span>
                </td>
                <td className="py-2 text-right whitespace-nowrap tabular-nums">
                  {/*
                    Selisih berupa pil berwarna — naik/turun terbaca dari
                    latar + tanda, bukan warna teks saja.
                  */}
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 font-medium",
                      neutral
                        ? "text-muted-foreground"
                        : better
                          ? "bg-success/10 text-success dark:bg-success/20"
                          : "bg-destructive/10 text-destructive dark:bg-destructive/20",
                    )}
                  >
                    <AnimatedNumber value={row.diff} format={row.formatDiff} />
                    <span className="sr-only">
                      {`${row.formatDiff(row.diff)}${neutral ? " — tidak berubah" : better ? " — membaik" : " — memburuk"}`}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
