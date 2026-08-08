import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
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

async function dataUrlToUint8Array(dataUrl) {
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

const PERSONAL_LABELS = {
  tempat_tanggal_lahir: "Tempat, Tanggal Lahir",
  jenis_kelamin: "Jenis Kelamin",
  status_pernikahan: "Status",
  alamat: "Alamat",
};

function personalDataRows(personalData) {
  return Object.entries(PERSONAL_LABELS)
    .map(([key, label]) => [label, personalData?.[key]?.trim()])
    .filter(([, value]) => !!value);
}

// ---------- Plain text ----------

export function cvToPlainText(cv, { mode = "ats", personalData } = {}) {
  const lines = [];
  if (cv.nama) lines.push(cv.nama.toUpperCase());
  if (cv.kontak) lines.push(cv.kontak);

  if (mode === "tradisional") {
    const rows = personalDataRows(personalData);
    if (rows.length) {
      lines.push("");
      lines.push("DATA PRIBADI");
      rows.forEach(([label, value]) => lines.push(`${label}: ${value}`));
    }
  }
  lines.push("");

  if (cv.ringkasan_profil) {
    lines.push("RINGKASAN PROFIL");
    lines.push(cv.ringkasan_profil);
    lines.push("");
  }

  if (cv.skill_utama?.length) {
    lines.push("SKILL UTAMA");
    lines.push(cv.skill_utama.join(", "));
    lines.push("");
  }

  if (cv.pengalaman?.length) {
    lines.push("PENGALAMAN KERJA");
    cv.pengalaman.forEach((p) => {
      const header = [p.posisi, p.perusahaan].filter(Boolean).join(" — ");
      lines.push(p.periode ? `${header} (${p.periode})` : header);
      (p.bullets || []).forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    });
  }

  if (cv.pendidikan?.length) {
    lines.push("PENDIDIKAN");
    cv.pendidikan.forEach((e) => {
      const header = [e.gelar, e.institusi].filter(Boolean).join(" — ");
      lines.push(e.periode ? `${header} (${e.periode})` : header);
    });
    lines.push("");
  }

  if (cv.proyek?.length) {
    lines.push("PROYEK");
    cv.proyek.forEach((p) => {
      lines.push(p.nama);
      if (p.deskripsi) lines.push(p.deskripsi);
      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

export function downloadCvAsTxt(cv, options) {
  const text = cvToPlainText(cv, options);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, "CV-Diperbaiki.txt");
}

// ---------- DOCX ----------

export async function downloadCvAsDocx(cv, { mode = "ats", personalData, photoDataUrl } = {}) {
  const children = [];
  const isTradisional = mode === "tradisional";

  const headerParas = [];
  if (cv.nama) {
    headerParas.push(
      new Paragraph({
        text: cv.nama,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.LEFT,
      })
    );
  }
  if (cv.kontak) {
    headerParas.push(
      new Paragraph({
        children: [new TextRun({ text: cv.kontak, color: "555555" })],
      })
    );
  }
  if (isTradisional) {
    const rows = personalDataRows(personalData);
    rows.forEach(([label, value]) => {
      headerParas.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 20 }),
            new TextRun({ text: value, size: 20 }),
          ],
        })
      );
    });
  }
  headerParas.push(new Paragraph({ text: "", spacing: { after: 100 } }));

  if (isTradisional && photoDataUrl) {
    const imgBytes = await dataUrlToUint8Array(photoDataUrl);
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: headerParas,
            }),
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imgBytes,
                      transformation: { width: 110, height: 140 },
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
      ],
    });
    children.push(table);
  } else {
    children.push(...headerParas);
  }

  const addHeading = (text) =>
    children.push(
      new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );

  if (cv.ringkasan_profil) {
    addHeading(isTradisional ? "Tentang Saya" : "Ringkasan Profil");
    children.push(new Paragraph({ text: cv.ringkasan_profil }));
  }

  if (cv.skill_utama?.length) {
    addHeading(isTradisional ? "Keahlian" : "Skill Utama");
    if (isTradisional) {
      cv.skill_utama.forEach((s) =>
        children.push(new Paragraph({ text: s, bullet: { level: 0 } }))
      );
    } else {
      children.push(new Paragraph({ text: cv.skill_utama.join(" · ") }));
    }
  }

  if (cv.pengalaman?.length) {
    addHeading("Pengalaman Kerja");
    cv.pengalaman.forEach((p) => {
      const header = [p.posisi, p.perusahaan].filter(Boolean).join(" — ");
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: header, bold: true }),
            ...(p.periode
              ? [new TextRun({ text: `  (${p.periode})`, italics: true, color: "777777" })]
              : []),
          ],
          spacing: { before: 160 },
        })
      );
      (p.bullets || []).forEach((b) => {
        children.push(new Paragraph({ text: b, bullet: { level: 0 } }));
      });
    });
  }

  if (cv.pendidikan?.length) {
    addHeading("Pendidikan");
    cv.pendidikan.forEach((e) => {
      const header = [e.gelar, e.institusi].filter(Boolean).join(" — ");
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: header, bold: true }),
            ...(e.periode
              ? [new TextRun({ text: `  (${e.periode})`, italics: true, color: "777777" })]
              : []),
          ],
        })
      );
    });
  }

  if (cv.proyek?.length) {
    addHeading("Proyek");
    cv.proyek.forEach((p) => {
      children.push(new Paragraph({ children: [new TextRun({ text: p.nama, bold: true })] }));
      if (p.deskripsi) children.push(new Paragraph({ text: p.deskripsi }));
    });
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, "CV-Diperbaiki.docx");
}

// ---------- PDF ----------

export async function downloadCvAsPdf(cv, { mode = "ats", personalData, photoDataUrl } = {}) {
  const isTradisional = mode === "tradisional";
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  let y = 56;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 56;
    }
  };

  const writeParagraph = (text, { size = 10.5, lineHeight = 14, maxWidth = contentWidth } = {}) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, marginX, y);
      y += lineHeight;
    });
  };

  const writeHeading = (text) => {
    ensureSpace(26);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(text.toUpperCase(), marginX, y);
    y += 4;
    doc.setDrawColor(180);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
  };

  const photoW = 85;
  const photoH = 110;
  let textAreaWidth = contentWidth;

  if (isTradisional && photoDataUrl) {
    textAreaWidth = contentWidth - photoW - 16;
    doc.addImage(photoDataUrl, "JPEG", pageWidth - marginX - photoW, y, photoW, photoH);
  }

  if (cv.nama) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(cv.nama, marginX, y + 8);
    y += 26;
  }
  doc.setFont("helvetica", "normal");
  if (cv.kontak) {
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(cv.kontak, marginX, y);
    doc.setTextColor(0);
    y += 16;
  }

  if (isTradisional) {
    const rows = personalDataRows(personalData);
    doc.setFontSize(10);
    rows.forEach(([label, value]) => {
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, marginX, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, marginX + 110, y, { maxWidth: textAreaWidth - 110 });
      y += 14;
    });
  }

  if (isTradisional && photoDataUrl) {
    y = Math.max(y, 56 + photoH + 10);
  } else {
    y += 6;
  }

  if (cv.ringkasan_profil) {
    writeHeading(isTradisional ? "Tentang Saya" : "Ringkasan Profil");
    writeParagraph(cv.ringkasan_profil);
  }

  if (cv.skill_utama?.length) {
    writeHeading(isTradisional ? "Keahlian" : "Skill Utama");
    if (isTradisional) {
      cv.skill_utama.forEach((s) => writeParagraph(`•  ${s}`));
    } else {
      writeParagraph(cv.skill_utama.join("  ·  "));
    }
  }

  if (cv.pengalaman?.length) {
    writeHeading("Pengalaman Kerja");
    cv.pengalaman.forEach((p) => {
      const header = [p.posisi, p.perusahaan].filter(Boolean).join(" — ");
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(header, marginX, y);
      if (p.periode) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120);
        doc.text(p.periode, pageWidth - marginX, y, { align: "right" });
        doc.setTextColor(0);
      }
      y += 14;
      doc.setFont("helvetica", "normal");
      (p.bullets || []).forEach((b) => writeParagraph(`•  ${b}`));
      y += 4;
    });
  }

  if (cv.pendidikan?.length) {
    writeHeading("Pendidikan");
    cv.pendidikan.forEach((e) => {
      const header = [e.gelar, e.institusi].filter(Boolean).join(" — ");
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.text(header, marginX, y);
      if (e.periode) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120);
        doc.text(e.periode, pageWidth - marginX, y, { align: "right" });
        doc.setTextColor(0);
      }
      y += 16;
      doc.setFont("helvetica", "normal");
    });
  }

  if (cv.proyek?.length) {
    writeHeading("Proyek");
    cv.proyek.forEach((p) => {
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.text(p.nama, marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      if (p.deskripsi) writeParagraph(p.deskripsi);
    });
  }

  doc.save("CV-Diperbaiki.pdf");
}
