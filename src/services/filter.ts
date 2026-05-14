import { config } from '../config';
import { FeedItem } from '../models';
import { isWeekend, similarity } from '../utils';

export class FilterService {
  private customTargetCount: number | null = null;

  setCustomTargetCount(count: number): void {
    this.customTargetCount = count;
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

    console.log(`简单去重: 从 ${items.length} 篇文章中去重后剩余 ${deduplicated.length} 篇`);
    return deduplicated.slice(0, targetCount);
  }
}
