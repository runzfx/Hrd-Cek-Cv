import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

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

export function cvToPlainText(cv) {
  const lines = [];
  if (cv.nama) lines.push(cv.nama.toUpperCase());
  if (cv.kontak) lines.push(cv.kontak);
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

export function downloadCvAsTxt(cv) {
  const text = cvToPlainText(cv);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, "CV-Diperbaiki.txt");
}

export async function downloadCvAsDocx(cv) {
  const children = [];

  if (cv.nama) {
    children.push(
      new Paragraph({
        text: cv.nama,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.LEFT,
      })
    );
  }
  if (cv.kontak) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.kontak, color: "555555" })],
        spacing: { after: 200 },
      })
    );
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
    addHeading("Ringkasan Profil");
    children.push(new Paragraph({ text: cv.ringkasan_profil }));
  }

  if (cv.skill_utama?.length) {
    addHeading("Skill Utama");
    children.push(new Paragraph({ text: cv.skill_utama.join(" · ") }));
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
        children.push(
          new Paragraph({
            text: b,
            bullet: { level: 0 },
          })
        );
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
    sections: [
      {
        properties: {},
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, "CV-Diperbaiki.docx");
}
