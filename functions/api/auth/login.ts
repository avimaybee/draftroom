import { drizzle } from 'drizzle-orm/d1';
import { AuthService } from '../../../src/services/auth';
import * as schema from '../../../src/db/schema';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { email, password } = await context.request.json() as any;
    const db = drizzle(context.env.DB, { schema });
    const authService = new AuthService(db);

    const result = await authService.login(email, password);

    if (!result) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = new Response(JSON.stringify({ success: true, user: result.user }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    // Set cookie
    response.headers.append('Set-Cookie', `session=${result.session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`);

    return response;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
