import { config } from '../config';
import { FeedItem } from '../models';
import { DatabaseService } from './database';
import { FailureLogger } from './failure-logger';
import { GitHubReleaseItem } from './github-releases';
import { AIProvider } from './ai/types';
import { OpenAICompatibleProvider } from './ai/providers/openai-compatible';

export interface BriefingItem {
  title: string;
  summary: string;
  recommendation?: string;
  tags?: string[];
  link: string;
  feedTitle?: string;
}

export interface GitHubReleaseSummary {
  version: string;
  publishedAt: Date;
  summary: string;
  link: string;
  sourceName: string;
}

function createProvider(): AIProvider {
  const providerName = config.ai.provider;
  const providerConfig = config.ai.providers[providerName];

  if (!providerConfig) {
    throw new Error(
      `AI provider "${providerName}" not found in config. Available providers: ${Object.keys(config.ai.providers).join(', ')}`
    );
  }

  const apiKey = process.env[`${providerName.toUpperCase()}_API_KEY`] || providerConfig.apiKey;
  const baseUrl = process.env[`${providerName.toUpperCase()}_BASE_URL`] || providerConfig.baseUrl;
  const model = process.env[`${providerName.toUpperCase()}_MODEL`] || providerConfig.model;

  if (!apiKey) {
    throw new Error(
      `API key not found for provider "${providerName}". Set ${providerName.toUpperCase()}_API_KEY environment variable or configure it in config.yaml`
    );
  }

  return new OpenAICompatibleProvider(baseUrl, apiKey, model);
}

function fillPrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}

export class AIService {
  private db: DatabaseService;
  private failureLogger: FailureLogger;
  private provider: AIProvider;
  private customTargetCount: number | null = null;

  constructor(db: DatabaseService, failureLogger: FailureLogger) {
    this.db = db;
    this.failureLogger = failureLogger;
    this.provider = createProvider();
  }

  setCustomTargetCount(count: number): void {
    this.customTargetCount = count;
  }

  private getTargetCount(): number {
    if (this.customTargetCount !== null) {
      return this.customTargetCount;
    }
    return this.isWeekend()
      ? config.rss.targetCount.weekend
      : config.rss.targetCount.weekday;
  }

  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  preFilterByKeywords(items: FeedItem[]): FeedItem[] {
    const keywords = config.ai.keywords;
    const filtered = items.filter((item) => {
      const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw.toLowerCase()));
    });
    console.log(`关键词预筛选: 从 ${items.length} 篇文章中筛选出 ${filtered.length} 篇`);
    return filtered;
  }

  async filterRelevantItems(items: FeedItem[]): Promise<FeedItem[]> {
    if (items.length === 0) return [];

    const targetCount = this.getTargetCount();
    const preFiltered = this.preFilterByKeywords(items);
    if (preFiltered.length === 0) {
      console.log('关键词预筛选后无相关文章');
      return [];
    }

    if (preFiltered.length <= targetCount) {
      console.log(`预筛选后文章数量较少(${preFiltered.length}篇)，跳过AI筛选`);
      return preFiltered;
    }

    const result = preFiltered.slice(0, targetCount * 2);
    console.log(`AI筛选: 最终保留 ${result.length} 篇文章`);
    return result;
  }

  async deduplicateItems(items: FeedItem[]): Promise<FeedItem[]> {
    if (items.length <= 1) return items;

    const targetCount = this.getTargetCount();
    const seen = new Set<string>();
    const deduplicated: FeedItem[] = [];

    for (const item of items) {
      const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      let isDuplicate = false;

      for (const seenTitle of seen) {
        if (this.similarity(normalizedTitle, seenTitle) > 0.7) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seen.add(normalizedTitle);
        deduplicated.push(item);
      }
    }

    console.log(`简单去重: 从 ${items.length} 篇文章中去重后剩余 ${deduplicated.length} 篇`);
    return deduplicated.slice(0, targetCount);
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    const longerLength = longer.length;
    if (longerLength === 0) return 1;

    return (longerLength - this.editDistance(longer, shorter)) / longerLength;
  }

  private editDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  async generateBriefingItem(item: FeedItem): Promise<BriefingItem> {
    const content = item.content || item.contentSnippet || '';

    const prompt = fillPrompt(config.ai.prompts.briefingUser, {
      title: item.title,
      source: item.feedTitle || '未知',
      link: item.link,
      content: content.substring(0, 2500),
    });

    try {
      const response = await this.provider.chat(
        [
          { role: 'system', content: config.ai.prompts.briefingSystem },
          { role: 'user', content: prompt },
        ],
        {
          temperature: config.ai.summaryTemperature,
          maxTokens: config.ai.summaryMaxTokens,
        }
      );
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || item.title,
          summary: parsed.summary || '无法生成摘要',
          tags: parsed.tags || [],
          link: item.link,
          feedTitle: item.feedTitle,
        };
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.failureLogger.logBriefingFailure(item.title, item.link, errorMsg);
    }

    return {
      title: item.title,
      summary: item.contentSnippet?.substring(0, 150) || '暂无摘要',
      tags: [],
      link: item.link,
      feedTitle: item.feedTitle,
    };
  }

  async generateBriefingItems(items: FeedItem[]): Promise<BriefingItem[]> {
    const briefingItems: BriefingItem[] = [];

    for (let i = 0; i < items.length; i++) {
      console.log(`生成简报 (${i + 1}/${items.length}): ${items[i].title.substring(0, 40)}...`);
      const briefingItem = await this.generateBriefingItem(items[i]);
      briefingItems.push(briefingItem);
      await this.sleep(config.ai.requestInterval);
    }

    return briefingItems;
  }

  async summarizeArticle(item: FeedItem): Promise<string> {
    const content = item.contentSnippet || item.content || item.title;

    try {
      const summary = await this.provider.chat(
        [
          { role: 'system', content: config.ai.prompts.summarizeSystem },
          {
            role: 'user',
            content: fillPrompt(config.ai.prompts.summarizeUser, {
              title: item.title,
              content: content.substring(0, 2500),
            }),
          },
        ],
        {
          temperature: config.ai.summaryTemperature,
          maxTokens: config.ai.summaryMaxTokens,
        }
      );

      this.db.updateFeedItemSummary(item.id, summary);

      console.log(`已生成摘要: ${item.title}`);
      return summary;
    } catch (error) {
      console.error(`生成摘要失败 ${item.title}:`, error);
      return '摘要生成失败';
    }
  }

  async summarizeMultipleArticles(items: FeedItem[]): Promise<Map<string, string>> {
    const summaries = new Map<string, string>();

    for (const item of items) {
      if (item.summary) {
        summaries.set(item.id, item.summary);
      } else {
        const summary = await this.summarizeArticle(item);
        summaries.set(item.id, summary);
        await this.sleep(1000);
      }
    }

    return summaries;
  }

  async generateGitHubReleaseSummary(item: GitHubReleaseItem): Promise<GitHubReleaseSummary | null> {
    const content = item.content || '';

    const prompt = fillPrompt(config.ai.prompts.releaseUser, {
      version: item.version,
      publishedAt: item.publishedAt.toLocaleString('zh-CN'),
      link: item.link,
      content: content.substring(0, 4000),
    });

    try {
      const response = await this.provider.chat(
        [
          { role: 'system', content: config.ai.prompts.releaseSystem },
          { role: 'user', content: prompt },
        ],
        {
          temperature: config.ai.temperature,
          maxTokens: config.ai.maxTokens,
        }
      );

      if (response.includes('无重要更新') || response.trim().length < 10) {
        return null;
      }

      return {
        version: item.version,
        publishedAt: item.publishedAt,
        summary: response.trim(),
        link: item.link,
        sourceName: item.source.name,
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.failureLogger.logBriefingFailure(`GitHub Release: ${item.version}`, item.link, errorMsg);
      return null;
    }
  }

  async generateGitHubReleaseSummaries(items: GitHubReleaseItem[]): Promise<GitHubReleaseSummary[]> {
    const summaries: GitHubReleaseSummary[] = [];

    for (let i = 0; i < items.length; i++) {
      console.log(`生成 GitHub Release 摘要 (${i + 1}/${items.length}): ${items[i].version}`);
      const summary = await this.generateGitHubReleaseSummary(items[i]);
      if (summary) {
        summaries.push(summary);
      }
      await this.sleep(config.ai.requestInterval);
    }

    return summaries;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}