import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import {
  addGregorianMonths,
  addGregorianYears,
  addJalaliMonths,
  addJalaliYears,
  applySlashDateMask,
  buildGregorianMonthGrid,
  buildGregorianYearWindow,
  buildJalaliMonthGrid,
  buildJalaliYearWindow,
  CalendarType,
  formatGregorianDisplay,
  formatGregorianMonthYear,
  formatGregorianRangeDisplay,
  formatGregorianSlash,
  formatJalaliDisplay,
  formatJalaliMonthYear,
  formatJalaliRangeDisplay,
  formatJalaliSlash,
  isDateWithinBounds,
  isJalaliDateBetween,
  isJalaliDateParts,
  isJalaliPartsWithinBounds,
  isSameJalaliDay,
  JalaliDateParts,
  JalaliDayCell,
  normalizeJalaliRange,
  parseGregorianDateString,
  parseJalaliDateString,
  toGregorianDate,
  toGregorianParts,
  toJalaliParts,
  toPersianDigits,
} from './jalali-calendar';
import {
  DatepickerLocale,
  DatepickerLocaleInput,
  resolveDatepickerLocale,
  rotateWeekdays,
  WeekStart,
} from './datepicker-locale';
import { DatepickerDir, dpClasses } from './jalalidatepicker-style';

/**
 * Form model value for `datepicker-ng`.
 * Shape depends on `valueFormat` / custom `formatValue`.
 */
export type JalaliDatePickerValue =
  | Date
  | Date[]
  | JalaliDateParts
  | JalaliDateParts[]
  | string
  | string[]
  | null
  | unknown;

/** Built-in form value shapes. Use `custom` with `parseValue` / `formatValue`. */
export type JalaliDatePickerValueFormat = 'date' | 'jalali' | 'custom';

/** Calendar used when showing/parsing the text input. */
export type JalaliDatePickerInputCalendar = 'jalali' | 'gregorian';

/** How a committed date is rendered in the text input. */
export type JalaliDatePickerDisplayFormat =
  | 'jalali-short'
  | 'jalali-long'
  | 'jalali-slash'
  | 'gregorian-slash';

export type JalaliDatePickerParseValue = (raw: unknown) => Date | Date[] | null;
export type JalaliDatePickerFormatValue = (date: Date | Date[]) => unknown;

export type { CalendarType };
export type { DatepickerLocale, DatepickerLocaleInput, WeekStart };

type CalendarPanelView = 'date' | 'month' | 'year';

const JALALI_DATEPICKER_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => JalaliDatePicker),
  multi: true,
};

/**
 * Persian (Jalali) datepicker styled with Tailwind CSS.
 * Supports RTL and LTR via the `dir` input (logical properties + mirrored chevrons/keys).
 *
 * @group Components
 */
@Component({
  selector: 'datepicker-ng',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideX, LucideCalendar, LucideChevronLeft, LucideChevronRight],
  providers: [JALALI_DATEPICKER_VALUE_ACCESSOR],
  host: {
    '[class]': 'rootClass()',
    '[attr.dir]': 'dir()',
    '[attr.data-p-disabled]': 'disabled() || null',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    @if (!inline()) {
      <span [class]="dp.inputWrap">
        <input
          #inputEl
          type="text"
          role="combobox"
          autocomplete="off"
          [id]="inputId()"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-expanded]="overlayVisible()"
          [attr.aria-haspopup]="true"
          [attr.aria-controls]="panelId"
          [attr.aria-invalid]="inputInvalid() || null"
          [class]="inputClass()"
          [placeholder]="resolvedPlaceholder()"
          [disabled]="disabled()"
          [readonly]="!editable()"
          [value]="inputText()"
          (click)="onInputClick($event)"
          (focus)="onInputFocus()"
          (input)="onInput($event)"
          (blur)="onInputBlur()"
          (keydown)="onInputKeydown($event)"
        />
        @if (showClear() && $filled() && !$disabled()) {
          <span
            [class]="dp.clearIcon"
            role="button"
            tabindex="-1"
            [attr.aria-label]="resolvedClearLabel()"
            (mousedown)="$event.preventDefault()"
            (click)="clear($event)"
          >
            <svg lucideX [size]="14" aria-hidden="true"></svg>
          </span>
        }
        <span
          [class]="dp.inputIcon"
          role="button"
          tabindex="-1"
          [attr.aria-label]="resolvedOpenLabel()"
          (mousedown)="$event.preventDefault()"
          (click)="onIconClick($event)"
        >
          <svg lucideCalendar [size]="14" aria-hidden="true"></svg>
        </span>
      </span>
    }

    @if (inline() || overlayVisible()) {
      <div
        #panelEl
        [id]="panelId"
        role="dialog"
        [attr.aria-modal]="!inline()"
        [attr.aria-label]="ariaLabel() || (isRange() ? t().pickRange : t().pickDate)"
        [class]="panelClass()"
      >
        @if (showSelectionBanner() && bannerContent(); as banner) {
          <div [class]="dp.selection" aria-live="polite">
            <span [class]="dp.selectionYear">{{ banner.year }}</span>
            <span [class]="dp.selectionDate">{{ banner.date }}</span>
          </div>
        }

        <div [class]="dp.calendarContainer">
          <div [class]="dp.calendar">
            <div [class]="dp.header">
              <button
                type="button"
                [class]="dp.navButton"
                [attr.aria-label]="prevLabel()"
                [disabled]="disabled()"
                (click)="onPrev()"
              >
                @if (isRtl()) {
                  <svg lucideChevronRight [size]="14" aria-hidden="true"></svg>
                } @else {
                  <svg lucideChevronLeft [size]="14" aria-hidden="true"></svg>
                }
              </button>

              <div [class]="dp.title">
                @if (panelView() === 'date') {
                  <button
                    type="button"
                    [class]="dp.selectMonth"
                    [disabled]="disabled()"
                    (click)="openMonthView()"
                  >
                    {{ monthYearLabel() }}
                  </button>
                } @else if (panelView() === 'month') {
                  <button
                    type="button"
                    [class]="dp.selectYear"
                    [disabled]="disabled()"
                    (click)="openYearView()"
                  >
                    {{ yearTitle() }}
                  </button>
                } @else {
                  <span [class]="dp.selectYear">{{ decadeLabel() }}</span>
                }
              </div>

              <button
                type="button"
                [class]="dp.navButton"
                [attr.aria-label]="nextLabel()"
                [disabled]="disabled()"
                (click)="onNext()"
              >
                @if (isRtl()) {
                  <svg lucideChevronLeft [size]="14" aria-hidden="true"></svg>
                } @else {
                  <svg lucideChevronRight [size]="14" aria-hidden="true"></svg>
                }
              </button>
            </div>

            @if (panelView() === 'date') {
              <table [class]="dp.dayView" role="grid" [attr.aria-label]="monthYearLabel()">
                <thead>
                  <tr>
                    @for (day of weekdays(); track day; let i = $index) {
                      <th [class]="dp.weekDayCell">
                        <span [class]="dp.weekDay(isWeekendColumn(i))">{{ day }}</span>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (week of weeks(); track $index) {
                    <tr>
                      @for (cell of week; track cell.parts.jy + '-' + cell.parts.jm + '-' + cell.parts.jd) {
                        <td [class]="dayCellClass(cell)">
                          <span
                            role="gridcell"
                            [attr.tabindex]="isFocusedDay(cell.parts) ? 0 : -1"
                            [attr.aria-selected]="isDaySelected(cell.parts)"
                            [attr.aria-disabled]="isDayDisabled(cell.parts) || null"
                            [attr.aria-current]="cell.today ? 'date' : null"
                            [attr.aria-label]="dayAriaLabel(cell)"
                            [class]="dayClass(cell)"
                            (click)="selectDay(cell)"
                            (keydown)="onDayKeydown($event, cell)"
                          >
                            {{ cell.label }}
                          </span>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            } @else if (panelView() === 'month') {
              <div [class]="dp.monthView" role="grid">
                @for (month of monthNames(); track month; let i = $index) {
                  <span
                    role="gridcell"
                    tabindex="0"
                    [class]="monthClass(i + 1)"
                    (click)="selectMonth(i + 1)"
                    (keydown)="onMonthKeydown($event, i + 1)"
                  >
                    {{ month }}
                  </span>
                }
              </div>
            } @else {
              <div [class]="dp.yearView" role="grid">
                @for (year of yearWindow(); track year) {
                  <span
                    role="gridcell"
                    tabindex="0"
                    [class]="yearClass(year)"
                    (click)="selectYear(year)"
                    (keydown)="onYearKeydown($event, year)"
                  >
                    {{ formatYearLabel(year) }}
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <div [class]="dp.buttonbar">
          @if (!autoCommit()) {
            <button
              type="button"
              [class]="dp.primaryButton"
              [disabled]="disabled() || !canConfirm()"
              (click)="confirm()"
            >
              {{ resolvedSelectLabel() }}
            </button>
          }
          <button
            type="button"
            [class]="dp.linkButton"
            [disabled]="disabled()"
            (click)="cancel()"
          >
            {{ resolvedCancelLabel() }}
          </button>
          @if (showClear()) {
            <button
              type="button"
              [class]="dp.linkButton"
              [disabled]="disabled() || !$filled()"
              (click)="clear()"
            >
              {{ resolvedClearLabel() }}
            </button>
          }
          <span [class]="dp.buttonbarSpacer" aria-hidden="true"></span>
          <button
            type="button"
            [class]="dp.linkButton"
            [disabled]="disabled() || isDayDisabled(todayParts())"
            (click)="goToday()"
          >
            {{ resolvedTodayLabel() }}
          </button>
        </div>
      </div>
    }
  `,
})
export class JalaliDatePicker implements ControlValueAccessor {
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  protected readonly dp = dpClasses;

  readonly placeholder = input<string | undefined>(undefined);
  readonly inputId = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly iconAriaLabel = input<string | undefined>(undefined);
  readonly styleClass = input<string | undefined>(undefined);
  /** Layout direction. Uses logical CSS so icons and keyboard arrows mirror correctly. */
  readonly dir = input<DatepickerDir>('rtl');
  /** Panel calendar system: Jalali (Persian) or Gregorian. */
  readonly calendar = input<CalendarType>('jalali');
  /**
   * Built-in `'fa'` | `'en'`, or a custom locale object.
   * Default: `fa` for Jalali, `en` for Gregorian.
   */
  readonly locale = input<DatepickerLocaleInput | undefined>(undefined);
  /** Partial overrides merged on top of the resolved locale (any language). */
  readonly translations = input<Partial<DatepickerLocale> | undefined>(undefined);
  /**
   * First day of the week (0 = Sunday … 6 = Saturday).
   * Default comes from the locale (`fa` → Saturday, `en` → Sunday).
   */
  readonly weekStart = input<WeekStart | undefined>(undefined);
  readonly inline = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Allow typing. Supports absolute Jalali/Gregorian strings, relative keywords,
   * and optional slash mask via `[mask]="true"`.
   */
  readonly editable = input(true, { transform: booleanAttribute });
  /** Progressive `YYYY/MM/DD` typing mask (digits auto-formatted with `/`). */
  readonly mask = input(false, { transform: booleanAttribute });
  readonly selectionMode = input<'single' | 'range'>('single');
  readonly rangeSeparator = input<string | undefined>(undefined);
  /** Earliest selectable date (inclusive). */
  readonly minDate = input<Date | null>(null);
  /** Latest selectable date (inclusive). */
  readonly maxDate = input<Date | null>(null);
  /** Commit on day click (and when range end is chosen) without pressing انتخاب. */
  readonly autoCommit = input(false, { transform: booleanAttribute });
  /** Show clear control in the input and button bar. */
  readonly showClear = input(true, { transform: booleanAttribute });
  readonly valueFormat = input<JalaliDatePickerValueFormat>('date');
  readonly inputCalendar = input<JalaliDatePickerInputCalendar>('jalali');
  readonly displayFormat = input<JalaliDatePickerDisplayFormat | undefined>(undefined);
  readonly parseValue = input<JalaliDatePickerParseValue | undefined>(undefined);
  readonly formatValue = input<JalaliDatePickerFormatValue | undefined>(undefined);
  readonly showDateBanner = input(true, { transform: booleanAttribute });
  readonly selectLabel = input<string | undefined>(undefined);
  readonly cancelLabel = input<string | undefined>(undefined);
  readonly todayLabel = input<string | undefined>(undefined);
  readonly clearLabel = input<string | undefined>(undefined);

  readonly onSelect = output<JalaliDatePickerValue>();
  readonly onClear = output<void>();
  readonly onInputInvalid = output<string>();
  readonly onShow = output<void>();
  readonly onHide = output<void>();

  protected readonly panelId = `datepicker-ng-panel-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly toPersianDigits = toPersianDigits;
  protected readonly formatJalaliDisplay = formatJalaliDisplay;

  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panelEl');

  private readonly committedDates = signal<Date | Date[] | null>(null);
  private readonly draftText = signal<string | null>(null);
  protected readonly inputInvalid = signal(false);
  protected readonly pendingStart = signal<JalaliDateParts | null>(null);
  protected readonly pendingEnd = signal<JalaliDateParts | null>(null);
  protected readonly viewParts = signal<JalaliDateParts>(toJalaliParts(new Date()));
  protected readonly focusedParts = linkedSignal(() => this.pendingStart() ?? this.todayParts());
  protected readonly panelView = signal<CalendarPanelView>('date');
  protected readonly overlayVisible = signal(false);

  private onChange: (value: JalaliDatePickerValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private cvaDisabled = false;

  protected readonly isRange = computed(() => this.selectionMode() === 'range');
  protected readonly isRtl = computed(() => this.dir() === 'rtl');
  protected readonly isGregorianCalendar = computed(() => this.calendar() === 'gregorian');
  protected readonly todayParts = computed(() => toJalaliParts(new Date()));

  protected readonly t = computed(() =>
    resolveDatepickerLocale(this.calendar(), this.locale(), this.translations()),
  );

  protected readonly resolvedWeekStart = computed(
    () => this.weekStart() ?? this.t().weekStart,
  );

  protected readonly resolvedRangeSeparator = computed(
    () => this.rangeSeparator() ?? this.t().rangeSeparator,
  );

  protected readonly resolvedPlaceholder = computed(
    () => this.placeholder() ?? this.t().placeholder,
  );
  protected readonly resolvedSelectLabel = computed(() => this.selectLabel() ?? this.t().select);
  protected readonly resolvedCancelLabel = computed(() => this.cancelLabel() ?? this.t().cancel);
  protected readonly resolvedTodayLabel = computed(() => this.todayLabel() ?? this.t().today);
  protected readonly resolvedClearLabel = computed(() => this.clearLabel() ?? this.t().clear);
  protected readonly resolvedOpenLabel = computed(
    () => this.iconAriaLabel() ?? this.t().openCalendar,
  );

  protected readonly weekdays = computed(() =>
    rotateWeekdays(this.t().weekdaysMin, this.resolvedWeekStart()),
  );

  protected readonly monthNames = computed(() => this.t().monthNames);

  protected readonly viewGregorian = computed(() => toGregorianParts(toGregorianDate(this.viewParts())));

  protected readonly weeks = computed(() => {
    const weekStart = this.resolvedWeekStart();
    const digits = this.t().digits;
    const weekendDays = this.t().weekendDays;
    if (this.isGregorianCalendar()) {
      const g = this.viewGregorian();
      return buildGregorianMonthGrid(g.gy, g.gm, new Date(), weekStart, digits, weekendDays);
    }
    const view = this.viewParts();
    return buildJalaliMonthGrid(view.jy, view.jm, this.todayParts(), weekStart, digits, weekendDays);
  });

  protected readonly yearWindow = computed(() =>
    this.isGregorianCalendar()
      ? buildGregorianYearWindow(this.viewGregorian().gy)
      : buildJalaliYearWindow(this.viewParts().jy),
  );

  protected readonly monthYearLabel = computed(() => {
    const loc = this.t();
    if (this.isGregorianCalendar()) {
      const g = this.viewGregorian();
      return formatGregorianMonthYear(g.gy, g.gm, loc.monthNames);
    }
    const view = this.viewParts();
    return formatJalaliMonthYear(view.jy, view.jm, loc.monthNames, loc.digits);
  });

  protected readonly decadeLabel = computed(() => {
    const years = this.yearWindow();
    if (this.t().digits === 'latin' || this.isGregorianCalendar()) {
      return `${years[1]} – ${years[10]}`;
    }
    return `${toPersianDigits(years[1])} – ${toPersianDigits(years[10])}`;
  });

  protected readonly yearTitle = computed(() => {
    if (this.isGregorianCalendar() || this.t().digits === 'latin') {
      return String(this.isGregorianCalendar() ? this.viewGregorian().gy : this.viewParts().jy);
    }
    return toPersianDigits(this.viewParts().jy);
  });

  protected readonly formattedCommitted = computed(() => {
    const value = this.committedDates();
    if (this.isRange()) {
      const range = Array.isArray(value) ? value : null;
      if (!range || range.length < 2) {
        return '';
      }
      return this.formatDatePairForInput(range[0], range[1]);
    }
    return value instanceof Date ? this.formatDateForInput(value) : '';
  });

  protected readonly inputText = computed(() => this.draftText() ?? this.formattedCommitted());

  protected readonly bannerContent = computed(() => {
    const start = this.pendingStart();
    if (!start) {
      return null;
    }
    const loc = this.t();
    const sep = this.resolvedRangeSeparator();
    if (this.isGregorianCalendar()) {
      const startDate = toGregorianDate(start);
      if (this.isRange()) {
        const end = this.pendingEnd();
        if (end) {
          const endDate = toGregorianDate(end);
          const [from, to] =
            startDate.getTime() <= endDate.getTime()
              ? [startDate, endDate]
              : [endDate, startDate];
          return {
            year: `${from.getFullYear()} – ${to.getFullYear()}`,
            date: formatGregorianRangeDisplay(
              from,
              to,
              sep,
              'long',
              loc.monthNames,
              loc.weekdaysLong,
            ),
          };
        }
        return {
          year: String(startDate.getFullYear()),
          date: `${formatGregorianDisplay(startDate, 'long', loc.monthNames, loc.weekdaysLong)} …`,
        };
      }
      return {
        year: String(startDate.getFullYear()),
        date: formatGregorianDisplay(startDate, 'long', loc.monthNames, loc.weekdaysLong),
      };
    }
    if (this.isRange()) {
      const end = this.pendingEnd();
      if (end) {
        const [from, to] = normalizeJalaliRange(start, end);
        return {
          year:
            loc.digits === 'latin'
              ? `${from.jy} – ${to.jy}`
              : `${toPersianDigits(from.jy)} – ${toPersianDigits(to.jy)}`,
          date: formatJalaliRangeDisplay(
            from,
            to,
            sep,
            'long',
            loc.monthNames,
            loc.weekdaysLong,
            loc.digits,
          ),
        };
      }
      return {
        year: loc.digits === 'latin' ? String(start.jy) : toPersianDigits(start.jy),
        date: `${formatJalaliDisplay(start, 'long', loc.monthNames, loc.weekdaysLong, loc.digits)} …`,
      };
    }
    return {
      year: loc.digits === 'latin' ? String(start.jy) : toPersianDigits(start.jy),
      date: formatJalaliDisplay(start, 'long', loc.monthNames, loc.weekdaysLong, loc.digits),
    };
  });

  protected readonly showSelectionBanner = computed(
    () => this.showDateBanner() && !!this.pendingStart() && this.panelView() === 'date',
  );

  protected readonly canConfirm = computed(() => {
    if (!this.pendingStart()) {
      return false;
    }
    if (this.isDayDisabled(this.pendingStart()!)) {
      return false;
    }
    if (this.isRange()) {
      const end = this.pendingEnd();
      return !!end && !this.isDayDisabled(end);
    }
    return true;
  });

  protected readonly rootClass = computed(() =>
    dpClasses.root({
      filled: this.$filled(),
      focused: this.overlayVisible(),
      disabled: this.$disabled(),
      invalid: this.inputInvalid(),
      styleClass: this.styleClass(),
    }),
  );

  protected readonly inputClass = computed(() => dpClasses.input(this.inputInvalid()));

  protected readonly panelClass = computed(() => dpClasses.panel(this.inline()));

  $filled(): boolean {
    const value = this.committedDates();
    if (this.isRange()) {
      return Array.isArray(value) && value.length >= 2;
    }
    return value instanceof Date;
  }

  $disabled(): boolean {
    return this.disabled() || this.cvaDisabled;
  }

  $invalid(): boolean {
    return this.inputInvalid();
  }

  writeValue(value: JalaliDatePickerValue): void {
    const next = this.toInternalDates(value);
    this.committedDates.set(next);
    this.draftText.set(null);
    this.inputInvalid.set(false);
    this.syncPendingFromCommitted(next);
  }

  registerOnChange(fn: (value: JalaliDatePickerValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled = isDisabled;
  }

  protected toggle(): void {
    if (this.$disabled() || this.inline()) {
      return;
    }
    if (this.overlayVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  protected show(): void {
    this.syncPendingFromCommitted(this.committedDates());
    if (!this.pendingStart()) {
      this.viewParts.set(this.todayParts());
    }
    this.panelView.set('date');
    this.overlayVisible.set(true);
    this.onShow.emit();
  }

  protected hide(): void {
    if (!this.overlayVisible()) {
      return;
    }
    this.overlayVisible.set(false);
    this.panelView.set('date');
    this.onTouched();
    this.onHide.emit();
  }

  protected prevLabel(): string {
    const loc = this.t();
    switch (this.panelView()) {
      case 'month':
        return loc.prevYear;
      case 'year':
        return loc.prevDecade;
      default:
        return loc.prevMonth;
    }
  }

  protected nextLabel(): string {
    const loc = this.t();
    switch (this.panelView()) {
      case 'month':
        return loc.nextYear;
      case 'year':
        return loc.nextDecade;
      default:
        return loc.nextMonth;
    }
  }

  protected onPrev(): void {
    if (this.isGregorianCalendar()) {
      if (this.panelView() === 'date') {
        this.shiftGregorianView((g) => addGregorianMonths(g, -1));
      } else if (this.panelView() === 'month') {
        this.shiftGregorianView((g) => addGregorianYears(g, -1));
      } else {
        this.shiftGregorianView((g) => addGregorianYears(g, -10));
      }
      return;
    }
    if (this.panelView() === 'date') {
      this.viewParts.update((current) => addJalaliMonths(current, -1));
    } else if (this.panelView() === 'month') {
      this.viewParts.update((current) => addJalaliYears(current, -1));
    } else {
      this.viewParts.update((current) => addJalaliYears(current, -10));
    }
  }

  protected onNext(): void {
    if (this.isGregorianCalendar()) {
      if (this.panelView() === 'date') {
        this.shiftGregorianView((g) => addGregorianMonths(g, 1));
      } else if (this.panelView() === 'month') {
        this.shiftGregorianView((g) => addGregorianYears(g, 1));
      } else {
        this.shiftGregorianView((g) => addGregorianYears(g, 10));
      }
      return;
    }
    if (this.panelView() === 'date') {
      this.viewParts.update((current) => addJalaliMonths(current, 1));
    } else if (this.panelView() === 'month') {
      this.viewParts.update((current) => addJalaliYears(current, 1));
    } else {
      this.viewParts.update((current) => addJalaliYears(current, 10));
    }
  }

  protected openMonthView(): void {
    if (!this.$disabled()) {
      this.panelView.set('month');
    }
  }

  protected openYearView(): void {
    if (!this.$disabled()) {
      this.panelView.set('year');
    }
  }

  protected selectMonth(month: number): void {
    if (this.$disabled() || this.isMonthDisabled(month)) {
      return;
    }
    if (this.isGregorianCalendar()) {
      const g = this.viewGregorian();
      this.viewParts.set(toJalaliParts(new Date(g.gy, month - 1, 1)));
      this.panelView.set('date');
      return;
    }
    this.viewParts.update((current) => ({
      jy: current.jy,
      jm: month,
      jd: Math.min(current.jd, 29),
    }));
    this.panelView.set('date');
  }

  protected selectYear(year: number): void {
    if (this.$disabled() || this.isYearDisabled(year)) {
      return;
    }
    if (this.isGregorianCalendar()) {
      const g = this.viewGregorian();
      this.viewParts.set(toJalaliParts(new Date(year, g.gm - 1, 1)));
      this.panelView.set('month');
      return;
    }
    this.viewParts.update((current) => ({ ...current, jy: year }));
    this.panelView.set('month');
  }

  protected selectDay(cell: JalaliDayCell): void {
    if (this.$disabled() || this.isDayDisabled(cell.parts)) {
      return;
    }

    this.focusedParts.set(cell.parts);

    if (this.isRange()) {
      const start = this.pendingStart();
      const end = this.pendingEnd();

      if (!start || (start && end)) {
        this.pendingStart.set(cell.parts);
        this.pendingEnd.set(null);
      } else {
        this.pendingEnd.set(cell.parts);
        if (this.autoCommit()) {
          this.confirm();
          return;
        }
      }
    } else {
      this.pendingStart.set(cell.parts);
      this.pendingEnd.set(null);
      if (this.autoCommit()) {
        this.confirm();
        return;
      }
    }

    if (cell.otherMonth) {
      if (this.isGregorianCalendar()) {
        const g = toGregorianParts(toGregorianDate(cell.parts));
        this.viewParts.set(toJalaliParts(new Date(g.gy, g.gm - 1, 1)));
      } else {
        this.viewParts.set({ jy: cell.parts.jy, jm: cell.parts.jm, jd: 1 });
      }
    }
  }

  protected confirm(): void {
    if (!this.canConfirm() || this.$disabled()) {
      return;
    }

    const start = this.pendingStart()!;
    let internal: Date | Date[];

    if (this.isRange()) {
      const end = this.pendingEnd()!;
      const [from, to] = normalizeJalaliRange(start, end);
      internal = [toGregorianDate(from), toGregorianDate(to)];
      this.pendingStart.set(from);
      this.pendingEnd.set(to);
    } else {
      internal = toGregorianDate(start);
    }

    if (!this.isInternalWithinBounds(internal)) {
      this.inputInvalid.set(true);
      return;
    }

    this.commitInternal(internal);

    if (!this.inline()) {
      this.hide();
    }
  }

  protected cancel(): void {
    this.syncPendingFromCommitted(this.committedDates());
    this.draftText.set(null);
    this.inputInvalid.set(false);
    this.panelView.set('date');
    if (!this.inline()) {
      this.hide();
    }
  }

  protected clear(event?: Event): void {
    event?.stopPropagation();
    if (this.$disabled()) {
      return;
    }
    this.commitInternal(null);
    this.inputInvalid.set(false);
    this.panelView.set('date');
    this.onClear.emit();
    if (!this.inline()) {
      this.hide();
    }
  }

  protected goToday(): void {
    const today = this.todayParts();
    if (this.isDayDisabled(today)) {
      return;
    }
    this.viewParts.set(today);
    this.pendingStart.set(today);
    this.pendingEnd.set(null);
    this.focusedParts.set(today);
    this.panelView.set('date');
    if (this.autoCommit() && !this.isRange()) {
      this.confirm();
    }
  }

  protected isDaySelected(parts: JalaliDateParts): boolean {
    if (this.isRange()) {
      return (
        isSameJalaliDay(parts, this.pendingStart()) || isSameJalaliDay(parts, this.pendingEnd())
      );
    }
    return isSameJalaliDay(parts, this.pendingStart());
  }

  protected isDayInRange(parts: JalaliDateParts): boolean {
    if (!this.isRange()) {
      return false;
    }
    const start = this.pendingStart();
    const end = this.pendingEnd();
    if (!start || !end) {
      return false;
    }
    return isJalaliDateBetween(parts, start, end);
  }

  protected isDayDisabled(parts: JalaliDateParts): boolean {
    return !isJalaliPartsWithinBounds(parts, this.minDate(), this.maxDate());
  }

  protected isMonthDisabled(month: number): boolean {
    const min = this.minDate();
    const max = this.maxDate();
    if (this.isGregorianCalendar()) {
      const gy = this.viewGregorian().gy;
      if (min) {
        if (gy < min.getFullYear() || (gy === min.getFullYear() && month < min.getMonth() + 1)) {
          return true;
        }
      }
      if (max) {
        if (gy > max.getFullYear() || (gy === max.getFullYear() && month > max.getMonth() + 1)) {
          return true;
        }
      }
      return false;
    }
    const jy = this.viewParts().jy;
    if (min) {
      const minParts = toJalaliParts(min);
      if (jy < minParts.jy || (jy === minParts.jy && month < minParts.jm)) {
        return true;
      }
    }
    if (max) {
      const maxParts = toJalaliParts(max);
      if (jy > maxParts.jy || (jy === maxParts.jy && month > maxParts.jm)) {
        return true;
      }
    }
    return false;
  }

  protected isYearDisabled(year: number): boolean {
    const min = this.minDate();
    const max = this.maxDate();
    if (this.isGregorianCalendar()) {
      if (min && year < min.getFullYear()) {
        return true;
      }
      if (max && year > max.getFullYear()) {
        return true;
      }
      return false;
    }
    if (min && year < toJalaliParts(min).jy) {
      return true;
    }
    if (max && year > toJalaliParts(max).jy) {
      return true;
    }
    return false;
  }

  protected isFocusedDay(parts: JalaliDateParts): boolean {
    return isSameJalaliDay(parts, this.focusedParts());
  }

  protected isWeekendColumn(index: number): boolean {
    const day = (this.resolvedWeekStart() + index) % 7;
    return this.t().weekendDays.includes(day as WeekStart);
  }

  protected formatYearLabel(year: number): string {
    return this.t().digits === 'latin' || this.isGregorianCalendar()
      ? String(year)
      : toPersianDigits(year);
  }

  protected dayAriaLabel(cell: JalaliDayCell): string {
    const loc = this.t();
    if (this.isGregorianCalendar()) {
      return formatGregorianDisplay(
        toGregorianDate(cell.parts),
        'long',
        loc.monthNames,
        loc.weekdaysLong,
      );
    }
    return formatJalaliDisplay(cell.parts, 'long', loc.monthNames, loc.weekdaysLong, loc.digits);
  }

  protected monthClass(month: number): string {
    const selected = this.isGregorianCalendar()
      ? this.viewGregorian().gm === month
      : this.viewParts().jm === month;
    return dpClasses.month({
      selected,
      disabled: this.isMonthDisabled(month),
    });
  }

  protected yearClass(year: number): string {
    const selected = this.isGregorianCalendar()
      ? this.viewGregorian().gy === year
      : this.viewParts().jy === year;
    return dpClasses.year({
      selected,
      disabled: this.isYearDisabled(year),
    });
  }

  protected dayCellClass(cell: JalaliDayCell): string {
    return dpClasses.dayCell({
      otherMonth: cell.otherMonth,
      today: cell.today,
      friday: cell.friday,
    });
  }

  protected dayClass(cell: JalaliDayCell): string {
    return dpClasses.day({
      selected: this.isDaySelected(cell.parts),
      selectedRange: this.isDayInRange(cell.parts),
      disabled: this.isDayDisabled(cell.parts),
      today: cell.today,
      friday: cell.friday,
    });
  }

  private shiftGregorianView(
    mutate: (parts: ReturnType<typeof toGregorianParts>) => ReturnType<typeof toGregorianParts>,
  ): void {
    const next = mutate(this.viewGregorian());
    this.viewParts.set(toJalaliParts(new Date(next.gy, next.gm - 1, 1)));
  }

  protected onInputClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.$disabled()) {
      return;
    }
    this.show();
  }

  protected onInputFocus(): void {
    if (this.$disabled() || this.inline()) {
      return;
    }
    this.show();
  }

  protected onIconClick(event: MouseEvent): void {
    event.stopPropagation();
    this.toggle();
  }

  protected onInput(event: Event): void {
    if (!this.editable() || this.$disabled()) {
      return;
    }
    const el = event.target as HTMLInputElement;
    let value = el.value;

    if (this.mask()) {
      const digits =
        this.calendar() === 'gregorian' || this.inputCalendar() === 'gregorian'
          ? 'latin'
          : 'persian';
      value = applySlashDateMask(value, digits);
      const start = el.selectionStart ?? value.length;
      el.value = value;
      const nextPos = Math.min(value.length, start + (value.length > (this.draftText()?.length ?? 0) ? 1 : 0));
      try {
        el.setSelectionRange(nextPos, nextPos);
      } catch {
        // Some browsers reject setSelectionRange on certain inputs.
      }
    }

    this.draftText.set(value);
    this.inputInvalid.set(false);
  }

  protected onInputBlur(): void {
    if (!this.editable() || this.$disabled()) {
      return;
    }
    this.applyTypedValue();
    this.onTouched();
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.draftText.set(null);
      this.inputInvalid.set(false);
      this.hide();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.show();
      this.focusDayCell();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.editable() && this.draftText() != null) {
        this.applyTypedValue();
      } else if (!this.overlayVisible()) {
        this.show();
      }
      return;
    }

    if (event.key === ' ' && !this.editable()) {
      event.preventDefault();
      this.show();
    }
  }

  protected onDayKeydown(event: KeyboardEvent, cell: JalaliDayCell): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectDay(cell);
      return;
    }

    const delta = this.arrowDayDelta(event.key);
    if (delta !== 0) {
      event.preventDefault();
      this.moveFocusByDays(delta);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.focusParts({ ...this.viewParts(), jd: 1 });
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const weeks = this.weeks().flat();
      const last = [...weeks].reverse().find((c) => !c.otherMonth);
      if (last) {
        this.focusParts(last.parts);
      }
      return;
    }

    if (event.key === 'PageUp') {
      event.preventDefault();
      if (this.isGregorianCalendar()) {
        this.shiftGregorianView((g) => addGregorianMonths(g, event.shiftKey ? -12 : -1));
      } else {
        this.viewParts.update((current) => addJalaliMonths(current, event.shiftKey ? -12 : -1));
      }
      return;
    }

    if (event.key === 'PageDown') {
      event.preventDefault();
      if (this.isGregorianCalendar()) {
        this.shiftGregorianView((g) => addGregorianMonths(g, event.shiftKey ? 12 : 1));
      } else {
        this.viewParts.update((current) => addJalaliMonths(current, event.shiftKey ? 12 : 1));
      }
    }
  }

  protected onMonthKeydown(event: KeyboardEvent, jm: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectMonth(jm);
    }
  }

  protected onYearKeydown(event: KeyboardEvent, year: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectYear(year);
    }
  }

  onDocumentClick(event: MouseEvent): void {
    if (this.inline() || !this.overlayVisible()) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const host = this.hostEl.nativeElement;
    if (!host.contains(target)) {
      this.hide();
    }
  }

  onEscape(): void {
    if (this.panelView() !== 'date') {
      this.panelView.set(this.panelView() === 'year' ? 'month' : 'date');
      return;
    }
    if (!this.inline()) {
      this.hide();
    }
  }

  private arrowDayDelta(key: string): number {
    const rtl = this.isRtl();
    switch (key) {
      case 'ArrowRight':
        return rtl ? -1 : 1;
      case 'ArrowLeft':
        return rtl ? 1 : -1;
      case 'ArrowUp':
        return -7;
      case 'ArrowDown':
        return 7;
      default:
        return 0;
    }
  }

  private moveFocusByDays(delta: number): void {
    const current = this.focusedParts();
    const date = toGregorianDate(current);
    date.setDate(date.getDate() + delta);
    const next = toJalaliParts(date);
    this.viewParts.set({ jy: next.jy, jm: next.jm, jd: 1 });
    this.focusParts(next);
  }

  private focusParts(parts: JalaliDateParts): void {
    this.focusedParts.set(parts);
    this.focusDayCell();
  }

  private focusDayCell(): void {
    queueMicrotask(() => {
      const panel = this.panelEl()?.nativeElement;
      const focused = panel?.querySelector<HTMLElement>('.dp-day[tabindex="0"]');
      focused?.focus();
    });
  }

  private applyTypedValue(): void {
    const draft = this.draftText();
    if (draft == null) {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      this.commitInternal(null);
      this.inputInvalid.set(false);
      return;
    }

    if (this.isRange()) {
      const parts = trimmed.split(this.resolvedRangeSeparator()).map((p) => p.trim());
      if (parts.length !== 2) {
        this.markInvalid(trimmed);
        return;
      }
      const start = this.parseInputText(parts[0]);
      const end = this.parseInputText(parts[1]);
      if (!start || !end || !this.isInternalWithinBounds([start, end])) {
        this.markInvalid(trimmed);
        return;
      }
      this.commitInternal([start, end]);
      this.inputInvalid.set(false);
      return;
    }

    const date = this.parseInputText(trimmed);
    if (!date || !this.isInternalWithinBounds(date)) {
      this.markInvalid(trimmed);
      return;
    }
    this.commitInternal(date);
    this.inputInvalid.set(false);
  }

  private markInvalid(text: string): void {
    this.inputInvalid.set(true);
    this.onInputInvalid.emit(text);
  }

  private parseInputText(text: string): Date | null {
    if (this.inputCalendar() === 'gregorian' || this.calendar() === 'gregorian') {
      return (
        parseGregorianDateString(text) ??
        (() => {
          const parts = parseJalaliDateString(text);
          return parts ? toGregorianDate(parts) : null;
        })()
      );
    }
    const parts = parseJalaliDateString(text);
    return parts ? toGregorianDate(parts) : null;
  }

  private formatDateForInput(date: Date): string {
    const format = this.resolveDisplayFormat();
    switch (format) {
      case 'jalali-long':
        return formatJalaliDisplay(toJalaliParts(date), 'long');
      case 'jalali-slash':
        return formatJalaliSlash(toJalaliParts(date), 'persian');
      case 'gregorian-slash':
        return formatGregorianSlash(date, 'latin');
      case 'jalali-short':
      default:
        return formatJalaliDisplay(toJalaliParts(date), 'short');
    }
  }

  private formatDatePairForInput(start: Date, end: Date): string {
    return `${this.formatDateForInput(start)}${this.resolvedRangeSeparator()}${this.formatDateForInput(end)}`;
  }

  private resolveDisplayFormat(): JalaliDatePickerDisplayFormat {
    const explicit = this.displayFormat();
    if (explicit) {
      return explicit;
    }
    const preferGregorian =
      this.calendar() === 'gregorian' || this.inputCalendar() === 'gregorian';
    if (this.mask()) {
      return preferGregorian ? 'gregorian-slash' : 'jalali-slash';
    }
    return preferGregorian ? 'gregorian-slash' : 'jalali-short';
  }

  private isInternalWithinBounds(internal: Date | Date[]): boolean {
    if (Array.isArray(internal)) {
      return internal.every((d) => isDateWithinBounds(d, this.minDate(), this.maxDate()));
    }
    return isDateWithinBounds(internal, this.minDate(), this.maxDate());
  }

  private commitInternal(internal: Date | Date[] | null): void {
    let next = internal;
    if (Array.isArray(next) && next.length >= 2) {
      const [fromParts, toParts] = normalizeJalaliRange(
        toJalaliParts(next[0]),
        toJalaliParts(next[1]),
      );
      next = [toGregorianDate(fromParts), toGregorianDate(toParts)];
    }

    this.committedDates.set(next);
    this.draftText.set(null);
    this.inputInvalid.set(false);
    this.syncPendingFromCommitted(next);

    const outward = this.toExternalValue(next);
    this.onChange(outward);
    if (next != null) {
      this.onSelect.emit(outward);
    }
  }

  private toInternalDates(value: JalaliDatePickerValue): Date | Date[] | null {
    const customParse = this.parseValue();
    if (customParse) {
      return this.normalizeInternal(customParse(value));
    }

    if (this.valueFormat() === 'jalali') {
      return this.jalaliModelToDates(value);
    }

    return this.dateModelToDates(value);
  }

  private toExternalValue(internal: Date | Date[] | null): JalaliDatePickerValue {
    if (internal == null) {
      return null;
    }

    const customFormat = this.formatValue();
    if (customFormat) {
      return customFormat(internal);
    }

    if (this.valueFormat() === 'jalali') {
      if (Array.isArray(internal)) {
        return internal.map((d) => toJalaliParts(d));
      }
      return toJalaliParts(internal);
    }

    return internal;
  }

  private jalaliModelToDates(value: JalaliDatePickerValue): Date | Date[] | null {
    if (value == null) {
      return null;
    }

    if (Array.isArray(value)) {
      const dates = value
        .map((item) => {
          if (isJalaliDateParts(item)) {
            return toGregorianDate(item);
          }
          if (typeof item === 'string') {
            const parts = parseJalaliDateString(item);
            return parts ? toGregorianDate(parts) : null;
          }
          return null;
        })
        .filter((d): d is Date => d instanceof Date);
      return this.normalizeInternal(dates.length ? dates : null);
    }

    if (isJalaliDateParts(value)) {
      return toGregorianDate(value);
    }

    if (typeof value === 'string') {
      const parts = parseJalaliDateString(value);
      return parts ? toGregorianDate(parts) : null;
    }

    return null;
  }

  private dateModelToDates(value: JalaliDatePickerValue): Date | Date[] | null {
    if (value == null) {
      return null;
    }

    if (Array.isArray(value)) {
      const dates = value
        .map((item) => {
          if (item instanceof Date && !Number.isNaN(item.getTime())) {
            return item;
          }
          if (typeof item === 'string') {
            return (
              parseGregorianDateString(item) ??
              (() => {
                const parts = parseJalaliDateString(item);
                return parts ? toGregorianDate(parts) : null;
              })()
            );
          }
          return null;
        })
        .filter((d): d is Date => d instanceof Date);
      return this.normalizeInternal(dates.length ? dates : null);
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string') {
      return (
        parseGregorianDateString(value) ??
        (() => {
          const parts = parseJalaliDateString(value);
          return parts ? toGregorianDate(parts) : null;
        })()
      );
    }

    return null;
  }

  private normalizeInternal(value: Date | Date[] | null): Date | Date[] | null {
    if (value == null) {
      return null;
    }

    if (this.isRange()) {
      if (!Array.isArray(value) || value.length === 0) {
        return null;
      }
      const dates = value
        .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
        .slice(0, 2);
      if (dates.length === 0) {
        return null;
      }
      if (dates.length === 1) {
        return [dates[0]];
      }
      const [from, to] = normalizeJalaliRange(toJalaliParts(dates[0]), toJalaliParts(dates[1]));
      return [toGregorianDate(from), toGregorianDate(to)];
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (Array.isArray(value) && value[0] instanceof Date) {
      return value[0];
    }
    return null;
  }

  private syncPendingFromCommitted(value: Date | Date[] | null): void {
    if (this.isRange()) {
      if (Array.isArray(value) && value.length >= 1) {
        const start = toJalaliParts(value[0]);
        this.pendingStart.set(start);
        this.pendingEnd.set(value.length >= 2 ? toJalaliParts(value[1]) : null);
        this.viewParts.set(start);
        this.focusedParts.set(start);
        return;
      }
      this.pendingStart.set(null);
      this.pendingEnd.set(null);
      return;
    }

    if (value instanceof Date) {
      const parts = toJalaliParts(value);
      this.pendingStart.set(parts);
      this.pendingEnd.set(null);
      this.viewParts.set(parts);
      this.focusedParts.set(parts);
      return;
    }

    this.pendingStart.set(null);
    this.pendingEnd.set(null);
  }
}

export { JalaliDatePicker as DatepickerNg };
export { JALALI_DATEPICKER_VALUE_ACCESSOR };
