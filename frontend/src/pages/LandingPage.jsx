/**
 * @module LandingPage
 * @description Landing page with language selector and start button.
 * Features glassmorphism cards, animated gradient background, and
 * polished UI with SVG icons.
 */

import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { startInterview } from '../services/api';
import Header from '../components/Header';
import { useState } from 'react';
import { AudioLines, Play, ListChecks, Target, Lightbulb } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', badge: 'EN', desc: 'Interview in English' },
  { code: 'hi', name: 'हिन्दी', badge: 'HI', desc: 'हिन्दी में साक्षात्कार' },
  { code: 'de', name: 'Deutsch', badge: 'DE', desc: 'Interview auf Deutsch' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useInterview();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);

    try {
      dispatch({ type: 'START_INTERVIEW' });

      const data = await startInterview(state.language);

      dispatch({
        type: 'INTERVIEW_STARTED',
        payload: data,
      });

      navigate('/interview');
    } catch (err) {
      setError(err.message || 'Failed to start interview');
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div
          className="glass-card animate-fade-in-up"
          style={{
            maxWidth: '540px',
            width: '100%',
            padding: '3rem 2.5rem',
            textAlign: 'center',
          }}
        >
          {/* Hero */}
          <div
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '1.25rem',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)',
              color: 'white',
            }}
          >
            <AudioLines size={40} strokeWidth={2} />
          </div>

          <h2
            style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}
            className="gradient-text"
          >
            AI Interview Practice
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Practice your software engineering interview with an AI-powered interviewer.
            Get real-time feedback, scoring, and coaching.
          </p>

          {/* Language Selector */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
            }}>
              Select Language
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-option ${state.language === lang.code ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: lang.code })}
                  id={`lang-${lang.code}`}
                >
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '0.75rem',
                    background: state.language === lang.code ? 'var(--gradient-primary)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: state.language === lang.code ? 'white' : 'var(--color-text)',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    transition: 'all 0.3s ease',
                    border: '1px solid',
                    borderColor: state.language === lang.code ? 'transparent' : 'var(--glass-border)'
                  }}>
                    {lang.badge}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontWeight: 600 }}>{lang.name}</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                      {lang.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Start Button */}
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={isLoading}
            id="start-interview-btn"
            style={{ width: '100%', fontSize: '1.15rem', padding: '1rem' }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }} />
                Starting...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Play size={20} fill="currentColor" />
                Start Interview
              </span>
            )}
          </button>

          {/* Info */}
          <div
            style={{
              marginTop: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.75rem',
            }}
          >
            {[
              { icon: <ListChecks size={22} />, label: '10 Questions' },
              { icon: <Target size={22} />, label: 'Real Scoring' },
              { icon: <Lightbulb size={22} />, label: 'AI Coaching' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'transform 0.2s ease, background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <div style={{ color: 'var(--color-primary-light)' }}>
                  {item.icon}
                </div>
                <span style={{ fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
