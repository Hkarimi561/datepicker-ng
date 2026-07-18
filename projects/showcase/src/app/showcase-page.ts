import { DOCUMENT, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  DatepickerDir,
  CalendarType,
  contrastingOnAccent,
  formatJalaliDisplay,
  isJalaliDateParts,
  JalaliDateParts,
  JalaliDatePicker,
  JalaliDatePickerDisplayFormat,
  JalaliDatePickerInputCalendar,
  JalaliDatePickerValue,
  JalaliDatePickerValueFormat,
  parseRelativeDateString,
  RELATIVE_DATE_KEYWORDS,
  toJalaliParts,
  WeekStart,
} from 'datepicker-ng';

type ThemeMode = 'light' | 'dark';
type SelectionMode = 'single' | 'range';
type PackageManager = 'npm' | 'pnpm' | 'yarn';

const STORAGE_KEY = 'datepicker-ng.showcase.v1';

interface PlaygroundSettings {
  dir: DatepickerDir;
  calendar: CalendarType;
  locale: 'fa' | 'en';
  weekStart: WeekStart | null;
  selectionMode: SelectionMode;
  inline: boolean;
  editable: boolean;
  mask: boolean;
  autoCommit: boolean;
  showClear: boolean;
  showDateBanner: boolean;
  disabled: boolean;
  valueFormat: JalaliDatePickerValueFormat;
  inputCalendar: JalaliDatePickerInputCalendar;
  displayFormat: JalaliDatePickerDisplayFormat;
  useBounds: boolean;
  placeholder: string;
  accent: string;
  /** Text color on selected / accent surfaces (--dp-on-accent). */
  onAccent: string;
}

interface StoredShowcase {
  pageDir: DatepickerDir;
  theme: ThemeMode;
  packageManager: PackageManager;
  settings: PlaygroundSettings;
}

interface Recipe {
  id: string;
  title: string;
  titleEn: string;
  blurb: string;
  code: string;
}

const ACCENT_PRESETS = [
  { id: 'teal', label: 'فیروزه‌ای', value: '#0d7377', dark: '#2ec4b6' },
  { id: 'lapis', label: 'لاجوردی', value: '#1d4e89', dark: '#5b9bd5' },
  { id: 'saffron', label: 'زعفرانی', value: '#c4782b', dark: '#e8a54b' },
  { id: 'rose', label: 'گل سرخ', value: '#a63d40', dark: '#e07a7d' },
] as const;

const DEFAULT_PLACEHOLDER = 'فردا / tomorrow';

function defaultSettings(): PlaygroundSettings {
  return {
    dir: 'rtl',
    calendar: 'jalali',
    locale: 'fa',
    weekStart: null,
    selectionMode: 'single',
    inline: false,
    editable: true,
    mask: false,
    autoCommit: false,
    showClear: true,
    showDateBanner: true,
    disabled: false,
    valueFormat: 'date',
    inputCalendar: 'jalali',
    displayFormat: 'jalali-short',
    useBounds: false,
    placeholder: DEFAULT_PLACEHOLDER,
    accent: '#0d7377',
    onAccent: contrastingOnAccent('#0d7377', 'light'),
  };
}

function loadStoredShowcase(): Partial<StoredShowcase> | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Partial<StoredShowcase>;
  } catch {
    return null;
  }
}

function mergeSettings(
  partial?: Partial<PlaygroundSettings> | null,
  theme: ThemeMode = 'light',
): PlaygroundSettings {
  const merged = { ...defaultSettings(), ...(partial ?? {}) };
  if (!partial?.onAccent) {
    merged.onAccent = contrastingOnAccent(merged.accent, theme);
  }
  return merged;
}

@Component({
  selector: 'app-showcase-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JalaliDatePicker, FormsModule, ReactiveFormsModule, JsonPipe],
  template: `
    <div class="min-h-screen" [attr.dir]="pageDir()">
      <!-- Top bar -->
      <header
        class="sticky top-0 z-40 border-b backdrop-blur-xl"
        style="border-color: var(--line); background: color-mix(in srgb, var(--bg) 82%, transparent)"
      >
        <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <p class="font-brand m-0 text-xl font-extrabold tracking-tight sm:text-2xl" style="color: var(--ink)">
              datepicker-ng
            </p>
            <span class="text-xs font-medium sm:text-sm" style="color: var(--muted)">
              by Hamidreza Karimi
            </span>
            <span
              class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
              style="background: var(--accent-soft); color: var(--accent)"
            >
              playground
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div
              class="inline-flex rounded-full border p-0.5"
              style="border-color: var(--line); background: var(--panel)"
              role="group"
              [attr.aria-label]="pageDir() === 'rtl' ? 'جهت صفحه' : 'Page direction'"
            >
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                [style.background]="pageDir() === 'rtl' ? 'var(--accent)' : 'transparent'"
                [style.color]="pageDir() === 'rtl' ? 'var(--dp-on-accent)' : 'var(--muted)'"
                (click)="setPageDir('rtl')"
              >
                RTL
              </button>
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                [style.background]="pageDir() === 'ltr' ? 'var(--accent)' : 'transparent'"
                [style.color]="pageDir() === 'ltr' ? 'var(--dp-on-accent)' : 'var(--muted)'"
                (click)="setPageDir('ltr')"
              >
                LTR
              </button>
            </div>

            <div
              class="inline-flex rounded-full border p-0.5"
              style="border-color: var(--line); background: var(--panel)"
              role="group"
              [attr.aria-label]="pageDir() === 'rtl' ? 'تم' : 'Theme'"
            >
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                [style.background]="theme() === 'light' ? 'var(--accent)' : 'transparent'"
                [style.color]="theme() === 'light' ? 'var(--dp-on-accent)' : 'var(--muted)'"
                (click)="setTheme('light')"
              >
                {{ pageDir() === 'rtl' ? 'روشن' : 'Light' }}
              </button>
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                [style.background]="theme() === 'dark' ? 'var(--accent)' : 'transparent'"
                [style.color]="theme() === 'dark' ? 'var(--dp-on-accent)' : 'var(--muted)'"
                (click)="setTheme('dark')"
              >
                {{ pageDir() === 'rtl' ? 'تاریک' : 'Dark' }}
              </button>
            </div>

            <a
              href="https://github.com/Hkarimi561/datepicker-ng"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
              style="border-color: var(--line); background: var(--panel); color: var(--ink)"
            >
              GitHub
            </a>

            <a
              href="https://donofa.com/hamidreza/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
              style="border-color: var(--line); background: var(--accent); color: var(--dp-on-accent)"
            >
              {{ pageDir() === 'rtl' ? 'حمایت' : 'Donate' }}
            </a>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <!-- Hero -->
        <section class="mb-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p class="font-brand m-0 mb-2 text-4xl font-extrabold tracking-tight sm:text-5xl" style="color: var(--ink)">
              datepicker-ng
            </p>
            <h1 class="m-0 mb-3 text-lg font-medium sm:text-xl" style="color: var(--muted)">
              @if (pageDir() === 'rtl') {
                تقویم جلالی برای Angular — Tailwind، RTL و LTR
              } @else {
                Jalali calendar for Angular — Tailwind, RTL &amp; LTR
              }
            </h1>
            <p class="m-0 mb-5 max-w-xl text-[0.95rem] leading-7" style="color: var(--muted)">
              @if (pageDir() === 'rtl') {
                تنظیمات را عوض کنید، پیش‌نمایش را ببینید و نمونه کد را کپی کنید.
              } @else {
                Tweak settings, watch the live preview, and copy the generated snippet.
              }
            </p>
            <p class="m-0 mb-5 max-w-xl text-sm leading-6" style="color: var(--muted)">
              @if (pageDir() === 'rtl') {
                پروژه متن‌باز است — از مشارکت خوشحال می‌شویم و
                <a
                  href="https://github.com/Hkarimi561/datepicker-ng/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-semibold underline-offset-2 hover:underline"
                  style="color: var(--accent)"
                >گزارش مشکل</a>
                را در GitHub بفرستید.
              } @else {
                We’re open to contributions — and please
                <a
                  href="https://github.com/Hkarimi561/datepicker-ng/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-semibold underline-offset-2 hover:underline"
                  style="color: var(--accent)"
                >report issues</a>
                on GitHub.
              }
            </p>
            <div class="flex flex-col items-start gap-2">
              <div
                class="inline-flex w-fit rounded-xl border p-0.5"
                style="border-color: var(--line); background: var(--panel)"
                role="group"
                [attr.aria-label]="pageDir() === 'rtl' ? 'مدیر بسته' : 'Package manager'"
              >
                @for (pm of packageManagers; track pm) {
                  <button
                    type="button"
                    class="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                    [style.background]="packageManager() === pm ? 'var(--accent)' : 'transparent'"
                    [style.color]="packageManager() === pm ? 'var(--dp-on-accent)' : 'var(--muted)'"
                    (click)="setPackageManager(pm)"
                  >
                    {{ pm }}
                  </button>
                }
              </div>
              <div class="flex items-center gap-2">
                <code
                  class="font-mono inline-block rounded-xl border px-3.5 py-2.5 text-sm"
                  style="border-color: var(--line); background: var(--panel); color: var(--ink); box-shadow: var(--shadow)"
                >
                  {{ installCommand() }}
                </code>
                <button
                  type="button"
                  class="rounded-lg border px-2.5 py-2 text-xs font-semibold"
                  style="border-color: var(--line); background: var(--panel-2); color: var(--accent)"
                  (click)="copyCode(installCommand(), 'install')"
                >
                  {{ copiedKey() === 'install' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                </button>
              </div>
            </div>
          </div>

          <div
            class="relative overflow-hidden rounded-2xl border p-5"
            style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)"
          >
            <div
              class="pointer-events-none absolute inset-0 opacity-40"
              style="
                background:
                  linear-gradient(135deg, transparent 40%, var(--accent-soft) 100%),
                  repeating-linear-gradient(
                    -18deg,
                    transparent,
                    transparent 10px,
                    color-mix(in srgb, var(--line) 55%, transparent) 10px,
                    color-mix(in srgb, var(--line) 55%, transparent) 11px
                  );
              "
            ></div>
            <div class="relative">
              <p class="m-0 mb-1 text-xs font-semibold uppercase tracking-[0.14em]" style="color: var(--saffron)">
                {{ pageDir() === 'rtl' ? 'امروز' : 'Today' }}
              </p>
              <p class="m-0 text-2xl font-semibold" style="color: var(--ink)">{{ todayLabel() }}</p>
              <p class="m-0 mt-2 text-sm" style="color: var(--muted)">{{ todayGregorian() }}</p>
            </div>
          </div>
        </section>

        <!-- Relative keywords -->
        <section id="keywords" class="mb-14 scroll-mt-20">
          <div class="mb-4">
            <h2 class="m-0 text-xl font-semibold" style="color: var(--ink)">
              {{ pageDir() === 'rtl' ? 'کلمات نسبی تاریخ' : 'Relative date keywords' }}
            </h2>
            <p class="m-0 mt-1 text-sm" style="color: var(--muted)">
              @if (pageDir() === 'rtl') {
                در ورودی تایپ کنید — مثلاً <strong>فردا</strong> یا <strong>tomorrow</strong>
              } @else {
                Type these in the input — e.g. <strong>فردا</strong> or <strong>tomorrow</strong>
              }
            </p>
          </div>

          <div
            class="rounded-2xl border p-5 sm:p-6"
            style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)"
          >
            <div class="mb-4 flex flex-wrap gap-2">
              @for (item of relativeKeywords; track item.keyword) {
                <button
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
                  [style.border-color]="activeKeyword() === item.keyword ? 'var(--accent)' : 'var(--line)'"
                  [style.background]="activeKeyword() === item.keyword ? 'var(--accent-soft)' : 'var(--panel-2)'"
                  [style.color]="activeKeyword() === item.keyword ? 'var(--accent)' : 'var(--ink)'"
                  (click)="useRelativeKeyword(item.keyword)"
                >
                  {{ item.keyword }}
                </button>
              }
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="flex flex-col gap-3" dir="rtl">
                <p class="m-0 text-xs font-semibold" style="color: var(--muted)">
                  {{ pageDir() === 'rtl' ? 'placeholder نمونه' : 'Sample placeholder' }}
                </p>
                <datepicker-ng
                  dir="rtl"
                  [placeholder]="relativePlaceholder()"
                  [ngModel]="relativeDate()"
                  (ngModelChange)="onDateModelChange(relativeDate, $event)"
                />
                <p class="m-0 text-sm" style="color: var(--muted)">
                  {{ formatDate(relativeDate()) }}
                </p>
              </div>

              <div class="rounded-xl border p-4" style="border-color: var(--line); background: var(--panel-2)">
                <p class="m-0 mb-2 text-xs font-semibold" style="color: var(--muted)">
                  {{ pageDir() === 'rtl' ? 'فارسی' : 'Persian' }}
                </p>
                <p class="m-0 mb-3 font-mono text-sm leading-7" style="color: var(--ink)">
                  امروز · دیروز · پریروز · فردا · پس فردا
                </p>
                <p class="m-0 mb-2 text-xs font-semibold" style="color: var(--muted)">English</p>
                <p class="m-0 font-mono text-sm leading-7" style="color: var(--ink)">
                  today · yesterday · tomorrow · day after tomorrow · overmorrow
                </p>
                <div class="mt-4 flex justify-end">
                  <button
                    type="button"
                    class="text-xs font-semibold"
                    style="color: var(--accent)"
                    (click)="copyCode(relativeKeywordsCode, 'kw')"
                  >
                    {{ copiedKey() === 'kw' ? '✓' : (pageDir() === 'rtl' ? 'کپی کد' : 'Copy code') }}
                  </button>
                </div>
                <pre
                  class="font-mono m-0 mt-2 overflow-x-auto rounded-lg border p-3 text-[11px] leading-5"
                  style="border-color: var(--line); background: var(--code-bg); color: var(--code-ink)"
                ><code>{{ relativeKeywordsCode }}</code></pre>
              </div>
            </div>
          </div>
        </section>

        <!-- Playground -->
        <section id="playground" class="mb-14 scroll-mt-20">
          <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 class="m-0 text-xl font-semibold" style="color: var(--ink)">
                {{ pageDir() === 'rtl' ? 'زمین بازی' : 'Playground' }}
              </h2>
              <p class="m-0 mt-1 text-sm" style="color: var(--muted)">
                {{ pageDir() === 'rtl' ? 'همه ورودی‌ها برای تست زنده' : 'Every input wired for live testing' }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
              (click)="resetSettings()"
            >
              {{ pageDir() === 'rtl' ? 'بازنشانی' : 'Reset' }}
            </button>
          </div>

          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <!-- Preview -->
            <div
              class="rounded-2xl border p-5 sm:p-6"
              style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)"
            >
              <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p class="m-0 text-sm font-semibold" style="color: var(--ink)">
                  {{ pageDir() === 'rtl' ? 'پیش‌نمایش' : 'Preview' }}
                </p>
                <span class="font-mono text-[11px]" style="color: var(--muted)">
                  dir={{ settings().dir }} · {{ theme() }}
                </span>
              </div>

              <div class="flex flex-col gap-3" [style.max-width]="settings().inline ? '100%' : '22rem'">
                <datepicker-ng
                  [dir]="settings().dir"
                  [calendar]="settings().calendar"
                  [locale]="settings().locale"
                  [weekStart]="settings().weekStart ?? undefined"
                  [selectionMode]="settings().selectionMode"
                  [inline]="settings().inline"
                  [editable]="settings().editable"
                  [mask]="settings().mask"
                  [autoCommit]="settings().autoCommit"
                  [showClear]="settings().showClear"
                  [showDateBanner]="settings().showDateBanner"
                  [disabled]="settings().disabled"
                  [valueFormat]="settings().valueFormat === 'custom' ? 'date' : settings().valueFormat"
                  [inputCalendar]="settings().inputCalendar"
                  [displayFormat]="settings().displayFormat"
                  [placeholder]="settings().placeholder"
                  [minDate]="settings().useBounds ? minBound : null"
                  [maxDate]="settings().useBounds ? maxBound : null"
                  [ngModel]="playgroundModel()"
                  (ngModelChange)="onPlaygroundChange($event)"
                  (onInputInvalid)="lastInvalid.set($event)"
                />

                <div class="rounded-xl border px-3 py-2.5 text-sm" style="border-color: var(--line); background: var(--panel-2)">
                  <p class="m-0" style="color: var(--muted)">
                    <span class="font-semibold" style="color: var(--ink)">
                      {{ pageDir() === 'rtl' ? 'مقدار:' : 'Value:' }}
                    </span>
                    {{ playgroundValueLabel() }}
                  </p>
                  @if (lastInvalid()) {
                    <p class="m-0 mt-1" style="color: var(--warn)">
                      Invalid: {{ lastInvalid() }}
                    </p>
                  }
                </div>
              </div>

              <!-- Generated code -->
              <div class="mt-6">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <p class="m-0 text-sm font-semibold" style="color: var(--ink)">
                    {{ pageDir() === 'rtl' ? 'نمونه کد' : 'Code sample' }}
                  </p>
                  <button
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs font-semibold transition"
                    style="background: var(--accent-soft); color: var(--accent)"
                    (click)="copyCode(playgroundCode())"
                  >
                    {{ copiedKey() === 'playground' ? (pageDir() === 'rtl' ? 'کپی شد' : 'Copied') : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                  </button>
                </div>
                <pre
                  class="font-mono m-0 overflow-x-auto rounded-xl border p-4 text-[12px] leading-6"
                  style="border-color: var(--line); background: var(--code-bg); color: var(--code-ink)"
                ><code>{{ playgroundCode() }}</code></pre>
              </div>
            </div>

            <!-- Settings -->
            <aside
              class="h-fit rounded-2xl border p-4 sm:p-5 lg:sticky lg:top-20"
              style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)"
            >
              <p class="m-0 mb-4 text-sm font-semibold" style="color: var(--ink)">
                {{ pageDir() === 'rtl' ? 'تنظیمات' : 'Settings' }}
              </p>

              <div class="flex flex-col gap-4 text-sm">
                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">calendar</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().calendar"
                    (ngModelChange)="onCalendarTypeChange($event)"
                  >
                    <option value="jalali">jalali</option>
                    <option value="gregorian">gregorian</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">locale</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().locale"
                    (ngModelChange)="patch({ locale: $event })"
                  >
                    <option value="fa">fa (Persian)</option>
                    <option value="en">en (English)</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">weekStart</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().weekStart === null ? 'auto' : '' + settings().weekStart"
                    (ngModelChange)="onWeekStartChange($event)"
                  >
                    <option value="auto">auto (from locale)</option>
                    <option value="0">0 Sunday</option>
                    <option value="1">1 Monday</option>
                    <option value="6">6 Saturday</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">dir</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().dir"
                    (ngModelChange)="patch({ dir: $event })"
                  >
                    <option value="rtl">rtl</option>
                    <option value="ltr">ltr</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">selectionMode</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().selectionMode"
                    (ngModelChange)="onSelectionModeChange($event)"
                  >
                    <option value="single">single</option>
                    <option value="range">range</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">valueFormat</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().valueFormat"
                    (ngModelChange)="patch({ valueFormat: $event })"
                  >
                    <option value="date">date</option>
                    <option value="jalali">jalali</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">inputCalendar</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().inputCalendar"
                    (ngModelChange)="patch({ inputCalendar: $event })"
                  >
                    <option value="jalali">jalali</option>
                    <option value="gregorian">gregorian</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">displayFormat</span>
                  <select
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().displayFormat"
                    (ngModelChange)="patch({ displayFormat: $event })"
                  >
                    <option value="jalali-short">jalali-short</option>
                    <option value="jalali-long">jalali-long</option>
                    <option value="jalali-slash">jalali-slash</option>
                    <option value="gregorian-slash">gregorian-slash</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span style="color: var(--muted)">placeholder</span>
                  <input
                    type="text"
                    class="rounded-lg border px-2.5 py-2 outline-none"
                    style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                    [ngModel]="settings().placeholder"
                    (ngModelChange)="patch({ placeholder: $event })"
                  />
                </label>

                <fieldset class="m-0 border-0 p-0">
                  <legend class="mb-2 text-xs font-semibold" style="color: var(--muted)">
                    {{ pageDir() === 'rtl' ? 'رنگ تاکید و متن انتخاب' : 'Accent & selected text' }}
                  </legend>
                  <div class="mb-3 flex flex-wrap gap-2">
                    @for (swatch of accentPresets; track swatch.id) {
                      <button
                        type="button"
                        class="size-8 rounded-full border-2 transition"
                        [style.background]="theme() === 'dark' ? swatch.dark : swatch.value"
                        [style.border-color]="
                          settings().accent === (theme() === 'dark' ? swatch.dark : swatch.value)
                            ? 'var(--ink)'
                            : 'transparent'
                        "
                        [attr.aria-label]="swatch.label"
                        [attr.title]="swatch.label"
                        (click)="setAccent(theme() === 'dark' ? swatch.dark : swatch.value)"
                      ></button>
                    }
                  </div>
                  <div class="flex flex-wrap items-center gap-3">
                    <label class="flex flex-col gap-1">
                      <span class="text-[11px]" style="color: var(--muted)">
                        {{ pageDir() === 'rtl' ? 'پس‌زمینه' : 'Background' }}
                      </span>
                      <input
                        type="color"
                        class="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
                        [value]="settings().accent"
                        (input)="setAccent(($any($event.target).value))"
                        [attr.aria-label]="pageDir() === 'rtl' ? 'رنگ تاکید' : 'Accent color'"
                      />
                    </label>
                    <label class="flex flex-col gap-1">
                      <span class="text-[11px]" style="color: var(--muted)">
                        {{ pageDir() === 'rtl' ? 'متن انتخاب' : 'Selected text' }}
                      </span>
                      <input
                        type="color"
                        class="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
                        [value]="settings().onAccent"
                        (input)="setOnAccent(($any($event.target).value))"
                        [attr.aria-label]="pageDir() === 'rtl' ? 'رنگ متن روی انتخاب' : 'Selected text color'"
                      />
                    </label>
                    <div
                      class="flex h-9 min-w-[4.5rem] items-center justify-center rounded-lg px-3 text-sm font-semibold"
                      [style.background]="settings().accent"
                      [style.color]="settings().onAccent"
                      [attr.title]="pageDir() === 'rtl' ? 'پیش‌نمایش خوانایی' : 'Readability preview'"
                    >
                      ۱۵
                    </div>
                    <button
                      type="button"
                      class="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"
                      style="border-color: var(--line); background: var(--panel-2); color: var(--ink)"
                      (click)="autoOnAccent()"
                    >
                      {{ pageDir() === 'rtl' ? 'خودکار' : 'Auto' }}
                    </button>
                  </div>
                </fieldset>

                <div class="grid grid-cols-1 gap-2 border-t pt-3" style="border-color: var(--line)">
                  @for (toggle of toggles; track toggle.key) {
                    <label class="flex cursor-pointer items-center justify-between gap-3 py-0.5">
                      <span class="font-mono text-xs" style="color: var(--ink)">{{ toggle.key }}</span>
                      <input
                        type="checkbox"
                        class="size-4 accent-[var(--accent)]"
                        [checked]="$any(settings())[toggle.key]"
                        (change)="patchToggle(toggle.key, $any($event.target).checked)"
                      />
                    </label>
                  }
                </div>
              </div>
            </aside>
          </div>
        </section>

        <!-- Recipes -->
        <section id="examples" class="mb-14 scroll-mt-20">
          <h2 class="m-0 mb-1 text-xl font-semibold" style="color: var(--ink)">
            {{ pageDir() === 'rtl' ? 'نمونه‌های آماده' : 'Ready-made examples' }}
          </h2>
          <p class="m-0 mb-6 text-sm" style="color: var(--muted)">
            {{ pageDir() === 'rtl' ? 'هر کارت: پیش‌نمایش + کد' : 'Each card: preview + code' }}
          </p>

          <div class="flex flex-col gap-6">
            <!-- Popup RTL -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="rtl">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">Popup · RTL</h3>
                  <p class="m-0 mb-4 text-sm" style="color: var(--muted)">
                    {{ pageDir() === 'rtl' ? 'تایپ: ۱۵ خرداد ۱۴۰۴ یا فردا' : 'Type: ۱۵ خرداد ۱۴۰۴ or tomorrow' }}
                  </p>
                  <datepicker-ng
                    dir="rtl"
                    placeholder="فردا / tomorrow"
                    [ngModel]="popupDate()"
                    (ngModelChange)="onDateModelChange(popupDate, $event)"
                  />
                  <p class="m-0 mt-3 text-xs" style="color: var(--muted)">{{ formatDate(popupDate()) }}</p>
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[0].code, 'r0')">
                      {{ copiedKey() === 'r0' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[0].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- Gregorian calendar -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="ltr">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">Gregorian calendar</h3>
                  <p class="m-0 mb-4 text-sm" style="color: var(--muted)">calendar="gregorian" · Sunday-first grid</p>
                  <datepicker-ng
                    calendar="gregorian"
                    locale="en"
                    dir="ltr"
                    inputCalendar="gregorian"
                    displayFormat="gregorian-slash"
                    placeholder="tomorrow / 2025/06/05"
                    [ngModel]="gregorianCalDate()"
                    (ngModelChange)="onDateModelChange(gregorianCalDate, $event)"
                  />
                  <p class="m-0 mt-3 text-xs" style="color: var(--muted)">{{ formatGregorian(gregorianCalDate()) }}</p>
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[1].code, 'r1')">
                      {{ copiedKey() === 'r1' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[1].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- LTR Jalali -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="ltr">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">Jalali · LTR</h3>
                  <p class="m-0 mb-4 text-sm" style="color: var(--muted)">Jalali grid with LTR chrome</p>
                  <datepicker-ng
                    dir="ltr"
                    placeholder="tomorrow / today"
                    [ngModel]="ltrDate()"
                    (ngModelChange)="onDateModelChange(ltrDate, $event)"
                  />
                  <p class="m-0 mt-3 text-xs" style="color: var(--muted)">{{ formatDate(ltrDate()) }}</p>
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[2].code, 'r2')">
                      {{ copiedKey() === 'r2' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[2].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- Inline -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="rtl">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">Inline</h3>
                  <p class="m-0 mb-4 text-sm" style="color: var(--muted)">Always-open calendar</p>
                  <datepicker-ng
                    [inline]="true"
                    [ngModel]="inlineDate()"
                    (ngModelChange)="onDateModelChange(inlineDate, $event)"
                  />
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[3].code, 'r3')">
                      {{ copiedKey() === 'r3' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[3].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- Range -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="rtl">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">Range</h3>
                  <p class="m-0 mb-4 text-sm" style="color: var(--muted)">{{ formatRange(rangeDates()) }}</p>
                  <datepicker-ng
                    selectionMode="range"
                    [inline]="true"
                    placeholder="از تاریخ تا تاریخ"
                    [ngModel]="rangeDates()"
                    (ngModelChange)="onRangeModelChange($event)"
                  />
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[4].code, 'r4')">
                      {{ copiedKey() === 'r4' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[4].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- Mask + autoCommit -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="rtl">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">Mask + autoCommit</h3>
                  <p class="m-0 mb-4 text-sm" style="color: var(--muted)">YYYY/MM/DD mask, commit on pick</p>
                  <div class="flex flex-col gap-3 max-w-xs">
                    <datepicker-ng
                      [mask]="true"
                      [autoCommit]="true"
                      placeholder="۱۴۰۴/۰۳/۱۵"
                      [ngModel]="maskDate()"
                      (ngModelChange)="onDateModelChange(maskDate, $event)"
                    />
                    <p class="m-0 text-xs" style="color: var(--muted)">{{ formatDate(maskDate()) }}</p>
                  </div>
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[5].code, 'r5')">
                      {{ copiedKey() === 'r5' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[5].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- Jalali value -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="rtl">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">valueFormat="jalali"</h3>
                  <p class="m-0 mb-4 font-mono text-xs" style="color: var(--muted)">{{ jalaliParts() | json }}</p>
                  <datepicker-ng
                    valueFormat="jalali"
                    placeholder="۱۵ خرداد ۱۴۰۴"
                    [ngModel]="jalaliParts()"
                    (ngModelChange)="onJalaliModelChange($event)"
                  />
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[6].code, 'r6')">
                      {{ copiedKey() === 'r6' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[6].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- Reactive -->
            <article class="recipe rounded-2xl border overflow-hidden" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <div class="grid gap-0 lg:grid-cols-2">
                <div class="border-b p-5 lg:border-b-0 lg:border-e" style="border-color: var(--line)" dir="rtl">
                  <h3 class="m-0 mb-1 text-base font-semibold" style="color: var(--ink)">Reactive forms</h3>
                  <p class="m-0 mb-4 text-sm" style="color: var(--muted)">{{ formatDate(dateControl.value) }}</p>
                  <datepicker-ng [formControl]="dateControl" placeholder="تاریخ تولد" />
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--line); background: var(--panel-2); color: var(--ink)" (click)="setToday()">Today</button>
                    <button type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--line); background: var(--panel-2); color: var(--ink)" (click)="dateControl.reset()">Clear</button>
                    <button type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--line); background: var(--panel-2); color: var(--ink)" (click)="dateControl.disable()">Disable</button>
                    <button type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--line); background: var(--panel-2); color: var(--ink)" (click)="dateControl.enable()">Enable</button>
                  </div>
                </div>
                <div class="p-4" style="background: var(--code-bg)">
                  <div class="mb-2 flex justify-end">
                    <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(recipes[7].code, 'r7')">
                      {{ copiedKey() === 'r7' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                    </button>
                  </div>
                  <pre class="font-mono m-0 overflow-x-auto text-[11px] leading-5" style="color: var(--code-ink)"><code>{{ recipes[7].code }}</code></pre>
                </div>
              </div>
            </article>

            <!-- Install snippet -->
            <article class="rounded-2xl border p-5" style="border-color: var(--line); background: var(--panel); box-shadow: var(--shadow)">
              <h3 class="m-0 mb-3 text-base font-semibold" style="color: var(--ink)">
                {{ pageDir() === 'rtl' ? 'شروع سریع' : 'Quick start' }}
              </h3>
              <div class="mb-2 flex justify-end">
                <button type="button" class="text-xs font-semibold" style="color: var(--accent)" (click)="copyCode(quickStartCode, 'qs')">
                  {{ copiedKey() === 'qs' ? '✓' : (pageDir() === 'rtl' ? 'کپی' : 'Copy') }}
                </button>
              </div>
              <pre
                class="font-mono m-0 overflow-x-auto rounded-xl border p-4 text-[12px] leading-6"
                style="border-color: var(--line); background: var(--code-bg); color: var(--code-ink)"
              ><code>{{ quickStartCode }}</code></pre>
            </article>
          </div>
        </section>

        <footer class="border-t pt-6 text-sm" style="border-color: var(--line); color: var(--muted)">
          <p class="m-0 mb-2">
            MIT · Angular 22 · Tailwind CSS · RTL / LTR · Light / Dark
          </p>
          <p class="m-0">
            @if (pageDir() === 'rtl') {
              برای مشارکت یا گزارش باگ به
              <a
                href="https://github.com/Hkarimi561/datepicker-ng"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold underline-offset-2 hover:underline"
                style="color: var(--accent)"
              >GitHub</a>
              سر بزنید.
            } @else {
              Contributions and issue reports welcome on
              <a
                href="https://github.com/Hkarimi561/datepicker-ng"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold underline-offset-2 hover:underline"
                style="color: var(--accent)"
              >GitHub</a>.
            }
          </p>
        </footer>
      </main>
    </div>
  `,
})
export class ShowcasePage {
  private readonly document = inject(DOCUMENT);
  private readonly stored = loadStoredShowcase();

  protected readonly accentPresets = ACCENT_PRESETS;
  protected readonly relativeKeywords = RELATIVE_DATE_KEYWORDS;
  protected readonly packageManagers = ['npm', 'pnpm', 'yarn'] as const;

  protected readonly toggles = [
    { key: 'inline' as const },
    { key: 'editable' as const },
    { key: 'mask' as const },
    { key: 'autoCommit' as const },
    { key: 'showClear' as const },
    { key: 'showDateBanner' as const },
    { key: 'disabled' as const },
    { key: 'useBounds' as const },
  ];

  protected readonly pageDir = signal<DatepickerDir>(
    this.stored?.pageDir === 'ltr' || this.stored?.pageDir === 'rtl' ? this.stored.pageDir : 'rtl',
  );
  protected readonly theme = signal<ThemeMode>(
    this.stored?.theme === 'dark' || this.stored?.theme === 'light' ? this.stored.theme : 'light',
  );
  protected readonly packageManager = signal<PackageManager>(
    this.stored?.packageManager === 'pnpm' ||
      this.stored?.packageManager === 'yarn' ||
      this.stored?.packageManager === 'npm'
      ? this.stored.packageManager
      : 'npm',
  );
  protected readonly copiedKey = signal<string | null>(null);
  protected readonly lastInvalid = signal<string | null>(null);
  protected readonly activeKeyword = signal<string | null>(null);
  protected readonly relativePlaceholder = signal(DEFAULT_PLACEHOLDER);
  protected readonly relativeDate = signal<Date | null>(null);

  protected readonly settings = signal<PlaygroundSettings>(
    mergeSettings(this.stored?.settings, this.stored?.theme === 'dark' ? 'dark' : 'light'),
  );

  protected readonly installCommand = computed(() => {
    switch (this.packageManager()) {
      case 'pnpm':
        return 'pnpm add datepicker-ng';
      case 'yarn':
        return 'yarn add datepicker-ng';
      default:
        return 'npm install datepicker-ng';
    }
  });

  protected readonly popupDate = signal<Date | null>(null);
  protected readonly gregorianCalDate = signal<Date | null>(null);
  protected readonly ltrDate = signal<Date | null>(null);
  protected readonly inlineDate = signal<Date | null>(new Date());
  protected readonly rangeDates = signal<Date[] | null>(null);
  protected readonly maskDate = signal<Date | null>(null);
  protected readonly jalaliParts = signal<JalaliDateParts | null>(null);
  protected readonly playgroundSingle = signal<Date | null>(null);
  protected readonly playgroundRange = signal<Date[] | null>(null);

  protected readonly minBound = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  protected readonly maxBound = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);
  protected readonly dateControl = new FormControl<Date | null>(null);

  protected readonly relativeKeywordsCode = `<datepicker-ng
  placeholder="فردا / tomorrow"
  [(ngModel)]="date"
/>

// type: امروز، فردا، دیروز، tomorrow, today, …`;

  protected readonly playgroundModel = computed(() =>
    this.settings().selectionMode === 'range' ? this.playgroundRange() : this.playgroundSingle(),
  );

  protected readonly playgroundValueLabel = computed(() => {
    if (this.settings().selectionMode === 'range') {
      return this.formatRange(this.playgroundRange());
    }
    return this.formatDate(this.playgroundSingle());
  });

  protected readonly todayLabel = computed(() => formatJalaliDisplay(toJalaliParts(new Date()), 'long'));
  protected readonly todayGregorian = computed(() => new Date().toLocaleDateString('en-CA'));

  protected readonly playgroundCode = computed(() => this.buildPlaygroundCode(this.settings()));

  protected readonly recipes: Recipe[] = [
    {
      id: 'popup',
      title: 'Popup RTL',
      titleEn: 'Popup RTL',
      blurb: '',
      code: `<datepicker-ng
  dir="rtl"
  placeholder="فردا یا ۱۵ خرداد ۱۴۰۴"
  [(ngModel)]="date"
/>`,
    },
    {
      id: 'gregorian',
      title: 'Gregorian',
      titleEn: 'Gregorian',
      blurb: '',
      code: `<datepicker-ng
  calendar="gregorian"
  locale="en"
  dir="ltr"
  inputCalendar="gregorian"
  displayFormat="gregorian-slash"
  placeholder="tomorrow / 2025/06/05"
  [(ngModel)]="date"
/>`,
    },
    {
      id: 'ltr',
      title: 'LTR',
      titleEn: 'LTR',
      blurb: '',
      code: `<datepicker-ng
  dir="ltr"
  placeholder="tomorrow or today"
  [(ngModel)]="date"
/>`,
    },
    {
      id: 'inline',
      title: 'Inline',
      titleEn: 'Inline',
      blurb: '',
      code: `<datepicker-ng
  [inline]="true"
  [(ngModel)]="date"
/>`,
    },
    {
      id: 'range',
      title: 'Range',
      titleEn: 'Range',
      blurb: '',
      code: `<datepicker-ng
  selectionMode="range"
  [inline]="true"
  [(ngModel)]="range"
/>`,
    },
    {
      id: 'mask',
      title: 'Mask',
      titleEn: 'Mask',
      blurb: '',
      code: `<datepicker-ng
  [mask]="true"
  [autoCommit]="true"
  placeholder="۱۴۰۴/۰۳/۱۵"
  [(ngModel)]="date"
/>`,
    },
    {
      id: 'jalali',
      title: 'Jalali value',
      titleEn: 'Jalali value',
      blurb: '',
      code: `<datepicker-ng
  valueFormat="jalali"
  [(ngModel)]="parts"
/>

// parts: { jy, jm, jd } | null`,
    },
    {
      id: 'reactive',
      title: 'Reactive',
      titleEn: 'Reactive',
      blurb: '',
      code: `dateControl = new FormControl<Date | null>(null);

<datepicker-ng
  [formControl]="dateControl"
  placeholder="تاریخ تولد"
/>`,
    },
  ];

  protected readonly quickStartCode = `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JalaliDatePicker } from 'datepicker-ng';

@Component({
  selector: 'app-demo',
  imports: [FormsModule, JalaliDatePicker],
  template: \`
    <datepicker-ng
      dir="rtl"
      [(ngModel)]="date"
      placeholder="فردا / tomorrow"
    />
  \`,
})
export class DemoComponent {
  date: Date | null = null;
}`;

  constructor() {
    effect(() => {
      const dir = this.pageDir();
      const html = this.document.documentElement;
      html.setAttribute('dir', dir);
      html.setAttribute('lang', dir === 'rtl' ? 'fa' : 'en');
    });

    effect(() => {
      const mode = this.theme();
      const html = this.document.documentElement;
      html.classList.toggle('dark', mode === 'dark');
      html.style.colorScheme = mode;
    });

    effect(() => {
      const { accent, onAccent } = this.settings();
      const root = this.document.documentElement;
      root.style.setProperty('--dp-accent', accent);
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--dp-on-accent', onAccent);
    });

    effect(() => {
      const payload: StoredShowcase = {
        pageDir: this.pageDir(),
        theme: this.theme(),
        packageManager: this.packageManager(),
        settings: this.settings(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Storage may be unavailable.
      }
    });
  }

  protected useRelativeKeyword(keyword: string): void {
    this.activeKeyword.set(keyword);
    this.relativePlaceholder.set(keyword);
    this.patch({ placeholder: keyword });
    const parsed = parseRelativeDateString(keyword);
    this.relativeDate.set(parsed);
  }

  protected setPageDir(dir: DatepickerDir): void {
    this.pageDir.set(dir);
  }

  protected setPackageManager(pm: PackageManager): void {
    this.packageManager.set(pm);
  }

  protected setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    const preset = ACCENT_PRESETS.find(
      (p) =>
        p.value === this.settings().accent ||
        p.dark === this.settings().accent,
    );
    if (preset) {
      this.setAccent(mode === 'dark' ? preset.dark : preset.value);
    } else {
      this.autoOnAccent();
    }
  }

  protected setAccent(value: string): void {
    this.patch({
      accent: value,
      onAccent: contrastingOnAccent(value, this.theme()),
    });
  }

  protected setOnAccent(value: string): void {
    this.patch({ onAccent: value });
  }

  protected autoOnAccent(): void {
    this.patch({ onAccent: contrastingOnAccent(this.settings().accent, this.theme()) });
  }

  protected patch(partial: Partial<PlaygroundSettings>): void {
    this.settings.update((s) => ({ ...s, ...partial }));
  }

  protected patchToggle(key: (typeof this.toggles)[number]['key'], value: boolean): void {
    this.patch({ [key]: value });
  }

  protected onSelectionModeChange(mode: SelectionMode): void {
    this.patch({ selectionMode: mode });
    this.lastInvalid.set(null);
  }

  protected onCalendarTypeChange(calendar: CalendarType): void {
    if (calendar === 'gregorian') {
      this.patch({
        calendar,
        locale: 'en',
        dir: 'ltr',
        inputCalendar: 'gregorian',
        displayFormat: 'gregorian-slash',
        placeholder: 'tomorrow / 2025/06/05',
        weekStart: null,
      });
      return;
    }
    this.patch({
      calendar,
      locale: 'fa',
      dir: 'rtl',
      inputCalendar: 'jalali',
      displayFormat: 'jalali-short',
      placeholder: DEFAULT_PLACEHOLDER,
      weekStart: null,
    });
  }

  protected onWeekStartChange(raw: string): void {
    if (raw === 'auto') {
      this.patch({ weekStart: null });
      return;
    }
    this.patch({ weekStart: Number(raw) as WeekStart });
  }

  protected resetSettings(): void {
    this.settings.set(defaultSettings());
    this.playgroundSingle.set(null);
    this.playgroundRange.set(null);
    this.lastInvalid.set(null);
    this.activeKeyword.set(null);
    this.relativePlaceholder.set(DEFAULT_PLACEHOLDER);
    this.relativeDate.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    // Re-save defaults immediately via effect
    this.pageDir.set('rtl');
    this.theme.set('light');
    this.packageManager.set('npm');
  }

  protected onPlaygroundChange(value: JalaliDatePickerValue): void {
    if (this.settings().selectionMode === 'range') {
      this.playgroundRange.set(
        Array.isArray(value) && value.every((v) => v instanceof Date) ? value : null,
      );
      return;
    }
    this.playgroundSingle.set(value instanceof Date ? value : null);
  }

  protected async copyCode(code: string, key = 'playground'): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copiedKey.set(key);
      window.setTimeout(() => {
        if (this.copiedKey() === key) {
          this.copiedKey.set(null);
        }
      }, 1600);
    } catch {
      // Clipboard may be unavailable.
    }
  }

  protected onDateModelChange(target: WritableSignal<Date | null>, value: JalaliDatePickerValue): void {
    target.set(value instanceof Date ? value : null);
  }

  protected onRangeModelChange(value: JalaliDatePickerValue): void {
    this.rangeDates.set(Array.isArray(value) && value.every((v) => v instanceof Date) ? value : null);
  }

  protected onJalaliModelChange(value: JalaliDatePickerValue): void {
    this.jalaliParts.set(isJalaliDateParts(value) ? value : null);
  }

  protected setToday(): void {
    this.dateControl.setValue(new Date());
  }

  protected formatDate(value: Date | null | undefined): string {
    if (!value) {
      return '—';
    }
    return formatJalaliDisplay(toJalaliParts(value), 'long');
  }

  protected formatGregorian(value: Date | null | undefined): string {
    if (!value) {
      return '—';
    }
    return value.toLocaleDateString('en-CA');
  }

  protected formatRange(value: Date[] | null): string {
    if (!value?.length) {
      return '—';
    }
    return value.map((d) => this.formatDate(d)).join(' تا ');
  }

  private buildPlaygroundCode(s: PlaygroundSettings): string {
    const lines = ['<datepicker-ng'];
    lines.push(`  dir="${s.dir}"`);
    if (s.calendar !== 'jalali') {
      lines.push(`  calendar="${s.calendar}"`);
    }
    if (s.locale !== (s.calendar === 'gregorian' ? 'en' : 'fa')) {
      lines.push(`  locale="${s.locale}"`);
    }
    if (s.weekStart !== null) {
      lines.push(`  [weekStart]="${s.weekStart}"`);
    }
    if (s.selectionMode !== 'single') {
      lines.push(`  selectionMode="${s.selectionMode}"`);
    }
    if (s.inline) {
      lines.push(`  [inline]="true"`);
    }
    if (!s.editable) {
      lines.push(`  [editable]="false"`);
    }
    if (s.mask) {
      lines.push(`  [mask]="true"`);
    }
    if (s.autoCommit) {
      lines.push(`  [autoCommit]="true"`);
    }
    if (!s.showClear) {
      lines.push(`  [showClear]="false"`);
    }
    if (!s.showDateBanner) {
      lines.push(`  [showDateBanner]="false"`);
    }
    if (s.disabled) {
      lines.push(`  [disabled]="true"`);
    }
    if (s.valueFormat !== 'date') {
      lines.push(`  valueFormat="${s.valueFormat}"`);
    }
    if (s.inputCalendar !== 'jalali') {
      lines.push(`  inputCalendar="${s.inputCalendar}"`);
    }
    if (s.displayFormat !== 'jalali-short') {
      lines.push(`  displayFormat="${s.displayFormat}"`);
    }
    if (s.useBounds) {
      lines.push(`  [minDate]="minDate"`);
      lines.push(`  [maxDate]="maxDate"`);
    }
    lines.push(`  placeholder="${s.placeholder}"`);
    lines.push(`  [(ngModel)]="date"`);
    lines.push('/>');
    lines.push('');
    lines.push(`/* accent: ${s.accent}`);
    lines.push(`   on-accent (selected text): ${s.onAccent}`);
    lines.push(`   set --dp-accent and --dp-on-accent on :root or host */`);
    return lines.join('\n');
  }
}
