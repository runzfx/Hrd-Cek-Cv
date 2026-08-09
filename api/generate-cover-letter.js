const MODEL = "claude-sonnet-5";
const MAX_CV_CHARS = 12000;

function buildSystemPrompt(bahasa, gaya) {
  const isEnglish = bahasa === "en";
  const isEmail = gaya === "email";

  if (isEnglish && isEmail) {
    return `You are a professional career writer who writes concise, warm, professional job application emails in English.

Task: based on the candidate's CV, target position, company name, and any extra notes, write ONE short email body suitable for pasting directly into an email client (not a formal letter), plus a short subject line.

Structure:
- A brief, specific subject line (e.g. "Application for [Position] — [Candidate Name]")
- A short greeting ("Dear Hiring Manager," or "Hi [Company] Team,")
- 1 short opening sentence stating intent to apply
- 1-2 short paragraphs (or a few sentences) highlighting relevant qualifications from the CV, tied directly to the role — personal, not generic
- A brief closing sentence mentioning attached CV/resume and availability for interview
- Sign-off ("Best regards," / "Kind regards,") followed by the candidate's name if available in the CV

Reply ONLY in valid JSON, no markdown, no extra text, with exactly this structure:

{
  "subjek": "<short email subject line>",
  "surat": "<full email body, use \\n\\n to separate paragraphs>"
}

Important rules:
- Use ONLY information actually present in the original CV. Do not invent achievements.
- Tone: professional but conversational, concise (roughly 120-200 words total for the body).
- No emoji.`;
  }

  if (isEnglish && !isEmail) {
    return `You are a professional cover letter writer who writes formal, persuasive, personal (not generic) English cover letters.

Task: based on the candidate's CV, target position, company name, and any extra notes, write ONE complete formal cover letter in professional English.

Structure:
1. "Dear Hiring Manager," or "Dear [Company Name] Hiring Team," (no date/address, the user will fill that in themselves)
2. Opening paragraph: state the position being applied for and where interest comes from
3. Body paragraph(s) (1-2): relevant qualifications and experience drawn from the CV, tied directly to the role's needs — must feel personal, based on the actual CV content, not generic
4. Closing paragraph: express interest in an interview, thank the reader
5. Sign-off ("Sincerely," / "Best regards,") followed by the candidate's name if available in the CV

Reply ONLY in valid JSON, no markdown, no extra text, with exactly this structure:

{
  "subjek": "",
  "surat": "<full cover letter, use \\n\\n to separate paragraphs>"
}

Important rules:
- Use ONLY information actually present in the original CV. Do not invent achievements that have no basis.
- Tone: professional, confident, not overblown.
- No emoji.
- Total length roughly 250-400 words.`;
  }

  if (!isEnglish && isEmail) {
    return `Kamu adalah penulis profesional yang menulis email lamaran kerja singkat, hangat, dan profesional dalam Bahasa Indonesia.

Tugasmu: berdasarkan isi CV, target posisi, nama perusahaan, dan info tambahan (jika ada), tulis SATU isi email lamaran yang singkat, siap tempel langsung ke badan email (bukan surat resmi panjang), plus subjek email singkat.

Struktur:
- Subjek email singkat dan spesifik (misal "Lamaran Posisi [Posisi] — [Nama Kandidat]")
- Salam pembuka singkat ("Halo Tim HRD [Nama Perusahaan]," atau "Selamat siang,")
- 1 kalimat pembuka menyatakan maksud melamar
- 1-2 paragraf pendek (atau beberapa kalimat) menonjolkan kualifikasi relevan dari CV, dikaitkan langsung dengan posisi — personal, bukan generik
- Kalimat penutup singkat, menyebut CV terlampir dan kesediaan untuk wawancara
- Salam penutup ("Terima kasih," / "Hormat saya,") diikuti nama kandidat jika ada di CV

Balas HANYA dalam format JSON valid, tanpa markdown, tanpa teks tambahan, dengan struktur persis seperti ini:

{
  "subjek": "<subjek email singkat>",
  "surat": "<isi lengkap email, gunakan \\n\\n untuk pemisah antar paragraf>"
}

Aturan penting:
- Gunakan HANYA informasi yang benar-benar ada di CV asli. Jangan mengarang pencapaian.
- Nada profesional tapi mengalir seperti email biasa, ringkas (total isi sekitar 120-200 kata).
- Jangan gunakan emoji.`;
  }

  // Indonesian, formal letter (default)
  return `Kamu adalah penulis surat lamaran kerja profesional Bahasa Indonesia yang formal, meyakinkan, dan personal (tidak generik/template kosong).

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
  "subjek": "",
  "surat": "<isi lengkap surat lamaran, gunakan \\n\\n untuk pemisah antar paragraf>"
}

Aturan penting:
- Gunakan HANYA informasi yang benar-benar ada di CV asli untuk kualifikasi/pengalaman. Jangan mengarang pencapaian yang tidak ada dasarnya.
- Nada profesional, percaya diri, tapi tidak berlebihan/bombastis.
- Jangan gunakan emoji.
- Total surat sekitar 250-400 kata.`;
}

function extractJson(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const sliced = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(sliced);
}

async function callAnthropic(apiKey, systemPrompt, userMessage) {
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
      system: systemPrompt,
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
    const {
      cvText,
      targetPosisi,
      namaPerusahaan,
      infoTambahan,
      bahasa = "id",
      gaya = "resmi",
    } = req.body || {};

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

    const safeBahasa = bahasa === "en" ? "en" : "id";
    const safeGaya = gaya === "email" ? "email" : "resmi";

    const trimmedCv = cvText.slice(0, MAX_CV_CHARS);
    const safeInfo = (infoTambahan || "").toString().slice(0, 500).trim();

    const userMessage = `Target posisi/pekerjaan: ${targetPosisi.slice(0, 200)}
Nama perusahaan: ${namaPerusahaan.slice(0, 200)}
${safeInfo ? `Info tambahan dari pelamar: ${safeInfo}` : ""}

Isi CV:
"""
${trimmedCv}
"""`;

    const systemPrompt = buildSystemPrompt(safeBahasa, safeGaya);

    let rawText;
    try {
      rawText = await callAnthropic(apiKey, systemPrompt, userMessage);
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
        rawText = await callAnthropic(apiKey, systemPrompt, userMessage);
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
