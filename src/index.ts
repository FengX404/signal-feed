import * as path from 'path';
import { config } from './config';
import { DatabaseService } from './services/database';
import { RSSService } from './services/rss';
import { AIService } from './services/ai';
import { EmailService } from './services/email';
import { FailureLogger } from './services/failure-logger';
import { GitHubReleasesService } from './services/github-releases';
import { XiaohongshuService } from './services/xiaohongshu';

class SignalFeedApp {
  private db: DatabaseService;
  private rssService: RSSService;
  private aiService: AIService;
  private emailService: EmailService;
  private failureLogger: FailureLogger;
  private githubReleasesService: GitHubReleasesService;
  private xiaohongshuService: XiaohongshuService;

  constructor() {
    this.db = new DatabaseService();
    this.failureLogger = new FailureLogger(path.dirname(config.database.path));
    this.rssService = new RSSService(this.db, this.failureLogger);
    this.aiService = new AIService(this.db, this.failureLogger);
    this.emailService = new EmailService(this.db);
    this.githubReleasesService = new GitHubReleasesService(this.failureLogger);
    this.xiaohongshuService = new XiaohongshuService(path.join(path.dirname(config.database.path), 'cards'));
  }

  async executeBriefing(days?: number): Promise<void> {
    const effectiveDays = days || config.rss.defaultDays;
    if (effectiveDays > 1) {
      const baseCount = this.isWeekend()
        ? config.rss.targetCount.weekend
        : config.rss.targetCount.weekday;
      const targetCount = Math.min(baseCount * effectiveDays, config.rss.targetCount.maxTotal);
      this.rssService.setCustomDays(effectiveDays);
      this.aiService.setCustomTargetCount(targetCount);
    }

    try {
      console.log('\n步骤1: 获取RSS文章');
      const items = await this.rssService.fetchWithPriority(config.rss.sources);

      if (items.length === 0) {
        console.log('未获取到任何文章');
        return;
      }

      console.log(`\n步骤2: AI筛选相关文章 (共 ${items.length} 篇)`);
      const filteredItems = await this.aiService.filterRelevantItems(items);

      if (filteredItems.length === 0) {
        console.log('筛选后无相关文章');
        return;
      }

      console.log(`\n步骤3: 去重 (共 ${filteredItems.length} 篇)`);
      const deduplicatedItems = await this.aiService.deduplicateItems(filteredItems);

      if (deduplicatedItems.length === 0) {
        console.log('去重后无文章');
        return;
      }

      console.log(`\n步骤4: 生成文章简报 (共 ${deduplicatedItems.length} 篇)`);
      const briefingItems = await this.aiService.generateBriefingItems(deduplicatedItems);

      console.log('\n步骤5: 生成卡片');
      this.xiaohongshuService.saveBatch(briefingItems);

      console.log('\n步骤6: 获取 GitHub Releases');
      const releaseItems = await this.githubReleasesService.fetchAllReleases(config.github.sources);

      let releaseSummaries: any[] = [];
      if (releaseItems.length > 0) {
        console.log(`\n步骤7: 生成 GitHub Releases 摘要 (共 ${releaseItems.length} 个版本)`);
        releaseSummaries = await this.aiService.generateGitHubReleaseSummaries(releaseItems);
      }

      console.log('\n步骤8: 发送简报邮件');
      await this.emailService.sendBriefingWithGitHubReleases(briefingItems, releaseSummaries);

      this.showFailureSummary();

      console.log('\n简报任务完成！');
    } catch (error) {
      console.error('执行简报任务失败:', error);
    }
  }

  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6;
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

function parseArgs(): { days: number } {
  const args = process.argv.slice(2);
  let days = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      if (isNaN(days) || days < 1) {
        console.error('错误: --days 参数必须是正整数');
        process.exit(1);
      }
      i++;
    }
  }

  return { days };
}

async function main(): Promise<void> {
  const app = new SignalFeedApp();
  const { days } = parseArgs();

  if (days > 1) {
    console.log(`\n获取最近 ${days} 天的简报`);
  }

  await app.executeBriefing(days);
  app.stop();
}

main().catch((error) => {
  console.error('程序运行出错:', error);
  process.exit(1);
});