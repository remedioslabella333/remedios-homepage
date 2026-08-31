import { describe, it, expect } from 'vitest';
import {
  clampInt, finiteInt, text, optionalText, safeUrl, isoDate, tags, jsonBody
} from '../src/utils/validation.js';

describe('clampInt', () => {
  it('parses and clamps within range', () => {
    expect(clampInt('42', 20, 1, 50)).toBe(42);
    expect(clampInt('999', 20, 1, 50)).toBe(50);
    expect(clampInt('0', 20, 1, 50)).toBe(1);
  });
  it('falls back on non-numeric input', () => {
    expect(clampInt('abc', 20, 1, 50)).toBe(20);
    expect(clampInt(null, 20, 1, 50)).toBe(20);
  });
});

describe('finiteInt', () => {
  it('accepts integers in range', () => {
    expect(finiteInt(5, 1, 100)).toBe(5);
    expect(finiteInt('5', 1, 100)).toBe(5);
    expect(finiteInt(1, 1, 100)).toBe(1);
    expect(finiteInt(100, 1, 100)).toBe(100);
  });
  it('rejects out-of-range, floats, booleans, empty', () => {
    expect(finiteInt(0, 1, 100)).toBeNull();
    expect(finiteInt(101, 1, 100)).toBeNull();
    expect(finiteInt(2.5, 1, 100)).toBeNull();
    expect(finiteInt(true, 1, 100)).toBeNull();
    expect(finiteInt('', 1, 100)).toBeNull();
    expect(finiteInt(null, 1, 100)).toBeNull();
  });
});

describe('text', () => {
  it('trims and validates length', () => {
    expect(text('  hi  ', 1, 10)).toBe('hi');
    expect(text('hello', 1, 10)).toBe('hello');
  });
  it('rejects non-strings and out-of-range', () => {
    expect(text(123, 1, 10)).toBeNull();
    expect(text('', 1, 10)).toBeNull();
    expect(text('a'.repeat(11), 1, 10)).toBeNull();
  });
});

describe('optionalText', () => {
  it('returns null for empty, or trimmed string', () => {
    expect(optionalText('', 10)).toBeNull();
    expect(optionalText(null, 10)).toBeNull();
    expect(optionalText('  x  ', 10)).toBe('x');
  });
});

describe('safeUrl', () => {
  it('accepts http/https URLs only', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeUrl('http://example.com')).toBe('http://example.com/');
  });
  it('rejects javascript/data schemes and malformed', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,x')).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl('ftp://example.com')).toBeNull();
  });
  it('returns null for empty input', () => {
    expect(safeUrl('')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe('isoDate', () => {
  it('normalizes valid dates', () => {
    expect(isoDate('2026-08-31T00:00:00Z')).toBe('2026-08-31T00:00:00.000Z');
  });
  it('rejects invalid and empty', () => {
    expect(isoDate('nope')).toBeNull();
    expect(isoDate('')).toBeNull();
    expect(isoDate(null)).toBeNull();
  });
});

describe('tags', () => {
  it('stringifies a string array', () => {
    expect(tags(['a', 'b'])).toBe('["a","b"]');
  });
  it('rejects non-arrays and empty strings', () => {
    expect(tags('nope')).toBeNull();
    expect(tags([42])).toBeNull();
    expect(tags(['', 'x'])).toBeNull();
  });
});

describe('jsonBody', () => {
  it('parses a valid JSON object body', async () => {
    const request = new Request('https://x.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'a', content: 'b' })
    });
    expect(await jsonBody(request)).toEqual({ nickname: 'a', content: 'b' });
  });
  it('rejects arrays as body', async () => {
    const request = new Request('https://x.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([1, 2, 3])
    });
    expect(await jsonBody(request)).toBeNull();
  });
  it('rejects malformed JSON', async () => {
    const request = new Request('https://x.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json'
    });
    expect(await jsonBody(request)).toBeNull();
  });
  it('rejects non-json content type', async () => {
    const request = new Request('https://x.test/', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });
    expect(await jsonBody(request)).toBeNull();
  });
});