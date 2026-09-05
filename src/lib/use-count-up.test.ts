// Celah yang diketahui: jalur hook (cancel/retarget/reduced-motion/unmount)
// tidak bisa diuji di env node tanpa jsdom/testing-library — hanya tween
// murni yang diuji di sini, jalur hook ditutup lewat code review + uji
// geser slider manual.
import { describe, expect, it } from "vitest";
import { COUNT_UP_MS, tweenValue } from "./use-count-up";
import { easeOutReveal } from "./easing";

describe("tweenValue", () => {
  it("mulai dari from dan berakhir tepat di to", () => {
    expect(tweenValue(0, 100, 0)).toBe(0);
    expect(tweenValue(0, 100, -50)).toBe(0);
    expect(tweenValue(0, 100, COUNT_UP_MS)).toBe(100);
    expect(tweenValue(0, 100, COUNT_UP_MS + 500)).toBe(100);
  });

  it("berjalan menurun sama baiknya", () => {
    expect(tweenValue(100, 0, COUNT_UP_MS)).toBe(0);
    expect(tweenValue(100, 0, 0)).toBe(100);
    const mid = tweenValue(100, 0, COUNT_UP_MS / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
  });

  it("mengikuti kurva reveal di tengah jalan", () => {
    expect(tweenValue(0, 100, COUNT_UP_MS / 2)).toBeCloseTo(
      100 * easeOutReveal(0.5),
      9,
    );
  });

  it("monoton naik untuk from < to", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 10; i++) {
      const v = tweenValue(20, 80, (i / 10) * COUNT_UP_MS);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("mendukung durasi kustom", () => {
    expect(tweenValue(0, 50, 100, 100)).toBe(50);
    expect(tweenValue(0, 50, 0, 100)).toBe(0);
  });

  it("durasi 0/negatif settle langsung", () => {
    expect(tweenValue(0, 100, 1, 0)).toBe(100);
    expect(tweenValue(0, 100, 50, -100)).toBe(100);
  });

  it("elapsed NaN tidak bocor NaN", () => {
    expect(tweenValue(0, 100, NaN)).toBe(0);
  });

  it("from sama dengan to stabil", () => {
    expect(tweenValue(5, 5, 200)).toBe(5);
  });

  it("to fraksional settle persis", () => {
    expect(tweenValue(0, 0.3, COUNT_UP_MS)).toBe(0.3);
    expect(tweenValue(0, 99.5, COUNT_UP_MS + 1)).toBe(99.5);
  });

  it("monoton turun untuk from > to", () => {
    let prev = Infinity;
    for (let i = 0; i <= 10; i++) {
      const v = tweenValue(80, 20, (i / 10) * COUNT_UP_MS);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});
