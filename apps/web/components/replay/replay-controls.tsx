'use client';

import { useEffect, useRef } from 'react';
import type { DrivePlayClip } from '@projectedge/schemas';
import type { ReplayFrame } from '@/lib/replay-protocol';
import { ScoreTimeline } from './score-timeline';

type PlaybackRate = 0.5 | 1 | 2;

export type ReplayState = {
  status: 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'complete' | 'error';
  currentFrame: number;
  totalFrames: number;
  playbackRate: PlaybackRate;
  pinnedNflId: number | null;
};

type ReplayControlsProps = {
  state: ReplayState;
  clips?: DrivePlayClip[];
  frames?: ReplayFrame[];
  onPlay: () => void;
  onPause: () => void;
  onSeek: (frame: number) => void;
  onRateChange: (rate: PlaybackRate) => void;
  onPrevClip?: () => void;
  onNextClip?: () => void;
};

const RATES: PlaybackRate[] = [0.5, 1, 2];

export function ReplayControls({
  state,
  clips,
  frames,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
  onPrevClip,
  onNextClip,
}: ReplayControlsProps) {
  const { status, currentFrame, totalFrames, playbackRate } = state;
  const isPlaying = status === 'playing';
  const isReady = status === 'playing' || status === 'paused' || status === 'complete';
  const pct = totalFrames > 1 ? (currentFrame / (totalFrames - 1)) * 100 : 0;
  const barRef = useRef<HTMLDivElement>(null);

  const onPlayPause = isPlaying ? onPause : onPlay;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':         e.preventDefault(); onPlayPause(); break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) onSeek(Math.max(0, currentFrame - 10));
          else onSeek(Math.max(0, currentFrame - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) onSeek(Math.min(totalFrames - 1, currentFrame + 10));
          else onSeek(Math.min(totalFrames - 1, currentFrame + 1));
          break;
        case '[': e.preventDefault(); onPrevClip?.(); break;
        case ']': e.preventDefault(); onNextClip?.(); break;
        case 'j': case 'J': onRateChange(0.5); break;
        case 'l': case 'L': onRateChange(2); break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [currentFrame, totalFrames, onPlayPause, onSeek, onPrevClip, onNextClip, onRateChange]);

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!barRef.current || !isReady) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(x * (totalFrames - 1)));
  }

  const clipTicks = clips?.map((c) => ({
    pct: totalFrames > 0 ? (c.frame_start / totalFrames) * 100 : 0,
  }));

  return (
    <div
      className="flex flex-col gap-2 px-4 pb-3 pt-2"
      style={{
        background: '#102238dd',
        borderRadius: '0 0 12px 12px',
        border: '1px solid rgba(255,255,255,0.06)',
        borderTop: 'none',
      }}
    >
      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Round play/pause button */}
        <button
          onClick={onPlayPause}
          disabled={!isReady && status !== 'buffering'}
          style={{
            width: 36,
            height: 36,
            borderRadius: 99,
            background: '#37d0b6',
            border: 'none',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            boxShadow: '0 0 16px #37d0b644',
            opacity: (!isReady && status !== 'buffering') ? 0.4 : 1,
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#07111d', marginLeft: isPlaying ? 0 : 2 }}>
            {isPlaying ? '▮▮' : '▶'}
          </span>
        </button>

        {/* Progress bar */}
        <div
          ref={barRef}
          onClick={handleBarClick}
          className="relative flex-1"
          style={{
            height: 6,
            background: '#163252',
            borderRadius: 99,
            cursor: isReady ? 'pointer' : 'default',
            position: 'relative',
          }}
        >
          {/* Filled portion */}
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #37d0b6, #f7b955)',
              borderRadius: 99,
              transition: 'width 50ms linear',
            }}
          />
          {/* Thumb */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              width: 14,
              height: 14,
              borderRadius: 99,
              background: '#07111d',
              border: '2px solid #37d0b6',
              boxShadow: '0 0 8px #37d0b666',
              pointerEvents: 'none',
            }}
          />
          {/* Clip tick marks */}
          {clipTicks?.map((tick, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${tick.pct}%`,
                transform: 'translateY(-50%)',
                width: 2,
                height: 12,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 1,
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>

        {/* Frame counter */}
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 9, color: '#aac0dd', minWidth: 60, textAlign: 'center' }}
        >
          {currentFrame + 1} / {totalFrames}
        </span>

        {/* Speed buttons */}
        <div className="flex gap-1">
          {RATES.map((r) => (
            <button
              key={r}
              onClick={() => onRateChange(r)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: playbackRate === r ? '#37d0b6' : '#163252aa',
                color: playbackRate === r ? '#07111d' : '#aac0dd',
                border: `1px solid ${playbackRate === r ? '#37d0b6' : 'rgba(255,255,255,0.06)'}`,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              {r}×
            </button>
          ))}
        </div>

        {/* Clip jump */}
        {(onPrevClip || onNextClip) && (
          <div className="flex gap-1">
            <button
              onClick={onPrevClip}
              disabled={!onPrevClip}
              className="font-mono text-muted-foreground hover:text-foreground disabled:opacity-30"
              style={{ fontSize: 11 }}
              aria-label="Previous clip"
            >
              [
            </button>
            <button
              onClick={onNextClip}
              disabled={!onNextClip}
              className="font-mono text-muted-foreground hover:text-foreground disabled:opacity-30"
              style={{ fontSize: 11 }}
              aria-label="Next clip"
            >
              ]
            </button>
          </div>
        )}

        {/* Status badge */}
        <span
          className="font-mono shrink-0"
          style={{
            fontSize: 7,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:
              status === 'error' ? '#f36f6f' :
              status === 'loading' || status === 'buffering' ? '#f7b955' :
              status === 'complete' ? '#37d0b6' :
              '#aac0dd',
          }}
        >
          {status}
        </span>
      </div>

      {/* Per-frame DCI sparkline */}
      {frames && frames.length > 0 && (
        <ScoreTimeline
          frames={frames}
          currentFrame={state.currentFrame}
          onSeek={onSeek}
        />
      )}

      {/* Keyboard help */}
      <div className="flex flex-wrap justify-center gap-3">
        {[
          { k: 'SPACE', l: 'Play/Pause' },
          { k: '← →', l: '±1 Frame' },
          { k: 'Shift+← →', l: '±10 Frames' },
          { k: '[ ]', l: 'Jump Clip' },
          { k: 'J / L', l: '0.5× / 2×' },
        ].map(({ k, l }) => (
          <div key={k} className="flex items-center gap-1.5">
            <span
              className="font-mono"
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                background: '#163252',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 8,
                color: '#f5f7fb',
              }}
            >
              {k}
            </span>
            <span className="font-mono" style={{ fontSize: 7, color: '#aac0dd' }}>
              {l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
