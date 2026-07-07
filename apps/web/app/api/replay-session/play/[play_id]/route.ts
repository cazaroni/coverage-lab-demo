import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.PROJECTEDGE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ play_id: string }> },
) {
  const { play_id } = await params;

  try {
    const res = await fetch(`${API_BASE}/plays/${encodeURIComponent(play_id)}/replay-session`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Session creation failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
