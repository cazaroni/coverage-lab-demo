import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.PROJECTEDGE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ drive_id: string }> },
) {
  const { drive_id } = await params;

  try {
    const res = await fetch(`${API_BASE}/drives/${encodeURIComponent(drive_id)}/replay-session`, {
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
