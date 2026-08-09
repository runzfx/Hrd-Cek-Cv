import { useCallback, useRef, useState } from "react";
import { extractTextFromFile } from "./extractText.js";
import FlameGauge from "./FlameGauge.jsx";
import GeneratedCv from "./GeneratedCv.jsx";
import CoverLetter from "./CoverLetter.jsx";
import { downloadNodeAsPng } from "./htmlToPng.js";

const ACCEPTED = [".pdf", ".docx"];
const MAX_SIZE_MB = 10;

export default function App() {
  const [file, setFile] = useState(null);
  const [targetPosisi, setTargetPosisi] = useState("");
  const [lowonganUrl, setLowonganUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | extracting | roasting | done
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const [extractedText, setExtractedText] = useState("");
  const [genStatus, setGenStatus] = useState("idle"); // idle | generating | done
  const [genError, setGenError] = useState("");
  const [generatedCv, setGeneratedCv] = useState(null);
  const roastCardRef = useRef(null);
  const [pngBusy, setPngBusy] = useState(false);

  const handleDownloadRoastPng = async () => {
    setPngBusy(true);
    try {
      await downloadNodeAsPng(roastCardRef.current, "Hasil-Roasting-CV.png");
    } finally {
      setPngBusy(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setTargetPosisi("");
    setLowonganUrl("");
    setStatus("idle");
    setError("");
    setResult(null);
    setExtractedText("");
    setGenStatus("idle");
    setGenError("");
    setGeneratedCv(null);
  };

  const handleGenerateCv = async () => {
    if (!extractedText || !targetPosisi) return;
    setGenError("");
    setGenStatus("generating");
    try {
      const res = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: extractedText, targetPosisi, jobUrl: lowonganUrl.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat CV baru. Coba lagi.");
      }
      const data = await res.json();
      setGeneratedCv(data);
      setGenStatus("done");
    } catch (err) {
      setGenError(err.message || "Terjadi kesalahan tak terduga.");
      setGenStatus("idle");
    }
  };

  const onPickFile = (f) => {
    setError("");
    if (!f) return;
    const nameLower = f.name.toLowerCase();
    const validExt = ACCEPTED.some((ext) => nameLower.endsWith(ext));
    if (!validExt) {
      setError("Format tidak didukung. Upload file PDF atau DOCX ya.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File terlalu besar. Maksimal ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    onPickFile(f);
  }, []);

  const handleSubmit = async () => {
    if (!file) {
      setError("Upload CV kamu dulu.");
      return;
    }
    if (!targetPosisi.trim()) {
      setError("Isi target posisi/pekerjaan dulu ya, biar roasting-nya relevan.");
      return;
    }
    setError("");
    try {
      setStatus("extracting");
      const cvText = await extractTextFromFile(file);
      setExtractedText(cvText);

      setStatus("roasting");
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText,
          targetPosisi: targetPosisi.trim(),
          jobUrl: lowonganUrl.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal memproses roasting. Coba lagi.");
      }

      const data = await res.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err.message || "Terjadi kesalahan tak terduga.");
      setStatus("idle");
    }
  };

  const isBusy = status === "extracting" || status === "roasting";

  return (
    <div className="page">
      <div className="topbar">
        <span className="topbar__mark">🔥</span>
        <span className="topbar__name">CV Roasting</span>
        <span className="topbar__badge">AI Powered</span>
      </div>

      {status !== "done" && (
        <>
          <div className="hero">
            <span className="hero__eyebrow">Sebelum HR yang nolak</span>
            <h1 className="hero__title">
              Biar <em>AI yang bakar</em> CV-mu duluan
            </h1>
            <p className="hero__sub">
              Upload CV, kasih tahu posisi incaranmu, dan dapatkan kritik tajam
              yang langsung bisa dipakai buat perbaikan — bukan sekadar
              "sudah bagus".
            </p>
          </div>

          <div className="card">
            <label className="field-label" htmlFor="posisi">
              🎯 Target Posisi / Pekerjaan <span className="req">*wajib diisi</span>
            </label>
            <input
              id="posisi"
              className="text-input"
              placeholder="Contoh: Frontend Developer, Data Analyst..."
              value={targetPosisi}
              onChange={(e) => setTargetPosisi(e.target.value)}
              disabled={isBusy}
            />

            <label className="field-label letter-info-label" htmlFor="lowonganUrl">
              🔗 Link Lowongan (opsional)
            </label>
            <input
              id="lowonganUrl"
              className="text-input"
              placeholder="Tempel link lowongan (JobStreet, Glints, dll)"
              value={lowonganUrl}
              onChange={(e) => setLowonganUrl(e.target.value)}
              disabled={isBusy}
            />
            <p className="format-hint">
              Kalau diisi, analisis dibandingkan langsung ke requirement di lowongan
              itu — lebih akurat daripada cuma nama posisi. Beberapa situs (LinkedIn,
              Instagram) kadang gagal dibaca otomatis karena butuh login.
            </p>

            <div
              className={`dropzone ${dragActive ? "dropzone--active" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                hidden
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              {file ? (
                <div className="dropzone__file">
                  <span>📄 {file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    ganti
                  </button>
                </div>
              ) : (
                <>
                  <span className="dropzone__icon">⬆️</span>
                  <div className="dropzone__title">
                    Seret & taruh CV di sini, atau klik untuk pilih file
                  </div>
                  <div className="dropzone__hint">PDF / DOCX hingga {MAX_SIZE_MB}MB</div>
                </>
              )}
            </div>

            <button className="cta" onClick={handleSubmit} disabled={isBusy}>
              {isBusy && <span className="spinner" />}
              {status === "extracting" && "Membaca CV..."}
              {status === "roasting" && "Mas Erdi lagi mikir pedas..."}
              {!isBusy && <>Roasting Sekarang 🔥</>}
            </button>

            {error && <div className="error-box">{error}</div>}
          </div>

          <p className="footer-note">CV diproses langsung dan tidak disimpan di server.</p>
        </>
      )}

      {status === "done" && result && (
        <div className="results">
          <div className="card gauge-card" ref={roastCardRef}>
            <FlameGauge score={result.skor} />
            <p className="roast-quote">{result.ringkasan_roasting}</p>
          </div>

          <div className="png-share-row">
            <button className="cta cta--sm cta--ghost" onClick={handleDownloadRoastPng} disabled={pngBusy}>
              {pngBusy ? "Menyiapkan..." : "🖼️ Download PNG (buat di-share)"}
            </button>
          </div>

          {result.catatan_lowongan && (
            <p className="job-link-note">
              ⚠️ Link lowongan tidak bisa dibaca otomatis: {result.catatan_lowongan} Analisis di atas
              tetap dijalankan pakai target posisi biasa.
            </p>
          )}

          {result.kekuatan?.length > 0 && (
            <div className="card section">
              <div className="section__title">✅ Yang udah oke</div>
              <ul className="pill-list pill-list--good">
                {result.kekuatan.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}

          {result.kelemahan?.length > 0 && (
            <div className="card section">
              <div className="section__title">🔥 Bagian yang gosong</div>
              <ul className="pill-list pill-list--bad">
                {result.kelemahan.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}

          {result.perbaikan_bullet?.length > 0 && (
            <div className="card section">
              <div className="section__title">✏️ Contoh perbaikan bullet</div>
              {result.perbaikan_bullet.map((b, i) => (
                <div className="bullet-fix" key={i}>
                  <div className="bullet-fix__row bullet-fix__row--before">
                    <span className="bullet-fix__tag">Before</span>
                    {b.before}
                  </div>
                  <div className="bullet-fix__row bullet-fix__row--after">
                    <span className="bullet-fix__tag">After</span>
                    {b.after}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.kata_kunci_hilang?.length > 0 && (
            <div className="card section">
              <div className="section__title">🔑 Keyword yang kayaknya kelewat</div>
              <div className="keyword-chips">
                {result.kata_kunci_hilang.map((kw, i) => (
                  <span className="keyword-chip" key={i}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {genStatus !== "done" && (
            <div className="card section gen-cta-card">
              <div className="section__title">📝 Siap perbaikan beneran?</div>
              <p className="gen-cta-text">
                Biar AI langsung tulis ulang seluruh CV kamu jadi versi yang lebih
                kuat, siap didownload sebagai .docx atau .txt.
              </p>
              <button className="cta" onClick={handleGenerateCv} disabled={genStatus === "generating"}>
                {genStatus === "generating" && <span className="spinner" />}
                {genStatus === "generating" ? "Menulis ulang CV..." : "Buat CV yang Sudah Diperbaiki ✍️"}
              </button>
              {genError && <div className="error-box">{genError}</div>}
            </div>
          )}

          {genStatus === "done" && generatedCv && <GeneratedCv cv={generatedCv} />}

          {extractedText && targetPosisi && (
            <CoverLetter cvText={extractedText} targetPosisi={targetPosisi} jobUrl={lowonganUrl.trim()} />
          )}

          <div className="reset-row">
            <button className="reset-link" onClick={resetAll}>
              ↺ Roasting CV lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
