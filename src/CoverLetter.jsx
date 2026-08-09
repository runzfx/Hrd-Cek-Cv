import { useState } from "react";
import {
  downloadLetterAsDocx,
  downloadLetterAsPdf,
  downloadLetterAsTxt,
} from "./coverLetterExport.js";

export default function CoverLetter({ cvText, targetPosisi }) {
  const [namaPerusahaan, setNamaPerusahaan] = useState("");
  const [infoTambahan, setInfoTambahan] = useState("");
  const [bahasa, setBahasa] = useState("id"); // "id" | "en"
  const [gaya, setGaya] = useState("resmi"); // "resmi" | "email"
  const [status, setStatus] = useState("idle"); // idle | generating | done
  const [error, setError] = useState("");
  const [letter, setLetter] = useState("");
  const [subjek, setSubjek] = useState("");
  const [copyHint, setCopyHint] = useState(false);
  const [editingLetter, setEditingLetter] = useState(false);

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
          bahasa,
          gaya,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat surat lamaran. Coba lagi.");
      }
      const data = await res.json();
      setLetter(data.surat || "");
      setSubjek(data.subjek || "");
      setStatus("done");
    } catch (err) {
      setError(err.message || "Terjadi kesalahan tak terduga.");
      setStatus("idle");
    }
  };

  const handleCopy = async () => {
    try {
      const text = subjek ? `Subjek: ${subjek}\n\n${letter}` : letter;
      await navigator.clipboard.writeText(text);
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
          <div className="toggle-row">
            <div className="format-toggle">
              <button
                className={`format-toggle__btn ${bahasa === "id" ? "format-toggle__btn--active" : ""}`}
                onClick={() => setBahasa("id")}
                disabled={status === "generating"}
              >
                🇮🇩 Indonesia
              </button>
              <button
                className={`format-toggle__btn ${bahasa === "en" ? "format-toggle__btn--active" : ""}`}
                onClick={() => setBahasa("en")}
                disabled={status === "generating"}
              >
                🇬🇧 English
              </button>
            </div>
            <div className="format-toggle">
              <button
                className={`format-toggle__btn ${gaya === "resmi" ? "format-toggle__btn--active" : ""}`}
                onClick={() => setGaya("resmi")}
                disabled={status === "generating"}
              >
                Surat Resmi
              </button>
              <button
                className={`format-toggle__btn ${gaya === "email" ? "format-toggle__btn--active" : ""}`}
                onClick={() => setGaya("email")}
                disabled={status === "generating"}
              >
                Email Singkat
              </button>
            </div>
          </div>
          <p className="format-hint">
            {gaya === "email"
              ? "Versi pendek siap tempel ke badan email, lengkap dengan subjek."
              : "Surat lamaran lengkap bergaya formal untuk dilampirkan sebagai dokumen."}
          </p>

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
            {status === "generating" ? "Menulis..." : "Buat Surat Lamaran ✍️"}
          </button>

          {error && <div className="error-box">{error}</div>}
        </>
      )}

      {status === "done" && (
        <>
          <div className="section__title-row section__title-row--inline">
            <button className="edit-toggle" onClick={() => setEditingLetter((v) => !v)}>
              {editingLetter ? "✓ Selesai Edit" : "✏️ Edit"}
            </button>
          </div>

          <div className="gen-cv-actions">
            <button className="cta cta--sm" onClick={() => downloadLetterAsPdf(letter, subjek)}>
              ⬇️ Download .pdf
            </button>
            <button className="cta cta--sm cta--ghost" onClick={() => downloadLetterAsDocx(letter, subjek)}>
              ⬇️ Download .docx
            </button>
            <button className="cta cta--sm cta--ghost" onClick={() => downloadLetterAsTxt(letter, subjek)}>
              ⬇️ Download .txt
            </button>
            <button className="cta cta--sm cta--ghost" onClick={handleCopy}>
              📋 Salin teks
            </button>
          </div>
          {copyHint && <p className="copy-hint">Surat disalin ke clipboard ✓</p>}

          {editingLetter ? (
            <div className="edit-fields">
              {subjek !== "" && (
                <>
                  <label className="edit-label">Subjek</label>
                  <input
                    className="text-input text-input--sm"
                    value={subjek}
                    onChange={(e) => setSubjek(e.target.value)}
                  />
                </>
              )}
              <label className="edit-label">Isi Surat</label>
              <textarea
                className="text-input textarea-input letter-edit-textarea"
                rows={14}
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
              />
            </div>
          ) : (
            <div className="letter-preview">
              {subjek && <div className="letter-subject">Subjek: {subjek}</div>}
              {letter.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          )}

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
