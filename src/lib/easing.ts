/**
 * Kurva animasi tunggal — cermin JS dari `--ease-reveal` di globals.css.
 *
 * Count-up memakai kurva yang sama persis dengan reveal CSS (diselesaikan
 * penuh, bukan perkiraan parametrik), supaya angka dan wadahnya terasa satu keluarga.
 * Satu-satunya perbedaan adalah durasi: 400ms untuk angka, 550ms untuk reveal.
 */

export const EASE_REVEAL = { x1: 0.22, y1: 1, x2: 0.36, y2: 1 } as const;

function bezier(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

function bezierDerivative(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

/**
 * Menyelesaikan cubic-bezier(x1, y1, x2, y2) untuk posisi waktu x → progres y.
 * Newton-Raphson dengan fallback bisection — sama seperti mesin CSS.
 */
export function cubicBezierY(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
): number {
  if (!(x > 0)) return 0;
  if (!(x < 1)) return 1;
  // Spek CSS cubic-bezier() mensyaratkan x1,x2 di [0,1]; y1,y2 boleh di luar rentang.
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new RangeError("cubicBezierY: x1 dan x2 harus di [0,1]");
  }
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = bezier(t, x1, x2) - x;
    if (Math.abs(err) < 1e-6) break;
    const d = bezierDerivative(t, x1, x2);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }
  if (t < 0 || t > 1 || Math.abs(bezier(t, x1, x2) - x) >= 1e-4) {
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const v = bezier(t, x1, x2);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
  }
  t = Math.min(1, Math.max(0, t));
  return bezier(t, y1, y2);
}

/** Progres eased untuk posisi waktu 0..1 — dipakai count-up 400ms. */
export function easeOutReveal(x: number): number {
  return cubicBezierY(
    EASE_REVEAL.x1,
    EASE_REVEAL.y1,
    EASE_REVEAL.x2,
    EASE_REVEAL.y2,
    x,
  );
}
