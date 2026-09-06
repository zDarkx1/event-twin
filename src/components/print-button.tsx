"use client";

/**
 * Cetak / Simpan PDF — memanggil dialog print browser.
 *
 * Tanpa state, tanpa dependensi: browser yang menyediakan pratinjau, pilihan
 * printer, dan "Save as PDF". CSS `@media print` di globals.css yang mengatur
 * bagian mana yang ikut tercetak.
 */
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        // beforeprint terpicu native oleh window.print() (spec HTML); listener
        // di use-count-up menjepret angka ke nilai akhir secara sinkron
        // (flushSync) sebelum dialog cetak membekukan DOM.
        window.print();
      }}
      className="w-full print:hidden"
    >
      <Printer aria-hidden="true" /> Cetak / simpan PDF
    </Button>
  );
}
