/**
 * @module Header
 * @description Application header with branding and timer display.
 */

import { Link } from 'react-router-dom';
import { Mic, Timer as TimerIcon, Settings } from 'lucide-react';

export default function Header({ timer, showTimer = false }) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <Link 
        to="/" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.625rem',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <Mic size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.2,
            }}
            className="gradient-text"
          >
            AI Interviewer
          </h1>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Practice makes perfect
          </p>
        </div>
      </Link>

      {showTimer && timer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            background: 'var(--color-surface-light)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <TimerIcon size={16} color="var(--color-text-muted)" />
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'monospace',
              color: 'var(--color-text)',
            }}
          >
            {timer}
          </span>
        </div>
      )}

      {!showTimer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/manage-questions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Settings size={16} />
            Manage Questions
          </Link>
        </div>
      )}
    </header>
  );
}
