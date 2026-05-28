import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { BriefingItem } from './summarizer';

export class XiaohongshuService {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  private formatDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  }

  private formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  generateBatchHTML(items: BriefingItem[]): string {
    const c = config.branding.card;
    const date = this.formatDate();
    const cards = items.map((item, index) => this.cardHTML(item, index)).join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI资讯卡片 - ${date}</title>
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --brand-primary: ${c.primary};
      --brand-primary-light: ${c.primaryLight};
      --brand-primary-dark: ${c.primaryDark};
      --brand-surface: ${c.surface};
      --brand-border: ${c.border};
      --brand-border-light: ${c.borderLight};
      --brand-text-primary: ${c.textPrimary};
      --brand-text-secondary: ${c.textSecondary};
      --brand-text-disabled: ${c.textDisabled};
      --brand-accent: ${c.accent};
      --brand-accent-light: ${c.accentLight};
      --brand-accent-dark: ${c.accentDark};
      --brand-primary-rgb: 27, 167, 132;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: var(--brand-surface);
      color: var(--brand-text-primary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--brand-border-light);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .toolbar-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--brand-text-primary);
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--brand-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--brand-primary-dark);
    }

    .btn-outline {
      background: white;
      color: var(--brand-primary);
      border: 1px solid var(--brand-border);
    }

    .btn-outline:hover {
      background: var(--brand-primary-light);
      border-color: var(--brand-primary);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-status {
      font-size: 13px;
      color: var(--brand-text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cards-grid {
      max-width: 1520px;
      margin: 0 auto;
      padding: 24px 32px 48px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      justify-items: center;
    }

    .card {
      width: 360px;
      height: 480px;
      background: #FFFFFF;
      border-radius: 0px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: relative;
      box-shadow:
        0 2px 12px rgba(0, 0, 0, 0.06),
        0 4px 24px rgba(0, 0, 0, 0.04);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow:
        0 4px 20px rgba(var(--brand-primary-rgb), 0.12),
        0 8px 32px rgba(0, 0, 0, 0.08);
    }

    .card-divider {
      height: 3px;
      flex-shrink: 0;
      background: linear-gradient(90deg, var(--brand-primary), var(--brand-accent));
      opacity: 0.3;
    }

    .card-top {
      background: var(--brand-primary);
      padding: 28px 24px 24px;
      color: white;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      height: 190px;
      position: relative;
      overflow: hidden;
    }

    .card-top::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 20px,
        rgba(255,255,255,0.04) 20px,
        rgba(255,255,255,0.04) 21px
      );
      pointer-events: none;
    }

    .card-top::after {
      content: '';
      position: absolute;
      bottom: 12px;
      right: 14px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--brand-accent);
      opacity: 0.45;
      box-shadow: 0 0 6px var(--brand-accent);
    }

    .card-title {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      font-size: 26px;
      font-weight: 800;
      line-height: 1.4;
      letter-spacing: -0.5px;
      text-align: left;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-source {
      margin-top: auto;
      font-size: 12px;
      opacity: 0.7;
      letter-spacing: 0.3px;
      font-weight: 500;
    }

    .card-bottom {
      background: var(--brand-surface);
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .card-summary {
      font-size: 15px;
      line-height: 1.7;
      color: var(--brand-text-secondary);
      flex: 1;
    }

    .card-download-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.25s ease;
      z-index: 10;
      cursor: default;
    }

    .card:hover .card-download-overlay {
      opacity: 1;
    }

    .card-download-btn {
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 12px 32px;
      border-radius: 14px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      font-family: inherit;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-download-btn:hover {
      background: rgba(255, 255, 255, 0.32);
      transform: scale(1.06);
      box-shadow: 0 6px 28px rgba(0, 0, 0, 0.16);
    }

    .card-download-btn:active {
      transform: scale(0.97);
    }

    @media (max-width: 1520px) {
      .cards-grid {
        grid-template-columns: repeat(3, 1fr);
        max-width: 1160px;
      }
    }

    @media (max-width: 1160px) {
      .cards-grid {
        grid-template-columns: repeat(2, 1fr);
        max-width: 780px;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">${date} · AI资讯卡片 · 共 ${items.length} 篇</div>
    <div class="toolbar-actions">
      <span class="btn-status" id="status"></span>
      <button class="btn btn-primary" onclick="exportAll()">导出全部</button>
    </div>
  </div>

  <div class="cards-grid" id="cardsGrid">
    ${cards}
  </div>

  <script>
    function setStatus(text) {
      document.getElementById('status').textContent = text;
    }

    async function captureCard(cardEl) {
      const canvas = await html2canvas(cardEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      return canvas;
    }

    function downloadCanvas(canvas, filename) {
      canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    }

    async function exportAll() {
      const cards = document.querySelectorAll('.cards-grid .card');
      if (cards.length === 0) return;
      setStatus('正在导出...');

      for (let i = 0; i < cards.length; i++) {
        setStatus('导出 ' + (i + 1) + '/' + cards.length);
        const canvas = await captureCard(cards[i]);
        downloadCanvas(canvas, 'card_' + (i + 1) + '.png');
        await new Promise(r => setTimeout(r, 300));
      }

      setStatus('导出完成 ✓');
    }

    async function exportSingle(index) {
      const cards = document.querySelectorAll('.cards-grid .card');
      if (!cards[index]) return;
      setStatus('正在导出...');
      const canvas = await captureCard(cards[index]);
      downloadCanvas(canvas, 'card_' + (index + 1) + '.png');
      setStatus('导出完成 ✓');
    }
  </script>
</body>
</html>`;
  }

  private cardHTML(item: BriefingItem, index: number): string {
    return `    <div class="card" id="card-${index}">
      <div class="card-top">
        <h2 class="card-title">${item.title}</h2>
        <div class="card-source">${item.feedTitle || '未知来源'}</div>
      </div>
      <div class="card-divider"></div>
      <div class="card-bottom">
        <div class="card-summary">${item.summary}</div>
      </div>
      <div class="card-download-overlay">
        <button class="card-download-btn" onclick="exportSingle(${index})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          导出图片
        </button>
      </div>
    </div>`;
  }

  saveBatch(items: BriefingItem[]): string {
    const html = this.generateBatchHTML(items);
    const timestamp = this.formatTimestamp();
    const filename = `cards_${timestamp}.html`;
    const filepath = path.join(this.outputDir, filename);

    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`卡片已保存: ${filepath}`);
    return filepath;
  }

  cleanupOldCards(): void {
    const retainDays = config.cards?.retainDays;

    if (retainDays === null || retainDays === undefined || retainDays < 0) {
      return;
    }

    const files = fs.readdirSync(this.outputDir)
      .filter(f => f.startsWith('cards_') && f.endsWith('.html'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return;
    }

    if (retainDays === 0) {
      const toDelete = files.slice(1);
      for (const file of toDelete) {
        const filepath = path.join(this.outputDir, file);
        fs.unlinkSync(filepath);
      }
      if (toDelete.length > 0) {
        console.log(`卡片清理: 保留最新1条，删除 ${toDelete.length} 条旧记录`);
      }
      return;
    }

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - retainDays * 24 * 60 * 60 * 1000);
    const cutoffDateStr = this.dateToFileDateStr(cutoffDate);

    const toDelete: string[] = [];
    for (const file of files) {
      const fileDateStr = file.substring(6, 14);
      if (fileDateStr < cutoffDateStr) {
        toDelete.push(file);
      }
    }

    for (const file of toDelete) {
      const filepath = path.join(this.outputDir, file);
      fs.unlinkSync(filepath);
    }

    if (toDelete.length > 0) {
      console.log(`卡片清理: 保留最近${retainDays}天，删除 ${toDelete.length} 条旧记录`);
    }
  }

  private dateToFileDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
