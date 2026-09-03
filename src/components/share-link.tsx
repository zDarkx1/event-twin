"use client";

/**
 * Share via URL (F8) — tombol salin tautan skenario.
 *
 * Tautan dibangun dari state saat ini, bukan dari `window.location`: URL bar
 * tidak diperbarui setiap slider digeser (itu akan membanjiri riwayat browser
 * dan membuat tombol Back tidak berguna). Tautan baru dihitung tepat saat
 * tombol ditekan.
 */
import { useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventParams } from "@/lib/engine";
import { encodeShareParams } from "@/lib/share-url";

interface ShareLinkProps {
  scenario: EventParams;
  baseline: EventParams;
}

type State = "idle" | "copied" | "failed";

export function ShareLink({ scenario, baseline }: ShareLinkProps) {
  const [state, setState] = useState<State>("idle");
  const [manualUrl, setManualUrl] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildUrl = () => {
    const qs = encodeShareParams(scenario, baseline);
    const { origin, pathname } = window.location;
    return qs ? `${origin}${pathname}?${qs}` : `${origin}${pathname}`;
  };

  const handleShare = async () => {
    const url = buildUrl();
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      timerRef.current = setTimeout(() => setState("idle"), 2500);
    } catch {
      // Clipboard API butuh konteks aman (HTTPS/localhost). Kalau ditolak,
      // tautannya ditampilkan supaya masih bisa disalin manual — jangan
      // biarkan pengguna menekan tombol yang tidak melakukan apa-apa.
      setManualUrl(url);
      setState("failed");
    }
  };

  return (
    <div className="grid gap-2">
      <Button variant="outline" size="sm" onClick={handleShare} className="w-full">
        {state === "copied" ? (
          <>
            <Check aria-hidden="true" /> Tautan tersalin
          </>
        ) : (
          <>
            <Link2 aria-hidden="true" /> Salin tautan skenario
          </>
        )}
      </Button>

      <p aria-live="polite" className="text-xs text-muted-foreground">
        {state === "copied"
          ? "Tautan memuat seluruh parameter — penerima melihat skenario yang sama."
          : "Bagikan hasil simulasi tanpa perlu akun atau database."}
      </p>

      {state === "failed" && (
        <label className="grid gap-1 text-xs text-muted-foreground">
          Salin manual:
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border bg-muted/40 px-2 py-1 font-mono text-[11px]"
          />
        </label>
      )}
    </div>
  );
}
