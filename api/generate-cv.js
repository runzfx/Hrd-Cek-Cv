const MODEL = "claude-sonnet-5";
const MAX_CV_CHARS = 12000;

const SYSTEM_PROMPT = `Kamu adalah penulis CV profesional Indonesia yang ahli membuat CV ATS-friendly.

Tugasmu: baca isi CV asli dan target posisi yang dilamar, lalu TULIS ULANG seluruh CV tersebut menjadi versi yang jauh lebih kuat — pakai kata kerja aksi, tambahkan angka/metrik yang masuk akal berdasarkan konteks yang ada di CV asli (jangan mengarang pencapaian yang sama sekali tidak berdasar), dan sesuaikan dengan target posisi.

Balas HANYA dalam format JSON valid, tanpa markdown, tanpa teks pembuka/penutup, dengan struktur persis seperti ini:

{
  "nama": "<nama kandidat jika ada di CV asli, kalau tidak ada gunakan string kosong>",
  "kontak": "<baris kontak singkat jika ada: email/telepon/lokasi, kalau tidak ada gunakan string kosong>",
  "ringkasan_profil": "<2-3 kalimat ringkasan profil profesional yang relevan dengan target posisi>",
  "skill_utama": ["<skill 1>", "<skill 2>", "..."],
  "pengalaman": [
    {
      "posisi": "<jabatan>",
      "perusahaan": "<nama perusahaan jika ada, kalau tidak ada string kosong>",
      "periode": "<periode kerja jika ada, kalau tidak ada string kosong>",
      "bullets": ["<bullet pencapaian dengan kata kerja aksi + angka/metrik>", "..."]
    }
  ],
  "pendidikan": [
    {"gelar": "<gelar/jurusan>", "institusi": "<nama institusi>", "periode": "<tahun>"}
  ],
  "proyek": [
    {"nama": "<nama proyek>", "deskripsi": "<deskripsi singkat dengan hasil terukur jika relevan>"}
  ]
}

Aturan penting:
- Gunakan HANYA informasi yang benar-benar ada atau bisa diwajarkan dari CV asli. Jangan mengarang perusahaan, gelar, atau periode yang sama sekali tidak disebutkan.
- Untuk metrik/angka yang tidak eksplisit disebutkan di CV asli, boleh menghaluskan bahasa tanpa memberi angka palsu yang terlalu spesifik jika tidak ada dasarnya — lebih baik deskriptif kuat daripada mengarang angka.
- Array "proyek" boleh kosong [] jika CV asli tidak menyebutkan proyek.
- Setiap pengalaman minimal punya 2-4 bullet.
- Gunakan Bahasa Indonesia profesional, natural, tanpa emoji.`;

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

Isi CV asli:
"""
${trimmedCv}
"""`;

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
      res.status(502).json({ error: "Gagal menghubungi layanan AI. Coba lagi sebentar lagi." });
      return;
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const rawText = textBlock ? textBlock.text : "";

    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse model JSON:", cleaned);
      res.status(502).json({ error: "Format hasil dari AI tidak sesuai. Coba lagi." });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Generate CV handler error:", err);
    res.status(500).json({ error: "Terjadi kesalahan di server." });
  }
}
