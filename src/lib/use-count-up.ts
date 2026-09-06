"use client";

import { useEffect, useRef, useState } from "react";
import { easeOutReveal } from "./easing";

/**
 * Durasi count-up — satu keluarga kurva dengan reveal 550ms, tapi lebih
 * pendek supaya sempat settle di antara tick slider yang beruntun.
 */
export const COUNT_UP_MS = 400;

// Cache malas untuk preferensi reduced-motion — dibaca sekali per sesi.
// Tanpa live listener: perubahan preferensi di tengah sesi tidak akan
// membatalkan tween 400ms yang sedang berjalan (diterima).
let reduceMotionCached: boolean | null = null;
function prefersReducedMotion(): boolean {
  if (reduceMotionCached !== null) return reduceMotionCached;
  reduceMotionCached =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduceMotionCached;
}

/**
 * Nilai tween murni — logika yang sama dipakai hook di bawah, diuji tanpa DOM.
 * `elapsedMs <= 0` → from, `>= duration` → to persis (tanpa sisa floating).
 */
export function tweenValue(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs = COUNT_UP_MS,
): number {
  if (!(elapsedMs > 0)) return from;
  if (elapsedMs >= durationMs) return to;
  return from + (to - from) * easeOutReveal(elapsedMs / durationMs);
}

/**
 * Count-up yang bisa diinterupsi: target baru di tengah jalan membatalkan
 * frame tertunda dan berangkat lagi dari nilai yang sedang tampil — tidak
 * pernah mengantre, jadi scrub slider yang cepat mengejar jari, bukan
 * tersendat lewat nilai basi. Mount pertama dan prefers-reduced-motion
 * langsung menampilkan nilai akhir.
 */
export function useCountUp(target: number): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef(0);
  // Cetak menangkap nilai tengah tween — jepret ke nilai akhir lewat jalur
  // instan yang sama seperti reduced-motion. Menerima Ctrl+P browser juga.
  useEffect(() => {
    const snap = () => {
      cancelAnimationFrame(rafRef.current);
      if (displayRef.current !== target) {
        displayRef.current = target;
        setDisplay(target);
      }
    };
    window.addEventListener("beforeprint", snap);
    return () => window.removeEventListener("beforeprint", snap);
  }, [target]);

  useEffect(() => {
    const from = displayRef.current;
    cancelAnimationFrame(rafRef.current);
    const reduceMotion = prefersReducedMotion();
    if (
      from === target ||
      !Number.isFinite(target) ||
      !Number.isFinite(from) ||
      reduceMotion
    ) {
      // NaN/infinite mengikuti perilaku lama: tampilkan apa adanya, tanpa tween.
      if (displayRef.current !== target) {
        displayRef.current = target;
        setDisplay(target);
      }
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      // Jaga timestamp rAF yang tidak valid — jangan biarkan NaN merambat.
      const nowMs = typeof now === "number" ? now : performance.now();
      const elapsed = nowMs - start;
      if (elapsed >= COUNT_UP_MS) {
        displayRef.current = target;
        setDisplay(target);
        return;
      }
      const v = tweenValue(from, target, elapsed);
      displayRef.current = v;
      setDisplay(v);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return display;
}
