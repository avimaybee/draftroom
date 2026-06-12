import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(): DrizzleD1Database<typeof schema> {
  const env = (process as any).env;
  
  if (!env || !env.DB) {
    throw new Error('D1 database binding "DB" is not defined. Ensure you are running under Wrangler or instrumentation mock is active.');
  }

  return drizzle(env.DB, { schema });
}

export type Db = DrizzleD1Database<typeof schema>;
