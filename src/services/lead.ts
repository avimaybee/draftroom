import { eq, and, ne } from 'drizzle-orm';
import { leads } from '../db/schema/core';
import { CreateLeadInput } from '../db/models/lead';

export class LeadService {
  constructor(private db: any) {}

  async createLead(input: CreateLeadInput) {
    const id = crypto.randomUUID();
    const now = new Date();
    
    await this.db.insert(leads).values({
      ...input,
      id,
      stage: input.stage || 'New',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    });

    const [lead] = await this.db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return lead;
  }

  async listLeads() {
    return this.db.select().from(leads).where(eq(leads.status, 'Active'));
  }

  async getLead(id: string) {
    const [lead] = await this.db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return lead;
  }

  async updateLead(id: string, input: Partial<CreateLeadInput>) {
    const now = new Date();
    await this.db.update(leads).set({
      ...input,
      updatedAt: now,
    }).where(eq(leads.id, id));

    return this.getLead(id);
  }

  async archiveLead(id: string) {
    const now = new Date();
    await this.db.update(leads).set({
      status: 'Archived',
      updatedAt: now,
    }).where(eq(leads.id, id));

    return this.getLead(id);
  }
}
