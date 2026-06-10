import { test } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { LeadService } from '../../services/lead';
import { leads } from '../schema/core';

function setupTestDb() {
  const sqlite = new Database(':memory:');
  
  sqlite.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      city TEXT,
      region TEXT,
      industry TEXT,
      stage TEXT NOT NULL DEFAULT 'New',
      status TEXT NOT NULL DEFAULT 'Active',
      owner_id TEXT REFERENCES users(id),
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  const db = drizzle(sqlite);
  return { db, service: new LeadService(db) };
}

test('LeadService integration', async (t) => {
  const { service } = setupTestDb();

  await t.test('createLead should create a lead', async () => {
    const lead = await service.createLead({
      name: 'Jane Smith',
      company: 'Jane Corp',
      industry: 'Technology',
    });
    assert.strictEqual(lead.name, 'Jane Smith');
    assert.strictEqual(lead.company, 'Jane Corp');
    assert.strictEqual(lead.stage, 'New');
  });

  await t.test('listLeads should return active leads', async () => {
    await service.createLead({ name: 'Lead 1' });
    await service.createLead({ name: 'Lead 2' });
    
    const list = await service.listLeads();
    assert.strictEqual(list.length, 3); // Including the one from previous test
  });

  await t.test('archiveLead should mark lead as Archived', async () => {
    const lead = await service.createLead({ name: 'To Archive' });
    const archived = await service.archiveLead(lead.id);
    assert.strictEqual(archived.status, 'Archived');
    
    const list = await service.listLeads();
    assert.ok(!list.find((l: any) => l.id === lead.id));
  });
});
