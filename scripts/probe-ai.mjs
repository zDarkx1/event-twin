/**
 * Probe upstream AI gateway — memisahkan "host tidak menjawab" dari "model lambat".
 * Jalankan: node --env-file=.env scripts/probe-ai.mjs
 * Hapus file ini setelah masalah beres; ini alat diagnosis, bukan bagian produk.
 */
const key = process.env.NEW_API_KEY || process.env.ANTHROPIC_API_KEY;
const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

if (!key) {
  console.error("NEW_API_KEY tidak terbaca. Jalankan dengan: node --env-file=.env scripts/probe-ai.mjs");
  process.exit(1);
}
console.log(`base=${base} model=${model} keylen=${key.length}`);

async function probe(label, path, headers, body, ms = 45_000) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ms),
    });
    const text = await res.text();
    console.log(`\n[${label}] ${res.status} ${res.statusText} in ${Date.now() - t0}ms`);
    console.log(text.slice(0, 400));
  } catch (err) {
    console.log(`\n[${label}] GAGAL in ${Date.now() - t0}ms — ${err.name}: ${err.message}`);
  }
}

const msgs = [{ role: "user", content: "hi" }];

// 1) OpenAI-compatible, Bearer — bentuk yang dipakai route sekarang.
await probe("chat/completions Bearer", "/v1/chat/completions",
  { authorization: `Bearer ${key}` }, { model, messages: msgs, max_tokens: 16 });

// 2) Sama, tapi streaming. Kalau ini jalan dan (1) hang, gateway hanya melayani stream.
await probe("chat/completions stream", "/v1/chat/completions",
  { authorization: `Bearer ${key}` }, { model, messages: msgs, max_tokens: 16, stream: true });

// 3) Skema Anthropic Messages, x-api-key — untuk memastikan bentuk mana yang dilayani.
await probe("messages x-api-key", "/v1/messages",
  { "x-api-key": key, "anthropic-version": "2023-06-01" },
  { model, messages: msgs, max_tokens: 16 });
