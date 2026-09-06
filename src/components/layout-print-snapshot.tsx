/**
 * Snapshot denah statis khusus cetak — pengganti editor interaktif di kertas.
 *
 * Editor memakai kanvas piksel + scroll + overlay drag yang tak bermakna di
 * cetakan; SVG dengan viewBox sel-grid mencetak tajam di semua skala tanpa
 * dependensi. Warna reuse `colorVar` katalog via style (atribut fill tak
 * mendukung var()). Murni render, tanpa "use client".
 */
import { BOX_SPECS, type VenueLayout } from "@/lib/layout";

export function LayoutPrintSnapshot({ layout }: { layout: VenueLayout }) {
  return (
    <figure aria-label="Denah venue" className="hidden layout-print-figure print:block">
      <svg
        viewBox={`0 0 ${layout.cols} ${layout.rows}`}
        role="img"
        aria-label={`Denah venue ${layout.cols} kali ${layout.rows} sel dengan ${layout.boxes.length} kotak`}
        className="h-auto w-full print:mx-auto print:max-h-[170mm] print:w-auto"
      >
        <rect
          x={0}
          y={0}
          width={layout.cols}
          height={layout.rows}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.1}
        />
        {layout.boxes.map((box) => {
          const spec = BOX_SPECS[box.type] ?? BOX_SPECS.generic;
          return (
            <g key={box.id}>
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                style={{ fill: spec.colorVar }}
                fillOpacity={0.3}
                stroke={spec.colorVar}
                strokeWidth={0.08}
              />
              {box.w >= 3 && box.h >= 1 ? (
                <text
                  x={box.x + box.w / 2}
                  y={box.y + box.h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={0.55}
                  textLength={box.w - 0.3}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {spec.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        Denah venue ({layout.cols}×{layout.rows} sel, {layout.boxes.length}{" "}
        kotak). Beban listrik denah sudah termasuk dalam angka energi.
      </figcaption>
    </figure>
  );
}
