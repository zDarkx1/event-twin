"use client";

/* eslint-disable react-hooks/set-state-in-effect -- stale insight & hidden→idle must reset on prop change; parent key also remounts but effect is defense-in-depth */
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
import type { EventParams, SimulationResult } from "@/lib/engine";

interface AiInsightProps {
  scenario: EventParams;
  baseline: EventParams;
  scenarioResult: SimulationResult;
  baselineResult: SimulationResult;
}

type Status = "idle" | "loading" | "success" | "hidden";

export function AiInsight({
  scenario,
  baseline,
  scenarioResult: _scenarioResult,
  baselineResult: _baselineResult,
}: AiInsightProps) {
  // keep props for wiring compliance (TASK §2) — not client-calculated
  void _scenarioResult;
  void _baselineResult;

  const [status, setStatus] = useState<Status>("idle");
  const [insight, setInsight] = useState("");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ponytail: stringify is O(n) on small EventParams (~8 keys), cheap vs deep-equal dep
  const scenarioKey = JSON.stringify(scenario);
  const baselineKey = JSON.stringify(baseline);

  useEffect(() => {
    // stale insight becomes a lie when inputs change; also recovers from
    // terminal hidden (503/transient) so demo is retryable without reload
    if (status === "success" || status === "hidden") {
      setStatus("idle");
      setInsight("");
      setCopied(false);
    }
    abortRef.current?.abort();
    // only react to input identity, not to status itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioKey, baselineKey]);

  const isLoading = status === "loading";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const fetchInsight = async () => {
    if (status === "loading") return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setCopied(false);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params: scenario, baselineDecisions: baseline }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!res.ok) {
        // 503 (no key) + 500/429/timeout → hidden silent per PRD.md:201;
        // effect above resets hidden→idle on next prop change so transient
        // 500/429 is retryable; 503 will just hide again until key exists
        setStatus("hidden");
        return;
      }
      const data = (await res.json()) as { insight?: string };
      if (controller.signal.aborted) return;
      if (typeof data.insight === "string" && data.insight.trim()) {
        setInsight(data.insight.trim());
        setStatus("success");
      } else {
        setStatus("hidden");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      if (controller.signal.aborted) return;
      setStatus("hidden");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(insight);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable in insecure context — silent
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
            <Button variant="outline" onClick={fetchInsight} disabled={isLoading}>
              <Sparkles aria-hidden="true" />
              Jelaskan dengan AI
            </Button>
            <p className="text-xs text-muted-foreground">
              Opsional — dashboard tetap jalan tanpa ini.
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
              <Button variant="ghost" size="sm" onClick={fetchInsight} disabled={isLoading}>
                <RotateCcw aria-hidden="true" /> Coba lagi
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
