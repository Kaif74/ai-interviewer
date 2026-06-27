/**
 * @module RadarChart
 * @description Recharts-based radar chart for visualizing skill categories
 * in the feedback report.
 */

import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

/**
 * @param {Object} props
 * @param {{ subject: string, score: number, fullMark: number }[]} props.data
 */
export default function RadarChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <RechartsRadar cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid
            stroke="rgba(99, 102, 241, 0.2)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: '#94a3b8',
              fontSize: 12,
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#6366f1"
            fill="rgba(99, 102, 241, 0.25)"
            strokeWidth={2}
            dot={{
              r: 4,
              fill: '#6366f1',
              stroke: '#818cf8',
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: '#818cf8',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-light)',
              border: '1px solid var(--glass-border)',
              borderRadius: '0.5rem',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
            }}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
