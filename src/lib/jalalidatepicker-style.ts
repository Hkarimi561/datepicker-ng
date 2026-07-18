/**
 * Tailwind class maps for `datepicker-ng`.
 * Consumers must include this package in their Tailwind `content` paths.
 *
 * Theme via CSS variables (defaults = light):
 * --dp-accent, --dp-surface, --dp-border, --dp-text, --dp-muted, --dp-hover, --dp-ring, --dp-on-accent
 */

export type DatepickerDir = 'rtl' | 'ltr';

type Flag = boolean | undefined;

function cx(...parts: Array<string | false | null | undefined | Record<string, Flag>>): string {
  const out: string[] = [];
  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (typeof part === 'string') {
      out.push(part);
      continue;
    }
    for (const [key, on] of Object.entries(part)) {
      if (on) {
        out.push(key);
      }
    }
  }
  return out.join(' ');
}

/** Parse `#rgb` / `#rrggbb` to 0–255 channels. */
function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) {
    return null;
  }
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color (0–1). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) {
    return 0;
  }
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/**
 * Readable foreground for text on an accent/selected background.
 * Uses theme ink/paper when `theme` is provided; otherwise black/white.
 */
export function contrastingOnAccent(
  accentHex: string,
  theme: 'light' | 'dark' = 'light',
): string {
  const L = relativeLuminance(accentHex);
  // Light accents need dark text; dark accents need light text.
  if (L > 0.45) {
    return theme === 'dark' ? '#e6edf5' : '#101828';
  }
  return theme === 'dark' ? '#04201c' : '#ffffff';
}

/** Full class strings so Tailwind content scan can see them. */
const accent = {
  bg: 'bg-[var(--dp-accent,#0d7377)]',
  text: 'text-[var(--dp-accent,#0d7377)]',
  ring: 'focus-visible:ring-[var(--dp-accent,#0d7377)]',
} as const;

export const dpClasses = {
  root: (opts: {
    filled: boolean;
    focused: boolean;
    disabled: boolean;
    invalid: boolean;
    styleClass?: string;
  }) =>
    cx(
      'dp-root relative inline-flex max-w-full',
      {
        'opacity-60 pointer-events-none': opts.disabled,
      },
      opts.styleClass,
    ),

  inputWrap: 'relative inline-flex w-full min-w-[14rem]',

  input: (invalid: boolean) =>
    cx(
      'dp-input w-full rounded-xl border bg-[var(--dp-surface,#ffffff)] px-3 py-2.5 pe-16 text-sm outline-none transition',
      'border-[var(--dp-border,#c8d2de)] text-[var(--dp-text,#142033)] placeholder:text-[var(--dp-muted,#5a6a7e)]',
      'focus:border-[var(--dp-accent,#0d7377)] focus:ring-2 focus:ring-[var(--dp-ring,color-mix(in_srgb,var(--dp-accent,#0d7377)_28%,transparent))]',
      {
        'border-red-500 focus:border-red-500 focus:ring-red-300/40': invalid,
      },
    ),

  clearIcon:
    'absolute end-9 top-1/2 z-[1] inline-flex -translate-y-1/2 cursor-pointer text-[var(--dp-muted,#5a6a7e)] hover:text-[var(--dp-text,#142033)]',

  inputIcon:
    'absolute end-3 top-1/2 z-[1] inline-flex -translate-y-1/2 cursor-pointer text-[var(--dp-muted,#5a6a7e)] hover:text-[var(--dp-text,#142033)]',

  panel: (inline: boolean) =>
    cx(
      'dp-panel min-w-[19.5rem] overflow-hidden rounded-[10px] border border-[var(--dp-border,#c8d2de)] bg-[var(--dp-surface,#ffffff)] text-[var(--dp-text,#142033)] shadow-lg',
      {
        'absolute start-0 top-[calc(100%+0.25rem)] z-[50]': !inline,
        'relative z-auto': inline,
      },
    ),

  selection: cx(
    'flex flex-col gap-1 px-5 py-4 text-[var(--dp-on-accent,#ffffff)]',
    accent.bg,
  ),

  selectionYear: 'text-sm font-medium opacity-90',
  selectionDate: 'text-xl font-semibold leading-snug',

  calendarContainer: 'px-4',
  calendar: '',

  header: 'flex items-center justify-between gap-2 pt-4 pb-1',

  navButton: cx(
    'inline-flex size-8 items-center justify-center rounded-full border-0 bg-transparent text-[var(--dp-muted,#5a6a7e)]',
    'hover:bg-[var(--dp-hover,#eef2f6)] disabled:opacity-40',
    accent.ring,
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
  ),

  title: 'flex flex-1 items-center justify-center',

  selectMonth: cx(
    'rounded-[10px] border-0 bg-transparent px-2 py-1 font-semibold text-[var(--dp-text,#142033)]',
    'hover:bg-[var(--dp-hover,#eef2f6)] disabled:opacity-40',
    accent.ring,
    'focus-visible:outline-none focus-visible:ring-2',
  ),

  selectYear: cx(
    'rounded-[10px] border-0 bg-transparent px-2 py-1 font-semibold text-[var(--dp-text,#142033)]',
    'hover:bg-[var(--dp-hover,#eef2f6)] disabled:opacity-40',
    accent.ring,
    'focus-visible:outline-none focus-visible:ring-2',
  ),

  dayView: 'mb-3 mt-2 w-full border-separate border-spacing-0.5',

  weekDayCell: 'p-0 text-center',
  weekDay: (friday: boolean) =>
    cx(
      'inline-flex size-9 items-center justify-center text-xs font-medium text-[var(--dp-muted,#5a6a7e)]',
      {
        [accent.text]: friday,
      },
    ),

  dayCell: (opts: { otherMonth: boolean; today: boolean; friday: boolean }) =>
    cx('p-0 text-center', {
      'opacity-45': opts.otherMonth,
    }),

  day: (opts: {
    selected: boolean;
    selectedRange: boolean;
    disabled: boolean;
    today: boolean;
    friday: boolean;
  }) =>
    cx(
      'dp-day inline-flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-sm text-[var(--dp-text,#142033)]',
      'hover:bg-[var(--dp-hover,#eef2f6)]',
      accent.ring,
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      {
        'border border-[var(--dp-accent,#0d7377)] bg-transparent':
          opts.today && !opts.selected && !opts.selectedRange,
        [accent.text]: opts.friday && !opts.selected && !opts.selectedRange && !opts.disabled,
        'bg-[var(--dp-accent,#0d7377)] text-[var(--dp-on-accent,#ffffff)] hover:bg-[var(--dp-accent,#0d7377)]':
          opts.selected,
        'bg-[color-mix(in_srgb,var(--dp-accent,#0d7377)_18%,transparent)]':
          opts.selectedRange && !opts.selected,
        'pointer-events-none cursor-default opacity-35': opts.disabled,
      },
    ),

  monthView: 'grid grid-cols-3 gap-1.5 px-4 pb-3 pt-2',
  yearView: 'grid grid-cols-3 gap-1.5 px-4 pb-3 pt-2',

  month: (opts: { selected: boolean; disabled: boolean }) =>
    cx(
      'flex w-full cursor-pointer items-center justify-center rounded-[10px] px-2 py-2 text-sm text-[var(--dp-text,#142033)]',
      'hover:bg-[var(--dp-hover,#eef2f6)]',
      {
        'bg-[var(--dp-accent,#0d7377)] text-[var(--dp-on-accent,#ffffff)] hover:bg-[var(--dp-accent,#0d7377)]':
          opts.selected,
        'pointer-events-none cursor-default opacity-35': opts.disabled,
      },
    ),

  year: (opts: { selected: boolean; disabled: boolean }) =>
    cx(
      'flex w-full cursor-pointer items-center justify-center rounded-[10px] px-2 py-2 text-sm text-[var(--dp-text,#142033)]',
      'hover:bg-[var(--dp-hover,#eef2f6)]',
      {
        'bg-[var(--dp-accent,#0d7377)] text-[var(--dp-on-accent,#ffffff)] hover:bg-[var(--dp-accent,#0d7377)]':
          opts.selected,
        'pointer-events-none cursor-default opacity-35': opts.disabled,
      },
    ),

  buttonbar: 'flex flex-wrap items-center gap-3 px-4 pb-4 pt-3',

  buttonbarSpacer: 'flex-1',

  primaryButton: cx(
    'rounded-lg border-0 px-3.5 py-2 text-sm font-medium text-[var(--dp-on-accent,#ffffff)]',
    accent.bg,
    'hover:opacity-90 disabled:cursor-default disabled:opacity-40',
    accent.ring,
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
  ),

  linkButton: cx(
    'rounded-[10px] border-0 bg-transparent px-1 py-2 text-sm',
    accent.text,
    'hover:underline disabled:cursor-default disabled:opacity-40 disabled:no-underline',
    accent.ring,
    'focus-visible:outline-none focus-visible:ring-2',
  ),
};

export { cx };

/**
 * CSS class name constants for styling hooks / tests.
 */
export enum JalaliDatePickerClasses {
  root = 'dp-root',
  input = 'dp-input',
  panel = 'dp-panel',
  day = 'dp-day',
  selection = 'dp-selection',
  friday = 'dp-friday',
}
