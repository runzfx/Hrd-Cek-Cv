import { Document, Packer, Paragraph, TextRun } from "docx";
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

export function downloadLetterAsTxt(letterText, subjek) {
  const text = subjek ? `Subjek: ${subjek}\n\n${letterText}` : letterText;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, "Surat-Lamaran.txt");
}

export async function downloadLetterAsDocx(letterText, subjek) {
  const children = [];

  if (subjek) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Subjek: ", bold: true }),
          new TextRun({ text: subjek, bold: true }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  paragraphs(letterText).forEach((p) =>
    children.push(new Paragraph({ text: p, spacing: { after: 200 } }))
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

export function downloadLetterAsPdf(letterText, subjek) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const contentWidth = pageWidth - marginX * 2;
  let y = 64;

  doc.setFontSize(11);

  if (subjek) {
    doc.setFont("helvetica", "bold");
    const subjLines = doc.splitTextToSize(`Subjek: ${subjek}`, contentWidth);
    subjLines.forEach((line) => {
      doc.text(line, marginX, y);
      y += 16;
    });
    y += 10;
    doc.setFont("helvetica", "normal");
  }

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
