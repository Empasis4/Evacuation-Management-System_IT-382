import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * CRON HEARTBEAT ENDPOINT
 * This is meant to be called by a CRON scheduler (Vercel Cron, Cron-job.org, etc.)
 * It triggers the full weather evaluation pipeline.
 */
export async function GET(request: Request) {
  try {
    // 1. Security Check (Optional: Add a CRON_SECRET header check here)
    const authHeader = request.headers.get('authorization');
    // For now, we allow it, but in production, you should check for a secret token
    
    // 2. Trigger the evaluation
    // We call our internal API to ensure logic is reused
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/weather/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await res.json();

    if (!res.ok) throw new Error(result.error || 'Evaluation failed');

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      evaluation: result.evaluation
    });

  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: String(err),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
