import * as path from 'path';
import { config } from '../config';
import { DatabaseService } from './database';
import { FailureLogger } from './failure-logger';
import { EmailService } from './email-new';
import { XiaohongshuService } from './xiaohongshu';
import { RSSDataSource, GitHubReleasesDataSource } from './data-source';
import { FilterService } from './filter';
import { SummarizerService, BriefingItem, GitHubReleaseSummary } from './summarizer';
import { FeedItem } from '../models';

export interface OrchestratorConfig {
  days?: number;
}

export class Orchestrator {
  private db: DatabaseService;
  private failureLogger: FailureLogger;
  private emailService: EmailService;
  private xiaohongshuService: XiaohongshuService;
  private filterService: FilterService;
  private summarizerService: SummarizerService;

  constructor() {
    this.db = new DatabaseService();
    this.failureLogger = new FailureLogger(path.dirname(config.database.path));
    this.emailService = new EmailService(this.db);
    this.xiaohongshuService = new XiaohongshuService(path.join(path.dirname(config.database.path), 'cards'));
    this.filterService = new FilterService();
    this.summarizerService = new SummarizerService(this.failureLogger);
  }

  async execute(orchestratorConfig: OrchestratorConfig = {}): Promise<void> {
    const { days = 1 } = orchestratorConfig;

    try {
      console.log('\n步骤1: 获取RSS文章');
      const items = await this.fetchRSSArticles(days);

      if (items.length === 0) {
        console.log('未获取到任何文章');
        return;
      }

      console.log(`\n步骤2: AI筛选相关文章 (共 ${items.length} 篇)`);
      const filteredItems = await this.filterService.filterRelevantItems(items);

      if (filteredItems.length === 0) {
        console.log('筛选后无相关文章');
        return;
      }

      console.log(`\n步骤3: 去重 (共 ${filteredItems.length} 篇)`);
      const deduplicatedItems = await this.filterService.deduplicateItems(filteredItems);

      if (deduplicatedItems.length === 0) {
        console.log('去重后无文章');
        return;
      }

      console.log(`\n步骤4: 生成文章简报 (共 ${deduplicatedItems.length} 篇)`);
      const briefingItems = await this.summarizerService.generateBriefingItems(deduplicatedItems);

      console.log('\n步骤5: 生成卡片');
      this.xiaohongshuService.saveBatch(briefingItems);
      this.xiaohongshuService.cleanupOldCards();

      console.log('\n步骤6: 获取 GitHub Releases');
      const releaseItems = await this.fetchGitHubReleases();

      let releaseSummaries: GitHubReleaseSummary[] = [];
      if (releaseItems.length > 0) {
        console.log(`\n步骤7: 生成 GitHub Releases 摘要 (共 ${releaseItems.length} 个版本)`);
        releaseSummaries = await this.summarizerService.generateGitHubReleaseSummaries(releaseItems);
      }

      console.log('\n步骤8: 发送简报邮件');
      await this.emailService.sendBriefingWithGitHubReleases(briefingItems, releaseSummaries);

      this.showFailureSummary();

      console.log('\n简报任务完成！');
    } catch (error) {
      console.error('执行简报任务失败:', error);
    }
  }

  private async fetchRSSArticles(days: number): Promise<FeedItem[]> {
    const rssDataSource = new RSSDataSource(
      this.db,
      this.failureLogger,
      config.rss.sources,
      { days }
    );
    return rssDataSource.fetchAsFeedItems();
  }

  private async fetchGitHubReleases() {
    const githubDataSource = new GitHubReleasesDataSource(
      this.failureLogger,
      config.github.sources
    );
    return githubDataSource.fetchAsReleaseItems();
  }

  private showFailureSummary(): void {
    const failures = this.failureLogger.getFailures();
    const recentFailures = failures.filter((f) => {
      const failTime = new Date(f.timestamp);
      const now = new Date();
      return now.getTime() - failTime.getTime() < 3600000;
    });

    if (recentFailures.length > 0) {
      console.log(`\n⚠️ 本次任务有 ${recentFailures.length} 个失败项，已记录到 data/failures.json`);
    }
  }

  stop(): void {
    this.db.close();
  }
}
