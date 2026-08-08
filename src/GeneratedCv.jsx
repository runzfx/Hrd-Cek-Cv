import { downloadCvAsDocx, downloadCvAsTxt, cvToPlainText } from "./cvExport.js";

export default function GeneratedCv({ cv, onCopyDone }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cvToPlainText(cv));
      onCopyDone?.();
    } catch (e) {
      // clipboard may be unavailable; ignore silently
    }
  };

  return (
    <div className="card section generated-cv">
      <div className="section__title">📝 CV yang Sudah Diperbaiki</div>

      <div className="gen-cv-actions">
        <button className="cta cta--sm" onClick={() => downloadCvAsDocx(cv)}>
          ⬇️ Download .docx
        </button>
        <button className="cta cta--sm cta--ghost" onClick={() => downloadCvAsTxt(cv)}>
          ⬇️ Download .txt
        </button>
        <button className="cta cta--sm cta--ghost" onClick={handleCopy}>
          📋 Salin teks
        </button>
      </div>

      <div className="gen-cv-preview">
        {cv.nama && <div className="gen-cv-name">{cv.nama}</div>}
        {cv.kontak && <div className="gen-cv-contact">{cv.kontak}</div>}

        {cv.ringkasan_profil && (
          <div className="gen-cv-block">
            <div className="gen-cv-heading">Ringkasan Profil</div>
            <p>{cv.ringkasan_profil}</p>
          </div>
        )}

        {cv.skill_utama?.length > 0 && (
          <div className="gen-cv-block">
            <div className="gen-cv-heading">Skill Utama</div>
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
