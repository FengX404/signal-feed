import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { Feed, FeedItem, Briefing } from '../models';
import { config } from '../config';

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(config.database.path);
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        title TEXT,
        last_fetched DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feed_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        pub_date DATETIME,
        content TEXT,
        content_snippet TEXT,
        summary TEXT,
        feed_url TEXT NOT NULL,
        feed_title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feed_url) REFERENCES feeds(url)
      );

      CREATE TABLE IF NOT EXISTS briefings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        sent_at DATETIME,
        item_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_feed_items_pub_date ON feed_items(pub_date);
      CREATE INDEX IF NOT EXISTS idx_feed_items_feed_url ON feed_items(feed_url);
    `);
  }

  saveFeed(feed: Partial<Feed>): void {
    const stmt = this.db.prepare(`
      INSERT INTO feeds (url, title, last_fetched)
      VALUES (@url, @title, @lastFetched)
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        last_fetched = excluded.last_fetched
    `);

    stmt.run({
      url: feed.url,
      title: feed.title,
      lastFetched: feed.lastFetched?.toISOString() || null,
    });
  }

  getFeedByUrl(url: string): Feed | undefined {
    const stmt = this.db.prepare('SELECT * FROM feeds WHERE url = ?');
    const row = stmt.get(url) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      url: row.url,
      title: row.title,
      lastFetched: row.last_fetched ? new Date(row.last_fetched) : null,
      createdAt: new Date(row.created_at),
    };
  }

  getAllFeeds(): Feed[] {
    const stmt = this.db.prepare('SELECT * FROM feeds');
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      lastFetched: row.last_fetched ? new Date(row.last_fetched) : null,
      createdAt: new Date(row.created_at),
    }));
  }

  saveFeedItem(item: Partial<FeedItem>): void {
    const stmt = this.db.prepare(`
      INSERT INTO feed_items (id, title, link, pub_date, content, content_snippet, summary, feed_url, feed_title)
      VALUES (@id, @title, @link, @pubDate, @content, @contentSnippet, @summary, @feedUrl, @feedTitle)
      ON CONFLICT(id) DO UPDATE SET
        summary = COALESCE(excluded.summary, summary)
    `);

    stmt.run({
      id: item.id,
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.content,
      contentSnippet: item.contentSnippet,
      summary: item.summary || null,
      feedUrl: item.feedUrl,
      feedTitle: item.feedTitle || null,
    });
  }

  getRecentFeedItems(hours: number = 24): FeedItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM feed_items
      WHERE datetime(pub_date) >= datetime('now', '-${hours} hours')
      ORDER BY datetime(pub_date) DESC
    `);
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      link: row.link,
      pubDate: row.pub_date,
      content: row.content,
      contentSnippet: row.content_snippet,
      summary: row.summary,
      feedUrl: row.feed_url,
      feedTitle: row.feed_title,
      createdAt: new Date(row.created_at),
    }));
  }

  getUnsummarizedItems(): FeedItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM feed_items
      WHERE summary IS NULL
      ORDER BY datetime(pub_date) DESC
    `);
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      link: row.link,
      pubDate: row.pub_date,
      content: row.content,
      contentSnippet: row.content_snippet,
      summary: row.summary,
      feedUrl: row.feed_url,
      feedTitle: row.feed_title,
      createdAt: new Date(row.created_at),
    }));
  }

  updateFeedItemSummary(id: string, summary: string): void {
    const stmt = this.db.prepare('UPDATE feed_items SET summary = ? WHERE id = ?');
    stmt.run(summary, id);
  }

  saveBriefing(briefing: Partial<Briefing>): number {
    const stmt = this.db.prepare(`
      INSERT INTO briefings (subject, content, sent_at, item_count)
      VALUES (@subject, @content, @sentAt, @itemCount)
    `);

    const result = stmt.run({
      subject: briefing.subject,
      content: briefing.content,
      sentAt: briefing.sentAt?.toISOString() || null,
      itemCount: briefing.itemCount || 0,
    });

    return result.lastInsertRowid as number;
  }

  close(): void {
    this.db.close();
  }
}
