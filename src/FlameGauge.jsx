const RADIUS = 80;
const CX = 100;
const CY = 100;
const START_ANGLE = 180; // left
const END_ANGLE = 0; // right (semicircle across the top)

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = startAngle - endAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function verdict(score) {
  if (score >= 80) return { label: "Nyaris tanpa cacat", color: "var(--score-high)" };
  if (score >= 70) return { label: "Lolos ambang ATS", color: "var(--score-high)" };
  if (score >= 50) return { label: "Butuh perbaikan serius", color: "var(--score-mid)" };
  return { label: "Gosong. Rombak total.", color: "var(--score-low)" };
}

export default function FlameGauge({ score }) {
  const clamped = Math.max(0, Math.min(100, score));
  const progressAngle = START_ANGLE - (START_ANGLE - END_ANGLE) * (clamped / 100);
  const trackPath = arcPath(CX, CY, RADIUS, START_ANGLE, END_ANGLE);
  const progressPath = arcPath(CX, CY, RADIUS, START_ANGLE, progressAngle);

  // Pass-line marker at 70
  const markerAngle = START_ANGLE - (START_ANGLE - END_ANGLE) * 0.7;
  const markerOuter = polarToCartesian(CX, CY, RADIUS + 8, markerAngle);
  const markerInner = polarToCartesian(CX, CY, RADIUS - 8, markerAngle);

  const needle = polarToCartesian(CX, CY, RADIUS - 22, progressAngle);
  const v = verdict(clamped);

  return (
    <div className="gauge-card">
      <span className="gauge-card__label">Skor CV</span>
      <svg viewBox="0 0 200 118" className="gauge-svg">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--score-low)" />
            <stop offset="55%" stopColor="var(--score-mid)" />
            <stop offset="100%" stopColor="var(--score-high)" />
          </linearGradient>
        </defs>
        <path
          d={trackPath}
          fill="none"
          stroke="var(--border)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={progressPath}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <line
          x1={markerInner.x}
          y1={markerInner.y}
          x2={markerOuter.x}
          y2={markerOuter.y}
          stroke="var(--text-faint)"
          strokeWidth="2"
          strokeDasharray="2 2"
        />
        <circle cx={needle.x} cy={needle.y} r="7" fill="var(--bg)" stroke={v.color} strokeWidth="3" />
        <text x="100" y="95" textAnchor="middle" fontSize="34" fontFamily="var(--font-display)" fontWeight="700" fill="var(--text)">
          {Math.round(clamped)}
        </text>
        <text x="100" y="112" textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-faint)">
          / 100 · garis putus = ambang lolos ATS
        </text>
      </svg>
      <div className="gauge-verdict" style={{ color: v.color }}>
        {v.label}
      </div>
    </div>
  );
}
