import { describe, expect, it } from 'vitest';
import { formatJobLocation, formatRelativeDate, getSafeApplyLink } from './jobs';

describe('jobs helpers', () => {
  it('formats location from available parts', () => {
    expect(
      formatJobLocation({
        job_city: 'Bengaluru',
        job_state: 'Karnataka',
        job_country: 'India',
      })
    ).toBe('Bengaluru, Karnataka, India');
  });

  it('returns fallback when location is unavailable', () => {
    expect(formatJobLocation({})).toBe('Location not specified');
  });

  it('returns safe http/https links only', () => {
    expect(getSafeApplyLink('https://example.com/apply')).toBe(
      'https://example.com/apply'
    );
    expect(getSafeApplyLink('http://example.com')).toBe('http://example.com/');
    expect(getSafeApplyLink('javascript:alert(1)')).toBe('');
  });

  it('formats relative date and handles invalid values', () => {
    expect(formatRelativeDate(undefined)).toBe('Recently posted');
    expect(formatRelativeDate('not-a-date')).toBe('Recently posted');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(oneDayAgo)).toBe('Yesterday');
  });
});
