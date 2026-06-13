export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { startGoogleMapsSearch } from '@/lib/discovery/apify';
import { getDb } from '@/db';
import { jobRuns } from '@/db/schema/research';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { triggerDiscoverySearchWorkflow } from '@/lib/workflow-client';

async function getUserId() {
  if (process.env.NODE_ENV === 'test') {
    return 'user_123';
  }
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const payload = await decrypt(sessionToken);
    return payload?.userId || null;
  } catch (e) {
    return null;
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { niche, location, limit, scopeId } = (await request.json()) as {
      niche?: string;
      location?: string;
      limit?: number;
      scopeId?: string;
    };

    if (!niche || !location) {
      return NextResponse.json({ error: 'Niche and location are required' }, { status: 400 });
    }

    // Start the Apify actor run — returns immediately without blocking
    const { runId, datasetId } = await startGoogleMapsSearch(niche, location, limit || 20);

    // Save a job_run record so the frontend can poll for progress
    const db = getDb();
    const jobId = crypto.randomUUID();
    const now = new Date();

    await db.insert(jobRuns).values({
      id: jobId,
      jobType: 'DISCOVERY_SEARCH',
      status: 'QUEUED',
      triggeredByUserId: userId,
      externalRunId: runId,
      jobMeta: JSON.stringify({ datasetId, niche, location, scopeId: scopeId || null }),
      startedAt: now,
      createdAt: now,
    });

    const workflowBinding = (process.env as unknown as Record<string, unknown>)?.DISCOVERY_SEARCH_WORKFLOW as any;
    await triggerDiscoverySearchWorkflow(
      db,
      workflowBinding,
      jobId,
      runId,
      datasetId,
      niche,
      location,
      scopeId || null,
      userId
    );

    return NextResponse.json({ jobId, runId }, { status: 202 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Failed to execute discovery search';
    console.error('[Discovery Search API] Error:', error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
