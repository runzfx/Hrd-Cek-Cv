import { useRef, useState } from "react";
import {
  downloadCvAsDocx,
  downloadCvAsPdf,
  downloadCvAsTxt,
  cvToPlainText,
} from "./cvExport.js";
import { downloadNodeAsPng } from "./htmlToPng.js";

const MAX_PHOTO_MB = 5;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function emptyPengalaman() {
  return { posisi: "", perusahaan: "", periode: "", bullets: [""] };
}
function emptyPendidikan() {
  return { gelar: "", institusi: "", periode: "" };
}
function emptyProyek() {
  return { nama: "", deskripsi: "" };
}

export default function GeneratedCv({ cv }) {
  const [cvData, setCvData] = useState(() => deepClone(cv));
  const [editMode, setEditMode] = useState(false);

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
  const previewRef = useRef(null);

  const isTradisional = mode === "tradisional";
  const exportOptions = { mode, personalData, photoDataUrl };

  // ---------- field updates ----------

  const updateTop = (key, value) => setCvData((prev) => ({ ...prev, [key]: value }));

  const updateSkills = (text) =>
    setCvData((prev) => ({
      ...prev,
      skill_utama: text.split(",").map((s) => s.trim()).filter(Boolean),
    }));

  const updatePengalaman = (index, key, value) =>
    setCvData((prev) => {
      const list = [...prev.pengalaman];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, pengalaman: list };
    });

  const updatePengalamanBullets = (index, text) =>
    setCvData((prev) => {
      const list = [...prev.pengalaman];
      list[index] = { ...list[index], bullets: text.split("\n") };
      return { ...prev, pengalaman: list };
    });

  const addPengalaman = () =>
    setCvData((prev) => ({ ...prev, pengalaman: [...(prev.pengalaman || []), emptyPengalaman()] }));

  const removePengalaman = (index) =>
    setCvData((prev) => ({
      ...prev,
      pengalaman: prev.pengalaman.filter((_, i) => i !== index),
    }));

  const updatePendidikan = (index, key, value) =>
    setCvData((prev) => {
      const list = [...prev.pendidikan];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, pendidikan: list };
    });

  const addPendidikan = () =>
    setCvData((prev) => ({ ...prev, pendidikan: [...(prev.pendidikan || []), emptyPendidikan()] }));

  const removePendidikan = (index) =>
    setCvData((prev) => ({
      ...prev,
      pendidikan: prev.pendidikan.filter((_, i) => i !== index),
    }));

  const updateProyek = (index, key, value) =>
    setCvData((prev) => {
      const list = [...prev.proyek];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, proyek: list };
    });

  const addProyek = () =>
    setCvData((prev) => ({ ...prev, proyek: [...(prev.proyek || []), emptyProyek()] }));

  const removeProyek = (index) =>
    setCvData((prev) => ({
      ...prev,
      proyek: prev.proyek.filter((_, i) => i !== index),
    }));

  // ---------- photo / personal fields ----------

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

  const updatePersonalField = (key, value) =>
    setPersonalData((prev) => ({ ...prev, [key]: value }));

  // ---------- export ----------

  const handleDocx = async () => {
    setBusy("docx");
    try {
      await downloadCvAsDocx(cvData, exportOptions);
    } finally {
      setBusy("");
    }
  };

  const handlePdf = async () => {
    setBusy("pdf");
    try {
      await downloadCvAsPdf(cvData, exportOptions);
    } finally {
      setBusy("");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cvToPlainText(cvData, exportOptions));
      setCopyHint(true);
      setTimeout(() => setCopyHint(false), 2000);
    } catch (e) {
      // clipboard may be unavailable; ignore silently
    }
  };

  const handlePng = async () => {
    setBusy("png");
    try {
      await downloadNodeAsPng(previewRef.current, "CV-Diperbaiki.png");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="card section generated-cv">
      <div className="section__title-row">
        <div className="section__title">📝 CV yang Sudah Diperbaiki</div>
        <button className="edit-toggle" onClick={() => setEditMode((v) => !v)}>
          {editMode ? "✓ Selesai Edit" : "✏️ Edit"}
        </button>
      </div>

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
              onChange={(e) => updatePersonalField("tempat_tanggal_lahir", e.target.value)}
            />
            <input
              className="text-input text-input--sm"
              placeholder="Jenis Kelamin"
              value={personalData.jenis_kelamin}
              onChange={(e) => updatePersonalField("jenis_kelamin", e.target.value)}
            />
            <input
              className="text-input text-input--sm"
              placeholder="Status (Belum/Sudah Menikah)"
              value={personalData.status_pernikahan}
              onChange={(e) => updatePersonalField("status_pernikahan", e.target.value)}
            />
            <input
              className="text-input text-input--sm"
              placeholder="Alamat lengkap"
              value={personalData.alamat}
              onChange={(e) => updatePersonalField("alamat", e.target.value)}
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
        <button className="cta cta--sm cta--ghost" onClick={() => downloadCvAsTxt(cvData, exportOptions)}>
          ⬇️ Download .txt
        </button>
        <button className="cta cta--sm cta--ghost" onClick={handlePng} disabled={busy === "png" || editMode} title={editMode ? "Selesai edit dulu ya" : ""}>
          {busy === "png" ? "Menyiapkan..." : "🖼️ Download .png"}
        </button>
        <button className="cta cta--sm cta--ghost" onClick={handleCopy}>
          📋 Salin teks
        </button>
      </div>
      {copyHint && <p className="copy-hint">Teks CV disalin ke clipboard ✓</p>}

      <div className="gen-cv-preview" ref={previewRef}>
        {editMode ? (
          <div className="edit-fields">
            <label className="edit-label">Nama</label>
            <input
              className="text-input text-input--sm"
              value={cvData.nama || ""}
              onChange={(e) => updateTop("nama", e.target.value)}
            />

            <label className="edit-label">Kontak</label>
            <input
              className="text-input text-input--sm"
              value={cvData.kontak || ""}
              onChange={(e) => updateTop("kontak", e.target.value)}
            />

            <label className="edit-label">{isTradisional ? "Tentang Saya" : "Ringkasan Profil"}</label>
            <textarea
              className="text-input textarea-input"
              rows={3}
              value={cvData.ringkasan_profil || ""}
              onChange={(e) => updateTop("ringkasan_profil", e.target.value)}
            />

            <label className="edit-label">{isTradisional ? "Keahlian" : "Skill Utama"} (pisahkan dengan koma)</label>
            <textarea
              className="text-input textarea-input"
              rows={2}
              value={(cvData.skill_utama || []).join(", ")}
              onChange={(e) => updateSkills(e.target.value)}
            />

            <div className="edit-block-header">
              <label className="edit-label">Pengalaman Kerja</label>
              <button className="edit-add-btn" onClick={addPengalaman}>
                + Tambah
              </button>
            </div>
            {(cvData.pengalaman || []).map((p, i) => (
              <div className="edit-entry" key={i}>
                <div className="edit-entry__row">
                  <input
                    className="text-input text-input--sm"
                    placeholder="Posisi"
                    value={p.posisi || ""}
                    onChange={(e) => updatePengalaman(i, "posisi", e.target.value)}
                  />
                  <button className="edit-remove-btn" onClick={() => removePengalaman(i)}>
                    🗑
                  </button>
                </div>
                <input
                  className="text-input text-input--sm"
                  placeholder="Perusahaan"
                  value={p.perusahaan || ""}
                  onChange={(e) => updatePengalaman(i, "perusahaan", e.target.value)}
                />
                <input
                  className="text-input text-input--sm"
                  placeholder="Periode (contoh: 2022 - 2024)"
                  value={p.periode || ""}
                  onChange={(e) => updatePengalaman(i, "periode", e.target.value)}
                />
                <textarea
                  className="text-input textarea-input"
                  placeholder="Bullet pencapaian, satu per baris"
                  rows={3}
                  value={(p.bullets || []).join("\n")}
                  onChange={(e) => updatePengalamanBullets(i, e.target.value)}
                />
              </div>
            ))}

            <div className="edit-block-header">
              <label className="edit-label">Pendidikan</label>
              <button className="edit-add-btn" onClick={addPendidikan}>
                + Tambah
              </button>
            </div>
            {(cvData.pendidikan || []).map((e, i) => (
              <div className="edit-entry" key={i}>
                <div className="edit-entry__row">
                  <input
                    className="text-input text-input--sm"
                    placeholder="Gelar/Jurusan"
                    value={e.gelar || ""}
                    onChange={(ev) => updatePendidikan(i, "gelar", ev.target.value)}
                  />
                  <button className="edit-remove-btn" onClick={() => removePendidikan(i)}>
                    🗑
                  </button>
                </div>
                <input
                  className="text-input text-input--sm"
                  placeholder="Institusi"
                  value={e.institusi || ""}
                  onChange={(ev) => updatePendidikan(i, "institusi", ev.target.value)}
                />
                <input
                  className="text-input text-input--sm"
                  placeholder="Periode"
                  value={e.periode || ""}
                  onChange={(ev) => updatePendidikan(i, "periode", ev.target.value)}
                />
              </div>
            ))}

            <div className="edit-block-header">
              <label className="edit-label">Proyek</label>
              <button className="edit-add-btn" onClick={addProyek}>
                + Tambah
              </button>
            </div>
            {(cvData.proyek || []).map((p, i) => (
              <div className="edit-entry" key={i}>
                <div className="edit-entry__row">
                  <input
                    className="text-input text-input--sm"
                    placeholder="Nama proyek"
                    value={p.nama || ""}
                    onChange={(e) => updateProyek(i, "nama", e.target.value)}
                  />
                  <button className="edit-remove-btn" onClick={() => removeProyek(i)}>
                    🗑
                  </button>
                </div>
                <textarea
                  className="text-input textarea-input"
                  placeholder="Deskripsi"
                  rows={2}
                  value={p.deskripsi || ""}
                  onChange={(e) => updateProyek(i, "deskripsi", e.target.value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="gen-cv-preview__row">
              {cvData.nama && <div className="gen-cv-name">{cvData.nama}</div>}
              {isTradisional && photoDataUrl && (
                <img className="gen-cv-preview__photo" src={photoDataUrl} alt="" />
              )}
            </div>
            {cvData.kontak && <div className="gen-cv-contact">{cvData.kontak}</div>}

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

            {cvData.ringkasan_profil && (
              <div className="gen-cv-block">
                <div className="gen-cv-heading">{isTradisional ? "Tentang Saya" : "Ringkasan Profil"}</div>
                <p>{cvData.ringkasan_profil}</p>
              </div>
            )}

            {cvData.skill_utama?.length > 0 && (
              <div className="gen-cv-block">
                <div className="gen-cv-heading">{isTradisional ? "Keahlian" : "Skill Utama"}</div>
                <div className="keyword-chips">
                  {cvData.skill_utama.map((s, i) => (
                    <span className="keyword-chip" key={i}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cvData.pengalaman?.length > 0 && (
              <div className="gen-cv-block">
                <div className="gen-cv-heading">Pengalaman Kerja</div>
                {cvData.pengalaman.map((p, i) => (
                  <div className="gen-cv-entry" key={i}>
                    <div className="gen-cv-entry__title">
                      {[p.posisi, p.perusahaan].filter(Boolean).join(" — ")}
                      {p.periode && <span className="gen-cv-entry__period"> · {p.periode}</span>}
                    </div>
                    <ul>
                      {(p.bullets || []).filter(Boolean).map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {cvData.pendidikan?.length > 0 && (
              <div className="gen-cv-block">
                <div className="gen-cv-heading">Pendidikan</div>
                {cvData.pendidikan.map((e, i) => (
                  <div className="gen-cv-entry" key={i}>
                    <div className="gen-cv-entry__title">
                      {[e.gelar, e.institusi].filter(Boolean).join(" — ")}
                      {e.periode && <span className="gen-cv-entry__period"> · {e.periode}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cvData.proyek?.length > 0 && (
              <div className="gen-cv-block">
                <div className="gen-cv-heading">Proyek</div>
                {cvData.proyek.map((p, i) => (
                  <div className="gen-cv-entry" key={i}>
                    <div className="gen-cv-entry__title">{p.nama}</div>
                    {p.deskripsi && <p>{p.deskripsi}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
