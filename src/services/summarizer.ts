import { config } from '../config';
import { FeedItem } from '../models';
import { FailureLogger } from './failure-logger';
import { GitHubReleaseItem } from './data-source/github-releases-data-source';
import { AIProvider } from './ai/types';
import { OpenAICompatibleProvider } from './ai/providers/openai-compatible';
import { sleep, withRetry } from '../utils';

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

export class SummarizerService {
  private failureLogger: FailureLogger;
  private provider: AIProvider;

  constructor(failureLogger: FailureLogger) {
    this.failureLogger = failureLogger;
    this.provider = createProvider();
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
      const response = await withRetry(
        () => this.provider.chat(
          [
            { role: 'system', content: config.ai.prompts.briefingSystem },
            { role: 'user', content: prompt },
          ],
          {
            temperature: config.ai.summaryTemperature,
            maxTokens: config.ai.summaryMaxTokens,
          }
        ),
        {
          maxRetries: 2,
          delayMs: 1000,
          onRetry: (attempt: number, error: Error) => {
            console.log(`  摘要生成重试 ${attempt}/2: ${item.title.substring(0, 30)}... - ${error.message}`);
          },
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
      await sleep(config.ai.requestInterval);
    }

    return briefingItems;
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
      const response = await withRetry(
        () => this.provider.chat(
          [
            { role: 'system', content: config.ai.prompts.releaseSystem },
            { role: 'user', content: prompt },
          ],
          {
            temperature: config.ai.temperature,
            maxTokens: config.ai.maxTokens,
          }
        ),
        {
          maxRetries: 2,
          delayMs: 1000,
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
      await sleep(config.ai.requestInterval);
    }

    return summaries;
  }
}
