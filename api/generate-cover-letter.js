const MODEL = "claude-sonnet-5";
const MAX_CV_CHARS = 12000;

const SYSTEM_PROMPT = `Kamu adalah penulis surat lamaran kerja profesional Bahasa Indonesia yang formal, meyakinkan, dan personal (tidak generik/template kosong).

Tugasmu: berdasarkan isi CV, target posisi, nama perusahaan, dan info tambahan (jika ada), tulis SATU surat lamaran kerja lengkap dalam Bahasa Indonesia baku dan formal.

Struktur surat:
1. "Kepada Yth. Bagian Sumber Daya Manusia [Nama Perusahaan]" (tanpa tempat/tanggal, itu akan diisi user sendiri)
2. "Perihal: Lamaran Pekerjaan sebagai [posisi]"
3. Salam pembuka ("Dengan hormat,")
4. Paragraf pembuka singkat: menyatakan maksud melamar posisi tersebut
5. Paragraf isi (1-2 paragraf): kualifikasi & pengalaman relevan yang diambil dari CV, dikaitkan langsung dengan kebutuhan posisi yang dilamar — jangan generik, harus terasa personal berdasarkan isi CV asli
6. Paragraf penutup: harapan untuk wawancara, ucapan terima kasih
7. Salam penutup ("Hormat saya,") diikuti nama kandidat (jika ada di CV)

Balas HANYA dalam format JSON valid, tanpa markdown, tanpa teks pembuka/penutup, dengan struktur persis seperti ini:

{
  "surat": "<isi lengkap surat lamaran, gunakan \\n\\n untuk pemisah antar paragraf>"
}

Aturan penting:
- Gunakan HANYA informasi yang benar-benar ada di CV asli untuk kualifikasi/pengalaman. Jangan mengarang pencapaian yang tidak ada dasarnya.
- Nada profesional, percaya diri, tapi tidak berlebihan/bombastis.
- Jangan gunakan emoji.
- Total surat sekitar 250-400 kata.`;

function extractJson(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
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
      max_tokens: 1800,
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
    const { cvText, targetPosisi, namaPerusahaan, infoTambahan } = req.body || {};

    if (!cvText || typeof cvText !== "string" || cvText.trim().length < 40) {
      res.status(400).json({ error: "Teks CV tidak valid atau terlalu pendek." });
      return;
    }
    if (!targetPosisi || typeof targetPosisi !== "string") {
      res.status(400).json({ error: "Target posisi wajib diisi." });
      return;
    }
    if (!namaPerusahaan || typeof namaPerusahaan !== "string" || !namaPerusahaan.trim()) {
      res.status(400).json({ error: "Nama perusahaan wajib diisi." });
      return;
    }

    const trimmedCv = cvText.slice(0, MAX_CV_CHARS);
    const safeInfo = (infoTambahan || "").toString().slice(0, 500).trim();

    const userMessage = `Target posisi/pekerjaan: ${targetPosisi.slice(0, 200)}
Nama perusahaan: ${namaPerusahaan.slice(0, 200)}
${safeInfo ? `Info tambahan dari pelamar: ${safeInfo}` : ""}

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
        res.status(502).json({ error: "Format hasil dari AI tidak sesuai. Coba lagi." });
        return;
      }
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Cover letter handler error:", err);
    res.status(500).json({ error: "Terjadi kesalahan di server." });
  }
}
