import { getDb, type Db } from '@/db';
import { fetchSiteContent } from '@/lib/scraper';
import { generateResearch, runTriageAI } from '@/lib/ai';
import { jobRuns, researchSnapshots } from '@/db/schema/research';
import { leads, activities } from '@/db/schema/core';
import { eq } from 'drizzle-orm';

interface CloudflareWorkflow {
  create(options: { params: Record<string, unknown> }): Promise<unknown>;
}

/**
 * Triggers the Research Snapshot Workflow.
 * If running under Cloudflare with the Workflow binding available, it triggers the real durable workflow.
 * If running locally in Node.js (Next.js dev server, tests) where the binding is absent, it simulates
 * the identical step-by-step workflow asynchronously in the background.
 */
export async function triggerResearchWorkflow(
  db: Db,
  workflowBinding: CloudflareWorkflow | undefined | null,
  leadId: string,
  jobId: string,
  userId?: string | null
) {
  if (workflowBinding && typeof workflowBinding.create === 'function') {
    console.log(`[WorkflowClient] Triggering Cloudflare Workflow for lead: ${leadId}, job: ${jobId}`);
    try {
      await workflowBinding.create({
        params: { leadId, jobId, userId: userId || null }
      });
      return;
    } catch (err: unknown) {
      console.error('[WorkflowClient] Failed to trigger Cloudflare Workflow binding. Falling back to simulation.', err);
    }
  }

  // Simulation mode
  console.log(`[WorkflowClient] Local simulation mode for lead: ${leadId}, job: ${jobId}`);

  // Run asynchronously in the background
  (async () => {
    try {
      // Step 1: Fetch Lead Info
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Update job run status to RUNNING
      await db.update(jobRuns)
        .set({ status: 'RUNNING', startedAt: new Date() })
        .where(eq(jobRuns.id, jobId));

      // Step 2: Fetch and scrape website
      let scraped = null;
      if (lead.website) {
        try {
          // Add a minor artificial delay for local realism if desired, but not strictly required
          scraped = await fetchSiteContent(lead.website);
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`[WorkflowClient Simulation] Website scraping failed for ${lead.website}:`, error);
          scraped = {
            title: '',
            url: lead.website,
            content: `[Failed to scrape website: ${errMsg}]`,
            description: '',
          };
        }
      }

      // Step 3: LLM Inference
      const research = await generateResearch(
        db,
        lead.name,
        lead.company || null,
        lead.website || null,
        lead.industry || null,
        scraped?.content || null
      );

      // Step 4: Save Snapshot & Activity
      const snapshotId = crypto.randomUUID();
      await db.insert(researchSnapshots).values({
        id: snapshotId,
        leadId,
        createdByUserId: userId || null,
        origin: 'AI_GENERATED',
        snapshotTitle: scraped?.title ? `Research Snapshot: ${scraped.title}` : 'AI Research Snapshot',
        companySummary: research.companySummary,
        productsServicesSummary: research.productsServicesSummary,
        digitalPresenceNotes: research.digitalPresenceNotes,
        websiteNotes: research.websiteNotes,
        brandingNotes: research.brandingNotes,
        painPointsHypotheses: research.painPointsHypotheses,
        opportunityHypotheses: research.opportunityHypotheses,
        sources: JSON.stringify(research.sources || [lead.website].filter(Boolean)),
        confidenceLevel: research.confidenceLevel,
        jobRunId: jobId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Log system activity
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId,
        type: 'Research generated',
        summary: `AI research snapshot generated with ${research.confidenceLevel} confidence`,
        timestamp: new Date(),
      });

      // Step 5: Mark Job Complete
      await db.update(jobRuns)
        .set({
          status: 'COMPLETED',
          finishedAt: new Date(),
        })
        .where(eq(jobRuns.id, jobId));

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error occurred during simulation';
      console.error(`[WorkflowClient Simulation] Research workflow failed for lead ${leadId}:`, error);

      // Update job run to FAILED in DB
      try {
        await db.update(jobRuns)
          .set({
            status: 'FAILED',
            errorSummary: errMsg,
            finishedAt: new Date(),
          })
          .where(eq(jobRuns.id, jobId));

        await db.insert(activities).values({
          id: crypto.randomUUID(),
          leadId,
          type: 'Enrichment failed',
          summary: `AI research generation failed: ${errMsg}`,
          timestamp: new Date(),
        });
      } catch (dbErr: unknown) {
        console.error('[WorkflowClient Simulation] Failed to write failure status to DB:', dbErr);
      }
    }
  })();
}

/**
 * Triggers the Triage Workflow.
 * If running under Cloudflare with the Workflow binding available, it triggers the real durable workflow.
 * If running locally in Node.js (Next.js dev server, tests) where the binding is absent, it simulates
 * the identical triage process asynchronously in the background.
 */
export async function triggerTriageWorkflow(
  db: Db,
  workflowBinding: CloudflareWorkflow | undefined | null,
  leadId: string
) {
  if (workflowBinding && typeof workflowBinding.create === 'function') {
    console.log(`[WorkflowClient] Triggering Cloudflare Triage Workflow for lead: ${leadId}`);
    try {
      await workflowBinding.create({
        params: { leadId }
      });
      return;
    } catch (err: unknown) {
      console.error('[WorkflowClient] Failed to trigger Cloudflare Triage Workflow binding. Falling back to simulation.', err);
    }
  }

  // Simulation mode
  console.log(`[WorkflowClient] Local simulation mode for triage on lead: ${leadId}`);

  // Run asynchronously in the background
  (async () => {
    try {
      // 1. Fetch Lead
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // 2. Initial Website Check
      if (!lead.website) {
        await db.update(leads)
          .set({ triagePriority: 'HIGH', triageReason: 'No website detected.' })
          .where(eq(leads.id, leadId));
          
        await db.insert(activities).values({
          id: crypto.randomUUID(),
          leadId,
          type: 'Triage complete',
          summary: 'Scored HIGH priority due to missing website (Simulation).',
          timestamp: new Date(),
        });
        return;
      }

      // 3. Fetch Site Content
      let siteContent = null;
      try {
        siteContent = await fetchSiteContent(lead.website);
      } catch (err: unknown) {
        // Unreachable website is high priority opportunity
        await db.update(leads)
          .set({ triagePriority: 'HIGH', triageReason: 'Website failed to load or is unreachable.' })
          .where(eq(leads.id, leadId));

        await db.insert(activities).values({
          id: crypto.randomUUID(),
          leadId,
          type: 'Triage complete',
          summary: 'Scored HIGH priority due to unreachable website (Simulation).',
          timestamp: new Date(),
        });
        return;
      }

      // 4. AI Triage Analysis
      const triageResult = await runTriageAI(db, siteContent.content.substring(0, 5000));
      const priority = triageResult.status === 'MODERN' ? 'SKIP' : 'MEDIUM';

      // 5. Save Triage Result
      await db.update(leads)
        .set({ triagePriority: priority, triageReason: triageResult.reason })
        .where(eq(leads.id, leadId));
        
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId,
        type: 'Triage complete',
        summary: `Scored ${priority} priority. Reason: ${triageResult.reason} (Simulation)`,
        timestamp: new Date(),
      });

    } catch (error: unknown) {
      console.error(`[WorkflowClient Simulation] Triage workflow failed for lead ${leadId}:`, error);
    }
  })();
}

