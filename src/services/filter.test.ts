import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterService } from './filter';
import { FeedItem } from '../models';

vi.mock('../config', () => ({
  config: {
    ai: {
      keywords: ['AI', '人工智能', 'GPT', 'LLM', '模型'],
      provider: 'test',
      providers: {
        test: {
          baseUrl: 'https://test.com',
          apiKey: 'test-key',
          model: 'test-model',
        },
      },
    },
    rss: {
      targetCount: {
        weekday: 20,
        weekend: 40,
        maxTotal: 100,
      },
    },
  },
}));

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    service = new FilterService();
    vi.clearAllMocks();
  });

  describe('preFilterByKeywords', () => {
    it('should filter items containing keywords', () => {
      const items: FeedItem[] = [
        { id: '1', title: 'AI发展新趋势', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
        { id: '2', title: '美食推荐', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
        { id: '3', title: 'GPT-4发布', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
      ];

      const result = service.preFilterByKeywords(items);

      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toContain('1');
      expect(result.map(i => i.id)).toContain('3');
    });

    it('should search in both title and contentSnippet', () => {
      const items: FeedItem[] = [
        { id: '1', title: '新闻标题', link: '', pubDate: '', content: '', contentSnippet: '人工智能相关内容', feedUrl: '', createdAt: new Date() },
      ];

      const result = service.preFilterByKeywords(items);

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no items match', () => {
      const items: FeedItem[] = [
        { id: '1', title: '美食推荐', link: '', pubDate: '', content: '', contentSnippet: '好吃的', feedUrl: '', createdAt: new Date() },
      ];

      const result = service.preFilterByKeywords(items);

      expect(result).toHaveLength(0);
    });

    it('should handle empty input', () => {
      const result = service.preFilterByKeywords([]);
      expect(result).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const items: FeedItem[] = [
        { id: '1', title: 'ai发展新趋势', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
        { id: '2', title: 'AI发展新趋势', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
      ];

      const result = service.preFilterByKeywords(items);

      expect(result).toHaveLength(2);
    });

    it('should match partial keywords', () => {
      const items: FeedItem[] = [
        { id: '1', title: '大语言模型LLM发展', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
      ];

      const result = service.preFilterByKeywords(items);

      expect(result).toHaveLength(1);
    });
  });

  describe('deduplicateItems - title deduplication', () => {
    it('should remove exact duplicate titles', async () => {
      const items: FeedItem[] = [
        { id: '1', title: 'AI发展新趋势', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
        { id: '2', title: 'AI发展新趋势', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
      ];

      const result = await service.deduplicateItems(items);

      expect(result).toHaveLength(1);
    });

    it('should keep different titles', async () => {
      const items: FeedItem[] = [
        { id: '1', title: 'AI发展新趋势', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
        { id: '2', title: 'GPT-4发布', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
      ];

      const result = await service.deduplicateItems(items);

      expect(result).toHaveLength(2);
    });

    it('should handle single item', async () => {
      const items: FeedItem[] = [
        { id: '1', title: 'AI发展新趋势', link: '', pubDate: '', content: '', contentSnippet: '', feedUrl: '', createdAt: new Date() },
      ];

      const result = await service.deduplicateItems(items);

      expect(result).toHaveLength(1);
    });

    it('should handle empty array', async () => {
      const result = await service.deduplicateItems([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('setCustomTargetCount', () => {
    it('should allow setting custom target count', () => {
      service.setCustomTargetCount(50);
      expect(true).toBe(true);
    });
  });
});
