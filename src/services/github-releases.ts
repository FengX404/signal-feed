import RSSParser from 'rss-parser';
import * as crypto from 'crypto';
import { config, GitHubReleaseSource } from '../config';
import { FailureLogger } from './failure-logger';

export interface GitHubReleaseItem {
  id: string;
  title: string;
  version: string;
  publishedAt: Date;
  content: string;
  link: string;
  source: GitHubReleaseSource;
}

export class GitHubReleasesService {
  private parser: RSSParser;
  private failureLogger: FailureLogger;

  constructor(failureLogger: FailureLogger) {
    this.parser = new RSSParser({
      timeout: config.github.fetchTimeout,
      headers: {
        'User-Agent': config.app.userAgent,
      },
    });
    this.failureLogger = failureLogger;
  }

  async fetchReleases(source: GitHubReleaseSource): Promise<GitHubReleaseItem[]> {
    try {
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
          id: this.generateItemId(item.link || item.title || ''),
          title: item.title || '无标题',
          version: version,
          publishedAt: pubDate,
          content: content,
          link: item.link || `https://github.com/${source.owner}/${source.repo}/releases`,
          source: source,
        };

        items.push(releaseItem);
      }

      console.log(`  ✓ ${source.name}: 获取 ${items.length} 个发布版本（最近 24 小时）`);
      return items;
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.failureLogger.logRSSFailure(`GitHub Releases: ${source.name}`, errorMsg);
      return [];
    }
  }

  async fetchAllReleases(sources: GitHubReleaseSource[]): Promise<GitHubReleaseItem[]> {
    const allItems: GitHubReleaseItem[] = [];

    for (const source of sources) {
      const items = await this.fetchReleases(source);
      allItems.push(...items);
    }

    return allItems;
  }

  private extractVersion(title: string): string {
    const versionMatch = title.match(/v?(\d+\.\d+\.\d+(?:[-\w]*)?)/i);
    return versionMatch ? versionMatch[1] : title;
  }

  private generateItemId(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }
}