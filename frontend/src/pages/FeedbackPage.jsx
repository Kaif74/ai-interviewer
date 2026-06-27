/**
 * @module FeedbackPage
 * @description Comprehensive feedback report page with overall score,
 * radar chart, question table, strengths/weaknesses, and recommendations.
 */

import { useNavigate } from 'react-router-dom';
import { useInterview, Status } from '../context/InterviewContext';
import Header from '../components/Header';
import ScoreCard from '../components/ScoreCard';
import RadarChart from '../components/RadarChart';
import QuestionTable from '../components/QuestionTable';
import { useEffect } from 'react';

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useInterview();
  const report = state.feedback;

  // Redirect if no feedback
  useEffect(() => {
    if (state.status !== Status.FEEDBACK && !report) {
      navigate('/');
    }
  }, [state.status, report, navigate]);

  if (!report) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
      </div>
    );
  }

  const radarData = [
    { subject: 'Communication', score: report.communicationScore || 0, fullMark: 10 },
    { subject: 'Technical', score: report.technicalScore || 0, fullMark: 10 },
    { subject: 'Problem Solving', score: report.problemSolvingScore || 0, fullMark: 10 },
  ];

  const handleRestart = () => {
    dispatch({ type: 'RESET' });
    navigate('/');
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main
        style={{
          flex: 1,
          maxWidth: '900px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Hero Score */}
        <div
          className="glass-card animate-fade-in-up"
          style={{ padding: '2rem', textAlign: 'center' }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }} className="gradient-text">
            Interview Report
          </h2>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '3rem',
              flexWrap: 'wrap',
            }}
          >
            <ScoreCard
              label="Overall Score"
              score={Math.round(report.overallScore / 10)}
              maxScore={10}
              size="large"
            />

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <ScoreCard label="Communication" score={report.communicationScore || 0} size="small" />
              <ScoreCard label="Technical" score={report.technicalScore || 0} size="small" />
              <ScoreCard label="Problem Solving" score={report.problemSolvingScore || 0} size="small" />
            </div>
          </div>

          {/* Duration */}
          <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem', fontSize: '0.85rem' }}>
            ⏱️ Duration: {formatDuration(report.duration || 0)}
          </p>

          {/* Summary */}
          {report.summary && (
            <p style={{
              color: 'var(--color-text)',
              marginTop: '1rem',
              lineHeight: 1.7,
              maxWidth: '600px',
              margin: '1rem auto 0',
            }}>
              {report.summary}
            </p>
          )}
        </div>

        {/* Radar Chart */}
        <div
          className="glass-card animate-fade-in-up"
          style={{ padding: '1.5rem', animationDelay: '0.1s' }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
            Skill Breakdown
          </h3>
          <RadarChart data={radarData} />
        </div>

        {/* Strengths & Weaknesses */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}
        >
          {/* Strengths */}
          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: '1.5rem', animationDelay: '0.2s' }}
          >
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              ✅ Strengths
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(report.strengths || []).map((s, i) => (
                <li
                  key={i}
                  style={{
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    fontSize: '0.85rem',
                    color: 'var(--color-text)',
                    lineHeight: 1.5,
                  }}
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: '1.5rem', animationDelay: '0.3s' }}
          >
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: 'var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              ⚠️ Areas to Improve
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(report.weaknesses || []).map((w, i) => (
                <li
                  key={i}
                  style={{
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.15)',
                    fontSize: '0.85rem',
                    color: 'var(--color-text)',
                    lineHeight: 1.5,
                  }}
                >
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: '1.5rem', animationDelay: '0.4s' }}
          >
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              💡 Recommendations
            </h3>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {report.recommendations.map((r, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text)',
                    lineHeight: 1.6,
                  }}
                >
                  {r}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Question Table */}
        {report.questionScores && report.questionScores.length > 0 && (
          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: '1.5rem', animationDelay: '0.5s' }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
              📋 Question Details
            </h3>
            <QuestionTable questions={report.questionScores} />
          </div>
        )}

        {/* Restart Button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '3rem' }}>
          <button
            className="btn-primary"
            onClick={handleRestart}
            id="restart-btn"
            style={{ fontSize: '1.05rem' }}
          >
            🔄 Start New Interview
          </button>
        </div>
      </main>
    </div>
  );
}
