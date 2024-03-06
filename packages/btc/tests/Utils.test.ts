import { describe, expect, it } from 'vitest';
import { isDomain } from '../src';

describe('Utils', () => {
  it('Domain validity tests', () => {
    expect(isDomain('google.com')).toBe(true);
    expect(isDomain('mail.google.com')).toBe(true);
    expect(isDomain('https://google.com')).toBe(false);
    expect(isDomain('google.com/path')).toBe(false);
    expect(isDomain('google')).toBe(false);
  });
});
