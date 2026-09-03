"use client";

import { useRef, useState } from "react";
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
  // Parent me-remount komponen ini lewat `key` saat skenario atau baseline
  // berubah, sehingga narasi lama tidak pernah tertinggal menemani angka baru.
  // Karena itu tidak ada effect reset di sini — remount sudah mengurusnya.
  const [status, setStatus] = useState<Status>("idle");
  const [insight, setInsight] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoading = status === "loading";

  const fetchInsight = async () => {
    if (isLoading) return;
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
        return;
      }
      const data = (await res.json()) as { insight?: string };
      if (typeof data.insight === "string" && data.insight.trim()) {
        setInsight(data.insight.trim());
        setStatus("success");
      } else {
        setStatus("hidden");
      }
    } catch {
      setStatus("hidden");
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

  if (status === "hidden") return null;

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
        {status === "idle" && (
          <div className="grid gap-3">
            <Button variant="outline" onClick={fetchInsight}>
              <Sparkles aria-hidden="true" />
              Jelaskan dengan AI
            </Button>
            <p className="text-xs text-muted-foreground">
              Angka dihitung engine; AI hanya menarasikan, tidak menghitung.
            </p>
          </div>
        )}

        {status === "loading" && (
          <div aria-busy="true" aria-label="Memuat narasi AI" className="grid gap-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        )}

        {status === "success" && (
          <div className="grid gap-4">
            <div
              aria-live="polite"
              className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap dark:prose-invert"
            >
              {insight}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check aria-hidden="true" /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" /> Salin
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchInsight}>
                <RotateCcw aria-hidden="true" /> Coba lagi
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
