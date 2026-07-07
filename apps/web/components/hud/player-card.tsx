'use client';

import { stressColor } from '@/lib/stress-colors';
import type { PlayerPositionMsg } from '@/lib/replay-protocol';

type PlayerCardProps = {
  player: PlayerPositionMsg;
  pinned: boolean;
};

export function PlayerCard({ player, pinned }: PlayerCardProps) {
  if (!pinned) return null;

  const stress = player.node_stress;
  const color = stressColor(stress);

  return (
    <div
      className="absolute top-3 right-3 z-20 flex flex-col gap-2"
      style={{
        width: 180,
        background: '#07111dee',
        border: '1px solid #f7b95555',
        borderRadius: 14,
        padding: 14,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 16px #f7b95522',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono" style={{ fontSize: 8, color: '#f7b955', letterSpacing: '0.15em' }}>
          PINNED
        </span>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: '#f7b955',
            boxShadow: '0 0 6px #f7b955',
            display: 'inline-block',
          }}
        />
      </div>

      {/* Name */}
      <div>
        <div
          style={{
            fontFamily: 'Impact, "Bebas Neue", sans-serif',
            fontSize: 18,
            color: '#f5f7fb',
            lineHeight: 1,
          }}
        >
          {player.player_label}
        </div>
        <div className="mt-1 font-mono" style={{ fontSize: 8, color: '#aac0dd', letterSpacing: '0.1em' }}>
          {player.player_position} · {player.player_side}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2.5">
        <div>
          <div className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
            STRESS
          </div>
          <div
            style={{
              fontFamily: 'Impact, "Bebas Neue", sans-serif',
              fontSize: 22,
              color,
              lineHeight: 1,
            }}
          >
            {stress.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
            X, Y
          </div>
          <div className="font-mono" style={{ fontSize: 9, color: '#f5f7fb' }}>
            {player.x.toFixed(1)}, {player.y.toFixed(1)}
          </div>
        </div>
      </div>

      {(player.frame_dci != null || player.frame_dis != null) && (
        <div className="flex gap-2.5">
          {player.frame_dci != null && (
            <div>
              <div className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
                DCI
              </div>
              <div className="font-mono" style={{ fontSize: 9, color: '#f5f7fb' }}>
                {player.frame_dci.toFixed(3)}
              </div>
            </div>
          )}
          {player.frame_dis != null && (
            <div>
              <div className="font-mono" style={{ fontSize: 7, color: '#aac0dd', letterSpacing: '0.12em' }}>
                DIS
              </div>
              <div className="font-mono" style={{ fontSize: 9, color: '#f5f7fb' }}>
                {player.frame_dis.toFixed(3)}
              </div>
            </div>
          )}
        </div>
      )}

      {player.is_ball_carrier && (
        <div
          className="text-center font-mono"
          style={{
            fontSize: 7,
            letterSpacing: '0.15em',
            padding: '3px 6px',
            borderRadius: 4,
            background: '#f7b95522',
            border: '1px solid #f7b95544',
            color: '#f7b955',
          }}
        >
          BALL CARRIER
        </div>
      )}
    </div>
  );
}
