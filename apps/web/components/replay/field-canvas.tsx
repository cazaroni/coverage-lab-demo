'use client';

import { Application, Graphics, Text, TextStyle, FillGradient } from 'pixi.js';
import { useEffect, useRef, useCallback } from 'react';

import type { ReplayFrame, PlayerPositionMsg } from '@/lib/replay-protocol';
import { lerpPosition, lerpAngle, lerpScalar, clamp } from './interpolation';
import { stressColor } from '@/lib/stress-colors';

const FIELD_W = 120;
const FIELD_H = 53.3;

// Design palette
const PALETTE = {
  field:    0x0f5d43,
  fieldDark:0x0a3828,
  offense:  0xf5f7fb,
  canvas:   0x07111d,
  ink:      0xf5f7fb,
  mutedInk: 0xaac0dd,
  accentWarm: 0xf7b955,
};

function hexFromStress(stress: number): number {
  return parseInt(stressColor(stress).slice(1), 16);
}

function stressHex(stress: number): string {
  return stressColor(stress);
}

type PlayerState = {
  x: number;
  y: number;
  o: number;
  node_stress: number;
  is_ball_carrier: boolean;
  player_side: string;
  player_label: string;
  player_position: string;
};

export type FieldCanvasProps = {
  frames: ReplayFrame[];
  currentFrame: number;
  pinnedNflId: number | null;
  onPlayerClick: (nflId: number, player: PlayerPositionMsg) => void;
  width?: number;
  height?: number;
};

function toCanvas(
  fx: number,
  fy: number,
  cw: number,
  ch: number,
): { cx: number; cy: number } {
  return {
    cx: (fx / FIELD_W) * cw,
    cy: (fy / FIELD_H) * ch,
  };
}

function drawDashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLen: number,
  gapLen: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  let pos = 0;
  while (pos < len) {
    const dEnd = Math.min(pos + dashLen, len);
    g.moveTo(x1 + ux * pos, y1 + uy * pos).lineTo(x1 + ux * dEnd, y1 + uy * dEnd);
    pos += dashLen + gapLen;
  }
}

export function FieldCanvas({
  frames,
  currentFrame,
  pinnedNflId,
  onPlayerClick,
  width = 960,
  height = 430,
}: FieldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const playerGfxRef = useRef<Map<number, Graphics>>(new Map());
  const haloGfxRef = useRef<Map<number, Graphics>>(new Map());
  const labelGfxRef = useRef<Map<number, Text>>(new Map());

  const buildField = useCallback((app: Application) => {
    const g = new Graphics();
    const cw = app.screen.width;
    const ch = app.screen.height;

    // Field gradient: dark → green → dark (vertical)
    const fieldGrad = new FillGradient(0, 0, 0, ch);
    fieldGrad.addColorStop(0, PALETTE.fieldDark);
    fieldGrad.addColorStop(0.5, PALETTE.field);
    fieldGrad.addColorStop(1, PALETTE.fieldDark);
    g.rect(0, 0, cw, ch).fill({ fill: fieldGrad });

    // Major yard lines every 10 yards
    for (let yd = 10; yd <= 110; yd += 10) {
      const { cx } = toCanvas(yd, 0, cw, ch);
      g.moveTo(cx, 0).lineTo(cx, ch)
        .stroke({ color: 0xf5f7fb, alpha: 0.18, width: 1 });
    }

    // 5-yard dashed lines
    for (let yd = 5; yd <= 115; yd += 10) {
      const { cx } = toCanvas(yd, 0, cw, ch);
      drawDashedLine(g, cx, 0, cx, ch, 4, 8);
      g.stroke({ color: 0xf5f7fb, alpha: 0.08, width: 0.8 });
    }

    // Hash marks at 1/3 and 2/3 field height
    const hashTop = ch * 0.33;
    const hashBot = ch * 0.67;
    for (let yd = 11; yd <= 109; yd++) {
      const { cx } = toCanvas(yd, 0, cw, ch);
      g.moveTo(cx, hashTop - 3).lineTo(cx, hashTop + 3)
        .stroke({ color: 0xf5f7fb, alpha: 0.2, width: 0.8 });
      g.moveTo(cx, hashBot - 3).lineTo(cx, hashBot + 3)
        .stroke({ color: 0xf5f7fb, alpha: 0.2, width: 0.8 });
    }

    // Endzone fills (darken 0–10 and 110–120)
    const { cx: ez1 } = toCanvas(10, 0, cw, ch);
    const { cx: ez2 } = toCanvas(110, 0, cw, ch);
    g.rect(0, 0, ez1, ch).fill({ color: PALETTE.canvas, alpha: 0.3 });
    g.rect(ez2, 0, cw - ez2, ch).fill({ color: PALETTE.canvas, alpha: 0.3 });

    // Endzone boundary lines
    g.moveTo(ez1, 0).lineTo(ez1, ch).stroke({ color: 0xf5f7fb, alpha: 0.35, width: 1.5 });
    g.moveTo(ez2, 0).lineTo(ez2, ch).stroke({ color: 0xf5f7fb, alpha: 0.35, width: 1.5 });

    // Field border
    g.rect(0, 0, cw, ch).stroke({ color: 0xf5f7fb, alpha: 0.25, width: 2 });

    app.stage.addChild(g);

    // Yard numbers
    const numStyle = new TextStyle({
      fontFamily: 'Impact, "Bebas Neue", sans-serif',
      fontSize: 12,
      fill: 0xf5f7fb,
    });
    const yardNums = [10, 20, 30, 40, 50, 40, 30, 20, 10];
    yardNums.forEach((num, i) => {
      const yd = (i + 1) * 10 + 10;
      const { cx } = toCanvas(yd, 0, cw, ch);
      const topLabel = new Text({ text: String(num), style: numStyle });
      topLabel.anchor.set(0.5, 0);
      topLabel.x = cx;
      topLabel.y = ch * 0.02;
      topLabel.alpha = 0.22;
      app.stage.addChild(topLabel);

      const botLabel = new Text({ text: String(num), style: numStyle });
      botLabel.anchor.set(0.5, 1);
      botLabel.x = cx;
      botLabel.y = ch * 0.97;
      botLabel.alpha = 0.22;
      app.stage.addChild(botLabel);
    });

    // Endzone text (rotated)
    const ezStyle = new TextStyle({
      fontFamily: 'Impact, "Bebas Neue", sans-serif',
      fontSize: 14,
      fill: 0xf5f7fb,
      letterSpacing: 6,
    });
    const ezLeft = new Text({ text: 'ENDZONE', style: ezStyle });
    ezLeft.anchor.set(0.5, 0.5);
    ezLeft.x = ez1 / 2;
    ezLeft.y = ch / 2;
    ezLeft.rotation = -Math.PI / 2;
    ezLeft.alpha = 0.25;
    app.stage.addChild(ezLeft);

    const ezRight = new Text({ text: 'ENDZONE', style: ezStyle });
    ezRight.anchor.set(0.5, 0.5);
    ezRight.x = ez2 + (cw - ez2) / 2;
    ezRight.y = ch / 2;
    ezRight.rotation = Math.PI / 2;
    ezRight.alpha = 0.25;
    app.stage.addChild(ezRight);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let destroyed = false;

    const app = new Application();
    app
      .init({
        width,
        height,
        backgroundColor: PALETTE.fieldDark,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      })
      .then(() => {
        if (destroyed) { app.destroy(true); return; }
        container.appendChild(app.canvas);
        appRef.current = app;
        buildField(app);
      });

    return () => {
      destroyed = true;
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
      playerGfxRef.current.clear();
      haloGfxRef.current.clear();
      labelGfxRef.current.clear();
    };
  }, [width, height, buildField]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || frames.length === 0) return;

    const frameA = frames[Math.max(0, currentFrame - 1)];
    const frameB = frames[Math.min(frames.length - 1, currentFrame)];
    if (!frameA || !frameB) return;

    const cw = app.screen.width;
    const ch = app.screen.height;
    const elapsed = 100; // assume ~10Hz frames, no wall clock needed for lerp
    const t = 0.5;      // fixed 50% interpolation between frames

    const playerMap = new Map<number, PlayerState>();
    for (const p of frameB.players) {
      const prev = frameA.players.find((a) => a.nfl_id === p.nfl_id);
      if (prev) {
        const lp = lerpPosition({ x: prev.x, y: prev.y }, { x: p.x, y: p.y }, t);
        playerMap.set(p.nfl_id, {
          ...lp,
          o: lerpAngle((prev.o * Math.PI) / 180, (p.o * Math.PI) / 180, t),
          node_stress: lerpScalar(prev.node_stress, p.node_stress, t),
          is_ball_carrier: p.is_ball_carrier,
          player_side: p.player_side,
          player_label: p.player_label,
          player_position: p.player_position,
        });
      } else {
        playerMap.set(p.nfl_id, {
          x: p.x, y: p.y,
          o: (p.o * Math.PI) / 180,
          node_stress: p.node_stress,
          is_ball_carrier: p.is_ball_carrier,
          player_side: p.player_side,
          player_label: p.player_label,
          player_position: p.player_position,
        });
      }
    }

    const posLabelStyle = new TextStyle({
      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
      fontSize: 7,
      fill: 0xf5f7fb,
    });

    for (const [nflId, state] of playerMap) {
      const { cx, cy } = toCanvas(state.x, state.y, cw, ch);
      const isDefense = state.player_side === 'Defense';
      const isPinned = nflId === pinnedNflId;
      const stress = state.node_stress;
      const dotR = isPinned ? 9 : 7;
      const stressHexVal = hexFromStress(stress);

      // ── Halo (defense only) ──────────────────────────────────────────
      let hg = haloGfxRef.current.get(nflId);
      if (!hg) {
        hg = new Graphics();
        app.stage.addChild(hg);
        haloGfxRef.current.set(nflId, hg);
      }
      hg.clear();
      if (isDefense && stress > 0.1) {
        const haloR = 14 + stress * 12;
        // Approximate radial gradient with 4 concentric filled circles
        const layers = 4;
        for (let i = layers; i >= 1; i--) {
          const r = haloR * (i / layers);
          const a = stress * 0.55 * (i / layers);
          hg.circle(cx, cy, r).fill({ color: stressHexVal, alpha: a * 0.4 });
        }
      }

      // ── Player dot ────────────────────────────────────────────────────
      let pg = playerGfxRef.current.get(nflId);
      if (!pg) {
        pg = new Graphics();
        pg.interactive = true;
        pg.cursor = 'pointer';
        pg.on('pointerdown', () => {
          const player = frameB.players.find((p) => p.nfl_id === nflId);
          if (player) onPlayerClick(nflId, player);
        });
        app.stage.addChild(pg);
        playerGfxRef.current.set(nflId, pg);
      }
      pg.clear();

      // Pinned reticle — drawn behind the dot
      if (isPinned) {
        // Dashed ring
        const reticleR = 18;
        const dashCount = 12;
        for (let i = 0; i < dashCount; i++) {
          const startAngle = (i / dashCount) * Math.PI * 2;
          const endAngle = startAngle + (Math.PI * 2) / dashCount / 2;
          pg.arc(cx, cy, reticleR, startAngle, endAngle)
            .stroke({ color: PALETTE.accentWarm, width: 2, alpha: 0.9 });
        }
        // Corner brackets (4× L-shapes)
        const s = 22;
        const armLen = 6;
        [
          { x: cx - s, y: cy - s, dx: 1, dy: 1 },
          { x: cx + s, y: cy - s, dx: -1, dy: 1 },
          { x: cx - s, y: cy + s, dx: 1, dy: -1 },
          { x: cx + s, y: cy + s, dx: -1, dy: -1 },
        ].forEach(({ x, y, dx, dy }) => {
          pg.moveTo(x + dx * armLen, y)
            .lineTo(x, y)
            .lineTo(x, y + dy * armLen)
            .stroke({ color: PALETTE.accentWarm, width: 2, alpha: 0.9 });
        });
      }

      // Dot fill
      if (isDefense) {
        pg.circle(cx, cy, dotR).fill({ color: stressHexVal });
        pg.circle(cx, cy, dotR).stroke({ color: PALETTE.canvas, width: 1.5 });
      } else {
        pg.circle(cx, cy, dotR).fill({ color: PALETTE.offense, alpha: 0.7 });
        pg.circle(cx, cy, dotR).stroke({ color: PALETTE.offense, alpha: 0.3, width: 1 });
      }

      // ── Position label ────────────────────────────────────────────────
      let label = labelGfxRef.current.get(nflId);
      if (!label) {
        label = new Text({ text: state.player_position, style: posLabelStyle });
        label.anchor.set(0.5, 0);
        app.stage.addChild(label);
        labelGfxRef.current.set(nflId, label);
      }
      label.text = state.player_position;
      label.x = cx;
      label.y = cy + dotR + 2;
      label.style.fill = isDefense ? 0xf5f7fb : 0xaac0dd;
      label.alpha = isDefense ? 1 : 0.5;
      label.visible = true;
    }

    // Hide graphics for players no longer in frame
    const activeIds = new Set(playerMap.keys());
    for (const [nflId, pg] of playerGfxRef.current) {
      if (!activeIds.has(nflId)) {
        pg.clear();
        haloGfxRef.current.get(nflId)?.clear();
        const lbl = labelGfxRef.current.get(nflId);
        if (lbl) lbl.visible = false;
      }
    }
  }, [frames, currentFrame, pinnedNflId, onPlayerClick]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ aspectRatio: `${width}/${height}`, background: '#0a3828' }}
    />
  );
}
