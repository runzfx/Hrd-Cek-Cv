import { Document, Packer, Paragraph } from "docx";
import { jsPDF } from "jspdf";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function paragraphs(letterText) {
  return letterText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export function downloadLetterAsTxt(letterText) {
  const blob = new Blob([letterText], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, "Surat-Lamaran.txt");
}

export async function downloadLetterAsDocx(letterText) {
  const children = paragraphs(letterText).map(
    (p) => new Paragraph({ text: p, spacing: { after: 200 } })
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, "Surat-Lamaran.docx");
}

export function downloadLetterAsPdf(letterText) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const contentWidth = pageWidth - marginX * 2;
  let y = 64;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  paragraphs(letterText).forEach((p) => {
    const lines = doc.splitTextToSize(p, contentWidth);
    lines.forEach((line) => {
      if (y > pageHeight - 56) {
        doc.addPage();
        y = 64;
      }
      doc.text(line, marginX, y);
      y += 16;
    });
    y += 10;
  });

  doc.save("Surat-Lamaran.pdf");
}
