import {
  addJalaliMonths,
  applySlashDateMask,
  buildGregorianMonthGrid,
  buildJalaliMonthGrid,
  buildJalaliYearWindow,
  compareJalaliDay,
  formatJalaliDisplay,
  formatJalaliMonthYear,
  formatJalaliRangeDisplay,
  isDateWithinBounds,
  isJalaliDateBetween,
  isSameJalaliDay,
  jalaliMonthLength,
  jalaliWeekdayIndex,
  normalizeJalaliRange,
  parseGregorianDateString,
  parseJalaliDateString,
  parseRelativeDateString,
  toGregorianDate,
  toJalaliParts,
  toPersianDigits,
} from './jalali-calendar';

describe('jalali-calendar', () => {
  it('converts known Gregorian ↔ Jalali dates', () => {
    const parts = toJalaliParts(new Date(2022, 1, 14)); // 1400/11/25
    expect(parts).toEqual({ jy: 1400, jm: 11, jd: 25 });
    expect(toGregorianDate(parts)).toEqual(new Date(2022, 1, 14));
  });

  it('formats Persian digits and month labels', () => {
    expect(toPersianDigits(1400)).toBe('۱۴۰۰');
    expect(formatJalaliMonthYear(1400, 11)).toBe('بهمن ۱۴۰۰');
    expect(formatJalaliDisplay({ jy: 1400, jm: 11, jd: 25 }, 'long')).toContain('بهمن');
  });

  it('builds a 6×7 month grid starting on Saturday', () => {
    const today = { jy: 1400, jm: 11, jd: 18 };
    const weeks = buildJalaliMonthGrid(1400, 11, today);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toHaveLength(7);
    expect(jalaliWeekdayIndex({ jy: 1400, jm: 11, jd: 1 })).toBeGreaterThanOrEqual(0);
    expect(jalaliMonthLength(1400, 11)).toBe(30);
  });

  it('detects same day and month navigation', () => {
    const a = { jy: 1400, jm: 11, jd: 25 };
    expect(isSameJalaliDay(a, { jy: 1400, jm: 11, jd: 25 })).toBe(true);
    expect(addJalaliMonths(a, 1)).toEqual({ jy: 1400, jm: 12, jd: 25 });
    expect(addJalaliMonths(a, -1)).toEqual({ jy: 1400, jm: 10, jd: 25 });
  });

  it('compares and normalizes date ranges', () => {
    const start = { jy: 1400, jm: 11, jd: 10 };
    const mid = { jy: 1400, jm: 11, jd: 15 };
    const end = { jy: 1400, jm: 11, jd: 20 };

    expect(compareJalaliDay(start, end)).toBeLessThan(0);
    expect(normalizeJalaliRange(end, start)).toEqual([start, end]);
    expect(isJalaliDateBetween(mid, start, end)).toBe(true);
    expect(isJalaliDateBetween(start, start, end)).toBe(false);
    expect(formatJalaliRangeDisplay(end, start)).toContain('تا');
  });

  it('parses common Jalali typed formats', () => {
    expect(parseJalaliDateString('15 خرداد 1404')).toEqual({ jy: 1404, jm: 3, jd: 15 });
    expect(parseJalaliDateString('خرداد 15 1404')).toEqual({ jy: 1404, jm: 3, jd: 15 });
    expect(parseJalaliDateString('1404/05/15')).toEqual({ jy: 1404, jm: 5, jd: 15 });
    expect(parseJalaliDateString('15/05/1404')).toEqual({ jy: 1404, jm: 5, jd: 15 });
    expect(parseJalaliDateString('۱۵ خرداد ۱۴۰۴')).toEqual({ jy: 1404, jm: 3, jd: 15 });
    expect(parseJalaliDateString('not-a-date')).toBeNull();
  });

  it('parses Gregorian slash formats', () => {
    expect(parseGregorianDateString('2025/06/05')).toEqual(new Date(2025, 5, 5));
    expect(parseGregorianDateString('05/06/2025')).toEqual(new Date(2025, 5, 5));
    expect(parseGregorianDateString('2025-13-01')).toBeNull();
  });

  it('parses relative day keywords in Persian and English', () => {
    const now = new Date(2025, 5, 10); // 10 Jun 2025

    expect(parseRelativeDateString('امروز', now)).toEqual(new Date(2025, 5, 10));
    expect(parseRelativeDateString('دیروز', now)).toEqual(new Date(2025, 5, 9));
    expect(parseRelativeDateString('پریروز', now)).toEqual(new Date(2025, 5, 8));
    expect(parseRelativeDateString('پری روز', now)).toEqual(new Date(2025, 5, 8));
    expect(parseRelativeDateString('فردا', now)).toEqual(new Date(2025, 5, 11));
    expect(parseRelativeDateString('پس فردا', now)).toEqual(new Date(2025, 5, 12));
    expect(parseRelativeDateString('پس‌فردا', now)).toEqual(new Date(2025, 5, 12));

    expect(parseRelativeDateString('today', now)).toEqual(new Date(2025, 5, 10));
    expect(parseRelativeDateString('yesterday', now)).toEqual(new Date(2025, 5, 9));
    expect(parseRelativeDateString('tomorrow', now)).toEqual(new Date(2025, 5, 11));
    expect(parseRelativeDateString('day after tomorrow', now)).toEqual(new Date(2025, 5, 12));
    expect(parseRelativeDateString('day before yesterday', now)).toEqual(new Date(2025, 5, 8));

    expect(parseJalaliDateString('فردا', now)).toEqual(toJalaliParts(new Date(2025, 5, 11)));
    expect(parseGregorianDateString('Tomorrow', now)).toEqual(new Date(2025, 5, 11));
  });

  it('applies slash masks and date bounds', () => {
    expect(applySlashDateMask('14040315', 'latin')).toBe('1404/03/15');
    expect(applySlashDateMask('۱۴۰۴۰۳۱۵', 'persian')).toBe('۱۴۰۴/۰۳/۱۵');
    expect(applySlashDateMask('1404', 'latin')).toBe('1404');
    expect(applySlashDateMask('140403', 'latin')).toBe('1404/03');

    const day = new Date(2025, 5, 10);
    expect(isDateWithinBounds(day, new Date(2025, 5, 1), new Date(2025, 5, 30))).toBe(true);
    expect(isDateWithinBounds(day, new Date(2025, 5, 11), null)).toBe(false);
    expect(buildJalaliYearWindow(1404).length).toBe(12);
  });

  it('builds a Gregorian month grid starting on Sunday', () => {
    const weeks = buildGregorianMonthGrid(2022, 2, new Date(2022, 1, 14));
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toHaveLength(7);
    // 1 Feb 2022 was Tuesday → index 2
    expect(weeks[0][2].label).toBe('1');
    expect(weeks[0][2].otherMonth).toBe(false);
  });
});
