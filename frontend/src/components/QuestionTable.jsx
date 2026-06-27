/**
 * @module QuestionTable
 * @description Results table showing per-question scores, evaluations,
 * and expandable ideal answers in the feedback report.
 */

import { useState } from 'react';

function getScoreColor(score) {
  if (score >= 8) return 'var(--color-success)';
  if (score >= 6) return 'var(--color-accent)';
  if (score >= 4) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function getEvalBadgeStyle(evaluation) {
  const colors = {
    Excellent: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    Good: { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
    Average: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    Poor: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  };
  const c = colors[evaluation] || colors.Average;
  return {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: c.bg,
    color: c.color,
  };
}

export default function QuestionTable({ questions }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!questions || questions.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0 0.5rem',
          fontSize: '0.9rem',
        }}
      >
        <thead>
          <tr style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>#</th>
            <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Topic</th>
            <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Score</th>
            <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Rating</th>
            <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, idx) => (
            <>
              <tr
                key={q.questionId}
                style={{
                  background: 'var(--color-surface-light)',
                  borderRadius: '0.5rem',
                }}
              >
                <td style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem 0 0 0.5rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>
                  {q.topic?.replace(/_/g, ' ')}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, color: getScoreColor(q.score), fontSize: '1.1rem' }}>
                    {q.score}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>/10</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <span style={getEvalBadgeStyle(q.evaluation)}>{q.evaluation}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', borderRadius: '0 0.5rem 0.5rem 0' }}>
                  <button
                    onClick={() => setExpandedId(expandedId === q.questionId ? null : q.questionId)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--color-text-muted)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.color = 'var(--color-text)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = 'var(--glass-border)';
                      e.target.style.color = 'var(--color-text-muted)';
                    }}
                  >
                    {expandedId === q.questionId ? 'Hide ▲' : 'View ▼'}
                  </button>
                </td>
              </tr>
              {expandedId === q.questionId && (
                <tr key={`${q.questionId}-detail`}>
                  <td
                    colSpan={5}
                    style={{
                      padding: '0 1rem 0.75rem',
                      background: 'rgba(30, 41, 59, 0.5)',
                      borderRadius: '0 0 0.5rem 0.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        padding: '1rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <p style={{ color: 'var(--color-primary-light)', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Your Answer
                        </p>
                        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                          {q.transcript || 'No transcript available'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-success)', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Ideal Answer
                        </p>
                        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                          {q.idealAnswer || 'Not available'}
                        </p>
                      </div>
                      {q.coaching && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ color: 'var(--color-warning)', fontWeight: 600, marginBottom: '0.35rem' }}>
                            💡 Coaching
                          </p>
                          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                            {q.coaching}
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
