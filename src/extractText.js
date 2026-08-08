import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MAX_CHARS = 12000;

async function extractFromPdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  const maxPages = Math.min(pdf.numPages, 8);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n\n";
  }
  return text;
}

async function extractFromDocx(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

export async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  let raw = "";
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    raw = await extractFromPdf(arrayBuffer);
  } else if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    raw = await extractFromDocx(arrayBuffer);
  } else {
    throw new Error("Format file tidak didukung. Gunakan PDF atau DOCX.");
  }

  const cleaned = raw.replace(/\s+/g, " ").trim();

  if (cleaned.length < 40) {
    throw new Error(
      "Teks tidak bisa diekstrak dari file ini. Kemungkinan CV berupa hasil scan/gambar tanpa layer teks."
    );
  }

  return cleaned.slice(0, MAX_CHARS);
}
