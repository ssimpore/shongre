import { beforeEach, describe, expect, it } from 'vitest';
import { analyticsService } from './analytics.service';

describe('analyticsService', () => {
  beforeEach(() => analyticsService.reset());

  it('keeps the collector behind consent', () => {
    analyticsService.track('trending_section_view', { source: 'trending_now' });
    expect(analyticsService.getRecentEvents()).toHaveLength(0);
  });
});

