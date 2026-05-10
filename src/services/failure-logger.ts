import * as fs from 'fs';
import * as path from 'path';

export interface FailedItem {
  type: 'rss_fetch' | 'briefing_generate';
  source?: string;
  title?: string;
  link?: string;
  error: string;
  timestamp: string;
}

export class FailureLogger {
  private logPath: string;

  constructor(dataDir: string) {
    this.logPath = path.join(dataDir, 'failures.json');
    this.ensureFile();
  }

  private ensureFile(): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.logPath)) {
      fs.writeFileSync(this.logPath, JSON.stringify([], null, 2));
    }
  }

  logRSSFailure(source: string, error: string): void {
    this.log({
      type: 'rss_fetch',
      source,
      error,
      timestamp: new Date().toISOString(),
    });
    console.log(`[失败记录] RSS源获取失败: ${source} - ${error}`);
  }

  logBriefingFailure(title: string, link: string, error: string): void {
    this.log({
      type: 'briefing_generate',
      title,
      link,
      error,
      timestamp: new Date().toISOString(),
    });
    console.log(`[失败记录] 简报生成失败: ${title} - ${error}`);
  }

  private log(item: FailedItem): void {
    try {
      const content = fs.readFileSync(this.logPath, 'utf-8');
      const failures: FailedItem[] = JSON.parse(content);
      failures.push(item);
      fs.writeFileSync(this.logPath, JSON.stringify(failures, null, 2));
    } catch (e) {
      console.error('写入失败日志出错:', e);
    }
  }

  getFailures(): FailedItem[] {
    try {
      const content = fs.readFileSync(this.logPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  clearFailures(): void {
    fs.writeFileSync(this.logPath, JSON.stringify([], null, 2));
    console.log('失败日志已清空');
  }
}
