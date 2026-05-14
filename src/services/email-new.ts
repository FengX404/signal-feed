import * as nodemailer from 'nodemailer';
import { config } from '../config';
import { DatabaseService } from './database';
import { BriefingItem, GitHubReleaseSummary } from './summarizer';
import { EmailTemplate } from './email-template';

export class EmailService {
  private db: DatabaseService;
  private transporter: nodemailer.Transporter;
  private template: EmailTemplate;

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
    this.template = new EmailTemplate();
  }

  private formatDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  }

  private formatSubjectDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  }

  async sendBriefingFromItems(items: BriefingItem[]): Promise<boolean> {
    if (items.length === 0) {
      console.log('没有文章需要发送');
      return false;
    }

    const subject = `${config.email.subjectPrefix} - ${this.formatSubjectDate()}`;
    const html = this.template.renderBriefing(items, this.formatDate());

    try {
      await this.transporter.sendMail({
        from: `"${config.email.senderName}" <${config.email.smtp.user}>`,
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

    const subject = `${config.email.subjectPrefix} - ${this.formatSubjectDate()}`;
    const html = this.template.renderBriefingWithReleases(items, releases, this.formatDate());

    try {
      await this.transporter.sendMail({
        from: `"${config.email.senderName}" <${config.email.smtp.user}>`,
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
}
