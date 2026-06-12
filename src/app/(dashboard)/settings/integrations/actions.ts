'use server';

import { getDb } from '@/db';
import { IntegrationsService } from '@/services/integrations';
import { revalidatePath } from 'next/cache';

export async function saveIntegrationConfigAction(formData: FormData) {
  const provider = formData.get('provider') as string;
  const apiKey = formData.get('apiKey') as string;
  const modelName = formData.get('modelName') as string;
  const isActive = formData.get('isActive') === 'on';

  if (!provider || !apiKey || !modelName) {
    return { error: 'Missing required fields' };
  }

  // Validate API key and model name against provider endpoints
  try {
    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        const models = data.data || [];
        const exists = models.some((m) => m.id === modelName);
        if (!exists) {
          return { error: `Invalid OpenRouter model name "${modelName}". Make sure it matches OpenRouter's model list (e.g., "google/gemini-2.5-flash").` };
        }
      }
    } else if (provider === 'nvidia') {
      const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (res.status === 401) {
        return { error: 'Invalid NVIDIA API key.' };
      }
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        const models = data.data || [];
        const exists = models.some((m) => m.id === modelName);
        if (!exists) {
          return { error: `Invalid NVIDIA model name "${modelName}". Make sure it matches NVIDIA NIM's model list (e.g., "meta/llama-3.1-70b-instruct").` };
        }
      }
    } else if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (res.status === 400 || res.status === 403) {
        return { error: 'Invalid Gemini API key.' };
      }
      if (res.ok) {
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        const models = data.models || [];
        const exists = models.some((m) => m.name === `models/${modelName}` || m.name === modelName);
        if (!exists) {
          return { error: `Invalid Gemini model name "${modelName}". Standard name is "gemini-2.5-flash".` };
        }
      }
    } else if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (res.status === 401) {
        return { error: 'Invalid Groq API key.' };
      }
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        const models = data.data || [];
        const exists = models.some((m) => m.id === modelName);
        if (!exists) {
          return { error: `Invalid Groq model name "${modelName}". Make sure it matches Groq's model list (e.g., "llama3-70b-8192").` };
        }
      }
    }
  } catch (err: unknown) {
    console.error(`Validation check failed for ${provider}:`, err);
    // If the validation check fails due to network issues, we allow saving rather than blocking the user.
  }

  const db = getDb();
  const service = new IntegrationsService(db);

  try {
    await service.saveProviderConfig(provider, apiKey, modelName, isActive);
    revalidatePath('/settings/integrations');
    return { success: true };
  } catch (e: unknown) {
    console.error(e);
    const errMsg = e instanceof Error ? e.message : 'Failed to save configuration';
    return { error: errMsg };
  }
}

export async function deleteIntegrationConfigAction(provider: string) {
  if (!provider) return { error: 'Provider is required' };

  const db = getDb();
  const service = new IntegrationsService(db);

  try {
    await service.deleteProviderConfig(provider);
    revalidatePath('/settings/integrations');
    return { success: true };
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Failed to delete configuration';
    return { error: errMsg };
  }
}
