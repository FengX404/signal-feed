import { config } from '../config';
import { FeedItem } from '../models';
import { isWeekend, similarity } from '../utils';
import { AIProvider } from './ai/types';
import { OpenAICompatibleProvider } from './ai/providers/openai-compatible';

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

export class FilterService {
  private customTargetCount: number | null = null;
  private provider: AIProvider | null = null;

  setCustomTargetCount(count: number): void {
    this.customTargetCount = count;
  }

  private getProvider(): AIProvider {
    if (!this.provider) {
      this.provider = createProvider();
    }
    return this.provider;
  }

  private getTargetCount(): number {
    if (this.customTargetCount !== null) {
      return this.customTargetCount;
    }
    return isWeekend()
      ? config.rss.targetCount.weekend
      : config.rss.targetCount.weekday;
  }

  preFilterByKeywords(items: FeedItem[]): FeedItem[] {
    const keywords = config.ai.keywords;
    const filtered = items.filter((item) => {
      const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
      return keywords.some((kw: string) => text.includes(kw.toLowerCase()));
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

    const afterTitleDedup = this.deduplicateByTitle(items);
    console.log(`标题去重: 从 ${items.length} 篇文章中去重后剩余 ${afterTitleDedup.length} 篇`);

    if (afterTitleDedup.length <= 5) {
      return afterTitleDedup.slice(0, targetCount);
    }

    const afterAIDedup = await this.deduplicateByAI(afterTitleDedup);
    console.log(`AI语义去重: 从 ${afterTitleDedup.length} 篇文章中去重后剩余 ${afterAIDedup.length} 篇`);

    return afterAIDedup.slice(0, targetCount);
  }

  private deduplicateByTitle(items: FeedItem[]): FeedItem[] {
    const seen = new Set<string>();
    const deduplicated: FeedItem[] = [];

    for (const item of items) {
      const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      let isDuplicate = false;

      for (const seenTitle of seen) {
        if (similarity(normalizedTitle, seenTitle) > 0.7) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seen.add(normalizedTitle);
        deduplicated.push(item);
      }
    }

    return deduplicated;
  }

  private async deduplicateByAI(items: FeedItem[]): Promise<FeedItem[]> {
    const articleList = items
      .map((item, index) => `[${index}] ${item.title} | ${item.feedTitle || '未知来源'}`)
      .join('\n');

    const prompt = `以下是今日抓取的科技新闻文章列表，每行格式为 [编号] 标题 | 来源。

${articleList}

请判断哪些文章报道的是同一事件（即使标题表述不同、来源不同）。返回JSON格式，每组重复文章只保留编号最小的一个（即最早出现的）。

规则：
1. 只有核心事件相同时才算重复（如同一产品发布、同一诉讼案、同一研究论文）
2. 同一事件的不同角度报道不算重复（如一篇报道技术细节，一篇报道商业影响）
3. 如果没有重复，返回空数组

返回格式：
{"duplicates": [[保留的编号, 需移除的编号, ...], ...]}

示例：{"duplicates": [[0, 3, 7], [2, 5]]} 表示编号0/3/7是同一事件（保留0），编号2/5是同一事件（保留2）`;

    try {
      const response = await this.getProvider().chat(
        [
          {
            role: 'system',
            content: '你是一个新闻去重助手。你的任务是识别报道同一事件的不同文章。只返回JSON，不要解释。',
          },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 500,
        }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('AI去重: 无法解析响应，跳过AI去重');
        return items;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const duplicates: number[][] = parsed.duplicates || [];

      if (duplicates.length === 0) {
        return items;
      }

      const removeIndices = new Set<number>();
      for (const group of duplicates) {
        for (let i = 1; i < group.length; i++) {
          removeIndices.add(group[i]);
        }
      }

      const result = items.filter((_, index) => !removeIndices.has(index));
      console.log(`AI语义去重: 识别 ${duplicates.length} 组重复，移除 ${removeIndices.size} 篇`);
      return result;
    } catch (error) {
      console.log(`AI语义去重失败，跳过: ${(error as Error).message}`);
      return items;
    }
  }
}
