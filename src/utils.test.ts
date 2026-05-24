import { describe, it, expect } from 'vitest';
import { editDistance, similarity, generateItemId, isWeekend, sleep } from '../src/utils';

describe('editDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(editDistance('hello', 'hello')).toBe(0);
  });

  it('should return length for empty string comparison', () => {
    expect(editDistance('', 'hello')).toBe(5);
    expect(editDistance('hello', '')).toBe(5);
  });

  it('should calculate correct distance for single character difference', () => {
    expect(editDistance('hello', 'hallo')).toBe(1);
  });

  it('should calculate correct distance for insertion', () => {
    expect(editDistance('hello', 'helloo')).toBe(1);
  });

  it('should calculate correct distance for deletion', () => {
    expect(editDistance('hello', 'helo')).toBe(1);
  });

  it('should work with Chinese characters', () => {
    expect(editDistance('你好', '你好')).toBe(0);
    expect(editDistance('你好', '你们')).toBe(1);
  });

  it('should handle completely different strings', () => {
    expect(editDistance('abc', 'xyz')).toBe(3);
  });

  it('should handle long strings', () => {
    const long1 = 'a'.repeat(1000);
    const long2 = 'a'.repeat(999) + 'b';
    expect(editDistance(long1, long2)).toBe(1);
  });

  it('should be symmetric', () => {
    expect(editDistance('hello', 'world')).toBe(editDistance('world', 'hello'));
  });
});

describe('similarity', () => {
  it('should return 1 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(1);
  });

  it('should return 0 for empty strings', () => {
    expect(similarity('', 'hello')).toBe(0);
    expect(similarity('hello', '')).toBe(0);
    expect(similarity('', '')).toBe(1);
  });

  it('should return value between 0 and 1', () => {
    const result = similarity('hello', 'hallo');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should be symmetric', () => {
    expect(similarity('hello', 'world')).toBe(similarity('world', 'hello'));
  });

  it('should work with Chinese characters', () => {
    expect(similarity('人工智能', '人工智能')).toBe(1);
    expect(similarity('人工智能', '机器学习')).toBeLessThan(1);
  });

  it('should return high similarity for similar strings', () => {
    expect(similarity('GPT-4', 'GPT-4o')).toBeGreaterThan(0.7);
  });

  it('should return low similarity for different strings', () => {
    expect(similarity('apple', 'orange')).toBeLessThan(0.5);
  });

  it('should handle case sensitivity', () => {
    expect(similarity('Hello', 'hello')).toBeLessThan(1);
    expect(similarity('Hello', 'hello')).toBeGreaterThan(0.5);
  });
});

describe('generateItemId', () => {
  it('should generate consistent ID for same input', () => {
    const id1 = generateItemId('https://example.com/article');
    const id2 = generateItemId('https://example.com/article');
    expect(id1).toBe(id2);
  });

  it('should generate different IDs for different inputs', () => {
    const id1 = generateItemId('https://example.com/article1');
    const id2 = generateItemId('https://example.com/article2');
    expect(id1).not.toBe(id2);
  });

  it('should return 32-character hex string (MD5)', () => {
    const id = generateItemId('test');
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[a-f0-9]+$/);
  });

  it('should handle empty string', () => {
    const id = generateItemId('');
    expect(id).toHaveLength(32);
  });

  it('should handle special characters', () => {
    const id = generateItemId('https://example.com/article?query=value&foo=bar#anchor');
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[a-f0-9]+$/);
  });

  it('should handle Unicode characters', () => {
    const id = generateItemId('https://example.com/文章/标题');
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[a-f0-9]+$/);
  });
});

describe('isWeekend', () => {
  it('should return boolean', () => {
    const result = isWeekend();
    expect(typeof result).toBe('boolean');
  });
});

describe('sleep', () => {
  it('should resolve after specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  it('should resolve immediately for 0ms', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
