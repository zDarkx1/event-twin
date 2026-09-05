"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EventParams } from "@/lib/engine";

interface AiInsightProps {
  scenario: EventParams;
  baseline: EventParams;
}

type Status = "idle" | "loading" | "success" | "hidden";

export function AiInsight({ scenario, baseline }: AiInsightProps) {
  // Stabil antar tick slider: narasi yang sudah diambil tidak pernah dibuang
  // oleh perubahan parameter. Sebagai gantinya snapshot saat fetch dicatat;
  // bila parameter berubah sesudahnya, panel menandai narasi basi dan
  // menawarkan jelaskan ulang — panitia tetap bisa membaca sambil menggeser.
  const [status, setStatus] = useState<Status>("idle");
  const [insight, setInsight] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqRef = useRef(0);

  const fingerprint = JSON.stringify({ scenario, baseline });
  // Param berubah membuka ulang idle tanpa remount.
  const effectiveStatus =
    status === "hidden" && hiddenFor !== fingerprint ? "idle" : status;
  const isLoading = effectiveStatus === "loading";
  const stale =
    effectiveStatus === "success" &&
    snapshot !== null &&
    snapshot !== fingerprint;

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const fetchInsight = async () => {
    if (isLoading) return;
    // Request terbaru menang — respons basi diabaikan.
    const id = ++reqRef.current;
    // Potret parameter yang dikirim — bila berubah saat request melayang,
    // narasi yang tiba langsung ditandai basi.
    const snap = fingerprint;
    setStatus("loading");
    setCopied(false);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params: scenario, baselineDecisions: baseline }),
      });
      if (!res.ok) {
        // PRD §6: kegagalan AI ditangani dengan diam — panel hilang, dashboard
        // tetap utuh. 503 tanpa key, 429 kena rate limit, 500 gangguan upstream.
        setStatus("hidden");
        setHiddenFor(fingerprint);
        return;
      }
      const data = (await res.json()) as { insight?: string };
      // Respons basi diabaikan — request terbaru menang.
      if (id !== reqRef.current) return;
      if (typeof data.insight === "string" && data.insight.trim()) {
        setInsight(data.insight.trim());
        setSnapshot(snap);
        setStatus("success");
      } else {
        setStatus("hidden");
        setHiddenFor(fingerprint);
      }
    } catch {
      setStatus("hidden");
      setHiddenFor(fingerprint);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(insight);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia pada konteks non-HTTPS — abaikan diam-diam
    }
  };

  if (effectiveStatus === "hidden") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden="true" />
          AI Insight
        </CardTitle>
        <CardDescription>
          Narasi dampak skenario vs baseline — opsional, dashboard tetap jalan
          tanpa ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {effectiveStatus === "idle" && (
          <div className="mount-enter grid gap-3">
            <Button variant="outline" onClick={fetchInsight}>
              <Sparkles aria-hidden="true" />
              Jelaskan dengan AI
            </Button>
            <p className="text-xs text-muted-foreground">
              Angka dihitung engine; AI hanya menarasikan, tidak menghitung.
            </p>
          </div>
        )}

        {effectiveStatus === "loading" && (
          <div aria-busy="true" aria-label="Memuat narasi AI" className="mount-enter grid gap-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        )}

        {effectiveStatus === "success" && (
          <div className="mount-enter grid gap-4">
            <div
              aria-live="polite"
              className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap dark:prose-invert"
            >
              {insight}
            </div>
            {stale ? (
              <p role="status" className="mount-enter text-xs text-muted-foreground">
                Parameter berubah sejak narasi dibuat — jelaskan ulang untuk
                versi terbaru.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <span
                  key={String(copied)}
                  className="swap-enter inline-flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check aria-hidden="true" /> Tersalin
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" /> Salin
                    </>
                  )}
                </span>
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchInsight}>
                <RotateCcw aria-hidden="true" />{" "}
                {stale ? "Jelaskan ulang" : "Coba lagi"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
