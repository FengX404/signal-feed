import RSSParser from 'rss-parser';
import { config, GitHubReleaseSource } from '../../config';
import { FailureLogger } from '../failure-logger';
import { DataSource, DataSourceItem } from './types';
import { Result, Ok, Err, withRetry } from '../../utils/result';
import { generateItemId } from '../../utils';

export interface GitHubReleaseItem {
  id: string;
  title: string;
  version: string;
  publishedAt: Date;
  content: string;
  link: string;
  source: GitHubReleaseSource;
}

export class GitHubReleasesDataSource implements DataSource {
  readonly name = 'GitHub Releases';
  readonly type = 'github';
  
  private parser: RSSParser;
  private failureLogger: FailureLogger;
  private sources: GitHubReleaseSource[];

  constructor(failureLogger: FailureLogger, sources: GitHubReleaseSource[]) {
    this.parser = new RSSParser({
      timeout: config.github.fetchTimeout,
      headers: {
        'User-Agent': config.app.userAgent,
      },
    });
    this.failureLogger = failureLogger;
    this.sources = sources;
  }

  async fetch(): Promise<Result<DataSourceItem[]>> {
    try {
      const items = await this.fetchAllReleases();
      return Ok(items.map(this.toDataSourceItem));
    } catch (error) {
      return Err(error as Error);
    }
  }

  async fetchAsReleaseItems(): Promise<GitHubReleaseItem[]> {
    return this.fetchAllReleases();
  }

  private async fetchAllReleases(): Promise<GitHubReleaseItem[]> {
    const allItems: GitHubReleaseItem[] = [];

    for (const source of this.sources) {
      const items = await this.fetchReleases(source);
      allItems.push(...items);
    }

    return allItems;
  }

  private async fetchReleases(source: GitHubReleaseSource): Promise<GitHubReleaseItem[]> {
    try {
      const items = await withRetry(
        async () => {
          const atomUrl = `https://github.com/${source.owner}/${source.repo}/releases.atom`;
          console.log(`正在获取 GitHub Releases: ${source.name} (${atomUrl})`);

          const feed = await this.parser.parseURL(atomUrl);

          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const items: GitHubReleaseItem[] = [];

          for (const item of feed.items) {
            const pubDate = new Date(item.pubDate || now);

            if (pubDate < twentyFourHoursAgo) {
              continue;
            }

            const version = this.extractVersion(item.title || '');
            const content = item.content || item.contentSnippet || item.summary || '';

            const releaseItem: GitHubReleaseItem = {
              id: generateItemId(item.link || item.title || ''),
              title: item.title || '无标题',
              version: version,
              publishedAt: pubDate,
              content: content,
              link: item.link || `https://github.com/${source.owner}/${source.repo}/releases`,
              source: source,
            };

            items.push(releaseItem);
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

      console.log(`  ✓ ${source.name}: 获取 ${items.length} 个发布版本（最近 24 小时）`);
      return items;
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.failureLogger.logRSSFailure(`GitHub Releases: ${source.name}`, errorMsg);
      return [];
    }
  }

  private extractVersion(title: string): string {
    const versionMatch = title.match(/v?(\d+\.\d+\.\d+(?:[-\w]*)?)/i);
    return versionMatch ? versionMatch[1] : title;
  }

  private toDataSourceItem(item: GitHubReleaseItem): DataSourceItem {
    return {
      id: item.id,
      title: item.title,
      link: item.link,
      pubDate: item.publishedAt.toISOString(),
      content: item.content,
      contentSnippet: item.content,
      sourceName: item.source.name,
      sourceType: 'github',
    };
  }
}
