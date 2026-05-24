import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FeedItem } from '../models';

const TEST_DB_PATH = path.resolve(__dirname, '../../data/test.db');

function cleanupTestDb(): void {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

describe('DatabaseService', () => {
  let db: any;

  beforeEach(async () => {
    cleanupTestDb();

    vi.doMock('../config', () => ({
      config: {
        database: {
          path: TEST_DB_PATH,
        },
      },
    }));

    const { DatabaseService } = await import('./database');
    db = new DatabaseService();
  });

  afterEach(() => {
    if (db) db.close();
    cleanupTestDb();
    vi.resetModules();
  });

  describe('Feed operations', () => {
    it('should save and retrieve feed', () => {
      db.saveFeed({
        url: 'https://example.com/feed',
        title: 'Test Feed',
        lastFetched: new Date(),
      });

      const feeds = db.getAllFeeds();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].url).toBe('https://example.com/feed');
      expect(feeds[0].title).toBe('Test Feed');
    });

    it('should update existing feed', () => {
      db.saveFeed({
        url: 'https://example.com/feed',
        title: 'Test Feed',
        lastFetched: new Date('2026-01-01'),
      });

      db.saveFeed({
        url: 'https://example.com/feed',
        title: 'Updated Feed',
        lastFetched: new Date('2026-01-02'),
      });

      const feeds = db.getAllFeeds();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].title).toBe('Updated Feed');
    });
  });

  describe('FeedItem operations', () => {
    beforeEach(() => {
      db.saveFeed({
        url: 'https://example.com/feed',
        title: 'Test Feed',
        lastFetched: new Date(),
      });
    });

    it('should save and retrieve feed item', () => {
      const item: FeedItem = {
        id: 'test-id-1',
        title: 'Test Article',
        link: 'https://example.com/article',
        pubDate: '2026-01-01',
        content: 'Test content',
        contentSnippet: 'Test snippet',
        feedUrl: 'https://example.com/feed',
        feedTitle: 'Test Feed',
        createdAt: new Date(),
      };

      db.saveFeedItem(item);

      const retrieved = db.getFeedItemById('test-id-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Article');
      expect(retrieved?.link).toBe('https://example.com/article');
    });

    it('should return undefined for non-existent item', () => {
      const result = db.getFeedItemById('non-existent');
      expect(result).toBeUndefined();
    });

    it('should check if briefing has been generated', () => {
      const item: FeedItem = {
        id: 'test-id-2',
        title: 'Test Article',
        link: 'https://example.com/article',
        pubDate: '2026-01-01',
        content: 'Test content',
        contentSnippet: 'Test snippet',
        feedUrl: 'https://example.com/feed',
        createdAt: new Date(),
      };

      db.saveFeedItem(item);

      expect(db.hasBriefingBeenGenerated('test-id-2')).toBe(false);

      db.updateFeedItemSummary('test-id-2', 'Generated summary');

      expect(db.hasBriefingBeenGenerated('test-id-2')).toBe(true);
    });

    it('should update feed item summary', () => {
      const item: FeedItem = {
        id: 'test-id-3',
        title: 'Test Article',
        link: 'https://example.com/article',
        pubDate: '2026-01-01',
        content: 'Test content',
        contentSnippet: 'Test snippet',
        feedUrl: 'https://example.com/feed',
        createdAt: new Date(),
      };

      db.saveFeedItem(item);
      db.updateFeedItemSummary('test-id-3', 'New summary');

      const retrieved = db.getFeedItemById('test-id-3');
      expect(retrieved?.summary).toBe('New summary');
    });
  });

  describe('Briefing operations', () => {
    it('should save briefing', () => {
      const id = db.saveBriefing({
        subject: 'Test Briefing',
        content: 'Briefing content',
        sentAt: new Date(),
        itemCount: 5,
      });

      expect(id).toBeGreaterThan(0);
    });

    it('should save multiple briefings', () => {
      const id1 = db.saveBriefing({
        subject: 'First Briefing',
        content: 'Content 1',
        sentAt: new Date('2026-01-01'),
        itemCount: 3,
      });

      const id2 = db.saveBriefing({
        subject: 'Second Briefing',
        content: 'Content 2',
        sentAt: new Date('2026-01-02'),
        itemCount: 5,
      });

      expect(id2).toBeGreaterThan(id1);
    });
  });
});
