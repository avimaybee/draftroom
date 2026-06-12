# Tasks

*Executable units of work based on the current stage in PLAN.md.*

## Stage 3: Research Pipeline & Cloudflare Workflows

### 1. Web Scraping Service
- [x] Install Jina Reader / create a lightweight utility (`src/lib/scraper.ts`) to fetch URLs.
- [x] Add timeout handling and markdown truncation (max 15,000 characters) to prevent token limits.
- [x] Write integration test verifying scraper correctly fetches an external site.

### 2. Workflow Infrastructure Setup
- [x] Install/Configure Cloudflare Workflows types (`@cloudflare/workers-types` already present).
- [x] Define the `ResearchSnapshotWorkflow` class in `src/workflows/research-snapshot.ts`.
- [x] Implement Workflow Steps:
  - `step("fetch-lead")`
  - `step("fetch-site")`
  - `step("call-llm")`
  - `step("save-snapshot")`
  - `step("mark-job-complete")`
- [x] Update `wrangler.toml` to bind `RESEARCH_SNAPSHOT_WORKFLOW`.

### 3. Application API Wiring
- [x] Modify `POST /api/leads/[id]/research` to create a `job_runs` row and trigger the Workflow instance.
- [x] Ensure the endpoint immediately returns the `{ jobId }` without awaiting the actual LLM generation.
- [x] Implement `GET /api/jobs/[id]` to allow the UI to poll the job status.

### 4. UI Implementation (Lead Detail)
- [x] Update the Lead Detail page to support triggering the workflow.
- [x] Implement UI polling (e.g., polling `/api/jobs/[id]` every 2.5 seconds) when a job is `RUNNING`.
- [x] Display a loading indicator / steps progress based on the job status.
- [x] Once the job reaches `COMPLETED`, automatically refresh the Lead Detail page to display the new Snapshot.

### 5. Verification & Testing
- [x] Verify local workflow simulation works using `wrangler dev` or Next.js local integration.
- [x] Ensure failure states (e.g., website unreachable, LLM rate limit) correctly mark the job as `FAILED` and present an error message to the user allowing them to retry.

## Stage 2: Discovery Intake & AI Triage (Completed)

### 1. Sourcing Lead Slices
- [x] Install `apify-client` to connect to Google Maps scraping actors.
- [x] Create backend service `src/lib/discovery/apify.ts` to query maps search queries.
- [x] Implement UI at `/discovery` allowing niches and city locations to be searched.
- [x] Support checkboxes to bulk import discovered leads.

### 2. Triage AI (Cloudflare Workflows)
- [x] Create `src/workflows/triage-workflow.ts` bound in `wrangler.toml`.
- [x] Rules:
  - If no website ➜ score `HIGH` priority.
  - If website exists ➜ fetch with Jina and query active LLM to check if modern (`SKIP`) or outdated (`MEDIUM` priority).
- [x] Create `/functions/_middleware.ts` to export workflow classes so Wrangler builds compile correctly.

### 3. Settings & Integrations
- [x] Add OpenRouter and Groq to integrations settings.
- [x] Centralize LLM triage queries in `src/lib/ai.ts` (`runTriageAI`) to dynamically route to the user's active provider config.
- [x] Replace text input for model names with a dynamic `<select>` dropdown.
- [x] Query `/api/settings/models` on key change to pull live model lists.
- [x] Support manual fallback text input for custom model names.

