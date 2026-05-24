import RSSParser from 'rss-parser';
import { config, RSSFeedSource } from '../../config';
import { DatabaseService } from '../database';
import { FailureLogger } from '../failure-logger';
import { FeedItem } from '../../models';
import { DataSource, DataSourceItem, DataSourceConfig } from './types';
import { Result, Ok, Err, withRetry } from '../../utils/result';
import { generateItemId, isWeekend } from '../../utils';

export class RSSDataSource implements DataSource {
  readonly name = 'RSS';
  readonly type = 'rss';
  
  private parser: RSSParser;
  private db: DatabaseService;
  private failureLogger: FailureLogger;
  private sources: RSSFeedSource[];
  private dataSourceConfig: DataSourceConfig;

  constructor(
    db: DatabaseService,
    failureLogger: FailureLogger,
    sources: RSSFeedSource[],
    dataSourceConfig: DataSourceConfig = {}
  ) {
    this.parser = new RSSParser({
      timeout: config.rss.fetchTimeout,
      headers: {
        'User-Agent': config.app.userAgent,
      },
    });
    this.db = db;
    this.failureLogger = failureLogger;
    this.sources = sources;
    this.dataSourceConfig = dataSourceConfig;
  }

  async fetch(): Promise<Result<DataSourceItem[]>> {
    try {
      const items = await this.fetchWithPriority();
      return Ok(items.map(this.toDataSourceItem));
    } catch (error) {
      return Err(error as Error);
    }
  }

  async fetchAsFeedItems(): Promise<FeedItem[]> {
    return this.fetchWithPriority();
  }

  private async fetchWithPriority(): Promise<FeedItem[]> {
    const effectiveDays = this.dataSourceConfig.days || config.rss.defaultDays;
    const targetCount = this.getTargetCount(effectiveDays);
    const highPriority = this.sources.filter((s) => s.priority === 'high');
    const mediumPriority = this.sources.filter((s) => s.priority === 'medium');
    const lowPriority = this.sources.filter((s) => s.priority === 'low');

    const allItems: FeedItem[] = [];

    console.log(`\n目标文章数：${targetCount} 篇（最近 ${effectiveDays} 天）${isWeekend() ? '（周末模式）' : ''}`);

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

  private async fetchFeed(source: RSSFeedSource, days: number): Promise<FeedItem[]> {
    try {
      let skippedCount = 0;
      const items = await withRetry(
        async () => {
          console.log(`[${source.priority.toUpperCase()}] 正在获取：${source.name} (${source.category})`);
          const feed = await this.parser.parseURL(source.url);

          this.db.saveFeed({
            url: source.url,
            title: feed.title,
            lastFetched: new Date(),
          });

          const now = new Date();
          const cutoffTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          skippedCount = 0;
          const items: FeedItem[] = [];

          for (const item of feed.items) {
            const pubDate = new Date(item.pubDate || now);
            
            if (pubDate < cutoffTime) {
              continue;
            }

            const feedItem: FeedItem = {
              id: generateItemId(item.link || item.title || ''),
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

            if (this.db.hasBriefingBeenGenerated(feedItem.id)) {
              skippedCount++;
              continue;
            }

            items.push(feedItem);
          }

          return items;
        },
        {
          maxRetries: 3,
          delayMs: 2000,
          onRetry: (attempt: number, error: Error) => {
            console.log(`  重试 ${attempt}/3: ${source.name} - ${error.message}`);
          },
        }
      );

      console.log(`  ✓ ${source.name}: 获取 ${items.length} 篇文章（最近 ${days} 天）${skippedCount > 0 ? `，跳过 ${skippedCount} 篇已生成简报` : ''}`);
      return items;
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.failureLogger.logRSSFailure(source.name, errorMsg);
      return [];
    }
  }

  private getTargetCount(days: number): number {
    const baseCount = isWeekend()
      ? config.rss.targetCount.weekend
      : config.rss.targetCount.weekday;
    return Math.min(baseCount * days, config.rss.targetCount.maxTotal);
  }

  private toDataSourceItem(item: FeedItem): DataSourceItem {
    return {
      id: item.id,
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.content,
      contentSnippet: item.contentSnippet,
      sourceName: item.feedTitle || '未知来源',
      sourceType: 'rss',
    };
  }
}
