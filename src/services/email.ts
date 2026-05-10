import * as nodemailer from 'nodemailer';
import moment from 'moment';
import { config } from '../config';
import { FeedItem } from '../models';
import { DatabaseService } from './database';
import { BriefingItem, GitHubReleaseSummary } from './ai';

export class EmailService {
  private db: DatabaseService;
  private transporter: nodemailer.Transporter;

  constructor(db: DatabaseService) {
    this.db = db;
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass,
      },
    });
  }

  private get bgColor(): string {
    return config.branding.email.surface;
  }

  private get primaryColor(): string {
    return config.branding.email.primary;
  }

  private get primaryDark(): string {
    return config.branding.email.primaryDark;
  }

  private get headerEmoji(): string {
    return config.branding.email.headerEmoji;
  }

  private get senderName(): string {
    return config.email.senderName;
  }

  private get subjectPrefix(): string {
    return config.email.subjectPrefix;
  }

  private markdownToHtml(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, `<code style="background: rgba(102, 126, 234, 0.2); padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>`)
      .replace(/\n/g, '<br>');
  }

  async sendBriefingFromItems(items: BriefingItem[]): Promise<boolean> {
    if (items.length === 0) {
      console.log('没有文章需要发送');
      return false;
    }

    const subject = `${this.subjectPrefix} - ${moment().format('YYYY年MM月DD日')}`;
    const html = this.generateBriefingHTMLFromItems(items);

    try {
      await this.transporter.sendMail({
        from: `"${this.senderName}" <${config.email.smtp.user}>`,
        to: config.email.smtp.user,
        subject: subject,
        html: html,
      });

      this.db.saveBriefing({
        subject: subject,
        content: html,
        sentAt: new Date(),
        itemCount: items.length,
      });

      console.log(`简报已发送: ${subject}，共 ${items.length} 篇文章`);
      return true;
    } catch (error) {
      console.error('发送邮件失败:', error);
      return false;
    }
  }

  async sendBriefingWithGitHubReleases(items: BriefingItem[], releases: GitHubReleaseSummary[]): Promise<boolean> {
    if (items.length === 0 && releases.length === 0) {
      console.log('没有内容需要发送');
      return false;
    }

    const subject = `${this.subjectPrefix} - ${moment().format('YYYY年MM月DD日')}`;
    const html = this.generateBriefingHTMLWithReleases(items, releases);

    try {
      await this.transporter.sendMail({
        from: `"${this.senderName}" <${config.email.smtp.user}>`,
        to: config.email.smtp.user,
        subject: subject,
        html: html,
      });

      this.db.saveBriefing({
        subject: subject,
        content: html,
        sentAt: new Date(),
        itemCount: items.length + releases.length,
      });

      console.log(`简报已发送: ${subject}，共 ${items.length} 篇文章，${releases.length} 个版本更新`);
      return true;
    } catch (error) {
      console.error('发送邮件失败:', error);
      return false;
    }
  }

  private generateBriefingHTMLFromItems(items: BriefingItem[]): string {
    const p = config.branding.email;
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.subjectPrefix}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: ${p.surface};
    }
    .header {
      background: linear-gradient(135deg, ${p.primary} 0%, ${p.primaryDark} 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
    }
    .article {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .article-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      text-decoration: none;
      display: block;
      margin-bottom: 10px;
    }
    .article-title:hover {
      color: ${p.primary};
    }
    .article-summary {
      color: #555;
      font-size: 14px;
      line-height: 1.8;
    }
    .article-meta {
      font-size: 12px;
      color: #999;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${p.headerEmoji} ${this.subjectPrefix}</h1>
    <p>${moment().format('YYYY年MM月DD日 HH:mm')}</p>
  </div>
`;

    for (const item of items) {
      html += `
  <div class="article">
    <a href="${item.link}" class="article-title" target="_blank">${item.title}</a>
    <div class="article-summary">${item.summary}</div>
    ${item.feedTitle ? `<div class="article-meta">来源: ${item.feedTitle}</div>` : ''}
  </div>`;
    }

    html += `
  <div class="footer">
    <p>由 ${config.app.name} 自动生成 | 共 ${items.length} 篇文章</p>
  </div>
</body>
</html>`;

    return html;
  }

  private generateBriefingHTMLWithReleases(items: BriefingItem[], releases: GitHubReleaseSummary[]): string {
    const p = config.branding.email;
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.subjectPrefix}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: ${p.surface};
    }
    .header {
      background: linear-gradient(135deg, ${p.primary} 0%, ${p.primaryDark} 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
    }
    .article {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .article-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      text-decoration: none;
      display: block;
      margin-bottom: 10px;
    }
    .article-title:hover {
      color: ${p.primary};
    }
    .article-summary {
      color: #555;
      font-size: 14px;
      line-height: 1.8;
    }
    .article-meta {
      font-size: 12px;
      color: #999;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
    .divider {
      border: none;
      height: 2px;
      background: linear-gradient(90deg, transparent, ${p.primary}, transparent);
      margin: 40px 0;
    }
    .release-section {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    .release-section-title {
      color: #fff;
      font-size: 20px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${p.primary};
    }
    .release-item {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .release-item:last-child {
      margin-bottom: 0;
    }
    .release-version {
      color: ${p.primary};
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 8px;
    }
    .release-version:hover {
      color: ${p.primaryLight};
    }
    .release-time {
      color: #888;
      font-size: 12px;
      margin-left: 10px;
    }
    .release-summary {
      color: #ccc;
      font-size: 14px;
      line-height: 1.8;
    }
    .release-summary strong {
      color: #fff;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${p.headerEmoji} ${this.subjectPrefix}</h1>
    <p>${moment().format('YYYY年MM月DD日 HH:mm')}</p>
  </div>
`;

    for (const item of items) {
      html += `
  <div class="article">
    <a href="${item.link}" class="article-title" target="_blank">${item.title}</a>
    <div class="article-summary">${item.summary}</div>
    ${item.feedTitle ? `<div class="article-meta">来源: ${item.feedTitle}</div>` : ''}
  </div>`;
    }

    if (releases.length > 0) {
      html += `
  <hr class="divider">
  <div class="release-section">
    <h2 class="release-section-title">📦 GitHub Releases 更新</h2>`;

      for (const release of releases) {
        html += `
    <div class="release-item">
      <a href="${release.link}" class="release-version" target="_blank">${release.version}</a>
      <span class="release-time">${moment(release.publishedAt).format('MM-DD HH:mm')}</span>
      <div class="release-summary">${this.markdownToHtml(release.summary)}</div>
    </div>`;
      }

      html += `</div>`;
    }

    html += `
  <div class="footer">
    <p>由 ${config.app.name} 自动生成 | 共 ${items.length} 篇文章${releases.length > 0 ? `，${releases.length} 个版本更新` : ''}</p>
  </div>
</body>
</html>`;

    return html;
  }

  async sendBriefing(items: FeedItem[]): Promise<boolean> {
    if (items.length === 0) {
      console.log('没有文章需要发送');
      return false;
    }

    const subject = `${this.subjectPrefix} - ${moment().format('YYYY年MM月DD日')}`;
    const html = this.generateBriefingHTML(items);

    try {
      await this.transporter.sendMail({
        from: `"${this.senderName}" <${config.email.smtp.user}>`,
        to: config.email.smtp.user,
        subject: subject,
        html: html,
      });

      this.db.saveBriefing({
        subject: subject,
        content: html,
        sentAt: new Date(),
        itemCount: items.length,
      });

      console.log(`简报已发送: ${subject}，共 ${items.length} 篇文章`);
      return true;
    } catch (error) {
      console.error('发送邮件失败:', error);
      return false;
    }
  }

  private generateBriefingHTML(items: FeedItem[]): string {
    const groupedItems = this.groupByFeed(items);
    const p = config.branding.email;

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.subjectPrefix}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: ${p.surface};
    }
    .header {
      background: linear-gradient(135deg, ${p.primary} 0%, ${p.primaryDark} 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
    }
    .feed-section {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .feed-title {
      color: ${p.primary};
      font-size: 20px;
      border-bottom: 2px solid ${p.primary};
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .article {
      padding: 15px 0;
      border-bottom: 1px solid #eee;
    }
    .article:last-child {
      border-bottom: none;
    }
    .article-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      text-decoration: none;
      display: block;
      margin-bottom: 8px;
    }
    .article-title:hover {
      color: ${p.primary};
    }
    .article-summary {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .article-meta {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${p.headerEmoji} ${this.subjectPrefix}</h1>
    <p>${moment().format('YYYY年MM月DD日 HH:mm')}</p>
  </div>
`;

    for (const [feedTitle, feedItems] of groupedItems) {
      html += `
  <div class="feed-section">
    <h2 class="feed-title">${feedTitle}</h2>`;

      for (const item of feedItems) {
        html += `
    <div class="article">
      <a href="${item.link}" class="article-title" target="_blank">${item.title}</a>
      <div class="article-summary">${item.summary || item.contentSnippet || '暂无摘要'}</div>
      <div class="article-meta">${moment(item.pubDate).format('MM-DD HH:mm')}</div>
    </div>`;
      }

      html += `</div>`;
    }

    html += `
  <div class="footer">
    <p>由 ${config.app.name} 自动生成 | 共 ${items.length} 篇文章</p>
  </div>
</body>
</html>`;

    return html;
  }

  private groupByFeed(items: FeedItem[]): Map<string, FeedItem[]> {
    const grouped = new Map<string, FeedItem[]>();

    for (const item of items) {
      const feedTitle = item.feedTitle || '未知来源';
      if (!grouped.has(feedTitle)) {
        grouped.set(feedTitle, []);
      }
      grouped.get(feedTitle)!.push(item);
    }

    return grouped;
  }
}