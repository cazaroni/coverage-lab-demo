'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { ReplayFrame } from '@/lib/replay-protocol';

type Props = {
  frames: ReplayFrame[];
  currentFrame: number;
  onSeek: (frame: number) => void;
};

const HEIGHT = 32;
const DCI_THRESHOLD = 0.5;
const MIN_COLLAPSE_RUN = 5;

function frameDci(frame: ReplayFrame): number {
  if (frame.players.length === 0) return 0.5;
  const first = frame.players[0];
  if (first.frame_dci != null) return first.frame_dci;
  const sum = frame.players.reduce((acc, p) => acc + p.node_stress, 0);
  return Math.max(0, Math.min(1, 1 - sum / frame.players.length));
}

function collapseRuns(dcis: number[]): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  let runStart = -1;
  for (let i = 0; i <= dcis.length; i++) {
    const inCollapse = i < dcis.length && dcis[i] < DCI_THRESHOLD;
    if (inCollapse && runStart === -1) {
      runStart = i;
    } else if (!inCollapse && runStart !== -1) {
      if (i - runStart >= MIN_COLLAPSE_RUN) runs.push({ start: runStart, end: i - 1 });
      runStart = -1;
    }
  }
  return runs;
}

export function ScoreTimeline({ frames, currentFrame, onSeek }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const dcis = useMemo(() => frames.map(frameDci), [frames]);
  const collapses = useMemo(() => collapseRuns(dcis), [dcis]);

  const total = frames.length;

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || total === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(Math.round(x * (total - 1)));
    },
    [total, onSeek],
  );

  if (total === 0) return null;

  const W = total;
  const cursorX = total > 1 ? (currentFrame / (total - 1)) * W : 0;

  const polyPoints = dcis
    .map((dci, i) => {
      const x = total > 1 ? (i / (total - 1)) * W : W / 2;
      const y = HEIGHT - dci * HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div style={{ marginTop: 4, marginBottom: 2, paddingInline: 48 }}>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 7,
          color: '#aac0dd88',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 3,
        }}
      >
        Frame DCI
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${HEIGHT}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: HEIGHT, display: 'block', cursor: 'pointer' }}
        onClick={handleClick}
      >
        {/* Midline at DCI = 0.5 */}
        <line
          x1={0} y1={HEIGHT / 2}
          x2={W} y2={HEIGHT / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />

        {/* Collapse window shading */}
        {collapses.map((run, i) => {
          const x1 = total > 1 ? (run.start / (total - 1)) * W : 0;
          const x2 = total > 1 ? (run.end / (total - 1)) * W : W;
          return (
            <rect
              key={i}
              x={x1}
              y={0}
              width={Math.max(1, x2 - x1)}
              height={HEIGHT}
              fill="rgba(243,111,111,0.15)"
            />
          );
        })}

        {/* Sparkline */}
        <polyline
          points={polyPoints}
          fill="none"
          stroke="url(#dci-gradient)"
          strokeWidth={1.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="dci-gradient" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#37d0b6" />
            <stop offset="100%" stopColor="#f36f6f" />
          </linearGradient>
        </defs>

        {/* Cursor */}
        <line
          x1={cursorX} y1={0}
          x2={cursorX} y2={HEIGHT}
          stroke="#f7b955"
          strokeWidth={1}
          opacity={0.9}
        />
      </svg>
    </div>
  );
}
