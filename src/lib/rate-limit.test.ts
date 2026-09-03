import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimit, checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimit();
  });

  it("mengizinkan request di bawah kuota", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      const r = checkRateLimit("1.1.1.1", { limit: 10, windowMs: 60_000, now: now + i });
      expect(r.allowed).toBe(true);
    }
  });

  it("menolak request setelah kuota habis", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.1.1.1", { limit: 10, windowMs: 60_000, now });
    }
    const r = checkRateLimit("1.1.1.1", { limit: 10, windowMs: 60_000, now });
    expect(r.allowed).toBe(false);
  });

  it("memberi retryAfterSeconds ketika ditolak", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now });
    }
    const r = checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now: now + 10_000 });
    expect(r.allowed).toBe(false);
    // sisa jendela 50s, dibulatkan ke atas
    expect(r.retryAfterSeconds).toBe(50);
  });

  it("menghitung kuota terpisah per identitas", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now });
    }
    expect(checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now }).allowed).toBe(false);
    expect(checkRateLimit("2.2.2.2", { limit: 3, windowMs: 60_000, now }).allowed).toBe(true);
  });

  it("memakai jendela geser, bukan jendela tetap", () => {
    const t0 = 1_000_000;
    // 3 request di awal
    for (let i = 0; i < 3; i++) {
      checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now: t0 });
    }
    // masih dalam jendela → ditolak
    expect(
      checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now: t0 + 59_000 }).allowed,
    ).toBe(false);
    // request pertama sudah keluar jendela → diizinkan lagi
    expect(
      checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now: t0 + 61_000 }).allowed,
    ).toBe(true);
  });

  it("melaporkan sisa kuota", () => {
    const now = 1_000_000;
    const a = checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now });
    expect(a.remaining).toBe(2);
    const b = checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now });
    expect(b.remaining).toBe(1);
    const c = checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now });
    expect(c.remaining).toBe(0);
  });

  it("tidak membiarkan peta tumbuh tanpa batas", () => {
    const now = 1_000_000;
    for (let i = 0; i < 6000; i++) {
      checkRateLimit(`ip-${i}`, { limit: 10, windowMs: 60_000, now });
    }
    // entri lama dipangkas; jumlah kunci tidak boleh sebanyak identitas unik
    expect(__resetRateLimit.size()).toBeLessThanOrEqual(5000);
  });

  it("membersihkan entri yang jendelanya sudah lewat", () => {
    const t0 = 1_000_000;
    checkRateLimit("1.1.1.1", { limit: 3, windowMs: 60_000, now: t0 });
    expect(__resetRateLimit.size()).toBe(1);
    // identitas lain jauh di masa depan memicu pembersihan entri kedaluwarsa
    checkRateLimit("2.2.2.2", { limit: 3, windowMs: 60_000, now: t0 + 200_000 });
    expect(__resetRateLimit.size()).toBe(1);
  });
});
