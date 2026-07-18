import * as jalaali from 'jalaali-js';

/** Jalali calendar date parts (1-based month and day). */
export interface JalaliDateParts {
  jy: number;
  jm: number;
  jd: number;
}

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** Weekday labels starting Saturday (Iranian week). */
export const JALALI_WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

export const JALALI_WEEKDAY_LONG = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Normalize Persian/Arabic-Indic digits to ASCII 0–9. */
export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => {
    const persian = PERSIAN_DIGITS.indexOf(d as (typeof PERSIAN_DIGITS)[number]);
    if (persian >= 0) {
      return String(persian);
    }
    const arabic = ARABIC_DIGITS.indexOf(d as (typeof ARABIC_DIGITS)[number]);
    return arabic >= 0 ? String(arabic) : d;
  });
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function isValidJalaliParts(parts: JalaliDateParts): boolean {
  return jalaali.isValidJalaaliDate(parts.jy, parts.jm, parts.jd);
}

function monthNameIndex(token: string): number {
  const normalized = token.trim().replace(/\u200c/g, '');
  return JALALI_MONTH_NAMES.findIndex((name) => name === normalized);
}

/** Day offsets from today for typed relative keywords (Persian + English). */
const RELATIVE_DAY_OFFSETS: Readonly<Record<string, number>> = {
  امروز: 0,
  دیروز: -1,
  پریروز: -2,
  'پری روز': -2,
  فردا: 1,
  پسفردا: 2,
  'پس فردا': 2,
  today: 0,
  yesterday: -1,
  tomorrow: 1,
  'day after tomorrow': 2,
  overmorrow: 2,
  'day before yesterday': -2,
};

function normalizeRelativeKeyword(raw: string): string {
  return toLatinDigits(raw)
    .trim()
    .replace(/\u200c/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Parse relative day keywords such as `امروز`, `دیروز`, `فردا`, `پریروز`,
 * `پس فردا`, `today`, `yesterday`, `tomorrow`.
 */
export function parseRelativeDateString(raw: string, now: Date = new Date()): Date | null {
  const key = normalizeRelativeKeyword(raw);
  if (!Object.prototype.hasOwnProperty.call(RELATIVE_DAY_OFFSETS, key)) {
    return null;
  }
  const offset = RELATIVE_DAY_OFFSETS[key];
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
}

/**
 * Parse typed Jalali date strings. Supported examples:
 * - `15 خرداد 1404`
 * - `خرداد 15 1404`
 * - `1404/05/15` or `1404-05-15`
 * - `15/05/1404` or `15-05-1404`
 * - Relative: `امروز`, `دیروز`, `فردا`, `پریروز`, `پس فردا` (and English equivalents)
 */
export function parseJalaliDateString(raw: string, now: Date = new Date()): JalaliDateParts | null {
  const relative = parseRelativeDateString(raw, now);
  if (relative) {
    return toJalaliParts(relative);
  }

  const text = toLatinDigits(raw).trim().replace(/\s+/g, ' ');
  if (!text) {
    return null;
  }

  const namedDayMonthYear = text.match(
    /^(\d{1,2})\s+([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیء‌]+)\s+(\d{4})$/u,
  );
  if (namedDayMonthYear) {
    const jm = monthNameIndex(namedDayMonthYear[2]) + 1;
    if (jm > 0) {
      const parts = {
        jd: Number(namedDayMonthYear[1]),
        jm,
        jy: Number(namedDayMonthYear[3]),
      };
      return isValidJalaliParts(parts) ? parts : null;
    }
  }

  const namedMonthDayYear = text.match(
    /^([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیء‌]+)\s+(\d{1,2})\s+(\d{4})$/u,
  );
  if (namedMonthDayYear) {
    const jm = monthNameIndex(namedMonthDayYear[1]) + 1;
    if (jm > 0) {
      const parts = {
        jm,
        jd: Number(namedMonthDayYear[2]),
        jy: Number(namedMonthDayYear[3]),
      };
      return isValidJalaliParts(parts) ? parts : null;
    }
  }

  const numeric = text.match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})$/);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const c = Number(numeric[3]);

    // YYYY/MM/DD
    if (String(numeric[1]).length === 4) {
      const parts = { jy: a, jm: b, jd: c };
      return isValidJalaliParts(parts) ? parts : null;
    }

    // DD/MM/YYYY
    if (String(numeric[3]).length === 4) {
      const parts = { jd: a, jm: b, jy: c };
      return isValidJalaliParts(parts) ? parts : null;
    }
  }

  return null;
}

/**
 * Parse typed Gregorian date strings (`YYYY/MM/DD` or `DD/MM/YYYY`),
 * plus relative keywords (`today`, `tomorrow`, `دیروز`, …).
 */
export function parseGregorianDateString(raw: string, now: Date = new Date()): Date | null {
  const relative = parseRelativeDateString(raw, now);
  if (relative) {
    return relative;
  }

  const text = toLatinDigits(raw).trim();
  if (!text) {
    return null;
  }

  const numeric = text.match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})$/);
  if (!numeric) {
    return null;
  }

  const a = Number(numeric[1]);
  const b = Number(numeric[2]);
  const c = Number(numeric[3]);

  let year: number;
  let month: number;
  let day: number;

  if (String(numeric[1]).length === 4) {
    year = a;
    month = b;
    day = c;
  } else if (String(numeric[3]).length === 4) {
    day = a;
    month = b;
    year = c;
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatJalaliSlash(parts: JalaliDateParts, digits: 'persian' | 'latin' = 'persian'): string {
  const value = `${parts.jy}/${pad2(parts.jm)}/${pad2(parts.jd)}`;
  return digits === 'persian' ? toPersianDigits(value) : value;
}

export function formatGregorianSlash(date: Date, digits: 'persian' | 'latin' = 'latin'): string {
  const value = `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
  return digits === 'persian' ? toPersianDigits(value) : value;
}

export function isJalaliDateParts(value: unknown): value is JalaliDateParts {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<JalaliDateParts>;
  return (
    typeof candidate.jy === 'number' &&
    typeof candidate.jm === 'number' &&
    typeof candidate.jd === 'number'
  );
}

export function toGregorianDate(parts: JalaliDateParts): Date {
  const { gy, gm, gd } = jalaali.toGregorian(parts.jy, parts.jm, parts.jd);
  return new Date(gy, gm - 1, gd);
}

export function toJalaliParts(date: Date): JalaliDateParts {
  return jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

export function isSameJalaliDay(a: JalaliDateParts | null, b: JalaliDateParts | null): boolean {
  return !!a && !!b && a.jy === b.jy && a.jm === b.jm && a.jd === b.jd;
}

/** Compare two Jalali days: negative if a < b, 0 if equal, positive if a > b. */
export function compareJalaliDay(a: JalaliDateParts, b: JalaliDateParts): number {
  if (a.jy !== b.jy) {
    return a.jy - b.jy;
  }
  if (a.jm !== b.jm) {
    return a.jm - b.jm;
  }
  return a.jd - b.jd;
}

/** True when day is strictly between start and end (order-independent). */
export function isJalaliDateBetween(
  day: JalaliDateParts,
  start: JalaliDateParts,
  end: JalaliDateParts,
): boolean {
  const [from, to] = compareJalaliDay(start, end) <= 0 ? [start, end] : [end, start];
  return compareJalaliDay(day, from) > 0 && compareJalaliDay(day, to) < 0;
}

/** Normalize a range so start ≤ end. */
export function normalizeJalaliRange(
  start: JalaliDateParts,
  end: JalaliDateParts,
): [JalaliDateParts, JalaliDateParts] {
  return compareJalaliDay(start, end) <= 0 ? [start, end] : [end, start];
}

export function addJalaliMonths(parts: JalaliDateParts, delta: number): JalaliDateParts {
  let { jy, jm, jd } = parts;
  jm += delta;

  while (jm > 12) {
    jm -= 12;
    jy += 1;
  }
  while (jm < 1) {
    jm += 12;
    jy -= 1;
  }

  const maxDay = jalaliMonthLength(jy, jm);
  return { jy, jm, jd: Math.min(jd, maxDay) };
}

/** Saturday-based weekday index (0 = Saturday … 6 = Friday). */
export function jalaliWeekdayIndex(parts: JalaliDateParts): number {
  const date = toGregorianDate(parts);
  // JS: 0 = Sunday … 6 = Saturday → shift so Saturday = 0
  return (date.getDay() + 1) % 7;
}

export function formatJalaliDisplay(parts: JalaliDateParts, pattern: 'short' | 'long' = 'short'): string {
  const month = JALALI_MONTH_NAMES[parts.jm - 1];
  const day = toPersianDigits(parts.jd);
  const year = toPersianDigits(parts.jy);

  if (pattern === 'long') {
    const weekday = JALALI_WEEKDAY_LONG[jalaliWeekdayIndex(parts)];
    return `${weekday} ${day} ${month} ماه`;
  }

  return `${day} ${month} ${year}`;
}

export function formatJalaliRangeDisplay(
  start: JalaliDateParts,
  end: JalaliDateParts,
  separator = ' تا ',
  pattern: 'short' | 'long' = 'short',
): string {
  const [from, to] = normalizeJalaliRange(start, end);
  return `${formatJalaliDisplay(from, pattern)}${separator}${formatJalaliDisplay(to, pattern)}`;
}

export function formatJalaliMonthYear(jy: number, jm: number): string {
  return `${JALALI_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)}`;
}

/** Strip time so min/max comparisons are date-only. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isDateWithinBounds(date: Date, minDate?: Date | null, maxDate?: Date | null): boolean {
  const day = startOfDay(date).getTime();
  if (minDate && day < startOfDay(minDate).getTime()) {
    return false;
  }
  if (maxDate && day > startOfDay(maxDate).getTime()) {
    return false;
  }
  return true;
}

export function isJalaliPartsWithinBounds(
  parts: JalaliDateParts,
  minDate?: Date | null,
  maxDate?: Date | null,
): boolean {
  return isDateWithinBounds(toGregorianDate(parts), minDate, maxDate);
}

export function addJalaliYears(parts: JalaliDateParts, delta: number): JalaliDateParts {
  const jy = parts.jy + delta;
  const maxDay = jalaliMonthLength(jy, parts.jm);
  return { jy, jm: parts.jm, jd: Math.min(parts.jd, maxDay) };
}

/** 12-year window around `jy` (PrimeNG-style decade picker). */
export function buildJalaliYearWindow(jy: number): number[] {
  const start = jy - ((jy % 10) + 1);
  return Array.from({ length: 12 }, (_, i) => start + i);
}

/**
 * Progressive `YYYY/MM/DD` mask from typed digits (Persian or Latin output).
 */
export function applySlashDateMask(raw: string, digits: 'persian' | 'latin' = 'persian'): string {
  const nums = toLatinDigits(raw).replace(/\D/g, '').slice(0, 8);
  let out = '';
  for (let i = 0; i < nums.length; i += 1) {
    if (i === 4 || i === 6) {
      out += '/';
    }
    out += nums[i];
  }
  return digits === 'persian' ? toPersianDigits(out) : out;
}

export interface JalaliDayCell {
  parts: JalaliDateParts;
  otherMonth: boolean;
  today: boolean;
  friday: boolean;
  label: string;
}

export function buildJalaliMonthGrid(jy: number, jm: number, today: JalaliDateParts): JalaliDayCell[][] {
  const daysInMonth = jalaliMonthLength(jy, jm);
  const firstWeekday = jalaliWeekdayIndex({ jy, jm, jd: 1 });
  const prev = addJalaliMonths({ jy, jm, jd: 1 }, -1);
  const prevDays = jalaliMonthLength(prev.jy, prev.jm);
  const next = addJalaliMonths({ jy, jm, jd: 1 }, 1);

  const cells: JalaliDayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const jd = prevDays - i;
    const parts = { jy: prev.jy, jm: prev.jm, jd };
    cells.push(createCell(parts, true, today));
  }

  for (let jd = 1; jd <= daysInMonth; jd += 1) {
    const parts = { jy, jm, jd };
    cells.push(createCell(parts, false, today));
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const parts = { jy: next.jy, jm: next.jm, jd: nextDay };
    cells.push(createCell(parts, true, today));
    nextDay += 1;
    if (cells.length >= 42) {
      break;
    }
  }

  const weeks: JalaliDayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function createCell(parts: JalaliDateParts, otherMonth: boolean, today: JalaliDateParts): JalaliDayCell {
  const weekday = jalaliWeekdayIndex(parts);
  return {
    parts,
    otherMonth,
    today: isSameJalaliDay(parts, today),
    friday: weekday === 6,
    label: toPersianDigits(parts.jd),
  };
}
