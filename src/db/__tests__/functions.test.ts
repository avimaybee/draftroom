import { test } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { onRequestGet as getScopes, onRequestPost as postScope } from '../../../functions/api/scopes';
import { onRequestGet as getCandidates, onRequestPost as postCandidate, onRequestPatch as patchCandidate } from '../../../functions/api/candidates';
import { DiscoveryService } from '../../services/discovery';

class MockD1Database {
  constructor(private sqlite: any) {}

  prepare(query: string) {
    const stmt = this.sqlite.prepare(query);
    
    const createPreparedStatement = (boundParams: any[]): any => {
      return {
        bind: (...params: any[]) => {
          return createPreparedStatement(boundParams.concat(params.flat()));
        },
        all: async () => {
          try {
            const results = stmt.all(...boundParams);
            return { results, success: true };
          } catch (e: any) {
            console.error('SQLite stmt.all error:', e);
            throw new Error(`Failed query: ${query}\nparams: ${boundParams.join(', ')}\n${e.message}`);
          }
        },
        run: async () => {
          try {
            const info = stmt.run(...boundParams);
            return { success: true, meta: info };
          } catch (e: any) {
            console.error('SQLite stmt.run error:', e);
            throw new Error(`Failed query: ${query}\nparams: ${boundParams.join(', ')}\n${e.message}`);
          }
        },
        first: async () => {
          try {
            return stmt.get(...boundParams);
          } catch (e: any) {
            console.error('SQLite stmt.get error:', e);
            throw new Error(`Failed query: ${query}\nparams: ${boundParams.join(', ')}\n${e.message}`);
          }
        },
        raw: async () => {
          try {
            stmt.raw(true);
            const results = stmt.all(...boundParams);
            stmt.raw(false);
            return results;
          } catch (e: any) {
            console.error('SQLite stmt.raw error:', e);
            throw new Error(`Failed query (raw): ${query}\nparams: ${boundParams.join(', ')}\n${e.message}`);
          }
        }
      };
    };

    return createPreparedStatement([]);
  }

  async exec(query: string) {
    this.sqlite.exec(query);
    return { count: 1, duration: 0 };
  }
}

function setupTestDb() {
  const sqlite = new Database(':memory:');
  
  // Create tables
  sqlite.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
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
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      timestamp INTEGER
    );

    CREATE TABLE discovery_scopes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      industry_filter TEXT,
      geography_filter TEXT,
      company_size_filter TEXT,
      business_type_filter TEXT,
      digital_presence_filter TEXT,
      notes TEXT,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE candidate_leads (
      id TEXT PRIMARY KEY,
      discovery_scope_id TEXT REFERENCES discovery_scopes(id),
      raw_name TEXT NOT NULL,
      raw_website_url TEXT,
      raw_contact_info TEXT,
      raw_location TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'NEW',
      promoted_lead_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const mockD1 = new MockD1Database(sqlite);
  return mockD1;
}

test('API Endpoint - POST /api/scopes creates a scope successfully', async () => {
  const mockD1 = setupTestDb();
  
  const payload = {
    name: 'Real Estate Agents',
    createdByUserId: 'user_123'
  };

  const mockRequest = {
    json: async () => payload
  } as any;

  const mockContext = {
    request: mockRequest,
    env: { DB: mockD1 as any }
  } as any;

  const response = await postScope(mockContext);
  assert.strictEqual(response.status, 201);

  const body = await response.json() as any;
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.name, 'Real Estate Agents');
  assert.strictEqual(body.data.createdByUserId, 'user_123');
  assert.ok(body.data.id);
});

test('API Endpoint - GET /api/scopes returns empty list initially', async () => {
  const mockD1 = setupTestDb();
  
  const mockContext = {
    request: { url: 'https://localhost/api/scopes' } as any,
    env: { DB: mockD1 as any }
  } as any;

  const response = await getScopes(mockContext);
  assert.strictEqual(response.status, 200);

  const body = await response.json() as any;
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.length, 0);
});

test('API Endpoint - POST /api/candidates creates a candidate successfully', async () => {
  const mockD1 = setupTestDb();

  const payload = {
    rawName: 'Dream Homes Realty',
    rawWebsiteUrl: 'https://dreamhomes.com',
    status: 'NEW'
  };

  const mockRequest = {
    json: async () => payload
  } as any;

  const mockContext = {
    request: mockRequest,
    env: { DB: mockD1 as any }
  } as any;

  const response = await postCandidate(mockContext);
  assert.strictEqual(response.status, 201);

  const body = await response.json() as any;
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.rawName, 'Dream Homes Realty');
  assert.strictEqual(body.data.rawWebsiteUrl, 'https://dreamhomes.com');
  assert.ok(body.data.id);
});

test('API Endpoint - PATCH /api/candidates updates status successfully', async () => {
  const mockD1 = setupTestDb();
  const db = require('drizzle-orm/better-sqlite3').drizzle((mockD1 as any).sqlite);
  const service = new DiscoveryService(db);

  // Setup candidate
  await service.createCandidateLead('cand_123', {
    rawName: 'Dream Homes Realty',
    status: 'NEW'
  });

  const payload = {
    id: 'cand_123',
    status: 'DISCARDED'
  };

  const mockRequest = {
    json: async () => payload
  } as any;

  const mockContext = {
    request: mockRequest,
    env: { DB: mockD1 as any }
  } as any;

  const response = await patchCandidate(mockContext);
  assert.strictEqual(response.status, 200);

  const body = await response.json() as any;
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.status, 'DISCARDED');
});

test('API Endpoint - PATCH /api/candidates promotes candidate successfully', async () => {
  const mockD1 = setupTestDb();
  const db = require('drizzle-orm/better-sqlite3').drizzle((mockD1 as any).sqlite);
  const service = new DiscoveryService(db);

  // Insert user to avoid FK error
  await db.insert(require('../schema/core').users).values({
    id: 'user_123',
    name: 'Owner User',
    email: 'owner@test.com',
    password: 'password_hash',
  });

  // Setup scope
  await service.createScope('scope_1', {
    name: 'Real Estate Agents',
    createdByUserId: 'user_123'
  });

  // Setup candidate
  await service.createCandidateLead('cand_123', {
    discoveryScopeId: 'scope_1',
    rawName: 'Dream Homes Realty',
    status: 'NEW'
  });

  const payload = {
    id: 'cand_123',
    status: 'PROMOTED',
    ownerId: 'user_123'
  };

  const mockRequest = {
    json: async () => payload
  } as any;

  const mockContext = {
    request: mockRequest,
    env: { DB: mockD1 as any }
  } as any;

  const response = await patchCandidate(mockContext);
  assert.strictEqual(response.status, 200);

  const body = await response.json() as any;
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.name, 'Dream Homes Realty');
  assert.strictEqual(body.data.ownerId, 'user_123');
});


