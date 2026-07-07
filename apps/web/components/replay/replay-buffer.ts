import type { ReplayFrame } from '@/lib/replay-protocol';

export class ReplayBuffer {
  private frames: ReplayFrame[] = [];
  private capacity: number;

  constructor(capacity = 600) {
    this.capacity = capacity;
  }

  push(frame: ReplayFrame): void {
    if (this.frames.length >= this.capacity) {
      this.frames.shift();
    }
    this.frames.push(frame);
  }

  pushMany(incoming: ReplayFrame[]): void {
    for (const f of incoming) this.push(f);
  }

  get(index: number): ReplayFrame | undefined {
    return this.frames[index];
  }

  get length(): number {
    return this.frames.length;
  }

  get totalFrames(): number {
    return this.frames.length;
  }

  getAll(): ReplayFrame[] {
    return this.frames;
  }

  clear(): void {
    this.frames = [];
  }
}
