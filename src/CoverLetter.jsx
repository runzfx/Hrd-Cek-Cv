import { useState } from "react";
import {
  downloadLetterAsDocx,
  downloadLetterAsPdf,
  downloadLetterAsTxt,
} from "./coverLetterExport.js";

export default function CoverLetter({ cvText, targetPosisi }) {
  const [namaPerusahaan, setNamaPerusahaan] = useState("");
  const [infoTambahan, setInfoTambahan] = useState("");
  const [status, setStatus] = useState("idle"); // idle | generating | done
  const [error, setError] = useState("");
  const [letter, setLetter] = useState("");
  const [copyHint, setCopyHint] = useState(false);

  const handleGenerate = async () => {
    if (!namaPerusahaan.trim()) {
      setError("Nama perusahaan wajib diisi dulu ya.");
      return;
    }
    setError("");
    setStatus("generating");
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText,
          targetPosisi,
          namaPerusahaan: namaPerusahaan.trim(),
          infoTambahan: infoTambahan.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat surat lamaran. Coba lagi.");
      }
      const data = await res.json();
      setLetter(data.surat || "");
      setStatus("done");
    } catch (err) {
      setError(err.message || "Terjadi kesalahan tak terduga.");
      setStatus("idle");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopyHint(true);
      setTimeout(() => setCopyHint(false), 2000);
    } catch (e) {
      // clipboard may be unavailable; ignore silently
    }
  };

  return (
    <div className="card section">
      <div className="section__title">✉️ Buat Surat Lamaran</div>

      {status !== "done" && (
        <>
          <label className="field-label" htmlFor="perusahaan">
            🏢 Nama Perusahaan <span className="req">*wajib diisi</span>
          </label>
          <input
            id="perusahaan"
            className="text-input"
            placeholder="Contoh: PT Kopi Nusantara"
            value={namaPerusahaan}
            onChange={(e) => setNamaPerusahaan(e.target.value)}
            disabled={status === "generating"}
          />

          <label className="field-label letter-info-label" htmlFor="infoTambahan">
            Info tambahan (opsional)
          </label>
          <textarea
            id="infoTambahan"
            className="text-input textarea-input"
            placeholder="Contoh: lowongan dilihat dari Instagram, bisa mulai kerja minggu depan, dll."
            value={infoTambahan}
            onChange={(e) => setInfoTambahan(e.target.value)}
            disabled={status === "generating"}
            rows={3}
          />

          <button className="cta" onClick={handleGenerate} disabled={status === "generating"}>
            {status === "generating" && <span className="spinner" />}
            {status === "generating" ? "Menulis surat..." : "Buat Surat Lamaran ✍️"}
          </button>

          {error && <div className="error-box">{error}</div>}
        </>
      )}

      {status === "done" && (
        <>
          <div className="gen-cv-actions">
            <button className="cta cta--sm" onClick={() => downloadLetterAsPdf(letter)}>
              ⬇️ Download .pdf
            </button>
            <button className="cta cta--sm cta--ghost" onClick={() => downloadLetterAsDocx(letter)}>
              ⬇️ Download .docx
            </button>
            <button className="cta cta--sm cta--ghost" onClick={() => downloadLetterAsTxt(letter)}>
              ⬇️ Download .txt
            </button>
            <button className="cta cta--sm cta--ghost" onClick={handleCopy}>
              📋 Salin teks
            </button>
          </div>
          {copyHint && <p className="copy-hint">Surat disalin ke clipboard ✓</p>}

          <div className="letter-preview">
            {letter.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
          </div>

          <div className="reset-row">
            <button className="reset-link" onClick={() => setStatus("idle")}>
              ↺ Buat surat lain
            </button>
          </div>
        </>
      )}
    </div>
  );
}
