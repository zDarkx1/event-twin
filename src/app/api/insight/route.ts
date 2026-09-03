import Anthropic from "@anthropic-ai/sdk";
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
    const client = new Anthropic({
      apiKey: key,
      // Base URL bisa diarahkan ke endpoint Anthropic-compatible mana pun — PRD §6.
      ...(process.env.ANTHROPIC_BASE_URL
        ? { baseURL: process.env.ANTHROPIC_BASE_URL }
        : {}),
    });

    const response = await client.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 968,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      },
      { signal: AbortSignal.timeout(20_000) },
    );

    const insight = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

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
