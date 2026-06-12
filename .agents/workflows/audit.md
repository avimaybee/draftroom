---
description: audit to eliminate noodle/slop code and keep the codebase modular
---

# Workflow: Ruthless Code Audit (`/audit`)

This workflow defines the protocol and steps that the AI agent must execute when the user invokes `/audit` or requests a code audit.

---

## Objective
To identify code smells, architectural weaknesses, "slop/noodle code," modularity violations, and type safety issues, ensuring the codebase complies with the principles set out in `AGENTS.md` and `GEMINI.md`.

---

## Execution Checklist

When `/audit` is invoked, the agent must run through these phases:

### Phase 1: Modularity & Architecture
- [ ] **File Size & Responsibility**: Check if any single React component exceeds 250 lines, or if any file does too many things. If it does, plan to break it into logical subcomponents (e.g. following the container/presentational pattern).
- [ ] **State Splitting**: Ensure UI states (Empty, Loading, Error, Data Display) are delegated to isolated components.
- [ ] **Coupling Check**: Verify that presentation layers are decoupled from raw database queries, direct API fetching code, or complex business simulations.

### Phase 2: Type Safety & Validation
- [ ] **TypeScript Strictness**: Scan for any `any` typings, unchecked type assertions (`as any` unless absolutely necessary due to framework bugs), and implicit types.
- [ ] **Runtime Validation**: Confirm that database queries, API inputs, and LLM payloads are strictly validated using `zod` schemas or matching TypeScript models.

### Phase 3: Error Resilience & Boundaries
- [ ] **Async Try-Catch**: Check that all asynchronous functions, especially database updates and network calls (like `fetch`), are wrapped in explicit `try-catch` blocks.
- [ ] **Empty & Error UI States**: Verify that components that depend on remote data gracefully handle empty results, slow loading (using skeleton screens or steppers), and API failures.
- [ ] **DB Constraints**: Ensure database writes do not violate foreign keys or unique constraints (e.g., matching users exist before jobs are run).

### Phase 4: Output the Audit Report
After running the analysis, generate an audit report artifact (`audit_report.md` or a direct markdown output if it is small) summarizing:
1. **Critical Modularity Violations** (large files, coupled states)
2. **Type Safety Gaps** (implicit `any`, unvalidated payloads)
3. **Resilience Gaps** (missing error boundaries, raw unhandled promises)
4. **Actionable Refactoring Plan** (concrete steps to resolve the slop)
