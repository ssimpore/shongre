import { describe, it, expect } from 'vitest';
import {
  formatRelativeTimestamp,
  formatRelativeDate,
  formatPrice,
  formatDate,
  formatPhoneNumber,
} from './formatters';

describe('formatRelativeTimestamp', () => {
  const baseDate = new Date('2026-08-17T12:00:00Z');

  it('handles under 45 seconds / just now', () => {
    const recent = new Date('2026-08-17T11:59:30Z');
    expect(formatRelativeTimestamp(recent, { referenceDate: baseDate })).toBe("À l'instant");
    expect(formatRelativeTimestamp(recent, { referenceDate: baseDate, locale: 'en-US' })).toBe('Just now');
  });

  it('formats minutes ago properly in French and English', () => {
    const tenMinAgo = new Date('2026-08-17T11:50:00Z');
    expect(formatRelativeTimestamp(tenMinAgo, { referenceDate: baseDate })).toBe('Il y a 10 minutes');
    expect(formatRelativeTimestamp(tenMinAgo, { referenceDate: baseDate, style: 'short' })).toBe('Il y a 10 min');
    expect(formatRelativeTimestamp(tenMinAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('10 minutes ago');
    expect(formatRelativeTimestamp(tenMinAgo, { referenceDate: baseDate, locale: 'en-US', style: 'short' })).toBe('10m ago');

    const oneMinAgo = new Date('2026-08-17T11:59:00Z');
    expect(formatRelativeTimestamp(oneMinAgo, { referenceDate: baseDate })).toBe('Il y a 1 minute');
    expect(formatRelativeTimestamp(oneMinAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('1 minute ago');
  });

  it('formats hours ago properly in French and English', () => {
    const twoHoursAgo = new Date('2026-08-17T10:00:00Z');
    expect(formatRelativeTimestamp(twoHoursAgo, { referenceDate: baseDate })).toBe('Il y a 2 heures');
    expect(formatRelativeTimestamp(twoHoursAgo, { referenceDate: baseDate, style: 'short' })).toBe('Il y a 2 h');
    expect(formatRelativeTimestamp(twoHoursAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('2 hours ago');
    expect(formatRelativeTimestamp(twoHoursAgo, { referenceDate: baseDate, locale: 'en-US', style: 'short' })).toBe('2h ago');

    const oneHourAgo = new Date('2026-08-17T11:00:00Z');
    expect(formatRelativeTimestamp(oneHourAgo, { referenceDate: baseDate })).toBe('Il y a 1 heure');
    expect(formatRelativeTimestamp(oneHourAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('1 hour ago');
  });

  it('formats days ago properly in French and English', () => {
    const yesterday = new Date('2026-08-16T12:00:00Z');
    expect(formatRelativeTimestamp(yesterday, { referenceDate: baseDate })).toBe('Hier');
    expect(formatRelativeTimestamp(yesterday, { referenceDate: baseDate, numeric: 'always' })).toBe('Il y a 1 jour');
    expect(formatRelativeTimestamp(yesterday, { referenceDate: baseDate, locale: 'en-US' })).toBe('Yesterday');

    const threeDaysAgo = new Date('2026-08-14T12:00:00Z');
    expect(formatRelativeTimestamp(threeDaysAgo, { referenceDate: baseDate })).toBe('Il y a 3 jours');
    expect(formatRelativeTimestamp(threeDaysAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('3 days ago');
  });

  it('formats weeks ago properly', () => {
    const twoWeeksAgo = new Date('2026-08-03T12:00:00Z');
    expect(formatRelativeTimestamp(twoWeeksAgo, { referenceDate: baseDate })).toBe('Il y a 2 semaines');
    expect(formatRelativeTimestamp(twoWeeksAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('2 weeks ago');

    const oneWeekAgo = new Date('2026-08-10T12:00:00Z');
    expect(formatRelativeTimestamp(oneWeekAgo, { referenceDate: baseDate })).toBe('Il y a 1 semaine');
    expect(formatRelativeTimestamp(oneWeekAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('1 week ago');
  });

  it('formats months and years properly', () => {
    const twoMonthsAgo = new Date('2026-06-17T12:00:00Z');
    expect(formatRelativeTimestamp(twoMonthsAgo, { referenceDate: baseDate })).toBe('Il y a 2 mois');
    expect(formatRelativeTimestamp(twoMonthsAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('2 months ago');

    const twoYearsAgo = new Date('2024-08-17T12:00:00Z');
    expect(formatRelativeTimestamp(twoYearsAgo, { referenceDate: baseDate })).toBe('Il y a 2 ans');
    expect(formatRelativeTimestamp(twoYearsAgo, { referenceDate: baseDate, locale: 'en-US' })).toBe('2 years ago');
  });

  it('handles invalid dates or null gracefully', () => {
    expect(formatRelativeTimestamp(null)).toBe('');
    expect(formatRelativeTimestamp(undefined)).toBe('');
    expect(formatRelativeTimestamp('invalid-date')).toBe('invalid-date');
  });
});

describe('formatRelativeDate compatibility', () => {
  it('delegates to formatRelativeTimestamp', () => {
    const dateStr = '2026-08-17T10:00:00Z';
    expect(formatRelativeDate(dateStr)).toBeDefined();
    expect(typeof formatRelativeDate(dateStr)).toBe('string');
  });
});

describe('other formatters', () => {
  it('formats prices properly', () => {
    expect(formatPrice(120)).toContain('120');
    expect(formatPrice(0)).toBe('Don / Gratuit');
    expect(formatPrice(50)).toContain('50');
  });

  it('formats dates properly', () => {
    expect(formatDate('2026-08-17T10:00:00Z')).toBeDefined();
  });

  it('formats phone numbers properly', () => {
    expect(formatPhoneNumber('0612345678')).toBe('06 12 34 56 78');
  });
});
