import * as jalaali from 'jalaali-js';

/** Jalali calendar date parts (1-based month and day). Optional time for datetime values. */
export interface JalaliDateParts {
  jy: number;
  jm: number;
  jd: number;
  /** 0–23 when present. */
  hour?: number;
  /** 0–59 when present. */
  minute?: number;
  /** 0–59 when present. */
  second?: number;
}

/** Clock time in 24-hour form. */
export interface TimeParts {
  hour: number;
  minute: number;
  second: number;
}

export type HourFormat = '12' | '24';
export type Meridiem = 'am' | 'pm';

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

/** Gregorian month names (English). */
export const GREGORIAN_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Weekday labels starting Sunday (Gregorian week). */
export const GREGORIAN_WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export const GREGORIAN_WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Which calendar the panel grid uses. */
export type CalendarType = 'jalali' | 'gregorian';

export interface GregorianDateParts {
  gy: number;
  gm: number;
  gd: number;
}

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

/** Showcase / docs: relative keywords users can type in the input. */
export const RELATIVE_DATE_KEYWORDS = [
  { keyword: 'امروز', lang: 'fa', offset: 0 },
  { keyword: 'دیروز', lang: 'fa', offset: -1 },
  { keyword: 'پریروز', lang: 'fa', offset: -2 },
  { keyword: 'فردا', lang: 'fa', offset: 1 },
  { keyword: 'پس فردا', lang: 'fa', offset: 2 },
  { keyword: 'today', lang: 'en', offset: 0 },
  { keyword: 'yesterday', lang: 'en', offset: -1 },
  { keyword: 'tomorrow', lang: 'en', offset: 1 },
  { keyword: 'day after tomorrow', lang: 'en', offset: 2 },
  { keyword: 'day before yesterday', lang: 'en', offset: -2 },
  { keyword: 'overmorrow', lang: 'en', offset: 2 },
] as const;

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
  return new Date(
    gy,
    gm - 1,
    gd,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
    0,
  );
}

export function toJalaliParts(date: Date): JalaliDateParts {
  return jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Jalali parts including hour / minute / second from the Date. */
export function toJalaliDateTimeParts(date: Date): JalaliDateParts {
  return {
    ...toJalaliParts(date),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

/** Apply clock time onto a date (mutates a copy). */
export function applyTimeToDate(
  date: Date,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setHours(hour, minute, second, 0);
  return next;
}

export function timeFromDate(date: Date): TimeParts {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

export function wrapUnit(value: number, min: number, max: number): number {
  const span = max - min + 1;
  let next = value;
  while (next > max) {
    next -= span;
  }
  while (next < min) {
    next += span;
  }
  return next;
}

/** Convert 24h hour to 12h display (1–12) + meridiem. */
export function to12Hour(hour24: number): { hour: number; period: Meridiem } {
  const period: Meridiem = hour24 >= 12 ? 'pm' : 'am';
  const mod = hour24 % 12;
  return { hour: mod === 0 ? 12 : mod, period };
}

/** Convert 12h display hour + meridiem to 0–23. */
export function to24Hour(hour12: number, period: Meridiem): number {
  const h = wrapUnit(hour12, 1, 12);
  if (period === 'am') {
    return h === 12 ? 0 : h;
  }
  return h === 12 ? 12 : h + 12;
}

export function formatTimeDisplay(
  hour: number,
  minute: number,
  second: number | undefined,
  opts: {
    hourFormat?: HourFormat;
    showSeconds?: boolean;
    digits?: 'persian' | 'latin';
    am?: string;
    pm?: string;
  } = {},
): string {
  const hourFormat = opts.hourFormat ?? '24';
  const digits = opts.digits ?? 'latin';
  const showSeconds = opts.showSeconds ?? false;
  let core: string;

  if (hourFormat === '12') {
    const { hour: h12, period } = to12Hour(hour);
    const label = period === 'am' ? (opts.am ?? 'AM') : (opts.pm ?? 'PM');
    core = showSeconds
      ? `${pad2(h12)}:${pad2(minute)}:${pad2(second ?? 0)} ${label}`
      : `${pad2(h12)}:${pad2(minute)} ${label}`;
  } else {
    core = showSeconds
      ? `${pad2(hour)}:${pad2(minute)}:${pad2(second ?? 0)}`
      : `${pad2(hour)}:${pad2(minute)}`;
  }

  return digits === 'persian' ? toPersianDigits(core) : core;
}

/**
 * Parse `HH:mm`, `HH:mm:ss`, optional `AM`/`PM` (Latin or Persian ق.ظ / ب.ظ).
 * Returns 24-hour `TimeParts`, or null.
 */
export function parseTimeFromText(raw: string): TimeParts | null {
  const text = toLatinDigits(raw)
    .trim()
    .replace(/\u200c/g, '')
    .replace(/\s+/g, ' ');
  if (!text) {
    return null;
  }

  const m = text.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm|ق\.?\s*ظ\.?|ب\.?\s*ظ\.?))?$/i,
  );
  if (!m) {
    return null;
  }

  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = m[3] != null ? Number(m[3]) : 0;
  if (minute > 59 || second > 59 || Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
    return null;
  }

  const periodRaw = m[4]?.toLowerCase().replace(/\s+/g, '').replace(/\./g, '') ?? '';
  const isAm = periodRaw === 'am' || periodRaw === 'قظ';
  const isPm = periodRaw === 'pm' || periodRaw === 'بظ';

  if (isAm || isPm) {
    if (hour < 1 || hour > 12) {
      return null;
    }
    hour = to24Hour(hour, isAm ? 'am' : 'pm');
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute, second };
}

/** Split trailing time from a datetime string. */
export function splitDateTimeText(raw: string): { datePart: string; timePart: string | null } {
  const text = toLatinDigits(raw).trim().replace(/\s+/g, ' ');
  if (!text) {
    return { datePart: '', timePart: null };
  }

  const m = text.match(
    /^(.*?)(?:\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm|ق\.?\s*ظ\.?|ب\.?\s*ظ\.?))?))$/i,
  );
  if (!m || !m[1]?.trim()) {
    return { datePart: text, timePart: null };
  }

  return { datePart: m[1].trim(), timePart: m[2].trim() };
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

export function formatJalaliDisplay(
  parts: JalaliDateParts,
  pattern: 'short' | 'long' = 'short',
  monthNames: readonly string[] = JALALI_MONTH_NAMES,
  /** Sunday-first long weekday names. When omitted, uses built-in Saturday-first FA list. */
  weekdaysLongSunFirst?: readonly string[],
  digits: 'persian' | 'latin' = 'persian',
): string {
  const month = monthNames[parts.jm - 1];
  const day = digits === 'persian' ? toPersianDigits(parts.jd) : String(parts.jd);
  const year = digits === 'persian' ? toPersianDigits(parts.jy) : String(parts.jy);

  if (pattern === 'long') {
    const weekday = weekdaysLongSunFirst
      ? weekdaysLongSunFirst[toGregorianDate(parts).getDay()]
      : JALALI_WEEKDAY_LONG[jalaliWeekdayIndex(parts)];
    return weekdaysLongSunFirst ? `${weekday} ${day} ${month}` : `${weekday} ${day} ${month} ماه`;
  }

  return `${day} ${month} ${year}`;
}

export function formatJalaliRangeDisplay(
  start: JalaliDateParts,
  end: JalaliDateParts,
  separator = ' تا ',
  pattern: 'short' | 'long' = 'short',
  monthNames?: readonly string[],
  weekdaysLongSunFirst?: readonly string[],
  digits: 'persian' | 'latin' = 'persian',
): string {
  const [from, to] = normalizeJalaliRange(start, end);
  return `${formatJalaliDisplay(from, pattern, monthNames, weekdaysLongSunFirst, digits)}${separator}${formatJalaliDisplay(to, pattern, monthNames, weekdaysLongSunFirst, digits)}`;
}

export function formatJalaliMonthYear(
  jy: number,
  jm: number,
  monthNames: readonly string[] = JALALI_MONTH_NAMES,
  digits: 'persian' | 'latin' = 'persian',
): string {
  const year = digits === 'persian' ? toPersianDigits(jy) : String(jy);
  return `${monthNames[jm - 1]} ${year}`;
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

/** 12-year window around `jy` (decade-style year picker). */
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

export function toGregorianParts(date: Date): GregorianDateParts {
  return {
    gy: date.getFullYear(),
    gm: date.getMonth() + 1,
    gd: date.getDate(),
  };
}

export function fromGregorianParts(parts: GregorianDateParts): Date {
  return new Date(parts.gy, parts.gm - 1, parts.gd);
}

export function gregorianMonthLength(gy: number, gm: number): number {
  return new Date(gy, gm, 0).getDate();
}

export function addGregorianMonths(parts: GregorianDateParts, delta: number): GregorianDateParts {
  const date = new Date(parts.gy, parts.gm - 1 + delta, 1);
  const maxDay = gregorianMonthLength(date.getFullYear(), date.getMonth() + 1);
  return {
    gy: date.getFullYear(),
    gm: date.getMonth() + 1,
    gd: Math.min(parts.gd, maxDay),
  };
}

export function addGregorianYears(parts: GregorianDateParts, delta: number): GregorianDateParts {
  const gy = parts.gy + delta;
  const maxDay = gregorianMonthLength(gy, parts.gm);
  return { gy, gm: parts.gm, gd: Math.min(parts.gd, maxDay) };
}

/** 12-year window around `gy` (decade-style year picker). */
export function buildGregorianYearWindow(gy: number): number[] {
  const start = gy - ((gy % 10) + 1);
  return Array.from({ length: 12 }, (_, i) => start + i);
}

export function formatGregorianMonthYear(
  gy: number,
  gm: number,
  monthNames: readonly string[] = GREGORIAN_MONTH_NAMES,
): string {
  return `${monthNames[gm - 1]} ${gy}`;
}

export function formatGregorianDisplay(
  date: Date,
  pattern: 'short' | 'long' = 'short',
  monthNames: readonly string[] = GREGORIAN_MONTH_NAMES,
  weekdaysLong: readonly string[] = GREGORIAN_WEEKDAY_LONG,
): string {
  const parts = toGregorianParts(date);
  const month = monthNames[parts.gm - 1];
  if (pattern === 'long') {
    const weekday = weekdaysLong[date.getDay()];
    return `${weekday}, ${month} ${parts.gd}`;
  }
  return `${month} ${parts.gd}, ${parts.gy}`;
}

export function formatGregorianRangeDisplay(
  start: Date,
  end: Date,
  separator = ' – ',
  pattern: 'short' | 'long' = 'short',
  monthNames: readonly string[] = GREGORIAN_MONTH_NAMES,
  weekdaysLong: readonly string[] = GREGORIAN_WEEKDAY_LONG,
): string {
  const [from, to] = start.getTime() <= end.getTime() ? [start, end] : [end, start];
  return `${formatGregorianDisplay(from, pattern, monthNames, weekdaysLong)}${separator}${formatGregorianDisplay(to, pattern, monthNames, weekdaysLong)}`;
}

export function buildJalaliMonthGrid(
  jy: number,
  jm: number,
  today: JalaliDateParts,
  weekStart: number = 6,
  digits: 'persian' | 'latin' = 'persian',
  weekendDays: readonly number[] = [5],
): JalaliDayCell[][] {
  const daysInMonth = jalaliMonthLength(jy, jm);
  const firstJsDay = toGregorianDate({ jy, jm, jd: 1 }).getDay();
  const firstWeekday = (firstJsDay - weekStart + 7) % 7;
  const prev = addJalaliMonths({ jy, jm, jd: 1 }, -1);
  const prevDays = jalaliMonthLength(prev.jy, prev.jm);
  const next = addJalaliMonths({ jy, jm, jd: 1 }, 1);

  const cells: JalaliDayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const jd = prevDays - i;
    const parts = { jy: prev.jy, jm: prev.jm, jd };
    cells.push(createJalaliCell(parts, true, today, digits, weekendDays));
  }

  for (let jd = 1; jd <= daysInMonth; jd += 1) {
    const parts = { jy, jm, jd };
    cells.push(createJalaliCell(parts, false, today, digits, weekendDays));
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const parts = { jy: next.jy, jm: next.jm, jd: nextDay };
    cells.push(createJalaliCell(parts, true, today, digits, weekendDays));
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

/**
 * Gregorian month grid. Cells still carry Jalali `parts`
 * so selection / valueFormat stay consistent.
 */
export function buildGregorianMonthGrid(
  gy: number,
  gm: number,
  today: Date = new Date(),
  weekStart: number = 0,
  digits: 'persian' | 'latin' = 'latin',
  weekendDays: readonly number[] = [0],
): JalaliDayCell[][] {
  const daysInMonth = gregorianMonthLength(gy, gm);
  const firstJsDay = new Date(gy, gm - 1, 1).getDay();
  const firstWeekday = (firstJsDay - weekStart + 7) % 7;
  const prev = addGregorianMonths({ gy, gm, gd: 1 }, -1);
  const prevDays = gregorianMonthLength(prev.gy, prev.gm);
  const next = addGregorianMonths({ gy, gm, gd: 1 }, 1);
  const todayParts = toJalaliParts(today);

  const cells: JalaliDayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const gd = prevDays - i;
    const date = new Date(prev.gy, prev.gm - 1, gd);
    cells.push(createGregorianCell(date, true, todayParts, digits, weekendDays));
  }

  for (let gd = 1; gd <= daysInMonth; gd += 1) {
    const date = new Date(gy, gm - 1, gd);
    cells.push(createGregorianCell(date, false, todayParts, digits, weekendDays));
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const date = new Date(next.gy, next.gm - 1, nextDay);
    cells.push(createGregorianCell(date, true, todayParts, digits, weekendDays));
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

function createJalaliCell(
  parts: JalaliDateParts,
  otherMonth: boolean,
  today: JalaliDateParts,
  digits: 'persian' | 'latin',
  weekendDays: readonly number[],
): JalaliDayCell {
  const jsDay = toGregorianDate(parts).getDay();
  return {
    parts,
    otherMonth,
    today: isSameJalaliDay(parts, today),
    friday: weekendDays.includes(jsDay),
    label: digits === 'persian' ? toPersianDigits(parts.jd) : String(parts.jd),
  };
}

function createGregorianCell(
  date: Date,
  otherMonth: boolean,
  today: JalaliDateParts,
  digits: 'persian' | 'latin',
  weekendDays: readonly number[],
): JalaliDayCell {
  const parts = toJalaliParts(date);
  return {
    parts,
    otherMonth,
    today: isSameJalaliDay(parts, today),
    friday: weekendDays.includes(date.getDay()),
    label: digits === 'persian' ? toPersianDigits(date.getDate()) : String(date.getDate()),
  };
}
