import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { getDb } from "../db";
import { fetchSiteContent } from "../lib/scraper";
import { generateResearch } from "../lib/ai";
import { jobRuns, researchSnapshots } from "../db/schema/research";
import { leads, activities } from "../db/schema/core";
import { eq } from "drizzle-orm";

type Env = {
  DB: D1Database;
};

type Params = {
  leadId: string;
  jobId: string;
  userId?: string | null;
};

export class ResearchSnapshotWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { leadId, jobId, userId } = event.payload;

    // Inject the database binding into process.env so that our standard getDb() works
    (process as any).env = {
      ...(process as any).env,
      DB: this.env.DB,
    };

    const db = getDb();

    try {
      // Step 1: Fetch Lead Info
      const lead = await step.do("fetch-lead", async () => {
        const [row] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        if (!row) {
          throw new Error(`Lead not found: ${leadId}`);
        }
        return {
          name: row.name,
          company: row.company || null,
          website: row.website || null,
          industry: row.industry || null,
        };
      });

      // Step 2: Fetch and scrape website
      const scraped = await step.do("fetch-site", async () => {
        if (!lead.website) {
          return null;
        }
        try {
          return await fetchSiteContent(lead.website);
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`Website scraping failed for ${lead.website}:`, error);
          // Return placeholder structure so we can still attempt enrichment based on metadata
          return {
            title: "",
            url: lead.website,
            content: `[Failed to scrape website: ${errMsg}]`,
            description: "",
          };
        }
      });

      // Step 3: LLM Inference
      const research = await step.do("call-llm", async () => {
        const websiteMarkdown = scraped?.content || null;
        return await generateResearch(
          db,
          lead.name,
          lead.company,
          lead.website,
          lead.industry,
          websiteMarkdown
        );
      });

      // Step 4: Save Snapshot & Activity
      const snapshotId = crypto.randomUUID();
      await step.do("save-snapshot", async () => {
        await db.insert(researchSnapshots).values({
          id: snapshotId,
          leadId,
          createdByUserId: userId || null,
          origin: "AI_GENERATED",
          snapshotTitle: scraped?.title ? `Research Snapshot: ${scraped.title}` : "AI Research Snapshot",
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
          type: "Research generated",
          summary: `AI research snapshot generated with ${research.confidenceLevel} confidence`,
          timestamp: new Date(),
        });
      });

      // Step 5: Mark Job Complete
      await step.do("mark-job-complete", async () => {
        await db.update(jobRuns)
          .set({
            status: "COMPLETED",
            finishedAt: new Date(),
          })
          .where(eq(jobRuns.id, jobId));
      });

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown workflow error occurred";
      console.error(`Research Snapshot Workflow failed for lead ${leadId}:`, error);

      // Save failure details inside DB
      try {
        await db.update(jobRuns)
          .set({
            status: "FAILED",
            errorSummary: errMsg,
            finishedAt: new Date(),
          })
          .where(eq(jobRuns.id, jobId));

        await db.insert(activities).values({
          id: crypto.randomUUID(),
          leadId,
          type: "Enrichment failed",
          summary: `AI research generation failed: ${errMsg}`,
          timestamp: new Date(),
        });
      } catch (dbErr: unknown) {
        console.error("Failed to write workflow error to DB:", dbErr);
      }

      throw error;
    }
  }
}
