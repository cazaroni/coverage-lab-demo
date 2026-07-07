'use client';

import { stressColor } from '@/lib/stress-colors';
import type { PlayerPositionMsg } from '@/lib/replay-protocol';

type ScoreboardProps = {
  defenseTeam?: string;
  offenseTeam?: string;
  week?: number;
  season?: number;
  currentFramePlayers?: PlayerPositionMsg[];
};

export function Scoreboard({
  defenseTeam = '???',
  offenseTeam = '???',
  week,
  season,
  currentFramePlayers,
}: ScoreboardProps) {
  const frameDci = currentFramePlayers?.[0]?.frame_dci ?? null;
  const frameDis = currentFramePlayers?.[0]?.frame_dis ?? null;

  return (
    <div
      className="flex items-center overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, #07111dee, #102238ee, #07111dee)',
        borderRadius: '12px 12px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: 'none',
      }}
    >
      {/* Teams */}
      <div className="flex items-center">
        <div
          className="flex flex-col px-4 py-2.5"
          style={{ background: '#0f5d4344', borderRight: '2px solid #37d0b644' }}
        >
          <span
            className="font-heading leading-none"
            style={{ fontSize: 22, color: '#f5f7fb', fontFamily: 'Impact, "Bebas Neue", sans-serif' }}
          >
            {defenseTeam}
          </span>
          <span className="font-mono" style={{ fontSize: 7, color: '#37d0b6', letterSpacing: '0.15em' }}>
            DEF
          </span>
        </div>
        <div className="px-3 py-2">
          <span className="font-mono" style={{ fontSize: 8, color: '#aac0dd', letterSpacing: '0.1em' }}>
            VS
          </span>
        </div>
        <div className="flex flex-col px-4 py-2.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <span
            className="font-heading leading-none"
            style={{ fontSize: 22, color: '#aac0dd', fontFamily: 'Impact, "Bebas Neue", sans-serif' }}
          >
            {offenseTeam}
          </span>
          <span className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.15em' }}>
            OFF
          </span>
        </div>
      </div>

      <div className="mx-2 h-9 w-px bg-white/10" />

      {/* Week + Season */}
      <div className="flex gap-4 px-3 py-2">
        {week != null && (
          <div className="flex flex-col items-center">
            <span className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
              WEEK
            </span>
            <span
              className="font-heading leading-none"
              style={{ fontSize: 18, color: '#f5f7fb', fontFamily: 'Impact, "Bebas Neue", sans-serif' }}
            >
              {week}
            </span>
          </div>
        )}
        {season != null && (
          <div className="flex flex-col items-center">
            <span className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
              SEASON
            </span>
            <span
              className="font-heading leading-none"
              style={{ fontSize: 18, color: '#f5f7fb', fontFamily: 'Impact, "Bebas Neue", sans-serif' }}
            >
              {season}
            </span>
          </div>
        )}
      </div>

      {(frameDci != null || frameDis != null) && (
        <>
          <div className="mx-2 h-9 w-px bg-white/10" />
          <div className="flex gap-3.5 px-3 py-2">
            {frameDci != null && (
              <div className="flex flex-col items-center">
                <span className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
                  DCI
                </span>
                <span
                  className="font-heading leading-none tabular-nums"
                  style={{
                    fontSize: 20,
                    color: stressColor(1 - frameDci),
                    fontFamily: 'Impact, "Bebas Neue", sans-serif',
                  }}
                >
                  {frameDci.toFixed(2)}
                </span>
              </div>
            )}
            {frameDis != null && (
              <div className="flex flex-col items-center">
                <span className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
                  DIS
                </span>
                <span
                  className="font-heading leading-none tabular-nums"
                  style={{
                    fontSize: 20,
                    color: stressColor(frameDis),
                    fontFamily: 'Impact, "Bebas Neue", sans-serif',
                  }}
                >
                  {frameDis.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="ml-auto px-4 py-2">
        <span className="font-mono" style={{ fontSize: 8, color: '#37d0b6', letterSpacing: '0.12em' }}>
          LIVE REPLAY
        </span>
      </div>
    </div>
  );
}
