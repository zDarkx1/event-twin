import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildInsightPrompt } from "@/lib/ai-prompt";
import {
  ACCESSIBILITY_FEATURES,
  DRINK_VESSEL_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  LIGHTING_OPTIONS,
  POWER_SOURCE_OPTIONS,
  WASTE_BINS_OPTIONS,
  clampParams,
  simulate,
  type EventParams,
} from "@/lib/engine";

export const runtime = "nodejs";

const EVENT_TYPE_OPTIONS = ["festival", "seminar", "competition", "bazaar"] as const;

function isValidParams(p: unknown): p is EventParams {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  // integers — must be integral
  if (
    typeof obj.participants !== "number" ||
    !Number.isFinite(obj.participants as number) ||
    !Number.isInteger(obj.participants as number)
  )
    return false;
  if (
    typeof obj.estimatedDisabledGuests !== "number" ||
    !Number.isFinite(obj.estimatedDisabledGuests as number) ||
    !Number.isInteger(obj.estimatedDisabledGuests as number)
  )
    return false;
  // floats allowed
  const floatNums = ["durationHours", "mealsPerPerson", "drinksPerPerson", "soundSystemKw"] as const;
  for (const k of floatNums) {
    if (typeof obj[k] !== "number" || !Number.isFinite(obj[k] as number)) return false;
  }
  if (!(EVENT_TYPE_OPTIONS as readonly string[]).includes(obj.eventType as string)) return false;
  if (!FOOD_PACKAGING_OPTIONS.includes(obj.foodPackaging as never)) return false;
  if (!DRINK_VESSEL_OPTIONS.includes(obj.drinkVessel as never)) return false;
  if (!WASTE_BINS_OPTIONS.includes(obj.wasteBins as never)) return false;
  if (!LIGHTING_OPTIONS.includes(obj.lighting as never)) return false;
  if (!POWER_SOURCE_OPTIONS.includes(obj.powerSource as never)) return false;
  if (!Array.isArray(obj.accessibility)) return false;
  if (obj.accessibility.length > ACCESSIBILITY_FEATURES.length) return false;
  if (new Set(obj.accessibility as unknown[]).size !== obj.accessibility.length) return false;
  for (const f of obj.accessibility as unknown[]) {
    if (typeof f !== "string" || !(ACCESSIBILITY_FEATURES as readonly string[]).includes(f)) return false;
  }
  return true;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const params = (body as Record<string, unknown>).params;
  const baselineDecisions = (body as Record<string, unknown>).baselineDecisions;

  if (!isValidParams(params) || !isValidParams(baselineDecisions)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const scenario = clampParams(params);
  const baseline = clampParams(baselineDecisions);
  const scenarioResult = simulate(scenario);
  const baselineResult = simulate(baseline);

  const { system, user } = buildInsightPrompt(
    { params: scenario, result: scenarioResult },
    { params: baseline, result: baselineResult },
  );

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await client.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
        max_tokens: 968,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      },
      { signal: AbortSignal.timeout(8000) },
    );

    const insight = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();

    if (!insight) {
      console.warn("[ai-insight] empty response");
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    return NextResponse.json({ insight });
  } catch (err) {
    console.warn("[ai-insight] error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
