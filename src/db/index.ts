import { drizzle as d1Drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export const getDb = (env: { DB: D1Database }) => {
  return d1Drizzle(env.DB, { schema });
};

export type Db = ReturnType<typeof getDb>;
