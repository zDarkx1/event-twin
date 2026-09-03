/**
 * Rate limiter jendela-geser di memori proses — pelindung dasar untuk
 * `/api/insight`, satu-satunya endpoint yang memanggil API berbayar.
 *
 * Tanpa ini, endpoint publik bisa di-loop siapa pun yang tahu URL-nya dan
 * menghabiskan kuota API key. Ini bukan pengganti rate limiter terdistribusi
 * (Upstash/Redis): pada Vercel setiap instance serverless punya memorinya
 * sendiri, jadi batas efektifnya = limit x jumlah instance aktif. Untuk demo
 * lomba dan satu instance, ini memadai; kalau nanti perlu jaminan ketat,
 * ganti penyimpanannya, bukan pemanggilnya.
 */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** Disuntikkan pada test supaya waktu tidak perlu benar-benar berjalan. */
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export const RATE_LIMIT_DEFAULTS = {
  limit: 10,
  windowMs: 60_000,
} as const;

/** Batas jumlah identitas yang dilacak, agar peta tidak tumbuh tanpa batas. */
const MAX_TRACKED_IDENTITIES = 5_000;

const hits = new Map<string, number[]>();
let lastPruneAt = 0;

function prune(now: number, windowMs: number): void {
  for (const [key, stamps] of hits) {
    const live = stamps.filter((t) => now - t < windowMs);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
  lastPruneAt = now;
}

export function checkRateLimit(
  identity: string,
  options: RateLimitOptions = RATE_LIMIT_DEFAULTS,
): RateLimitResult {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now();

  // Sapuan berkala: paling sering sekali per jendela, jadi biayanya teramortisasi
  // dan entri mati tidak menumpuk sampai peta membengkak.
  if (now - lastPruneAt >= windowMs) {
    prune(now, windowMs);
  }

  // Jaring pengaman kalau lonjakan identitas unik datang dalam satu jendela.
  if (hits.size >= MAX_TRACKED_IDENTITIES) {
    prune(now, windowMs);
    // Kalau masih penuh setelah dipangkas, buang entri tertua.
    if (hits.size >= MAX_TRACKED_IDENTITIES) {
      const oldest = hits.keys().next();
      if (!oldest.done) hits.delete(oldest.value);
    }
  }

  const stamps = (hits.get(identity) ?? []).filter((t) => now - t < windowMs);

  if (stamps.length >= limit) {
    hits.set(identity, stamps);
    const oldest = stamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  stamps.push(now);
  hits.set(identity, stamps);
  return {
    allowed: true,
    remaining: Math.max(0, limit - stamps.length),
    retryAfterSeconds: 0,
  };
}

/**
 * Mengosongkan state — hanya untuk test. Diberi properti `size()` supaya test
 * bisa memeriksa bahwa peta tidak tumbuh tanpa batas.
 */
export const __resetRateLimit = Object.assign(
  function reset(): void {
    hits.clear();
    lastPruneAt = 0;
  },
  { size: () => hits.size },
);
