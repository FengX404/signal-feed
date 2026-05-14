import { Result } from '../../utils/result';

export interface DataSourceItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  sourceName: string;
  sourceType: string;
}

export interface DataSource {
  readonly name: string;
  readonly type: string;
  fetch(): Promise<Result<DataSourceItem[]>>;
}

export interface DataSourceConfig {
  days?: number;
  targetCount?: number;
}
