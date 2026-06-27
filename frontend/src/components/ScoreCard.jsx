/**
 * @module ScoreCard
 * @description Reusable score display card with color coding based on score value.
 */

/**
 * Returns the color class based on score value.
 * @param {number} score — 0-10
 * @returns {string} CSS color variable
 */
function getScoreColor(score) {
  if (score >= 8) return 'var(--color-success)';
  if (score >= 6) return 'var(--color-accent)';
  if (score >= 4) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

export default function ScoreCard({ label, score, maxScore = 10, size = 'medium' }) {
  const percentage = (score / maxScore) * 100;
  const color = getScoreColor(score);

  const sizes = {
    small: { circle: 60, stroke: 4, font: '1rem' },
    medium: { circle: 90, stroke: 6, font: '1.5rem' },
    large: { circle: 130, stroke: 8, font: '2.25rem' },
  };

  const s = sizes[size] || sizes.medium;
  const radius = (s.circle - s.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <div style={{ position: 'relative', width: s.circle, height: s.circle }}>
        <svg width={s.circle} height={s.circle} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={s.circle / 2}
            cy={s.circle / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-lighter)"
            strokeWidth={s.stroke}
          />
          {/* Score arc */}
          <circle
            cx={s.circle / 2}
            cy={s.circle / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: s.font,
            fontWeight: 700,
            color,
          }}
        >
          {score}
        </span>
      </div>
      {label && (
        <span
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
