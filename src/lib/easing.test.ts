import { describe, expect, it } from "vitest";
import { cubicBezierY, easeOutReveal, EASE_REVEAL } from "./easing";

describe("easeOutReveal", () => {
  it("mulai di 0 dan berakhir di 1", () => {
    expect(easeOutReveal(0)).toBe(0);
    expect(easeOutReveal(1)).toBe(1);
  });

  it("menjepit posisi di luar rentang", () => {
    expect(easeOutReveal(-0.5)).toBe(0);
    expect(easeOutReveal(1.5)).toBe(1);
  });

  it("berkarakter ease-out: melaju di awal", () => {
    expect(easeOutReveal(0.25)).toBeGreaterThan(0.25);
    expect(easeOutReveal(0.5)).toBeGreaterThan(0.5);
  });

  it("nilai emas di tengah cocok dengan solver", () => {
    // Nilai diukur langsung dari solver (node -e salinan inline cubicBezierY).
    expect(easeOutReveal(0.5)).toBeCloseTo(0.96138, 3);
  });

  it("konstanta sama dengan --ease-reveal di CSS", () => {
    expect([EASE_REVEAL.x1, EASE_REVEAL.y1, EASE_REVEAL.x2, EASE_REVEAL.y2]).toEqual([
      0.22, 1, 0.36, 1,
    ]);
  });

  it("menangani NaN dan tak-hingga", () => {
    expect(easeOutReveal(NaN)).toBe(0);
    expect(easeOutReveal(Infinity)).toBe(1);
    expect(easeOutReveal(-Infinity)).toBe(0);
  });

  it("keluaran tetap di [0,1] untuk seluruh rentang", () => {
    for (let i = 0; i <= 100; i++) {
      const v = easeOutReveal(i / 100);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("monoton naik tanpa lompatan", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const v = easeOutReveal(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("cubicBezierY", () => {
  it("kurva linear adalah identitas", () => {
    for (const x of [0.13, 0.37, 0.5, 0.73]) {
      expect(cubicBezierY(0, 0, 1, 1, x)).toBeCloseTo(x, 5);
    }
  });

  it("menjepit posisi di luar rentang", () => {
    expect(cubicBezierY(0.22, 1, 0.36, 1, -1)).toBe(0);
    expect(cubicBezierY(0.22, 1, 0.36, 1, 2)).toBe(1);
  });

  it("menangani NaN dan tak-hingga", () => {
    expect(cubicBezierY(0.22, 1, 0.36, 1, NaN)).toBe(0);
    expect(cubicBezierY(0.22, 1, 0.36, 1, Infinity)).toBe(1);
    expect(cubicBezierY(0.22, 1, 0.36, 1, -Infinity)).toBe(0);
  });

  it("keluaran tetap di [0,1] untuk seluruh rentang", () => {
    for (let i = 0; i <= 100; i++) {
      const v = cubicBezierY(0.22, 1, 0.36, 1, i / 100);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("kurva curam tetap selesai lewat fallback", () => {
    expect(cubicBezierY(0.9, 0, 0.9, 1, 0.5)).toBeGreaterThan(0);
  });

  it("menolak titik kontrol x di luar [0,1]", () => {
    expect(() => cubicBezierY(-0.1, 0, 0.5, 1, 0.5)).toThrow(RangeError);
    expect(() => cubicBezierY(0.2, 0, 1.2, 1, 0.5)).toThrow(RangeError);
  });
});
