import RSSParser from 'rss-parser';
import * as crypto from 'crypto';
import { FeedItem } from '../models';
import { DatabaseService } from './database';
import { FailureLogger } from './failure-logger';
import { config, RSSFeedSource } from '../config';

export class RSSService {
  private parser: RSSParser;
  private db: DatabaseService;
  private failureLogger: FailureLogger;
  private customDays: number | null = null;

  constructor(db: DatabaseService, failureLogger: FailureLogger) {
    this.parser = new RSSParser({
      timeout: config.rss.fetchTimeout,
      headers: {
        'User-Agent': config.app.userAgent,
      },
    });
    this.db = db;
    this.failureLogger = failureLogger;
  }

  setCustomDays(days: number): void {
    this.customDays = days;
  }

  async fetchFeed(source: RSSFeedSource, days?: number): Promise<FeedItem[]> {
    const effectiveDays = days || this.customDays || config.rss.defaultDays;
    try {
      console.log(`[${source.priority.toUpperCase()}] 正在获取：${source.name} (${source.category})`);
      const feed = await this.parser.parseURL(source.url);

      this.db.saveFeed({
        url: source.url,
        title: feed.title,
        lastFetched: new Date(),
      });

      const now = new Date();
      const cutoffTime = new Date(now.getTime() - effectiveDays * 24 * 60 * 60 * 1000);
      const items: FeedItem[] = [];

      for (const item of feed.items) {
        const pubDate = new Date(item.pubDate || now);
        
        if (pubDate < cutoffTime) {
          continue;
        }

        const feedItem: FeedItem = {
          id: this.generateItemId(item.link || item.title || ''),
          title: item.title || '无标题',
          link: item.link || '',
          pubDate: item.pubDate || now.toISOString(),
          content: item.content || item['content:encoded'] || '',
          contentSnippet: item.contentSnippet || item.summary || '',
          feedUrl: source.url,
          feedTitle: feed.title,
          createdAt: new Date(),
        };

        this.db.saveFeedItem(feedItem);
        items.push(feedItem);
      }

      console.log(`  ✓ ${source.name}: 获取 ${items.length} 篇文章（最近 ${effectiveDays} 天）`);
      return items;
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.failureLogger.logRSSFailure(source.name, errorMsg);
      return [];
    }
  }

  async fetchWithPriority(sources: RSSFeedSource[], days?: number): Promise<FeedItem[]> {
    const effectiveDays = days || this.customDays || config.rss.defaultDays;
    const targetCount = this.getTargetCount(effectiveDays);
    const highPriority = sources.filter((s) => s.priority === 'high');
    const mediumPriority = sources.filter((s) => s.priority === 'medium');
    const lowPriority = sources.filter((s) => s.priority === 'low');

    const allItems: FeedItem[] = [];

    console.log(`\n目标文章数：${targetCount} 篇（最近 ${effectiveDays} 天）${this.isWeekend() ? '（周末模式）' : ''}`);

    console.log('\n=== 抓取高优先级源 ===');
    for (const source of highPriority) {
      const items = await this.fetchFeed(source, effectiveDays);
      allItems.push(...items);
      
      if (allItems.length >= targetCount) {
        console.log(`\n高优先级源已获取 ${allItems.length} 篇文章，达到目标，停止抓取`);
        return allItems;
      }
    }

    console.log(`\n高优先级源获取 ${allItems.length} 篇，还需 ${targetCount - allItems.length} 篇`);

    console.log('\n=== 抓取中优先级源 ===');
    for (const source of mediumPriority) {
      const items = await this.fetchFeed(source, effectiveDays);
      allItems.push(...items);
      
      if (allItems.length >= targetCount) {
        console.log(`\n已获取 ${allItems.length} 篇文章，达到目标，停止抓取`);
        return allItems;
      }
    }

    console.log(`\n中优先级源获取后共 ${allItems.length} 篇，还需 ${targetCount - allItems.length} 篇`);

    console.log('\n=== 抓取低优先级源 ===');
    for (const source of lowPriority) {
      const items = await this.fetchFeed(source, effectiveDays);
      allItems.push(...items);
      
      if (allItems.length >= targetCount) {
        console.log(`\n已获取 ${allItems.length} 篇文章，达到目标，停止抓取`);
        return allItems;
      }
    }

    console.log(`\n总计获取 ${allItems.length} 篇文章`);
    return allItems;
  }

  private getTargetCount(days: number): number {
    const baseCount = this.isWeekend()
      ? config.rss.targetCount.weekend
      : config.rss.targetCount.weekday;
    return Math.min(baseCount * days, config.rss.targetCount.maxTotal);
  }

  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  async fetchAllFeeds(feedUrls: string[]): Promise<FeedItem[]> {
    const batchSize = 5;
    const allItems: FeedItem[] = [];

    for (let i = 0; i < feedUrls.length; i += batchSize) {
      const batch = feedUrls.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((url) =>
          this.fetchFeed({
            name: url,
            url,
            priority: 'medium',
            category: '其他',
          })
        )
      );
      results.forEach((items) => allItems.push(...items));
    }

    return allItems;
  }

  private generateItemId(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }
}