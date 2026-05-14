import { config } from '../config';
import { BriefingItem, GitHubReleaseSummary } from './summarizer';

export class EmailTemplate {
  private get c() {
    return config.branding.card;
  }

  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  private markdownToHtml(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, `<code style="background: rgba(${this.hexToRgb(this.c.primary)}, 0.2); padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>`)
      .replace(/\n/g, '<br>');
  }

  private getStyles(includeReleases: boolean = false): string {
    const c = this.c;
    const baseStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      color: ${c.textPrimary};
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: ${c.surface};
      -webkit-font-smoothing: antialiased;
    }
    .header {
      background: linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDark} 100%);
      color: white;
      padding: 30px;
      border-radius: 16px;
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
    .card {
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 20px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 4px 24px rgba(0, 0, 0, 0.04);
    }
    .card-top {
      background: ${c.primary};
      padding: 28px 24px;
      color: white;
    }
    .card-title {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.35;
      color: white;
      text-decoration: none;
      display: block;
      letter-spacing: -0.5px;
    }
    .card-source {
      margin-top: 12px;
      font-size: 12px;
      opacity: 0.7;
      letter-spacing: 0.3px;
      font-weight: 500;
    }
    .card-bottom {
      background: ${c.surface};
      padding: 24px;
    }
    .card-summary {
      font-size: 14px;
      line-height: 1.8;
      color: ${c.textSecondary};
      text-align: justify;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 14px;
    }
    .card-tag {
      background: white;
      color: ${c.primaryDark};
      border: 1px solid ${c.border};
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: ${c.textDisabled};
      font-size: 12px;
    }`;

    if (includeReleases) {
      return baseStyles + `
    .divider {
      border: none;
      height: 2px;
      background: linear-gradient(90deg, transparent, ${c.primary}, transparent);
      margin: 40px 0;
    }
    .release-section {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    .release-section-title {
      color: #fff;
      font-size: 20px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${c.primary};
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
      color: ${c.primary};
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 8px;
    }
    .release-version:hover {
      color: ${c.primaryLight};
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
    }`;
    }

    return baseStyles;
  }

  renderBriefing(items: BriefingItem[], dateStr: string): string {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.email.subjectPrefix}</title>
  <style>${this.getStyles(false)}</style>
</head>
<body>
  <div class="header">
    <h1>${config.branding.email.headerEmoji} ${config.email.subjectPrefix}</h1>
    <p>${dateStr}</p>
  </div>
`;

    for (const item of items) {
      html += this.renderCard(item);
    }

    html += `
  <div class="footer">
    <p>由 ${config.app.name} 自动生成 | 共 ${items.length} 篇文章</p>
  </div>
</body>
</html>`;

    return html;
  }

  renderBriefingWithReleases(
    items: BriefingItem[],
    releases: GitHubReleaseSummary[],
    dateStr: string
  ): string {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.email.subjectPrefix}</title>
  <style>${this.getStyles(true)}</style>
</head>
<body>
  <div class="header">
    <h1>${config.branding.email.headerEmoji} ${config.email.subjectPrefix}</h1>
    <p>${dateStr}</p>
  </div>
`;

    for (const item of items) {
      html += this.renderCard(item);
    }

    if (releases.length > 0) {
      html += `
  <hr class="divider">
  <div class="release-section">
    <h2 class="release-section-title">📦 GitHub Releases 更新</h2>`;

      for (const release of releases) {
        html += this.renderReleaseItem(release);
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

  private renderCard(item: BriefingItem): string {
    return `
  <div class="card">
    <div class="card-top">
      <a href="${item.link}" class="card-title" target="_blank">${item.title}</a>
      <div class="card-source">${item.feedTitle || '未知来源'}</div>
    </div>
    <div class="card-bottom">
      <div class="card-summary">${item.summary}</div>
      ${item.tags && item.tags.length > 0 ? `<div class="card-tags">${item.tags.map((tag: string) => `<span class="card-tag">${tag}</span>`).join('')}</div>` : ''}
    </div>
  </div>`;
  }

  private renderReleaseItem(release: GitHubReleaseSummary): string {
    return `
    <div class="release-item">
      <a href="${release.link}" class="release-version" target="_blank">${release.version}</a>
      <span class="release-time">${this.formatDate(release.publishedAt)}</span>
      <div class="release-summary">${this.markdownToHtml(release.summary)}</div>
    </div>`;
  }

  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }
}
