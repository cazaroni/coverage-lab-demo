export type PlayerPositionMsg = {
  nfl_id: number;
  player_label: string;
  player_position: string;
  player_side: string;
  x: number;
  y: number;
  s: number;
  o: number;
  dir: number;
  node_stress: number;
  is_ball_carrier: boolean;
  frame_dci?: number;
  frame_dis?: number;
};

export type ReplayFrame = {
  frame_id: number;
  clip_index?: number;
  is_bridge?: boolean;
  players: PlayerPositionMsg[];
};

export type ReplayInitMsg = {
  type: 'init';
  play_id?: string;
  drive_id?: string;
  frame_count: number;
  model_version: string;
};

export type ReplayChunkMsg = { type: 'chunk'; frames: ReplayFrame[] };
export type ReplayEndMsg = { type: 'end' };
export type ReplayErrorMsg = { type: 'error'; code: string; message: string };

export type ReplayMessage = ReplayInitMsg | ReplayChunkMsg | ReplayEndMsg | ReplayErrorMsg;

export type ConnectionStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

const WS_MSG_INIT = 1;
const WS_MSG_FRAME = 2;
const WS_MSG_END = 3;
const WS_MSG_ERROR = 4;

function decodePayloadJson<T>(data: Uint8Array): T | null {
  if (data.length === 0) return null;
  try {
    const text = new TextDecoder().decode(data);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function readVarint(bytes: Uint8Array, start: number): [number, number] {
  let value = 0;
  let shift = 0;
  let index = start;
  while (index < bytes.length) {
    const part = bytes[index] ?? 0;
    value |= (part & 0x7f) << shift;
    index += 1;
    if ((part & 0x80) === 0) return [value >>> 0, index];
    shift += 7;
    if (shift > 35) break;
  }
  return [0, start];
}

function readFloat32(bytes: Uint8Array, start: number): [number, number] {
  if (start + 4 > bytes.length) return [0, start];
  const view = new DataView(bytes.buffer, bytes.byteOffset + start, 4);
  return [view.getFloat32(0, true), start + 4];
}

function skipField(bytes: Uint8Array, wireType: number, start: number): number {
  if (wireType === 0) {
    const [, next] = readVarint(bytes, start);
    return next;
  }
  if (wireType === 1) return start + 8;
  if (wireType === 2) {
    const [len, afterLen] = readVarint(bytes, start);
    return afterLen + len;
  }
  if (wireType === 5) return start + 4;
  return bytes.length;
}

function decodeString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function decodeEntityPosition(bytes: Uint8Array): PlayerPositionMsg {
  const player: PlayerPositionMsg = {
    nfl_id: 0,
    player_label: '',
    player_position: '',
    player_side: '',
    x: 0,
    y: 0,
    s: 0,
    o: 0,
    dir: 0,
    node_stress: 0,
    is_ball_carrier: false,
  };

  let index = 0;
  while (index < bytes.length) {
    const [tag, nextTag] = readVarint(bytes, index);
    if (nextTag === index) break;
    index = nextTag;

    const field = tag >>> 3;
    const wire = tag & 0x7;

    if (field === 1 && wire === 0) {
      const [value, next] = readVarint(bytes, index);
      player.nfl_id = value;
      index = next;
      continue;
    }

    if ((field === 2 || field === 3 || field === 4) && wire === 2) {
      const [len, afterLen] = readVarint(bytes, index);
      const end = afterLen + len;
      const text = decodeString(bytes.subarray(afterLen, end));
      if (field === 2) player.player_label = text;
      if (field === 3) player.player_position = text;
      if (field === 4) player.player_side = text;
      index = end;
      continue;
    }

    if (wire === 5 && field >= 5 && field <= 10) {
      const [value, next] = readFloat32(bytes, index);
      if (field === 5) player.x = value;
      if (field === 6) player.y = value;
      if (field === 7) player.s = value;
      if (field === 8) player.o = value;
      if (field === 9) player.dir = value;
      if (field === 10) player.node_stress = value;
      index = next;
      continue;
    }

    if (field === 11 && wire === 0) {
      const [value, next] = readVarint(bytes, index);
      player.is_ball_carrier = value !== 0;
      index = next;
      continue;
    }

    if ((field === 12 || field === 13) && wire === 5) {
      const [value, next] = readFloat32(bytes, index);
      if (field === 12) player.frame_dci = value;
      if (field === 13) player.frame_dis = value;
      index = next;
      continue;
    }

    index = skipField(bytes, wire, index);
  }

  return player;
}

function decodeReplayFrame(bytes: Uint8Array): ReplayFrame | null {
  const frame: ReplayFrame = {
    frame_id: 0,
    players: [],
  };

  let index = 0;
  while (index < bytes.length) {
    const [tag, nextTag] = readVarint(bytes, index);
    if (nextTag === index) break;
    index = nextTag;

    const field = tag >>> 3;
    const wire = tag & 0x7;

    if (field === 1 && wire === 0) {
      const [value, next] = readVarint(bytes, index);
      frame.frame_id = value;
      index = next;
      continue;
    }

    if (field === 2 && wire === 0) {
      const [value, next] = readVarint(bytes, index);
      frame.clip_index = value;
      index = next;
      continue;
    }

    if (field === 3 && wire === 0) {
      const [value, next] = readVarint(bytes, index);
      frame.is_bridge = value !== 0;
      index = next;
      continue;
    }

    if (field === 4 && wire === 2) {
      const [len, afterLen] = readVarint(bytes, index);
      const end = afterLen + len;
      frame.players.push(decodeEntityPosition(bytes.subarray(afterLen, end)));
      index = end;
      continue;
    }

    index = skipField(bytes, wire, index);
  }

  return frame;
}

export function decodeReplayMessage(data: ArrayBuffer): ReplayMessage | null {
  const bytes = new Uint8Array(data);
  if (bytes.length === 0) return null;

  const kind = bytes[0];
  const payload = bytes.subarray(1);

  if (kind === WS_MSG_INIT) {
    const init = decodePayloadJson<Omit<ReplayInitMsg, 'type'>>(payload);
    return init ? { type: 'init', ...init } : null;
  }

  if (kind === WS_MSG_FRAME) {
    const frame = decodeReplayFrame(payload);
    return frame ? { type: 'chunk', frames: [frame] } : null;
  }

  if (kind === WS_MSG_END) {
    return { type: 'end' };
  }

  if (kind === WS_MSG_ERROR) {
    const error = decodePayloadJson<Omit<ReplayErrorMsg, 'type'>>(payload);
    return error ? { type: 'error', ...error } : null;
  }

  return null;
}
