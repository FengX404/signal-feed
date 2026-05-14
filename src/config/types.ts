export interface RSSFeedSource {
  name: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  reason?: string;
}

export interface GitHubReleaseSource {
  name: string;
  owner: string;
  repo: string;
  url?: string;
}
