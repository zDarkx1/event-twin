"use client";

/**
 * Scenario Simulator (F3) — killer feature. Menyatukan F1, F4, F5, F6.
 *
 * Baseline dibekukan di state saat pertama dihitung; setiap perubahan kontrol
 * menghitung ulang skenario aktif dan menampilkan delta. `simulate()` adalah
 * fungsi murni yang sinkron, jadi tidak ada debounce, tidak ada efek, dan tidak
 * ada network round-trip — syarat <100 ms PRD §4.3 tercapai dengan sendirinya.
 */
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { clampParams, simulate } from "@/lib/engine";
import type { EventParams, SimulationResult } from "@/lib/engine";
import { recommend } from "@/lib/recommend";
import { DEFAULT_PARAMS } from "@/lib/defaults";
import { decimal, round, rupiahCompact } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
<<<<<<< HEAD
=======
import { AiInsight } from "@/components/ai-insight";
>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc
import { EventForm } from "@/components/event-form";
import { ImpactDashboard } from "@/components/impact-dashboard";
import { RecommendationList } from "@/components/recommendation-list";
import { ScenarioComparison } from "@/components/scenario-comparison";
<<<<<<< HEAD
=======
import { ShareLink } from "@/components/share-link";
>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc

/**
 * Strip ringkas yang menempel di atas layar sempit.
 *
 * Di mobile form berada di atas dashboard, jadi tanpa ini "ubah satu keputusan
 * → empat angka bergerak serentak" tidak terlihat: angkanya ada di bawah lipatan
 * layar. Strip ini menahan keempat angka tetap terlihat sambil menggeser slider.
 * `aria-hidden` karena wadah live di dashboard sudah mengumumkan angka yang sama
 * — tanpa itu screen reader membacakannya dua kali.
 */
function StickySummary({ result }: { result: SimulationResult }) {
  const items = [
    {
      id: "waste",
      color: "var(--chart-1)",
      text: `${decimal(result.waste.generatedKg)} kg`,
    },
    {
      id: "energy",
      color: "var(--chart-2)",
      text: `${decimal(result.energy.kwh)} kWh`,
    },
    {
      id: "cost",
      color: "var(--chart-3)",
      text: rupiahCompact(result.cost.totalRp),
    },
    {
      id: "inclusion",
      color: "var(--chart-4)",
      text: `${round(result.inclusion.score)}/100`,
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-1 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden"
    >
      {items.map((item) => (
        <span
          key={item.id}
          className="flex items-center gap-1 text-[11px] font-medium tabular-nums sm:text-xs"
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          {item.text}
        </span>
      ))}
    </div>
  );
}

<<<<<<< HEAD
export function ScenarioSimulator() {
  const [params, setParams] = useState<EventParams>(DEFAULT_PARAMS);
=======
interface ScenarioSimulatorProps {
  /**
   * Nilai awal simulator. Diselesaikan di Server Component dari `searchParams`
   * (F8), bukan dibaca dari `window.location` di klien: dengan begitu HTML yang
   * dikirim server sudah memuat angka skenario yang benar, jadi tidak ada
   * hydration mismatch dan tidak ada kedipan nilai default sebelum tautan
   * diterapkan.
   */
  initial: { scenario: EventParams; baseline: EventParams };
}

export function ScenarioSimulator({ initial }: ScenarioSimulatorProps) {
  const [params, setParams] = useState<EventParams>(initial.scenario);
>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc
  /**
   * Baseline dibekukan sebagai PARAMS, bukan sebagai hasil: ketika jumlah
   * peserta diubah, baseline harus ikut berskala supaya perbandingannya adil.
   * Yang dibekukan adalah KEPUTUSAN penyelenggaraan, bukan ukuran acaranya.
   */
  const [baselineDecisions, setBaselineDecisions] = useState<EventParams>(
<<<<<<< HEAD
    DEFAULT_PARAMS,
=======
    initial.baseline,
>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc
  );

  const scenario = useMemo(() => clampParams(params), [params]);

  const baseline = useMemo<EventParams>(
    () =>
      clampParams({
        ...baselineDecisions,
        // Ukuran acara mengikuti input terkini; hanya keputusan yang dibekukan.
        participants: scenario.participants,
        durationHours: scenario.durationHours,
        eventType: scenario.eventType,
        mealsPerPerson: scenario.mealsPerPerson,
        drinksPerPerson: scenario.drinksPerPerson,
        soundSystemKw: scenario.soundSystemKw,
        estimatedDisabledGuests: scenario.estimatedDisabledGuests,
      }),
    [baselineDecisions, scenario],
  );

  const scenarioResult = useMemo(() => simulate(scenario), [scenario]);
  const baselineResult = useMemo(() => simulate(baseline), [baseline]);
  const recommendations = useMemo(() => recommend(scenario), [scenario]);

  const update = (patch: Partial<EventParams>) =>
    setParams((prev) => ({ ...prev, ...patch }));

  const reset = () => {
    setParams(DEFAULT_PARAMS);
    setBaselineDecisions(DEFAULT_PARAMS);
  };

  return (
    /*
      Root sengaja block, bukan grid: `position: sticky` pada grid item dibatasi
      grid area-nya sendiri (satu baris), jadi strip ringkas tidak akan bergerak
      sama sekali. Grid dua kolom dipasang di elemen dalam.
    */
    <div>
      <StickySummary result={scenarioResult} />

      <div className="grid gap-4 pt-4 lg:grid-cols-[22rem_1fr] lg:items-start lg:pt-0">
        {/*
          Kolom form menempel saat di-scroll, tapi dibatasi tinggi viewport dan
          di-scroll sendiri: tanpa itu, di layar 1024×768 bagian bawah form
          (checkbox aksesibilitas + tombol reset) tidak akan pernah bisa dicapai.
          Sticky + scroll dipasang di wrapper, bukan di Card: Card membawa
          `overflow-hidden` sendiri, dan menumpuk `overflow-y-auto` di atasnya
          bergantung pada urutan CSS yang tidak dijamin.
        */}
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Parameter acara</CardTitle>
              <CardDescription>
                Ubah satu keputusan — keempat angka dampak bergerak serentak.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventForm params={params} onChange={update} />
            </CardContent>
<<<<<<< HEAD
            <CardContent className="border-t pt-4">
              <Button
                variant="outline"
=======
            <CardContent className="grid gap-2 border-t pt-4">
              <ShareLink scenario={scenario} baseline={baseline} />
              <Button
                variant="ghost"
>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc
                size="sm"
                onClick={reset}
                className="w-full"
              >
                <RotateCcw aria-hidden="true" />
                Kembalikan ke baseline
              </Button>
            </CardContent>
          </Card>
        </div>

<<<<<<< HEAD
        <div className="grid gap-4">
          <ImpactDashboard result={scenarioResult} baseline={baselineResult} />

=======
        <div className="grid gap-6">
          <ImpactDashboard result={scenarioResult} baseline={baselineResult} />

          <AiInsight
            key={JSON.stringify(scenario) + JSON.stringify(baseline)}
            scenario={scenario}
            baseline={baseline}
          />

>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc
          <Card>
            <CardHeader>
              <CardTitle>Rekomendasi berdampak terbesar</CardTitle>
              <CardDescription>
                Satu langkah perubahan, diurutkan dari poin sustainability
                tertinggi per rupiah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecommendationList
                items={recommendations}
                onApply={(next) => setParams(next)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Baseline vs skenario</CardTitle>
              <CardDescription>
                Baseline adalah keputusan awal acara pada ukuran peserta yang
                sama.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScenarioComparison
                baseline={baselineResult}
                scenario={scenarioResult}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
