import { useState } from "react";
import {
  downloadCvAsDocx,
  downloadCvAsPdf,
  downloadCvAsTxt,
  cvToPlainText,
} from "./cvExport.js";

const MAX_PHOTO_MB = 5;

export default function GeneratedCv({ cv }) {
  const [mode, setMode] = useState("ats"); // "ats" | "tradisional"
  const [personalData, setPersonalData] = useState({
    tempat_tanggal_lahir: cv.data_pribadi?.tempat_tanggal_lahir || "",
    jenis_kelamin: cv.data_pribadi?.jenis_kelamin || "",
    status_pernikahan: cv.data_pribadi?.status_pernikahan || "",
    alamat: cv.data_pribadi?.alamat || "",
  });
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [copyHint, setCopyHint] = useState(false);
  const [busy, setBusy] = useState("");

  const isTradisional = mode === "tradisional";
  const exportOptions = { mode, personalData, photoDataUrl };

  const handlePhotoPick = (file) => {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("File harus berupa gambar (JPG/PNG).");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Ukuran foto maksimal ${MAX_PHOTO_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const updateField = (key, value) =>
    setPersonalData((prev) => ({ ...prev, [key]: value }));

  const handleDocx = async () => {
    setBusy("docx");
    try {
      await downloadCvAsDocx(cv, exportOptions);
    } finally {
      setBusy("");
    }
  };

  const handlePdf = async () => {
    setBusy("pdf");
    try {
      await downloadCvAsPdf(cv, exportOptions);
    } finally {
      setBusy("");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cvToPlainText(cv, exportOptions));
      setCopyHint(true);
      setTimeout(() => setCopyHint(false), 2000);
    } catch (e) {
      // clipboard may be unavailable; ignore silently
    }
  };

  return (
    <div className="card section generated-cv">
      <div className="section__title">📝 CV yang Sudah Diperbaiki</div>

      <div className="format-toggle">
        <button
          className={`format-toggle__btn ${!isTradisional ? "format-toggle__btn--active" : ""}`}
          onClick={() => setMode("ats")}
        >
          ATS-friendly
        </button>
        <button
          className={`format-toggle__btn ${isTradisional ? "format-toggle__btn--active" : ""}`}
          onClick={() => setMode("tradisional")}
        >
          Tradisional + Foto
        </button>
      </div>
      <p className="format-hint">
        {isTradisional
          ? "Cocok untuk lamaran fisik/walk-in. Termasuk foto & data pribadi."
          : "Tanpa foto & data pribadi sensitif — direkomendasikan untuk apply online lewat sistem ATS."}
      </p>

      {isTradisional && (
        <div className="tradisional-panel">
          <div className="photo-upload">
            {photoDataUrl ? (
              <div className="photo-preview">
                <img src={photoDataUrl} alt="Preview foto CV" />
                <button className="reset-link" onClick={() => setPhotoDataUrl(null)}>
                  ganti foto
                </button>
              </div>
            ) : (
              <label className="photo-upload__label">
                📷 Upload foto formal (3x4 / 4x6)
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handlePhotoPick(e.target.files?.[0])}
                />
              </label>
            )}
            {photoError && <div className="error-box">{photoError}</div>}
          </div>

          <div className="personal-fields">
            <input
              className="text-input text-input--sm"
              placeholder="Tempat, Tanggal Lahir"
              value={personalData.tempat_tanggal_lahir}
              onChange={(e) => updateField("tempat_tanggal_lahir", e.target.value)}
            />
            <input
              className="text-input text-input--sm"
              placeholder="Jenis Kelamin"
              value={personalData.jenis_kelamin}
              onChange={(e) => updateField("jenis_kelamin", e.target.value)}
            />
            <input
              className="text-input text-input--sm"
              placeholder="Status (Belum/Sudah Menikah)"
              value={personalData.status_pernikahan}
              onChange={(e) => updateField("status_pernikahan", e.target.value)}
            />
            <input
              className="text-input text-input--sm"
              placeholder="Alamat lengkap"
              value={personalData.alamat}
              onChange={(e) => updateField("alamat", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="gen-cv-actions">
        <button className="cta cta--sm" onClick={handlePdf} disabled={busy === "pdf"}>
          {busy === "pdf" ? "Menyiapkan..." : "⬇️ Download .pdf"}
        </button>
        <button className="cta cta--sm cta--ghost" onClick={handleDocx} disabled={busy === "docx"}>
          {busy === "docx" ? "Menyiapkan..." : "⬇️ Download .docx"}
        </button>
        <button className="cta cta--sm cta--ghost" onClick={() => downloadCvAsTxt(cv, exportOptions)}>
          ⬇️ Download .txt
        </button>
        <button className="cta cta--sm cta--ghost" onClick={handleCopy}>
          📋 Salin teks
        </button>
      </div>
      {copyHint && <p className="copy-hint">Teks CV disalin ke clipboard ✓</p>}

      <div className="gen-cv-preview">
        <div className="gen-cv-preview__row">
          {cv.nama && <div className="gen-cv-name">{cv.nama}</div>}
          {isTradisional && photoDataUrl && (
            <img className="gen-cv-preview__photo" src={photoDataUrl} alt="" />
          )}
        </div>
        {cv.kontak && <div className="gen-cv-contact">{cv.kontak}</div>}

        {isTradisional && (
          <div className="gen-cv-block">
            {Object.entries(personalData)
              .filter(([, v]) => v.trim())
              .map(([k, v]) => (
                <div key={k} className="gen-cv-personal-row">
                  {v}
                </div>
              ))}
          </div>
        )}

        {cv.ringkasan_profil && (
          <div className="gen-cv-block">
            <div className="gen-cv-heading">{isTradisional ? "Tentang Saya" : "Ringkasan Profil"}</div>
            <p>{cv.ringkasan_profil}</p>
          </div>
        )}

        {cv.skill_utama?.length > 0 && (
          <div className="gen-cv-block">
            <div className="gen-cv-heading">{isTradisional ? "Keahlian" : "Skill Utama"}</div>
            <div className="keyword-chips">
              {cv.skill_utama.map((s, i) => (
                <span className="keyword-chip" key={i}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {cv.pengalaman?.length > 0 && (
          <div className="gen-cv-block">
            <div className="gen-cv-heading">Pengalaman Kerja</div>
            {cv.pengalaman.map((p, i) => (
              <div className="gen-cv-entry" key={i}>
                <div className="gen-cv-entry__title">
                  {[p.posisi, p.perusahaan].filter(Boolean).join(" — ")}
                  {p.periode && <span className="gen-cv-entry__period"> · {p.periode}</span>}
                </div>
                <ul>
                  {(p.bullets || []).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {cv.pendidikan?.length > 0 && (
          <div className="gen-cv-block">
            <div className="gen-cv-heading">Pendidikan</div>
            {cv.pendidikan.map((e, i) => (
              <div className="gen-cv-entry" key={i}>
                <div className="gen-cv-entry__title">
                  {[e.gelar, e.institusi].filter(Boolean).join(" — ")}
                  {e.periode && <span className="gen-cv-entry__period"> · {e.periode}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {cv.proyek?.length > 0 && (
          <div className="gen-cv-block">
            <div className="gen-cv-heading">Proyek</div>
            {cv.proyek.map((p, i) => (
              <div className="gen-cv-entry" key={i}>
                <div className="gen-cv-entry__title">{p.nama}</div>
                {p.deskripsi && <p>{p.deskripsi}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
