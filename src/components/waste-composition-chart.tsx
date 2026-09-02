/**
 * Komposisi sampah — satu batang bertumpuk horizontal (part-to-whole).
 *
 * Sengaja bukan pie: empat fraksi dengan nama panjang lebih terbaca sebagai
 * satu batang bertumpuk, dan bar horizontal menampung label panjang di lebar
 * 360 px.
 *
 * Dibangun dari flexbox, bukan chart library: satu batang part-to-whole adalah
 * pembagian lebar proporsional — `flex-grow` sudah melakukannya persis, di
 * setiap lebar, tanpa sumbu, tanpa pengukuran, tanpa JavaScript saat resize.
 * Recharts di sini justru menambah risiko: `layout="vertical"` tanpa `YAxis`
 * eksplisit memakai sumbu implisit bertipe `number`, sehingga posisi dan tinggi
 * batang dihitung dari domain numerik kosong.
 *
 * Batang bersifat dekoratif (`aria-hidden`): daftar di bawahnya menyebut setiap
 * fraksi beserta massa dan persentasenya sebagai teks biasa, jadi seluruh angka
 * terbaca tanpa hover, tanpa mouse, dan tanpa bergantung pada warna.
 */
import type { WasteComposition } from "@/lib/engine";
import { decimal } from "@/lib/format";

const FRACTIONS: Array<{
  key: keyof WasteComposition;
  label: string;
  color: string;
}> = [
  { key: "organic", label: "Organik", color: "var(--chart-3)" },
  { key: "plastic", label: "Plastik", color: "var(--chart-1)" },
  { key: "paper", label: "Kertas", color: "var(--chart-2)" },
  { key: "other", label: "Lain-lain", color: "var(--chart-4)" },
];

interface WasteCompositionChartProps {
  composition: WasteComposition;
  totalKg: number;
}

export function WasteCompositionChart({
  composition,
  totalKg,
}: WasteCompositionChartProps) {
  const share = (value: number) => (totalKg > 0 ? (value / totalKg) * 100 : 0);

  /**
   * Fraksi bernilai nol dibuang dari batang: menyisakannya menghasilkan celah
   * 2 px tanpa segmen di antaranya — pemisah yang tidak memisahkan apa pun.
   * Daftar di bawah tetap menyebut semua fraksi, termasuk yang nol.
   */
  const segments = FRACTIONS.filter((f) => composition[f.key] > 0);

  return (
    <div className="grid gap-3">
      {/*
        `gap-0.5` = celah 2 px berwarna permukaan antar segmen (spesifikasi
        dataviz): pemisah adalah ruang kosong, bukan garis tepi. Karena celah
        diambil dari lebar total sebelum `flex-grow` dibagi, proporsi tetap
        benar tanpa perhitungan persen manual.
      */}
      <div aria-hidden="true" className="flex h-6 w-full gap-0.5">
        {segments.map((f, i) => (
          <span
            key={f.key}
            className={[
              "block min-w-0.5 basis-0",
              // 4 px hanya di ujung batang — sudut di tengah tumpukan akan
              // terlihat seperti celah kedua.
              i === 0 ? "rounded-l-[4px]" : "",
              i === segments.length - 1 ? "rounded-r-[4px]" : "",
            ].join(" ")}
            style={{
              // Persen, bukan kg mentah: `flex-grow` yang totalnya di bawah 1
              // hanya membagi sebagian ruang kosong, jadi acara terkecil
              // (0,05 kg timbulan) akan merender batang yang hampir habis
              // kosong. Rasio antar segmen sama, skalanya saja yang aman.
              flexGrow: share(composition[f.key]),
              background: f.color,
            }}
          />
        ))}
      </div>

      {/*
        Satu kolom di 360 px: barisnya membawa nama fraksi + massa + persen, dan
        dua kolom memaksanya melebihi 140 px yang tersedia.
      */}
      <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {FRACTIONS.map((f) => (
          <li key={f.key} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: f.color }}
            />
            <span className="text-muted-foreground">{f.label}</span>
            <span className="ml-auto shrink-0 tabular-nums">
              {decimal(composition[f.key])} kg
              <span className="text-muted-foreground">
                {" "}
                ({decimal(share(composition[f.key]))}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
