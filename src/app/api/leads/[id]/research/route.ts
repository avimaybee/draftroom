export const dynamic = 'force-dynamic';

/**
 * POST /api/leads/[id]/research
 *
 * Starts an AI research job for a lead. Returns immediately with a jobId.
 * The frontend must poll POST /api/jobs/[jobId]/advance every ~5 seconds
 * until status becomes COMPLETED or FAILED.
 *
 * When the lead has a website, the Apify Google Maps actor is NOT used here —
 * instead we skip straight to scraping + LLM since the lead is already known.
 * We store a stub externalRunId='DIRECT' to signal the advance route to skip
 * the Apify status check and proceed directly to scraping + LLM.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { jobRuns } from '@/db/schema/research';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { triggerResearchWorkflow } from '@/lib/workflow-client';

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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leadId } = await params;
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const jobId = crypto.randomUUID();
  const now = new Date();

  try {
    // Create job in QUEUED status with a special externalRunId='DIRECT'
    await db.insert(jobRuns).values({
      id: jobId,
      jobType: 'RESEARCH_GENERATION',
      status: 'QUEUED',
      targetLeadId: leadId,
      triggeredByUserId: userId,
      externalRunId: 'DIRECT', // sentinel: no Apify run needed, go straight to LLM
      startedAt: null,
      finishedAt: null,
      createdAt: now,
    });

    const workflowBinding = (process.env as unknown as Record<string, unknown>)?.RESEARCH_SNAPSHOT_WORKFLOW as any;
    await triggerResearchWorkflow(db, workflowBinding, leadId, jobId, userId);

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Failed to trigger research:', error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
