import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { RSSFeedSource, GitHubReleaseSource } from './types';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env') });

function loadYamlFile(filePath: string): Record<string, any> | null {
  try {
    const yaml = require('js-yaml');
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(content) || {};
  } catch {
    return null;
  }
}

function loadConfigFile(): Record<string, any> {
  const yamlPath = path.resolve(PROJECT_ROOT, 'config.yaml');
  if (fs.existsSync(yamlPath)) {
    return loadYamlFile(yamlPath) || {};
  }
  return {};
}

function loadExternalConfig(filename: string): Record<string, any> | null {
  const filePath = path.resolve(PROJECT_ROOT, 'config', filename);
  if (fs.existsSync(filePath)) {
    return loadYamlFile(filePath);
  }
  return null;
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const defaultsYaml = loadExternalConfig('defaults.yaml') || {};
const fileConfig = loadConfigFile();
const merged = deepMerge(defaultsYaml, fileConfig);

const keywordsConfig = loadExternalConfig('keywords.yaml');
if (keywordsConfig?.keywords) {
  merged.ai.keywords = keywordsConfig.keywords;
}

const promptsConfig = loadExternalConfig('prompts.yaml');
if (promptsConfig?.prompts) {
  merged.ai.prompts = { ...merged.ai.prompts, ...promptsConfig.prompts };
}

const sourcesConfig = loadExternalConfig('sources.yaml');
if (sourcesConfig?.sources) {
  merged.rss.sources = sourcesConfig.sources;
}

const brandingConfig = loadExternalConfig('branding.yaml');
if (brandingConfig) {
  if (!merged.branding) {
    merged.branding = {};
  }
  if (brandingConfig.email) {
    merged.branding.email = brandingConfig.email;
  }
  if (brandingConfig.card) {
    merged.branding.card = brandingConfig.card;
  }
}

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

export const config = {
  app: {
    name: merged.app?.name || 'SignalFeed',
    userAgent: merged.app?.userAgent || 'Mozilla/5.0 (compatible; SignalFeed/1.0)',
  },

  ai: {
    provider: merged.ai?.provider as string,
    keywords: merged.ai?.keywords as string[],
    temperature: merged.ai?.temperature,
    maxTokens: merged.ai?.maxTokens,
    summaryTemperature: merged.ai?.summaryTemperature,
    summaryMaxTokens: merged.ai?.summaryMaxTokens,
    requestInterval: merged.ai?.requestInterval,
    timeout: merged.ai?.timeout,
    prompts: merged.ai?.prompts as Record<string, string>,

    providers: merged.ai?.providers as Record<
      string,
      { baseUrl: string; apiKey: string; model: string }
    >,
  },

  rss: {
    fetchTimeout: merged.rss?.fetchTimeout,
    defaultDays: merged.rss?.defaultDays,
    targetCount: merged.rss?.targetCount as { weekday: number; weekend: number; maxTotal: number },
    sources: merged.rss?.sources as RSSFeedSource[],
  },

  github: {
    fetchTimeout: merged.github?.fetchTimeout,
    sources: merged.github?.sources as GitHubReleaseSource[],
  },

  email: {
    smtp: {
      host: env('SMTP_HOST', merged.email?.smtp?.host || ''),
      port: envInt('SMTP_PORT', merged.email?.smtp?.port || 465),
      secure: merged.email?.smtp?.secure ?? true,
      user: env('SMTP_USER', merged.email?.smtp?.user || ''),
      pass: env('SMTP_PASS', merged.email?.smtp?.pass || ''),
    },
    senderName: merged.email?.senderName || 'SignalFeed',
    subjectPrefix: env('EMAIL_SUBJECT_PREFIX', merged.email?.subjectPrefix || 'SignalFeed'),
  },

  branding: {
    email: merged.branding?.email as Record<string, string>,
    card: merged.branding?.card as Record<string, string>,
  },

  database: {
    path: env('DB_PATH', merged.database?.path || path.resolve(PROJECT_ROOT, 'data/signalfeed.db')),
  },
};

export { RSSFeedSource, GitHubReleaseSource };
