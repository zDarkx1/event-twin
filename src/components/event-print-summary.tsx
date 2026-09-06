"use client";

/**
 * Ringkasan parameter khusus cetak — pengganti form interaktif di kertas.
 *
 * Form memakai `max-h + overflow-y-auto` yang akan memotong isi saat dicetak,
 * dan input tak berguna di kertas; jadi kolom form disembunyikan di print dan
 * komponen ini (render teks polos) yang tampil. Tanggal cetak diisi di efek
 * supaya HTML server dan klien pertama sama (tanpa hydration mismatch).
 */
import { useEffect, useState } from "react";
import type { EventParams } from "@/lib/engine";
import { ACCESSIBILITY } from "@/lib/coefficients";
import {
  DRINK_VESSEL_LABELS,
  EVENT_TYPE_LABELS,
  FOOD_PACKAGING_LABELS,
  LIGHTING_LABELS,
  POWER_SOURCE_LABELS,
  WASTE_BINS_LABELS,
} from "@/lib/labels";
import { decimal, round } from "@/lib/format";

export function EventPrintSummary({
  scenario,
  layoutNote,
}: {
  scenario: EventParams;
  /** Catatan beban denah (cetak saja) — kolom form yang print:hidden tak terbaca di kertas. */
  layoutNote?: string | null;
}) {
  // String asing (params rakitan tangan) dibuang, duplikat dihitung sekali —
  // sama seperti uniqueKnownAccess di engine supaya label = yang dinilai.
  const seen = new Set<string>();
  const accessLabels: string[] = [];
  for (const f of scenario.accessibility) {
    if (typeof f !== "string") continue;
    if (!Object.prototype.hasOwnProperty.call(ACCESSIBILITY, f)) continue;
    if (seen.has(f)) continue;
    seen.add(f);
    accessLabels.push(
      ACCESSIBILITY[f as keyof typeof ACCESSIBILITY].label,
    );
  }
  // renderToStaticMarkup tak menjalankan efek: tanggal absen dengan anggun.
  const [date, setDate] = useState<string | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- isi sekali saat mount, bukan sinkronisasi turunan */
  useEffect(() => {
    setDate(
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const rows: Array<[string, string]> = [
    ["Jenis acara", EVENT_TYPE_LABELS[scenario.eventType]],
    [
      "Peserta",
      `${round(scenario.participants)} orang (difabel/lansia ${round(scenario.estimatedDisabledGuests)})`,
    ],
    ["Durasi", `${decimal(scenario.durationHours)} jam`],
    [
      "Makanan",
      `${decimal(scenario.mealsPerPerson)} porsi/orang · ${FOOD_PACKAGING_LABELS[scenario.foodPackaging]}`,
    ],
    [
      "Minuman",
      `${decimal(scenario.drinksPerPerson)} gelas/orang · ${DRINK_VESSEL_LABELS[scenario.drinkVessel]}`,
    ],
    ["Pemilahan sampah", WASTE_BINS_LABELS[scenario.wasteBins]],
    ["Pencahayaan", LIGHTING_LABELS[scenario.lighting]],
    [
      "Sound system",
      `${decimal(scenario.soundSystemKw)} kW · ${POWER_SOURCE_LABELS[scenario.powerSource]}`,
    ],
    [
      "Fasilitas akses",
      accessLabels.length > 0 ? accessLabels.join(", ") : "—",
    ],
  ];

  return (
    <section aria-label="Ringkasan parameter acara" className="hidden print:block">
      <h2 className="text-sm font-medium">Parameter acara</h2>
      {date ? (
        <p className="text-xs text-muted-foreground">Dicetak {date}</p>
      ) : null}
      <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-4 text-xs">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="text-right font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {layoutNote ? (
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          {layoutNote}
        </p>
      ) : null}
    </section>
  );
}
