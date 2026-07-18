/**
 * Translation / locale config for `datepicker-ng`.
 * Pass a built-in code (`'fa'` | `'en'`), a full locale object, or merge overrides via `translations`.
 */

/** JS `Date.getDay()` value: 0 = Sunday … 6 = Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DatepickerLocale {
  /** Optional locale id (documentation / debugging). */
  code?: string;
  placeholder?: string;
  select?: string;
  cancel?: string;
  today?: string;
  clear?: string;
  openCalendar?: string;
  prevMonth?: string;
  nextMonth?: string;
  prevYear?: string;
  nextYear?: string;
  prevDecade?: string;
  nextDecade?: string;
  pickDate?: string;
  pickRange?: string;
  /** 12 month names (calendar-specific). */
  monthNames?: readonly string[];
  /** 7 weekday short labels, Sunday-first order. */
  weekdaysMin?: readonly string[];
  /** 7 weekday long labels, Sunday-first order. */
  weekdaysLong?: readonly string[];
  rangeSeparator?: string;
  /** Day-number digits in the grid. */
  digits?: 'persian' | 'latin';
  /** Weekend columns (JS getDay values). */
  weekendDays?: readonly WeekStart[];
  /** Default first day of week when `weekStart` input is omitted. */
  weekStart?: WeekStart;
}

export type DatepickerLocaleInput = 'fa' | 'en' | DatepickerLocale;

export type ResolvedDatepickerLocale = Required<
  Pick<
    DatepickerLocale,
    | 'code'
    | 'placeholder'
    | 'select'
    | 'cancel'
    | 'today'
    | 'clear'
    | 'openCalendar'
    | 'prevMonth'
    | 'nextMonth'
    | 'prevYear'
    | 'nextYear'
    | 'prevDecade'
    | 'nextDecade'
    | 'pickDate'
    | 'pickRange'
    | 'monthNames'
    | 'weekdaysMin'
    | 'weekdaysLong'
    | 'rangeSeparator'
    | 'digits'
    | 'weekendDays'
    | 'weekStart'
  >
>;

/** Persian (Jalali-oriented) built-in locale. Week starts Saturday. */
export const DATEPICKER_LOCALE_FA: ResolvedDatepickerLocale = {
  code: 'fa',
  placeholder: 'انتخاب تاریخ',
  select: 'انتخاب',
  cancel: 'انصراف',
  today: 'امروز',
  clear: 'پاک کردن',
  openCalendar: 'باز کردن تقویم',
  prevMonth: 'ماه قبل',
  nextMonth: 'ماه بعد',
  prevYear: 'سال قبل',
  nextYear: 'سال بعد',
  prevDecade: 'دهه قبل',
  nextDecade: 'دهه بعد',
  pickDate: 'انتخاب تاریخ',
  pickRange: 'انتخاب بازه تاریخ',
  monthNames: [
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
  ],
  // Sunday-first storage order
  weekdaysMin: ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'],
  weekdaysLong: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
  rangeSeparator: ' تا ',
  digits: 'persian',
  weekendDays: [5], // Friday
  weekStart: 6, // Saturday
};

/** English (Gregorian-oriented) built-in locale. Week starts Sunday. */
export const DATEPICKER_LOCALE_EN: ResolvedDatepickerLocale = {
  code: 'en',
  placeholder: 'Select a date',
  select: 'Select',
  cancel: 'Cancel',
  today: 'Today',
  clear: 'Clear',
  openCalendar: 'Open calendar',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  prevYear: 'Previous year',
  nextYear: 'Next year',
  prevDecade: 'Previous decade',
  nextDecade: 'Next decade',
  pickDate: 'Select date',
  pickRange: 'Select date range',
  monthNames: [
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
  ],
  weekdaysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  weekdaysLong: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  rangeSeparator: ' – ',
  digits: 'latin',
  weekendDays: [0], // Sunday
  weekStart: 0, // Sunday
};

const BUILTIN: Record<'fa' | 'en', ResolvedDatepickerLocale> = {
  fa: DATEPICKER_LOCALE_FA,
  en: DATEPICKER_LOCALE_EN,
};

/** Rotate Sunday-first weekday labels so index 0 is `weekStart`. */
export function rotateWeekdays(labels: readonly string[], weekStart: WeekStart): string[] {
  const start = ((weekStart % 7) + 7) % 7;
  return [...labels.slice(start), ...labels.slice(0, start)];
}

/**
 * Resolve locale from built-in code / object / calendar default, then apply overrides.
 * When `locale` is omitted: Jalali → `fa`, Gregorian → `en`.
 */
export function resolveDatepickerLocale(
  calendar: 'jalali' | 'gregorian',
  locale?: DatepickerLocaleInput | null,
  translations?: Partial<DatepickerLocale> | null,
): ResolvedDatepickerLocale {
  const base: ResolvedDatepickerLocale =
    locale === 'en' || locale === 'fa'
      ? BUILTIN[locale]
      : locale && typeof locale === 'object'
        ? { ...(calendar === 'gregorian' ? DATEPICKER_LOCALE_EN : DATEPICKER_LOCALE_FA), ...locale }
        : calendar === 'gregorian'
          ? DATEPICKER_LOCALE_EN
          : DATEPICKER_LOCALE_FA;

  if (!translations) {
    return {
      ...base,
      monthNames: [...base.monthNames],
      weekdaysMin: [...base.weekdaysMin],
      weekdaysLong: [...base.weekdaysLong],
      weekendDays: [...base.weekendDays],
    };
  }

  return {
    ...base,
    ...translations,
    code: translations.code ?? base.code,
    monthNames: [...(translations.monthNames ?? base.monthNames)],
    weekdaysMin: [...(translations.weekdaysMin ?? base.weekdaysMin)],
    weekdaysLong: [...(translations.weekdaysLong ?? base.weekdaysLong)],
    weekendDays: [...(translations.weekendDays ?? base.weekendDays)],
    weekStart: (translations.weekStart ?? base.weekStart) as WeekStart,
    digits: translations.digits ?? base.digits,
  };
}
