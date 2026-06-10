import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { DiscoveryService } from '../../src/services/discovery';
import { discoveryScopes } from '../../src/db/schema/discovery';
import { CreateDiscoveryScopeSchema } from '../../src/db/models/discovery';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = context.request ? new URL(context.request.url) : null;
    const id = url?.searchParams.get('id');
    const db = drizzle(context.env.DB);
    const service = new DiscoveryService(db);

    if (id) {
      const results = await db.select().from(discoveryScopes).where(eq(discoveryScopes.id, id));
      const scope = results[0] || null;
      return new Response(JSON.stringify({ success: true, data: scope }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scopes = await service.listScopes();
    return new Response(JSON.stringify({ success: true, data: scopes }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json();
    const parsed = CreateDiscoveryScopeSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: parsed.error.format() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = drizzle(context.env.DB);
    const service = new DiscoveryService(db);
    
    // Generate a random UUID for the scope
    const id = crypto.randomUUID();
    const scope = await service.createScope(id, parsed.data);

    return new Response(JSON.stringify({ success: true, data: scope }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
