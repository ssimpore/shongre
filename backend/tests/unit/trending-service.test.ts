import { describe, expect, it } from 'vitest';
import { DemoListingRepository } from '../../src/infrastructure/database/repositories/listing.repository.js';
import { DemoTrendingRepository } from '../../src/infrastructure/database/repositories/trending.repository.js';
import { TrendingService } from '../../src/modules/trending/trending.service.js';

describe('TrendingService', () => {
  it('rejects malformed market codes before querying listings', async () => {
    const service = new TrendingService(new DemoTrendingRepository(), new DemoListingRepository());

    await expect(service.getSection({ marketCode: 'FRA' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('serves the active listing as a topic and honors hidden overrides', async () => {
    const trendingRepository = new DemoTrendingRepository();
    const service = new TrendingService(trendingRepository, new DemoListingRepository());

    const visible = await service.getSection({ marketCode: 'FR' });
    expect(visible.enabled).toBe(true);
    expect(visible.topics).toHaveLength(1);
    expect(visible.topics[0].listings[0].status).toBe('published');

    await trendingRepository.upsertOverride('FR', {
      topicKey: 'bicycles',
      topicType: 'category',
      isHidden: true,
    });
    const hidden = await service.getSection({ marketCode: 'FR' });
    expect(hidden.topics).toHaveLength(0);
  });
});
