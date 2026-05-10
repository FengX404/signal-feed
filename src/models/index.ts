export interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  summary?: string;
  feedUrl: string;
  feedTitle?: string;
  createdAt: Date;
}

export interface Feed {
  id: number;
  url: string;
  title: string;
  lastFetched: Date | null;
  createdAt: Date;
}

export interface Briefing {
  id: number;
  subject: string;
  content: string;
  sentAt: Date;
  itemCount: number;
  createdAt: Date;
}
