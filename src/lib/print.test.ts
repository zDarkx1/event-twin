/**
 * Uji render cetak — SVG snapshot denah dan ringkasan parameter.
 *
 * renderToStaticMarkup dari react-dom/server: tanpa testing-library,
 * tanpa jsdom, tanpa dependensi baru. Komponen dipanggil sebagai fungsi
 * biasa (tanpa JSX) supaya berkas tetap `.test.ts` sesuai include vitest.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutPrintSnapshot } from "../components/layout-print-snapshot";
import { EventPrintSummary } from "../components/event-print-summary";
import { PrintButton } from "../components/print-button";
import { DEFAULT_PARAMS } from "./defaults";
import { round } from "./format";
import { DEFAULT_LAYOUT, type VenueLayout } from "./layout";

describe("LayoutPrintSnapshot", () => {
  it("viewBox mengikuti dimensi grid dan rect per kotak", () => {
    const layout: VenueLayout = {
      ...DEFAULT_LAYOUT,
      boxes: [
        { id: "a", type: "stage", x: 1, y: 1, w: 4, h: 2 },
        { id: "b", type: "ramp", x: 6, y: 1, w: 2, h: 1 },
      ],
    };
    const html = renderToStaticMarkup(LayoutPrintSnapshot({ layout }));
    expect(html).toContain(`viewBox="0 0 ${layout.cols} ${layout.rows}"`);
    // 1 bingkai grid + 2 kotak.
    expect(html.match(/<rect/g)?.length).toBe(3);
    expect(html).toContain("Panggung");
    // Kotak sempit (w=2) tak berlabel — label "Ramp" tak boleh lolos.
    expect(html).not.toContain("Ramp");
    expect(html).toContain("2 kotak");
  });

  it("denah kosong hanya merender bingkai grid", () => {
    const html = renderToStaticMarkup(
      LayoutPrintSnapshot({ layout: DEFAULT_LAYOUT }),
    );
    expect(html.match(/<rect/g)?.length).toBe(1);
    expect(html).toContain("0 kotak");
  });
});

describe("EventPrintSummary", () => {
  it("memuat label keputusan dan nilai terformat", () => {
    // Komponen klien (hook): render lewat createElement, bukan panggil
    // langsung — efek tak jalan di static render, tanggal absen dengan anggun.
    const html = renderToStaticMarkup(
      createElement(EventPrintSummary, { scenario: DEFAULT_PARAMS }),
    );
    expect(html).toContain("Parameter acara");
    expect(html).toContain("Peserta");
    expect(html).toContain("Fasilitas akses");
    // Efek tak jalan di static render: tanggal absen dengan anggun.
    expect(html).not.toContain("Dicetak");
    // Nilai terformat: 500 peserta default.
    expect(html).toContain(`${round(DEFAULT_PARAMS.participants)} orang`);
    // Aksesibilitas default kosong — fallback "—" tampil.
    expect(html).toContain("—");
  });
});

describe("PrintButton", () => {
  it("merender label cetak dan tersembunyi di kertas", () => {
    const html = renderToStaticMarkup(PrintButton());
    expect(html).toContain("Cetak");
    expect(html).toContain("print:hidden");
  });
});
