const MODEL = "claude-sonnet-5";
const MAX_CV_CHARS = 12000;

const SYSTEM_PROMPT = `Kamu adalah "Mas Erdi", seorang HR/recruiter senior asal Indonesia yang dikenal galak, sarkastik, dan blak-blakan saat me-roasting CV — tapi setiap kritiknya SELALU actionable dan membangun, bukan cuma menghina.

Tugasmu: baca isi CV dan target posisi yang dilamar, lalu berikan analisis dalam gaya roasting yang tajam tapi tetap membantu.

Balas HANYA dalam format JSON valid, tanpa markdown, tanpa teks pembuka/penutup, dengan struktur persis seperti ini:

{
  "skor": <angka 0-100, estimasi skor ATS & kekuatan CV>,
  "ringkasan_roasting": "<2-4 kalimat roasting singkat bergaya sarkas tapi jelas, dalam Bahasa Indonesia>",
  "kekuatan": ["<poin kekuatan CV, 3-5 item, singkat>"],
  "kelemahan": ["<poin kelemahan/hal yang di-roasting, 3-6 item, sarkas tapi actionable>"],
  "perbaikan_bullet": [
    {"before": "<contoh kalimat asli/mirip dari CV yang lemah>", "after": "<versi perbaikan dengan kata kerja aksi + angka/metrik>"}
  ],
  "kata_kunci_hilang": ["<3-8 keyword relevan dengan target posisi yang tidak ditemukan di CV>"]
}

Aturan penting:
- perbaikan_bullet harus berisi 2-3 item, diambil/diadaptasi dari isi CV asli, bukan mengarang total.
- Skor harus realistis berdasarkan isi CV: struktur, penggunaan angka/metrik, relevansi dengan target posisi, dan kepatuhan pada praktik ATS-friendly.
- Jangan menyebut ras, agama, usia, status pernikahan, atau atribut sensitif lain dalam analisis.
- Gunakan Bahasa Indonesia yang natural.`;

function extractJson(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  // If the model added stray text before/after the JSON object, slice to the
  // outermost braces before attempting to parse.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const sliced = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(sliced);
}

async function callAnthropic(apiKey, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Anthropic API error:", response.status, errBody);
    throw new Error("API_ERROR");
  }

  const data = await response.json();
  if (data.stop_reason === "max_tokens") {
    console.error("Response truncated by max_tokens");
  }
  const textBlock = (data.content || []).find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server belum dikonfigurasi (API key hilang)." });
    return;
  }

  try {
    const { cvText, targetPosisi } = req.body || {};

    if (!cvText || typeof cvText !== "string" || cvText.trim().length < 40) {
      res.status(400).json({ error: "Teks CV tidak valid atau terlalu pendek." });
      return;
    }
    if (!targetPosisi || typeof targetPosisi !== "string") {
      res.status(400).json({ error: "Target posisi wajib diisi." });
      return;
    }

    const trimmedCv = cvText.slice(0, MAX_CV_CHARS);

    const userMessage = `Target posisi/pekerjaan: ${targetPosisi.slice(0, 200)}

Isi CV:
"""
${trimmedCv}
"""`;

    let rawText;
    try {
      rawText = await callAnthropic(apiKey, userMessage);
    } catch (e) {
      res.status(502).json({ error: "Gagal menghubungi layanan AI. Coba lagi sebentar lagi." });
      return;
    }

    let parsed;
    try {
      parsed = extractJson(rawText);
    } catch (e) {
      console.error("Failed to parse model JSON, retrying once. Raw:", rawText);
      try {
        rawText = await callAnthropic(apiKey, userMessage);
        parsed = extractJson(rawText);
      } catch (e2) {
        console.error("Retry also failed. Raw:", rawText);
        res.status(502).json({ error: "Format hasil dari AI tidak sesuai. Coba upload ulang." });
        return;
      }
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Roast handler error:", err);
    res.status(500).json({ error: "Terjadi kesalahan di server." });
  }
}
