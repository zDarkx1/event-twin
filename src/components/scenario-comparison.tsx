"use client";

/**
 * Scenario Comparison (F5) — baseline vs skenario aktif berdampingan.
 *
 * Bentuknya tabel, bukan grafik: empat dimensi dengan satuan yang berbeda-beda
 * tidak bisa dibandingkan pada satu sumbu, dan memaksanya jadi grafik akan
 * menuntut dua skala pada satu bidang. Tabel juga sekaligus jadi "table view"
 * yang membuat seluruh angka terbaca tanpa bergantung pada warna.
 */
import type { SimulationResult } from "@/lib/engine";
import {
  decimal,
  round,
  rupiah,
  signedDecimal,
  signedRupiah,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface ScenarioComparisonProps {
  baseline: SimulationResult;
  scenario: SimulationResult;
}

const NEUTRAL = 0.05;

interface Row {
  label: string;
  base: string;
  active: string;
  deltaText: string;
  diff: number;
  lowerIsBetter: boolean;
}

function buildRows(
  b: SimulationResult,
  s: SimulationResult,
): Row[] {
  return [
    {
      label: "Timbulan sampah",
      base: `${decimal(b.waste.generatedKg)} kg`,
      active: `${decimal(s.waste.generatedKg)} kg`,
      deltaText: signedDecimal(s.waste.generatedKg - b.waste.generatedKg, "kg"),
      diff: s.waste.generatedKg - b.waste.generatedKg,
      lowerIsBetter: true,
    },
    {
      label: "Residu ke TPA",
      base: `${decimal(b.waste.landfillKg)} kg`,
      active: `${decimal(s.waste.landfillKg)} kg`,
      deltaText: signedDecimal(s.waste.landfillKg - b.waste.landfillKg, "kg"),
      diff: s.waste.landfillKg - b.waste.landfillKg,
      lowerIsBetter: true,
    },
    {
      label: "Energi",
      base: `${decimal(b.energy.kwh)} kWh`,
      active: `${decimal(s.energy.kwh)} kWh`,
      deltaText: signedDecimal(s.energy.kwh - b.energy.kwh, "kWh"),
      diff: s.energy.kwh - b.energy.kwh,
      lowerIsBetter: true,
    },
    {
      label: "Emisi",
      base: `${decimal(b.energy.co2eKg)} kg CO₂`,
      active: `${decimal(s.energy.co2eKg)} kg CO₂`,
      deltaText: signedDecimal(s.energy.co2eKg - b.energy.co2eKg, "kg"),
      diff: s.energy.co2eKg - b.energy.co2eKg,
      lowerIsBetter: true,
    },
    {
      label: "Biaya penyelenggaraan",
      base: rupiah(b.cost.totalRp),
      active: rupiah(s.cost.totalRp),
      deltaText: signedRupiah(s.cost.totalRp - b.cost.totalRp),
      diff: s.cost.totalRp - b.cost.totalRp,
      lowerIsBetter: true,
    },
    {
      label: "Skor inklusi",
      base: `${round(b.inclusion.score)} / 100`,
      active: `${round(s.inclusion.score)} / 100`,
      deltaText: signedDecimal(
        s.inclusion.score - b.inclusion.score,
        "poin",
      ),
      diff: s.inclusion.score - b.inclusion.score,
      lowerIsBetter: false,
    },
    {
      label: "Sustainability score",
      base: `${round(b.sustainabilityScore)} / 100`,
      active: `${round(s.sustainabilityScore)} / 100`,
      deltaText: signedDecimal(
        s.sustainabilityScore - b.sustainabilityScore,
        "poin",
      ),
      diff: s.sustainabilityScore - b.sustainabilityScore,
      lowerIsBetter: false,
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
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Baseline
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Skenario
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Selisih
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const neutral = Math.abs(row.diff) < NEUTRAL;
            const better = row.lowerIsBetter ? row.diff < 0 : row.diff > 0;

            return (
              <tr key={row.label} className="border-b border-border/60">
                <th
                  scope="row"
                  className="py-2 pr-3 text-left font-normal text-muted-foreground"
                >
                  {row.label}
                </th>
                <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">
                  {row.base}
                </td>
                <td className="py-2 pr-3 text-right font-medium whitespace-nowrap tabular-nums">
                  {row.active}
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-medium whitespace-nowrap tabular-nums",
                    neutral
                      ? "text-muted-foreground"
                      : better
                        ? "text-success"
                        : "text-destructive",
                  )}
                >
                  {row.deltaText}
                  <span className="sr-only">
                    {neutral
                      ? " — tidak berubah"
                      : better
                        ? " — membaik"
                        : " — memburuk"}
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
