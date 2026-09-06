"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Reveal sekali saat masuk viewport — IntersectionObserver, tanpa dependensi.
 * Elemen sudah dalam posisi akhir saat SSR; observer hanya menambahkan kelas
 * `is-visible`. Sekali terlihat tidak pernah disembunyikan lagi.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(): {
  ref: (node: T | null) => void;
  visible: boolean;
} {
  // Callback ref: elemen yang menempel belakangan tetap ter-observe,
  // tidak seperti ref object yang dibaca sekali saat mount.
  const [el, setEl] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => setEl(node), []);
  // Fallback tanpa IntersectionObserver dihitung di initializer (bukan di
  // effect) agar tidak ada setState sinkron di dalam effect. Server me-render
  // false (tanpa window), klien tanpa IO mulai true, klien normal mulai false
  // lalu di-observe.
  const [visible, setVisible] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el]);

  return { ref, visible };
}
