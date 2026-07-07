'use client';

import { decodeReplayMessage, type ConnectionStatus, type ReplayFrame } from './replay-protocol';

function resolveWsBase(): string {
  const configured =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_REALTIME_WS_URL : undefined;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  return 'ws://localhost:8001';
}

export class ReplaySocket {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private token: string = '';

  constructor(
    private readonly onFrame: (frames: ReplayFrame[]) => void,
    private readonly onStatusChange: (s: ConnectionStatus) => void,
    private readonly onInit?: (frameCount: number, modelVersion: string) => void,
  ) {}

  connect(token: string): void {
    this.token = token;
    this.retryCount = 0;
    this._open();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close(1000);
      this.ws = null;
    }
  }

  private _open(): void {
    this.onStatusChange('connecting');
    const url = `${resolveWsBase()}/ws/replay?token=${encodeURIComponent(this.token)}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) {
        return;
      }

      const msg = decodeReplayMessage(ev.data);
      if (!msg) return;

      if (msg.type === 'init') {
        this.onStatusChange('streaming');
        this.onInit?.(msg.frame_count, msg.model_version);
      } else if (msg.type === 'chunk') {
        this.onFrame(msg.frames);
      } else if (msg.type === 'end') {
        this.onStatusChange('complete');
      } else if (msg.type === 'error') {
        this.onStatusChange('error');
      }
    };

    ws.onerror = () => {
      this.onStatusChange('error');
    };

    ws.onclose = (ev) => {
      if (ev.code === 1000) return;
      if (this.retryCount < 1) {
        this.retryCount++;
        setTimeout(() => this._open(), 2000);
      } else {
        this.onStatusChange('error');
      }
    };
  }
}
