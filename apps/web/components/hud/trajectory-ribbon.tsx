'use client';

import { useEffect, useRef } from 'react';
import type { ReplayFrame } from '@/lib/replay-protocol';
import { stressColor } from '@/lib/stress-colors';

const FIELD_W = 120;
const FIELD_H = 53.3;
const TRAIL_LENGTH = 20;

type TrajectoryRibbonProps = {
  frames: ReplayFrame[];
  currentFrame: number;
  pinnedNflId: number;
  canvasWidth: number;
  canvasHeight: number;
};

export function TrajectoryRibbon({
  frames,
  currentFrame,
  pinnedNflId,
  canvasWidth,
  canvasHeight,
}: TrajectoryRibbonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const start = Math.max(0, currentFrame - TRAIL_LENGTH);
    const trailFrames = frames.slice(start, currentFrame + 1);

    const points: { x: number; y: number; stress: number; age: number }[] = [];
    for (let i = 0; i < trailFrames.length; i++) {
      const frame = trailFrames[i];
      const player = frame?.players.find((p) => p.nfl_id === pinnedNflId);
      if (!player) continue;
      const cx = (player.x / FIELD_W) * canvasWidth;
      const cy = (1 - player.y / FIELD_H) * canvasHeight;
      points.push({ x: cx, y: cy, stress: player.node_stress, age: i / trailFrames.length });
    }

    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const alpha = b.age * 0.7;
      const color = stressColor(b.stress);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [frames, currentFrame, pinnedNflId, canvasWidth, canvasHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="pointer-events-none absolute inset-0 z-10"
      style={{ top: 0, left: 0 }}
    />
  );
}
