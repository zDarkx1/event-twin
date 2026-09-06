"use client";

/**
 * Scenario Simulator (F3) — killer feature. Menyatukan F1, F4, F5, F6.
 *
 * Baseline dibekukan di state saat pertama dihitung; setiap perubahan kontrol
 * menghitung ulang skenario aktif dan menampilkan delta. `simulate()` adalah
 * fungsi murni yang sinkron, jadi tidak ada debounce, tidak ada efek, dan tidak
 * ada network round-trip — syarat <100 ms PRD §4.3 tercapai dengan sendirinya.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { clampParams, simulate } from "@/lib/engine";
import type {
  AccessibilityFeature,
  EventParams,
  SimulationResult,
  WasteBins,
} from "@/lib/engine";
import { recommend } from "@/lib/recommend";
import { DEFAULT_PARAMS } from "@/lib/defaults";
import { DEFAULT_LAYOUT, deriveLayoutPatch, type VenueLayout } from "@/lib/layout";
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
  type WorkspaceStore,
} from "@/lib/workspace";
import { decimal, round, rupiahCompact } from "@/lib/format";
import { useReveal } from "@/lib/use-reveal";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/animated-number";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiInsight } from "@/components/ai-insight";
import { EventForm } from "@/components/event-form";
import { ImpactDashboard } from "@/components/impact-dashboard";
import { LayoutEditor } from "@/components/layout-editor";
import { RecommendationList } from "@/components/recommendation-list";
import { ScenarioComparison } from "@/components/scenario-comparison";
import { ShareLink } from "@/components/share-link";

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
      rawValue: result.waste.generatedKg,
      format: decimal,
      suffix: "kg",
    },
    {
      id: "energy",
      color: "var(--chart-2)",
      rawValue: result.energy.kwh,
      format: decimal,
      suffix: "kWh",
    },
    {
      id: "cost",
      color: "var(--chart-3)",
      rawValue: result.cost.totalRp,
      format: rupiahCompact,
      suffix: "",
    },
    {
      id: "inclusion",
      color: "var(--chart-4)",
      rawValue: result.inclusion.score,
      format: round,
      suffix: "/ 100",
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
          className="flex items-center gap-1 text-[0.6875rem] font-medium tabular-nums sm:text-xs"
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          <span>
            <AnimatedNumber value={item.rawValue} format={item.format} />
            {item.suffix ? ` ${item.suffix}` : null}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Kunci konten draf — perbandingan murah cegah tulis ulang tanpa perubahan. */
function contentKey(
  scenario: EventParams,
  baselineDecisions: EventParams,
  layout: VenueLayout,
): string {
  return JSON.stringify({ s: scenario, b: baselineDecisions, l: layout });
}

/** localStorage bisa melempar saat cookie diblokir / iframe sandbox. */
function getStorageOrNull(): WorkspaceStore | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

interface ScenarioSimulatorProps {
  /**
   * Nilai awal simulator. Diselesaikan di Server Component dari `searchParams`
   * (F8), bukan dibaca dari `window.location` di klien: dengan begitu HTML yang
   * dikirim server sudah memuat angka skenario yang benar, jadi tidak ada
   * hydration mismatch dan tidak ada kedipan nilai default sebelum tautan
   * diterapkan.
   */
  initial: { scenario: EventParams; baseline: EventParams; hasParams: boolean };
}

export function ScenarioSimulator({ initial }: ScenarioSimulatorProps) {
  const [params, setParams] = useState<EventParams>(initial.scenario);
  /**
   * Baseline dibekukan sebagai PARAMS, bukan sebagai hasil: ketika jumlah
   * peserta diubah, baseline harus ikut berskala supaya perbandingannya adil.
   * Yang dibekukan adalah KEPUTUSAN penyelenggaraan, bukan ukuran acaranya.
   */
  const [baselineDecisions, setBaselineDecisions] = useState<EventParams>(
    initial.baseline,
  );
  const [layout, setLayout] = useState<VenueLayout>(DEFAULT_LAYOUT);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Lewati satu autosave setelah reset supaya default tidak ditulis balik.
  const skipSaveRef = useRef(false);
  // Kunci terakhir yang persist — tulis hanya saat konten benar-benar berubah.
  // Diisi kunci awal saat mount supaya pengunjung baru tidak menyimpan default.
  const lastPersistedRef = useRef<string | null>(
    contentKey(initial.scenario, initial.baseline, DEFAULT_LAYOUT),
  );
  // True setelah pengguna menyentuh kontrol — tautan berbagi tak menimpa draf.
  const dirtyRef = useRef(false);

  /**
   * Pulihkan draf lokal saat dibuka TANPA tautan berbagi. Tautan selalu
   * menang: bila URL membawa parameter, draf diabaikan dan autosave
   * ditahan sampai pengguna menyentuh kontrol (dirty gate). Muat di efek, bukan
   * saat inisialisasi state — server tidak punya localStorage, dan membaca
   * di render pertama akan membuat HTML klien beda dari server.
   */
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || initial.hasParams) return;
    restoredRef.current = true;
    // Inisialisasi malas tidak bisa dipakai: server tidak punya localStorage
    // dan membaca saat render pertama membuat HTML klien beda dari server.
    const store = getStorageOrNull();
    if (!store) return;
    const draft = loadWorkspace(store);
    if (!draft) return;
    /* eslint-disable react-hooks/set-state-in-effect -- pemulihan sekali saat mount, bukan sinkronisasi turunan */
    setParams(draft.scenario);
    setBaselineDecisions(draft.baselineDecisions);
    setLayout(draft.layout);
    setSavedAt(draft.savedAt);
    // Tandai sudah persist supaya restore tak menaikkan timestamp.
    lastPersistedRef.current = contentKey(
      draft.scenario,
      draft.baselineDecisions,
      draft.layout,
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initial.hasParams]);

  const scenario = useMemo(() => clampParams(params), [params]);

  /**
   * Turunan denah: beban listrik aditif mengalir langsung ke skenario aktif
   * (tak ada kontrol form yang dilawan), sedangkan sampah + akses hanya
   * saran yang diterapkan lewat tombol di editor. Baseline tidak membawa
   * beban denah — denah adalah rencana aktif, bukan keputusan beku.
   */
  const layoutPatch = useMemo(
    () => deriveLayoutPatch(layout, scenario.participants),
    [layout, scenario.participants],
  );
  const energizedScenario = useMemo<EventParams>(
    () => ({
      ...scenario,
      extraLightingKw: layoutPatch.extraLightingKw,
      extraSoundKw: layoutPatch.extraSoundKw,
    }),
    [scenario, layoutPatch],
  );

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

  const scenarioResult = useMemo(() => simulate(energizedScenario), [energizedScenario]);
  const baselineResult = useMemo(() => simulate(baseline), [baseline]);
  const recommendations = useMemo(
    () => recommend(energizedScenario),
    [energizedScenario],
  );
  const hasLayoutLoad =
    layoutPatch.extraLightingKw > 0 || layoutPatch.extraSoundKw > 0;

  /**
   * Autosave draf (debounce 500 ms). Yang disimpan adalah skenario TERJEPIT
   * — sama persis dengan yang dikodekan ke tautan berbagi — supaya draf dan
   * URL tidak pernah berbeda makna. Boolean saveWorkspace membuat indikator
   * jujur: hanya tampil "tersimpan" bila tulisnya benar-benar berhasil.
   */
  useEffect(() => {
    // Dibuka via tautan: jangan timpa draf pembuka sebelum pengguna menyentuh.
    if (initial.hasParams && !dirtyRef.current) return;
    const store = getStorageOrNull();
    if (!store) return;
    // Sekali setelah reset: state default jangan ditulis balik ke storage.
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    // Tanpa perubahan konten: jangan tulis, jangan naikkan timestamp.
    const key = contentKey(scenario, baselineDecisions, layout);
    if (key === lastPersistedRef.current) return;
    const timer = setTimeout(() => {
      if (
        saveWorkspace(store, {
          scenario,
          baselineDecisions: clampParams(baselineDecisions),
          layout,
        })
      ) {
        lastPersistedRef.current = key;
        setSavedAt(new Date().toISOString());
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [scenario, baselineDecisions, layout, initial.hasParams]);

  // Reveal sekali saat scroll — kartu form di atas lipatan tidak ikut supaya
  // kontrol killer feature terasa instan sejak paint pertama.
  const { ref: layoutRef, visible: layoutVisible } = useReveal();
  const { ref: aiRef, visible: aiVisible } = useReveal();
  const { ref: recoRef, visible: recoVisible } = useReveal();
  const { ref: compRef, visible: compVisible } = useReveal();

  // Stabil via useCallback — hanya setter + ref, aman untuk memo anak.
  const update = useCallback((patch: Partial<EventParams>) => {
    dirtyRef.current = true;
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyWaste = useCallback(
    (bins: WasteBins) => {
      update({ wasteBins: bins });
    },
    [update],
  );

  const applyAccess = useCallback((feature: AccessibilityFeature) => {
    dirtyRef.current = true;
    setParams((prev) =>
      prev.accessibility.includes(feature)
        ? prev
        : { ...prev, accessibility: [...prev.accessibility, feature] },
    );
  }, []);

  // Edit denah adalah edit pengguna: menandai kotor supaya autosave
  // menyimpan draf bahkan saat dibuka dari tautan berbagi.
  const updateLayout = useCallback((next: VenueLayout) => {
    dirtyRef.current = true;
    setLayout(next);
  }, []);

  const reset = () => {
    skipSaveRef.current = true;
    lastPersistedRef.current = null;
    setParams(DEFAULT_PARAMS);
    setBaselineDecisions(DEFAULT_PARAMS);
    setLayout(DEFAULT_LAYOUT);
    const store = getStorageOrNull();
    if (store) clearWorkspace(store);
    setSavedAt(null);
  };

  // savedAt korup tak boleh jadi "Invalid Date" di indikator.
  const savedDate = savedAt ? new Date(savedAt) : null;
  const savedTime =
    savedDate && !Number.isNaN(savedDate.getTime())
      ? savedDate.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    /*
      Root sengaja block, bukan grid: `position: sticky` pada grid item dibatasi
      grid area-nya sendiri (satu baris), jadi strip ringkas tidak akan bergerak
      sama sekali. Grid dua kolom dipasang di elemen dalam.
    */
    <div>
      <StickySummary result={scenarioResult} />

      <div className="grid gap-6">
        <div
          ref={layoutRef}
          className={cn("reveal min-w-0", layoutVisible && "is-visible")}
        >
        <Card>
          <CardHeader>
            <CardTitle>Denah venue</CardTitle>
            <CardDescription>
              Kotak energi, stasiun, dan akses masuk hitungan:
              lighting/sound menambah beban listrik otomatis, stasiun dan
              akses memberi saran sekali klik. Panggung dan area netral hanya
              visual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LayoutEditor
              layout={layout}
              onChange={updateLayout}
              participants={scenario.participants}
              wasteBins={scenario.wasteBins}
              accessibility={scenario.accessibility}
              onApplyWaste={applyWaste}
              onApplyAccess={applyAccess}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
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
            <CardContent className="grid gap-2 border-t pt-4">
              <ShareLink
                scenario={scenario}
                baseline={baseline}
                hasLayoutLoad={hasLayoutLoad}
              />
              {hasLayoutLoad && (
                <p role="note" className="text-xs text-muted-foreground tabular-nums">
                  Tautan berbagi tidak membawa beban denah (
                  {decimal(layoutPatch.extraLightingKw)} kW lighting,{" "}
                  {decimal(layoutPatch.extraSoundKw)} kW sound) — penerima
                  membuka tanpa beban denah.
                </p>
              )}
              {/*
                Indikator persistensi eksplisit: draf lokal tidak boleh jadi
                state tersembunyi (PRD §2.2). role=status mengumumkannya ke
                screen reader saat berubah.
              */}
              <p role="status" className="text-xs text-muted-foreground tabular-nums">
                {savedTime === null
                  ? "Perubahan tersimpan otomatis di perangkat ini"
                  : `Draf tersimpan · ${savedTime}`}
              </p>
              <Button
                variant="ghost"
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

        <div className="grid gap-6">
          <ImpactDashboard result={scenarioResult} baseline={baselineResult} />

          <div
            ref={aiRef}
            className={cn("reveal min-w-0", aiVisible && "is-visible")}
          >
            <AiInsight scenario={energizedScenario} baseline={baseline} />
          </div>

          <div
            ref={recoRef}
            className={cn("reveal min-w-0", recoVisible && "is-visible")}
          >
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
                  onApply={(next) => {
                    dirtyRef.current = true;
                    const clean = { ...next };
                    delete clean.extraLightingKw;
                    delete clean.extraSoundKw;
                    setParams(clean);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <div
            ref={compRef}
            className={cn("reveal min-w-0", compVisible && "is-visible")}
          >
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
      </div>
    </div>
  );
}
