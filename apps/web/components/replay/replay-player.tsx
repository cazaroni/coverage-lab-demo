'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';

import { ReplayBuffer } from './replay-buffer';
import { FieldCanvas } from './field-canvas';
import { ReplayControls } from './replay-controls';
import { Scoreboard } from '@/components/hud/scoreboard';
import { PlayerCard } from '@/components/hud/player-card';
import { StressLegend } from '@/components/hud/stress-legend';
import { TrajectoryRibbon } from '@/components/hud/trajectory-ribbon';
import type { ReplayState } from './replay-controls';
import { ReplaySocket } from '@/lib/replay-socket';
import type { ConnectionStatus, PlayerPositionMsg, ReplayFrame } from '@/lib/replay-protocol';

const FRAME_TICK_MS = 100;

type State = ReplayState & {
  frames: ReplayFrame[];
  totalFrames: number;
};

type Action =
  | { type: 'STATUS'; status: ConnectionStatus }
  | { type: 'INIT'; frameCount: number }
  | { type: 'FRAMES'; frames: ReplayFrame[] }
  | { type: 'SEEK'; frame: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'RATE'; rate: 0.5 | 1 | 2 }
  | { type: 'PIN'; nflId: number | null }
  | { type: 'TICK' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'STATUS': {
      const wsStatus = action.status;
      const status =
        wsStatus === 'connecting' ? 'loading' :
        wsStatus === 'streaming' ? 'buffering' :
        wsStatus === 'complete' ? (state.status === 'playing' ? 'playing' : 'complete') :
        wsStatus === 'error' ? 'error' :
        state.status;
      return { ...state, status };
    }
    case 'INIT':   return { ...state, totalFrames: action.frameCount, status: 'buffering' };
    case 'FRAMES': return { ...state, frames: [...state.frames, ...action.frames] };
    case 'SEEK':   return { ...state, currentFrame: action.frame };
    case 'PLAY':   return { ...state, status: 'playing' };
    case 'PAUSE':  return { ...state, status: 'paused' };
    case 'RATE':   return { ...state, playbackRate: action.rate };
    case 'PIN':    return { ...state, pinnedNflId: action.nflId };
    case 'TICK': {
      if (state.status !== 'playing') return state;
      const next = state.currentFrame + 1;
      if (next >= state.frames.length) {
        return { ...state, status: 'complete', currentFrame: state.frames.length - 1 };
      }
      return { ...state, currentFrame: next };
    }
    default: return state;
  }
}

const initialState: State = {
  status: 'idle',
  currentFrame: 0,
  totalFrames: 0,
  playbackRate: 1,
  pinnedNflId: null,
  frames: [],
};

type ReplayPlayerProps = {
  playId: string;
  gameId?: string;
  defenseTeam?: string;
  offenseTeam?: string;
  week?: number;
  season?: number;
};

export function ReplayPlayer({ playId, gameId, defenseTeam, offenseTeam, week, season }: ReplayPlayerProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const bufferRef = useRef(new ReplayBuffer());
  const socketRef = useRef<ReplaySocket | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch(`/api/replay-session/play/${encodeURIComponent(playId)}`, {
          method: 'POST',
        });
        if (!res.ok || cancelled) return;
        const { token } = (await res.json()) as { token: string };

        const socket = new ReplaySocket(
          (frames) => {
            if (cancelled) return;
            bufferRef.current.pushMany(frames);
            dispatch({ type: 'FRAMES', frames });
          },
          (status: ConnectionStatus) => {
            if (!cancelled) dispatch({ type: 'STATUS', status });
          },
          (frameCount) => {
            if (!cancelled) dispatch({ type: 'INIT', frameCount });
          },
        );
        socketRef.current = socket;
        socket.connect(token);
      } catch {
        dispatch({ type: 'STATUS', status: 'error' });
      }
    }

    start();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
  }, [playId]);

  useEffect(() => {
    if (state.status === 'playing') {
      const intervalMs = FRAME_TICK_MS / state.playbackRate;
      tickRef.current = setInterval(() => dispatch({ type: 'TICK' }), intervalMs);
    } else {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state.status, state.playbackRate]);

  const handlePlayerClick = useCallback(
    (nflId: number, _player: PlayerPositionMsg) => {
      dispatch({ type: 'PIN', nflId: nflId === state.pinnedNflId ? null : nflId });
    },
    [state.pinnedNflId],
  );

  const currentFramePlayers = state.frames[state.currentFrame]?.players ?? [];
  const currentPlayerForHud =
    state.pinnedNflId != null
      ? currentFramePlayers.find((p) => p.nfl_id === state.pinnedNflId) ?? null
      : null;
  const hasRealData = state.frames.length > 0;

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden" style={{ borderRadius: '12px 12px 0 0' }}>
        <Scoreboard
          defenseTeam={defenseTeam}
          offenseTeam={offenseTeam}
          week={week}
          season={season}
          currentFramePlayers={currentFramePlayers}
        />

        {hasRealData ? (
          <FieldCanvas
            frames={state.frames}
            currentFrame={state.currentFrame}
            pinnedNflId={state.pinnedNflId}
            onPlayerClick={handlePlayerClick}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #0a3828 0%, #0f5d43 50%, #0a3828 100%)', minHeight: 320 }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'Impact, "Bebas Neue", sans-serif',
                  fontSize: 22,
                  color: state.status === 'error' ? '#f36f6f' : '#37d0b6',
                  letterSpacing: 4,
                }}
              >
                {state.status === 'error' ? 'REPLAY UNAVAILABLE' :
                 state.status === 'idle' ? 'NO REPLAY FOR THIS PLAY' :
                 'LOADING PLAY DATA'}
              </div>
              <div className="font-mono mt-1" style={{ fontSize: 9, color: '#aac0dd', letterSpacing: '0.15em' }}>
                {state.status === 'loading' || state.status === 'buffering' ? 'PARSING MOTION FRAMES...' : ''}
              </div>
            </div>
          </div>
        )}

        {currentPlayerForHud && <PlayerCard player={currentPlayerForHud} pinned />}

        {state.pinnedNflId != null && hasRealData && (
          <TrajectoryRibbon
            frames={state.frames}
            currentFrame={state.currentFrame}
            pinnedNflId={state.pinnedNflId}
            canvasWidth={960}
            canvasHeight={430}
          />
        )}

        <StressLegend />
      </div>

      <ReplayControls
        state={state}
        frames={state.frames}
        onPlay={() => state.frames.length > 0 && dispatch({ type: 'PLAY' })}
        onPause={() => dispatch({ type: 'PAUSE' })}
        onSeek={(f) => dispatch({ type: 'SEEK', frame: f })}
        onRateChange={(r) => dispatch({ type: 'RATE', rate: r })}
      />
    </div>
  );
}
