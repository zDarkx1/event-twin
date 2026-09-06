"use client";

/**
 * Event Builder (F1) — 13 field PRD §4.1.
 *
 * Komponen ini hanya mengumpulkan input; seluruh perhitungan terjadi di
 * `simulate()`. Nilai numerik tidak dijepit di sini melainkan lewat
 * `clampParams()` di lapisan halaman, supaya batas kepercayaan sistem hanya
 * punya satu implementasi (PRD §4.1).
 */
import { ACCESSIBILITY, LIMITS } from "@/lib/coefficients";
import {
  ACCESSIBILITY_FEATURES,
  DRINK_VESSEL_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  LIGHTING_OPTIONS,
  POWER_SOURCE_OPTIONS,
  WASTE_BINS_OPTIONS,
} from "@/lib/engine";
import type { AccessibilityFeature, EventParams } from "@/lib/engine";
import {
  DRINK_VESSEL_LABELS,
  EVENT_TYPE_LABELS,
  FOOD_PACKAGING_LABELS,
  LIGHTING_LABELS,
  POWER_SOURCE_LABELS,
  WASTE_BINS_LABELS,
} from "@/lib/labels";
import { decimal, rupiah } from "@/lib/format";
import { Field } from "@/components/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface EventFormProps {
  params: EventParams;
  onChange: (patch: Partial<EventParams>) => void;
}

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as Array<
  keyof typeof EVENT_TYPE_LABELS
>;

/**
 * `valueAsNumber` mengembalikan NaN saat field dikosongkan. NaN tidak boleh
 * masuk state karena React menolak merender `value={NaN}`. Nilai 0 aman:
 * `clampParams()` menaikkannya ke batas minimum sebelum masuk simulasi.
 */
const num = (value: number) => (Number.isNaN(value) ? 0 : value);

export function EventForm({ params, onChange }: EventFormProps) {
  const toggleFeature = (feature: AccessibilityFeature, on: boolean) => {
    onChange({
      accessibility: on
        ? [...params.accessibility, feature]
        : params.accessibility.filter((f) => f !== feature),
    });
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4" aria-labelledby="group-peserta">
        <h3
          id="group-peserta"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Peserta &amp; durasi
        </h3>

        <Field
          id="participants"
          label="Jumlah peserta"
          hint={`${LIMITS.participants.min}–${LIMITS.participants.max.toLocaleString("id-ID")} orang`}
        >
          <Input
            id="participants"
            type="number"
            inputMode="numeric"
            min={LIMITS.participants.min}
            max={LIMITS.participants.max}
            step={10}
            value={params.participants}
            aria-describedby="participants-hint"
            onChange={(e) =>
              onChange({ participants: num(e.target.valueAsNumber) })
            }
          />
        </Field>

        <Field
          id="durationHours"
          label="Durasi acara"
          valueLabel={`${decimal(params.durationHours)} jam`}
          nativeControl={false}
        >
          <Slider
            min={LIMITS.durationHours.min}
            max={LIMITS.durationHours.max}
            step={0.5}
            value={[params.durationHours]}
            aria-labelledby="durationHours-label"
            aria-valuetext={`${decimal(params.durationHours)} jam`}
            onValueChange={([v]) => onChange({ durationHours: v })}
          />
        </Field>

        <Field id="eventType" label="Jenis acara">
          <Select
            value={params.eventType}
            onValueChange={(v) =>
              onChange({ eventType: v as EventParams["eventType"] })
            }
          >
            <SelectTrigger id="eventType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="estimatedDisabledGuests"
          label="Perkiraan tamu difabel / lansia"
          hint="Menentukan seberapa berat fasilitas yang tidak tersedia dihitung pada skor inklusi."
        >
          <Input
            id="estimatedDisabledGuests"
            type="number"
            inputMode="numeric"
            min={0}
            max={params.participants}
            value={params.estimatedDisabledGuests}
            aria-describedby="estimatedDisabledGuests-hint"
            onChange={(e) =>
              onChange({
                estimatedDisabledGuests: num(e.target.valueAsNumber),
              })
            }
          />
        </Field>
      </section>

      <section className="grid gap-4" aria-labelledby="group-konsumsi">
        <h3
          id="group-konsumsi"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Konsumsi
        </h3>

        <Field
          id="mealsPerPerson"
          label="Porsi makan per orang"
          valueLabel={decimal(params.mealsPerPerson)}
          nativeControl={false}
        >
          <Slider
            min={LIMITS.mealsPerPerson.min}
            max={LIMITS.mealsPerPerson.max}
            step={0.5}
            value={[params.mealsPerPerson]}
            aria-labelledby="mealsPerPerson-label"
            aria-valuetext={`${decimal(params.mealsPerPerson)} porsi`}
            onValueChange={([v]) => onChange({ mealsPerPerson: v })}
          />
        </Field>

        <Field
          id="drinksPerPerson"
          label="Porsi minum per orang"
          valueLabel={decimal(params.drinksPerPerson)}
          nativeControl={false}
        >
          <Slider
            min={LIMITS.drinksPerPerson.min}
            max={LIMITS.drinksPerPerson.max}
            step={0.5}
            value={[params.drinksPerPerson]}
            aria-labelledby="drinksPerPerson-label"
            aria-valuetext={`${decimal(params.drinksPerPerson)} porsi`}
            onValueChange={([v]) => onChange({ drinksPerPerson: v })}
          />
        </Field>

        <Field id="foodPackaging" label="Kemasan makanan">
          <Select
            value={params.foodPackaging}
            onValueChange={(v) =>
              onChange({ foodPackaging: v as EventParams["foodPackaging"] })
            }
          >
            <SelectTrigger id="foodPackaging" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOOD_PACKAGING_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {FOOD_PACKAGING_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="drinkVessel" label="Wadah minuman">
          <Select
            value={params.drinkVessel}
            onValueChange={(v) =>
              onChange({ drinkVessel: v as EventParams["drinkVessel"] })
            }
          >
            <SelectTrigger id="drinkVessel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRINK_VESSEL_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {DRINK_VESSEL_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <section className="grid gap-4" aria-labelledby="group-energi">
        <h3
          id="group-energi"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Energi &amp; sampah
        </h3>

        <Field id="lighting" label="Pencahayaan">
          <Select
            value={params.lighting}
            onValueChange={(v) =>
              onChange({ lighting: v as EventParams["lighting"] })
            }
          >
            <SelectTrigger id="lighting" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIGHTING_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {LIGHTING_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="soundSystemKw"
          label="Daya sound system utama"
          hint="Belum termasuk titik sound di denah — titik denah menambah otomatis."
          valueLabel={`${decimal(params.soundSystemKw)} kW`}
          nativeControl={false}
        >
          <Slider
            min={LIMITS.soundSystemKw.min}
            max={LIMITS.soundSystemKw.max}
            step={0.5}
            value={[params.soundSystemKw]}
            aria-labelledby="soundSystemKw-label"
            aria-describedby="soundSystemKw-hint"
            aria-valuetext={`${decimal(params.soundSystemKw)} kilowatt`}
            onValueChange={([v]) => onChange({ soundSystemKw: v })}
          />
        </Field>

        <Field id="powerSource" label="Sumber daya">
          <Select
            value={params.powerSource}
            onValueChange={(v) =>
              onChange({ powerSource: v as EventParams["powerSource"] })
            }
          >
            <SelectTrigger id="powerSource" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POWER_SOURCE_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {POWER_SOURCE_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="wasteBins"
          label="Pengelolaan sampah"
          hint="Pemilahan mengurangi residu yang berakhir di TPA, bukan total timbulan."
        >
          <Select
            value={params.wasteBins}
            onValueChange={(v) =>
              onChange({ wasteBins: v as EventParams["wasteBins"] })
            }
          >
            <SelectTrigger
              id="wasteBins"
              className="w-full"
              aria-describedby="wasteBins-hint"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WASTE_BINS_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {WASTE_BINS_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <fieldset className="grid gap-3">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fasilitas aksesibilitas
        </legend>
        {ACCESSIBILITY_FEATURES.map((feature) => {
          const { label, cost } = ACCESSIBILITY[feature];
          const checked = params.accessibility.includes(feature);

          return (
            <div key={feature} className="flex items-start gap-3">
              <Checkbox
                id={`access-${feature}`}
                checked={checked}
                onCheckedChange={(v) => toggleFeature(feature, v === true)}
              />
              <div className="grid gap-0.5 leading-tight">
                <Label htmlFor={`access-${feature}`} className="font-normal">
                  {label}
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {rupiah(cost)}
                </span>
              </div>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}
