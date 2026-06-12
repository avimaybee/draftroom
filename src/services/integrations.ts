import { Db } from '../db';
import { eq } from 'drizzle-orm';
import { providerConfigs } from '../db/schema/core';

export class IntegrationsService {
  constructor(private db: Db) {}

  async getProviderConfig(provider: string) {
    const [config] = await this.db.select()
      .from(providerConfigs)
      .where(eq(providerConfigs.provider, provider))
      .limit(1);
    
    return config || null;
  }

  async saveProviderConfig(
    provider: string,
    apiKey: string,
    modelName: string,
    isActive: boolean = true
  ) {
    const id = crypto.randomUUID();
    const now = new Date();

    const existing = await this.getProviderConfig(provider);

    if (existing) {
      await this.db.update(providerConfigs)
        .set({
          apiKey,
          modelName,
          isActive,
          updatedAt: now,
        })
        .where(eq(providerConfigs.provider, provider));
    } else {
      await this.db.insert(providerConfigs).values({
        id,
        provider,
        apiKey,
        modelName,
        isActive,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.getProviderConfig(provider);
  }

  async deleteProviderConfig(provider: string) {
    await this.db.delete(providerConfigs)
      .where(eq(providerConfigs.provider, provider));
  }
}
