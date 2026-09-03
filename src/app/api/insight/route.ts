import { NextResponse } from "next/server";
import { buildInsightPrompt } from "@/lib/ai-prompt";
import { simulate } from "@/lib/engine";
import { parseInsightRequest } from "@/lib/insight-request";
import { RATE_LIMIT_DEFAULTS, checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Batas ukuran body — payload sah jauh di bawah 8 KB. */
const MAX_BODY_BYTES = 16_384;

const DEFAULT_MODEL = "claude-opus-5";

/**
 * Identitas pemanggil untuk rate limiting. Di belakang proxy Vercel, IP asli
 * ada di x-forwarded-for; entri pertama adalah klien. Header ini bisa dipalsukan
 * kalau app diakses langsung tanpa proxy — itu diterima di sini karena limiter
 * ini pelindung kuota, bukan kontrol akses.
 */
function callerIdentity(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function apiKey(): string | undefined {
  // NEW_API_KEY adalah nama yang dipakai di deployment ini; ANTHROPIC_API_KEY
  // tetap didukung agar setup standar Anthropic tidak perlu diubah.
  return process.env.NEW_API_KEY || process.env.ANTHROPIC_API_KEY;
}

export async function POST(req: Request) {
  const key = apiKey();
  if (!key) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const rate = checkRateLimit(callerIdentity(req), RATE_LIMIT_DEFAULTS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "RateLimit-Limit": String(RATE_LIMIT_DEFAULTS.limit),
          "RateLimit-Remaining": "0",
        },
      },
    );
  }

  // Tolak body raksasa sebelum di-parse, supaya tidak boros memori.
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const parsed = parseInsightRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  // Angka dihitung ulang di server; nilai apa pun dari klien tidak dipercaya.
  const { params, baseline } = parsed.value;
  const { system, user } = buildInsightPrompt(
    { params, result: simulate(params) },
    { params: baseline, result: simulate(baseline) },
  );

  try {
    // Endpoint OpenAI-compatible (`/v1/chat/completions`, Bearer token) — bentuk
    // yang dilayani gateway di ANTHROPIC_BASE_URL. Dipanggil dengan fetch bawaan,
    // tanpa SDK: satu request non-stream tidak butuh lapisan tambahan, dan error
    // upstream terbaca apa adanya di log (status + body).
    const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com")
      .replace(/\/+$/, "");

    // Gateway reseller bisa jauh lebih lambat dari API langsung: prompt EventTwin
    // ~3 KB dan keluaran ratusan token. 90 detik dipilih supaya lambat tidak
    // terbaca sebagai mati; bisa dipendekkan lewat env kalau demo butuh gagal cepat.
    const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 90_000;
    const startedAt = Date.now();

    const upstream = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        temperature: 0.2,
        // System prompt jadi pesan pertama — begitu skema chat completions
        // membawanya; tidak ada field `system` terpisah.
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    console.info(
      `[ai-insight] upstream ${upstream.status} in ${Date.now() - startedAt}ms`,
    );

    if (!upstream.ok) {
      // Body ikut dicatat: di sinilah "model tidak dikenal" atau "key ditolak"
      // sebenarnya tertulis. Tanpa ini penyebabnya tidak pernah kelihatan.
      const detail = await upstream.text().catch(() => "");
      console.warn(
        `[ai-insight] upstream ${upstream.status} ${upstream.statusText}: ${detail.slice(0, 500)}`,
      );
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };

    const raw = data.choices?.[0]?.message?.content;
    // Sebagian gateway mengembalikan content sebagai array blok, bukan string.
    const insight = (
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw
              .map((b) =>
                typeof b === "string"
                  ? b
                  : typeof (b as { text?: unknown })?.text === "string"
                    ? ((b as { text: string }).text)
                    : "",
              )
              .join("")
          : ""
    ).trim();

    if (!insight) {
      console.warn("[ai-insight] empty response");
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    return NextResponse.json({ insight });
  } catch (err) {
    // Pesan ke klien sengaja generik; detail hanya masuk log server.
    console.warn("[ai-insight] error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
