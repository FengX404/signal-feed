import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.resolve(__dirname, '../../data/test-cards-temp');

vi.mock('../config', () => ({
  config: {
    cards: {
      retainDays: null,
    },
    branding: {
      card: {
        primary: '#4A9B6D',
        primaryLight: '#E8F3ED',
        primaryDark: '#3D8A5E',
        surface: '#F8FAF9',
        border: '#D4E5DA',
        borderLight: '#E8F3ED',
        textPrimary: '#1A3D2A',
        textSecondary: '#4A6B5A',
        textDisabled: '#8BA898',
      },
    },
  },
}));

import { XiaohongshuService } from './xiaohongshu';

function createTestFiles(filenames: string[]): void {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  for (const file of filenames) {
    const filepath = path.join(TEST_DIR, file);
    fs.writeFileSync(filepath, `<html><body>${file}</body></html>`, 'utf-8');
  }
}

function listFiles(): string[] {
  if (!fs.existsSync(TEST_DIR)) return [];
  return fs.readdirSync(TEST_DIR)
    .filter(f => f.startsWith('cards_') && f.endsWith('.html'))
    .sort();
}

function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    const files = fs.readdirSync(TEST_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEST_DIR, file));
    }
    fs.rmdirSync(TEST_DIR);
  }
}

describe('XiaohongshuService - saveBatch', () => {
  let service: XiaohongshuService;

  beforeEach(() => {
    cleanupTestDir();
    service = new XiaohongshuService(TEST_DIR);
  });

  afterEach(() => {
    cleanupTestDir();
  });

  it('should create HTML file with correct naming pattern', () => {
    const items = [
      { title: 'Test Title', summary: 'Test Summary', tags: ['#test'], link: 'https://example.com' },
    ];

    const filepath = service.saveBatch(items);

    expect(filepath).toMatch(/cards_\d{8}_\d{6}\.html$/);
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it('should create valid HTML structure', () => {
    const items = [
      { title: 'Test Title', summary: 'Test Summary', tags: ['#test'], link: 'https://example.com' },
    ];

    const filepath = service.saveBatch(items);
    const content = fs.readFileSync(filepath, 'utf-8');

    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
    expect(content).toContain('Test Title');
    expect(content).toContain('Test Summary');
  });

  it('should handle multiple items', () => {
    const items = [
      { title: 'Title 1', summary: 'Summary 1', tags: ['#tag1'], link: 'https://example.com/1' },
      { title: 'Title 2', summary: 'Summary 2', tags: ['#tag2'], link: 'https://example.com/2' },
    ];

    const filepath = service.saveBatch(items);
    const content = fs.readFileSync(filepath, 'utf-8');

    expect(content).toContain('Title 1');
    expect(content).toContain('Title 2');
    expect(content).toContain('共 2 篇');
  });
});
