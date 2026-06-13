import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { getDb } from '../db';
import { checkApifyRunStatus, fetchApifyResults } from '../lib/discovery/apify';
import { candidateLeads } from '../db/schema/discovery';
import { jobRuns } from '../db/schema/research';
import { eq } from 'drizzle-orm';

type DiscoveryParams = {
  jobId: string;
  runId: string;
  datasetId: string;
  niche: string;
  location: string;
  scopeId: string | null;
  userId: string;
};

type Env = {
  DB: D1Database;
};

export class DiscoverySearchWorkflow extends WorkflowEntrypoint<Env, DiscoveryParams> {
  async run(event: WorkflowEvent<DiscoveryParams>, step: WorkflowStep) {
    const { jobId, runId, datasetId, niche, location, scopeId } = event.payload;

    // Inject environment variables and bindings into process.env so libraries can access them
    (process as any).env = {
      ...(process as any).env,
      ...this.env,
    };

    const db = getDb();

    try {
      // Step 1: Wait for Apify Google Maps run to succeed
      let status = await step.do(
        'check-apify-status',
        {
          retries: {
            limit: 3,
            delay: 2000,
            backoff: 'exponential',
          },
          timeout: '1 minute',
        },
        async () => {
          return await checkApifyRunStatus(runId);
        }
      );

      let retries = 0;
      const maxRetries = 40; // 40 * 15s = 10 minutes maximum duration
      while (status === 'RUNNING' || status === 'READY') {
        if (retries >= maxRetries) {
          throw new Error('Apify actor run timed out');
        }
        await step.sleep(`wait-for-apify-retry-${retries}`, '15 seconds');
        status = await step.do(
          `check-apify-status-retry-${retries}`,
          {
            retries: {
              limit: 3,
              delay: 2000,
              backoff: 'exponential',
            },
            timeout: '1 minute',
          },
          async () => {
            return await checkApifyRunStatus(runId);
          }
        );
        retries++;
      }

      if (status !== 'SUCCEEDED') {
        throw new Error(`Apify actor run failed with status: ${status}`);
      }

      // Step 2: Fetch Apify results
      const results = await step.do(
        'fetch-results',
        {
          retries: {
            limit: 5,
            delay: 3000,
            backoff: 'exponential',
          },
          timeout: '3 minutes',
        },
        async () => {
          return await fetchApifyResults(datasetId, niche, location);
        }
      );

      // Step 3: Insert candidate leads and update job status to COMPLETED
      await step.do(
        'save-candidates',
        {
          retries: {
            limit: 3,
            delay: 1000,
            backoff: 'linear',
          },
          timeout: '2 minutes',
        },
        async () => {
          const now = new Date();
          if (results.length > 0) {
            await db.insert(candidateLeads).values(
              results.map((r) => ({
                id: crypto.randomUUID(),
                discoveryScopeId: scopeId || null,
                rawName: r.name,
                rawWebsiteUrl: r.website,
                rawContactInfo: r.phone || null,
                rawLocation: [r.city, r.region].filter(Boolean).join(', ') || null,
                notes: r.industry ? `Industry: ${r.industry}` : null,
                status: 'NEW' as const,
                createdAt: now,
                updatedAt: now,
              })),
            );
          }

          await db.update(jobRuns)
            .set({ status: 'COMPLETED', finishedAt: now })
            .where(eq(jobRuns.id, jobId));
        }
      );

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error during discovery search';
      console.error(`DiscoverySearchWorkflow failed for job ${jobId}:`, error);

      try {
        await db.update(jobRuns)
          .set({
            status: 'FAILED',
            errorSummary: errMsg,
            finishedAt: new Date(),
          })
          .where(eq(jobRuns.id, jobId));
      } catch (dbErr) {
        console.error('Failed to write job failure status to DB:', dbErr);
      }

      throw error;
    }
  }
}
