import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { getDb } from '@/db';
import { leads, activities } from '@/db/schema/core';
import { eq } from 'drizzle-orm';
import { fetchSiteContent } from '@/lib/scraper';
import { runTriageAI } from '@/lib/ai';

type TriageParams = {
  leadId: string;
};

type Env = {
  DB: unknown;
};

export class TriageWorkflow extends WorkflowEntrypoint<Env, TriageParams> {
  async run(event: WorkflowEvent<TriageParams>, step: WorkflowStep) {
    const { leadId } = event.payload;

    // Inject the database binding into process.env so that our standard getDb() works
    (process as any).env = {
      ...(process as any).env,
      DB: this.env.DB,
    };

    // 1. Fetch Lead
    const lead = await step.do('fetch-lead', async () => {
      const db = getDb();
      const results = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      return results[0] || null;
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    // 2. Initial Website Check
    if (!lead.website) {
      await step.do('mark-no-website', async () => {
        const db = getDb();
        await db.update(leads)
          .set({ triagePriority: 'HIGH', triageReason: 'No website detected.' })
          .where(eq(leads.id, leadId));
          
        await db.insert(activities).values({
          id: crypto.randomUUID(),
          leadId,
          type: 'Triage complete',
          summary: 'Scored HIGH priority due to missing website.',
          timestamp: new Date(),
        });
      });
      return { status: 'COMPLETED', priority: 'HIGH' };
    }

    // 3. Fetch Site Content (if website exists)
    const siteContent = await step.do('fetch-site', async () => {
      try {
        const content = await fetchSiteContent(lead.website!);
        // Truncate to first 5000 chars for triage to save tokens/time
        return content.content.substring(0, 5000);
      } catch (err: unknown) {
        return null;
      }
    });

    if (!siteContent) {
      await step.do('mark-fetch-failed', async () => {
        const db = getDb();
        await db.update(leads)
          .set({ triagePriority: 'HIGH', triageReason: 'Website failed to load or is unreachable.' })
          .where(eq(leads.id, leadId));
      });
      return { status: 'COMPLETED', priority: 'HIGH' };
    }

    // 4. AI Triage Analysis
    const triageResult = await step.do('analyze-site', async () => {
      const db = getDb();
      return await runTriageAI(db, siteContent);
    });

    // 5. Save Triage Result
    await step.do('save-triage', async () => {
      const db = getDb();
      const priority = triageResult.status === 'MODERN' ? 'SKIP' : 'MEDIUM';
      
      await db.update(leads)
        .set({ triagePriority: priority, triageReason: triageResult.reason })
        .where(eq(leads.id, leadId));
        
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId,
        type: 'Triage complete',
        summary: `Scored ${priority} priority. Reason: ${triageResult.reason}`,
        timestamp: new Date(),
      });
    });

    return { status: 'COMPLETED', priority: triageResult.status === 'MODERN' ? 'SKIP' : 'MEDIUM' };
  }
}
