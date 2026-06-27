/**
 * @module ProgressBar
 * @description Question progress indicator with step markers and animated fill.
 */

export default function ProgressBar({ current, total }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          fontSize: '0.85rem',
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
        <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
          Question {current} of {total}
        </span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
