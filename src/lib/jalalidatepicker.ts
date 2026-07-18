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
import { LucideCalendar, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideChevronUp, LucideX } from '@lucide/angular';
import {
  addGregorianMonths,
  addGregorianYears,
  addJalaliMonths,
  addJalaliYears,
  applySlashDateMask,
  applyTimeToDate,
  buildGregorianMonthGrid,
  buildGregorianYearWindow,
  buildJalaliMonthGrid,
  buildJalaliYearWindow,
  CalendarType,
  compareJalaliDay,
  formatGregorianDisplay,
  formatGregorianMonthYear,
  formatGregorianRangeDisplay,
  formatGregorianSlash,
  formatJalaliDisplay,
  formatJalaliMonthYear,
  formatJalaliRangeDisplay,
  formatJalaliSlash,
  formatTimeDisplay,
  HourFormat,
  isDateWithinBounds,
  isJalaliDateBetween,
  isJalaliDateParts,
  isJalaliPartsWithinBounds,
  isSameJalaliDay,
  JalaliDateParts,
  JalaliDayCell,
  Meridiem,
  normalizeJalaliRange,
  pad2,
  parseGregorianDateString,
  parseJalaliDateString,
  parseTimeFromText,
  splitDateTimeText,
  to12Hour,
  to24Hour,
  toGregorianDate,
  toGregorianParts,
  toJalaliDateTimeParts,
  toJalaliParts,
  toPersianDigits,
  wrapUnit,
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
export type { HourFormat, Meridiem };

type CalendarPanelView = 'date' | 'month' | 'year' | 'time';
type AnalogFace = 'hour' | 'minute' | 'second';
export type TimePickerType = 'digital' | 'analog';

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
  imports: [
    LucideX,
    LucideCalendar,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronUp,
    LucideChevronDown,
  ],
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

        @if (isTimeView()) {
          <div [class]="timeOnly() ? dp.timebarFlat : dp.timebar" role="group" [attr.aria-label]="t().pickTime">
            @if (!timeOnly()) {
              <button
                type="button"
                [class]="dp.linkButton"
                [disabled]="disabled()"
                (click)="backToCalendar()"
              >
                {{ t().backToDate }}
              </button>
            }

            <div [class]="dp.timePreview">{{ pendingTimeLabel() }}</div>

            @if (timePickerType() === 'analog') {
              <div [class]="dp.timeFaceTabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  [class]="dp.timeFaceTab(analogFace() === 'hour')"
                  [attr.aria-selected]="analogFace() === 'hour'"
                  (click)="setAnalogFace('hour')"
                >
                  {{ t().hour }}
                </button>
                <button
                  type="button"
                  role="tab"
                  [class]="dp.timeFaceTab(analogFace() === 'minute')"
                  [attr.aria-selected]="analogFace() === 'minute'"
                  (click)="setAnalogFace('minute')"
                >
                  {{ t().minute }}
                </button>
                @if (showSeconds()) {
                  <button
                    type="button"
                    role="tab"
                    [class]="dp.timeFaceTab(analogFace() === 'second')"
                    [attr.aria-selected]="analogFace() === 'second'"
                    (click)="setAnalogFace('second')"
                  >
                    {{ t().second }}
                  </button>
                }
              </div>

              <div [class]="dp.analogWrap">
                <svg
                  [class]="dp.analogSvg"
                  viewBox="0 0 200 200"
                  (pointerdown)="onAnalogPointerDown($event)"
                  (pointermove)="onAnalogPointerMove($event)"
                  (pointerup)="onAnalogPointerUp($event)"
                  (pointerleave)="onAnalogPointerUp($event)"
                >
                  <circle cx="100" cy="100" r="96" [attr.class]="dp.analogFace" />
                  @for (mark of analogMarks(); track mark.value) {
                    <circle
                      [attr.cx]="mark.x"
                      [attr.cy]="mark.y"
                      r="14"
                      [attr.class]="dp.analogMarkBg(mark.active)"
                    />
                    <text
                      [attr.x]="mark.x"
                      [attr.y]="mark.y"
                      text-anchor="middle"
                      dominant-baseline="central"
                      [attr.class]="mark.active ? dp.analogMarkActive : dp.analogMark"
                      [attr.fill]="mark.active ? 'var(--dp-on-accent, #ffffff)' : 'var(--dp-text, #142033)'"
                    >
                      {{ mark.label }}
                    </text>
                  }
                  <line
                    x1="100"
                    y1="100"
                    [attr.x2]="analogHand().x"
                    [attr.y2]="analogHand().y"
                    [attr.class]="dp.analogHand"
                  />
                  <circle cx="100" cy="100" r="4" [attr.class]="dp.analogDot" />
                </svg>
              </div>

              @if (hourFormat() === '12' && analogFace() === 'hour') {
                <div [class]="dp.ampm" role="group">
                  <button
                    type="button"
                    [class]="dp.ampmBtn(pendingPeriod() === 'am')"
                    [disabled]="disabled()"
                    (click)="setPeriod('am')"
                  >
                    {{ t().am }}
                  </button>
                  <button
                    type="button"
                    [class]="dp.ampmBtn(pendingPeriod() === 'pm')"
                    [disabled]="disabled()"
                    (click)="setPeriod('pm')"
                  >
                    {{ t().pm }}
                  </button>
                </div>
              }
            } @else {
              <div [class]="dp.timeDigitalRow">
                <div [class]="dp.timeCol">
                  <button
                    type="button"
                    [class]="dp.timeSpinBtn"
                    [disabled]="disabled()"
                    [attr.aria-label]="t().hour"
                    (click)="bumpHour(1)"
                  >
                    <svg lucideChevronUp [size]="14" aria-hidden="true"></svg>
                  </button>
                  <span [class]="dp.timeValue">{{ displayHourLabel() }}</span>
                  <button
                    type="button"
                    [class]="dp.timeSpinBtn"
                    [disabled]="disabled()"
                    [attr.aria-label]="t().hour"
                    (click)="bumpHour(-1)"
                  >
                    <svg lucideChevronDown [size]="14" aria-hidden="true"></svg>
                  </button>
                </div>
                <span [class]="dp.timeSep" aria-hidden="true">:</span>
                <div [class]="dp.timeCol">
                  <button
                    type="button"
                    [class]="dp.timeSpinBtn"
                    [disabled]="disabled()"
                    [attr.aria-label]="t().minute"
                    (click)="bumpMinute(1)"
                  >
                    <svg lucideChevronUp [size]="14" aria-hidden="true"></svg>
                  </button>
                  <span [class]="dp.timeValue">{{ displayMinuteLabel() }}</span>
                  <button
                    type="button"
                    [class]="dp.timeSpinBtn"
                    [disabled]="disabled()"
                    [attr.aria-label]="t().minute"
                    (click)="bumpMinute(-1)"
                  >
                    <svg lucideChevronDown [size]="14" aria-hidden="true"></svg>
                  </button>
                </div>
                @if (showSeconds()) {
                  <span [class]="dp.timeSep" aria-hidden="true">:</span>
                  <div [class]="dp.timeCol">
                    <button
                      type="button"
                      [class]="dp.timeSpinBtn"
                      [disabled]="disabled()"
                      [attr.aria-label]="t().second"
                      (click)="bumpSecond(1)"
                    >
                      <svg lucideChevronUp [size]="14" aria-hidden="true"></svg>
                    </button>
                    <span [class]="dp.timeValue">{{ displaySecondLabel() }}</span>
                    <button
                      type="button"
                      [class]="dp.timeSpinBtn"
                      [disabled]="disabled()"
                      [attr.aria-label]="t().second"
                      (click)="bumpSecond(-1)"
                    >
                      <svg lucideChevronDown [size]="14" aria-hidden="true"></svg>
                    </button>
                  </div>
                }
                @if (hourFormat() === '12') {
                  <div [class]="dp.ampm" role="group">
                    <button
                      type="button"
                      [class]="dp.ampmBtn(pendingPeriod() === 'am')"
                      [disabled]="disabled()"
                      (click)="setPeriod('am')"
                    >
                      {{ t().am }}
                    </button>
                    <button
                      type="button"
                      [class]="dp.ampmBtn(pendingPeriod() === 'pm')"
                      [disabled]="disabled()"
                      (click)="setPeriod('pm')"
                    >
                      {{ t().pm }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        } @else {
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
        }

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
          @if (!isTimeView()) {
            <button
              type="button"
              [class]="dp.linkButton"
              [disabled]="disabled() || isDayDisabled(todayParts())"
              (click)="goToday()"
            >
              {{ resolvedTodayLabel() }}
            </button>
          }
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
  /** Show time picker after a date is chosen (or with `timeOnly`). */
  readonly showTime = input(false, { transform: booleanAttribute });
  /** Only the time picker — no calendar grid. */
  readonly timeOnly = input(false, { transform: booleanAttribute });
  /** Digital spinners (default) or analog clock face. */
  readonly timePickerType = input<TimePickerType>('digital');
  /** `24` (default) or `12` with AM/PM. */
  readonly hourFormat = input<HourFormat>('24');
  /** Include seconds in the time picker and display. */
  readonly showSeconds = input(false, { transform: booleanAttribute });
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

  private readonly now = new Date();
  protected readonly pendingHour = signal(this.now.getHours());
  protected readonly pendingMinute = signal(this.now.getMinutes());
  protected readonly pendingSecond = signal(this.now.getSeconds());
  protected readonly pendingPeriod = signal<Meridiem>(this.now.getHours() >= 12 ? 'pm' : 'am');
  protected readonly analogFace = signal<AnalogFace>('hour');
  private analogDragging = false;

  private onChange: (value: JalaliDatePickerValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private cvaDisabled = false;

  protected readonly isRange = computed(() => this.selectionMode() === 'range');
  protected readonly isRtl = computed(() => this.dir() === 'rtl');
  protected readonly isGregorianCalendar = computed(() => this.calendar() === 'gregorian');
  protected readonly todayParts = computed(() => toJalaliParts(new Date()));
  /** Time is part of the value when `showTime` or `timeOnly` is on. */
  protected readonly timeEnabled = computed(() => this.showTime() || this.timeOnly());
  protected readonly isTimeView = computed(
    () => this.timeOnly() || this.panelView() === 'time',
  );

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

  protected readonly displayHourLabel = computed(() => {
    const digits = this.t().digits;
    const hour24 = this.pendingHour();
    const value = this.hourFormat() === '12' ? to12Hour(hour24).hour : hour24;
    const padded = pad2(value);
    return digits === 'persian' ? toPersianDigits(padded) : padded;
  });

  protected readonly displayMinuteLabel = computed(() => {
    const padded = pad2(this.pendingMinute());
    return this.t().digits === 'persian' ? toPersianDigits(padded) : padded;
  });

  protected readonly displaySecondLabel = computed(() => {
    const padded = pad2(this.pendingSecond());
    return this.t().digits === 'persian' ? toPersianDigits(padded) : padded;
  });

  protected readonly pendingTimeLabel = computed(() => {
    const loc = this.t();
    return formatTimeDisplay(
      this.pendingHour(),
      this.pendingMinute(),
      this.pendingSecond(),
      {
        hourFormat: this.hourFormat(),
        showSeconds: this.showSeconds(),
        digits: loc.digits,
        am: loc.am,
        pm: loc.pm,
      },
    );
  });

  protected readonly analogMarks = computed(() => {
    const face = this.analogFace();
    const digits = this.t().digits;
    const cx = 100;
    const cy = 100;
    const marks: Array<{ value: number; label: string; x: number; y: number; active: boolean }> =
      [];

    if (face === 'hour') {
      if (this.hourFormat() === '24') {
        for (let h = 0; h < 24; h += 1) {
          const ring = h < 12 ? 58 : 78;
          const idx = h % 12;
          const angle = ((idx / 12) * Math.PI * 2) - Math.PI / 2;
          const x = cx + ring * Math.cos(angle);
          const y = cy + ring * Math.sin(angle);
          const label = digits === 'persian' ? toPersianDigits(pad2(h)) : pad2(h);
          marks.push({ value: h, label, x, y, active: this.pendingHour() === h });
        }
      } else {
        for (let h = 1; h <= 12; h += 1) {
          const angle = ((h % 12) / 12) * Math.PI * 2 - Math.PI / 2;
          const x = cx + 70 * Math.cos(angle);
          const y = cy + 70 * Math.sin(angle);
          const label = digits === 'persian' ? toPersianDigits(String(h)) : String(h);
          const display = to12Hour(this.pendingHour()).hour;
          marks.push({ value: h, label, x, y, active: display === h });
        }
      }
      return marks;
    }

    const step = 5;
    const current = face === 'minute' ? this.pendingMinute() : this.pendingSecond();
    for (let v = 0; v < 60; v += step) {
      const angle = (v / 60) * Math.PI * 2 - Math.PI / 2;
      const x = cx + 70 * Math.cos(angle);
      const y = cy + 70 * Math.sin(angle);
      const label = digits === 'persian' ? toPersianDigits(pad2(v)) : pad2(v);
      marks.push({
        value: v,
        label,
        x,
        y,
        active: Math.floor(current / step) * step === v,
      });
    }
    return marks;
  });

  protected readonly analogHand = computed(() => {
    const face = this.analogFace();
    let unit: number;
    let total: number;
    if (face === 'hour') {
      if (this.hourFormat() === '24') {
        unit = this.pendingHour() % 12;
        total = 12;
      } else {
        unit = to12Hour(this.pendingHour()).hour % 12;
        total = 12;
      }
    } else if (face === 'minute') {
      unit = this.pendingMinute();
      total = 60;
    } else {
      unit = this.pendingSecond();
      total = 60;
    }
    const angle = (unit / total) * Math.PI * 2 - Math.PI / 2;
    const len = face === 'hour' && this.hourFormat() === '24' && this.pendingHour() >= 12 ? 62 : 55;
    return {
      x: 100 + len * Math.cos(angle),
      y: 100 + len * Math.sin(angle),
    };
  });

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
    () =>
      this.showDateBanner() &&
      !!this.pendingStart() &&
      (this.panelView() === 'date' || this.isTimeView()),
  );

  protected readonly canConfirm = computed(() => {
    if (this.timeOnly()) {
      return true;
    }
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
    if (this.timeOnly()) {
      if (!this.pendingStart()) {
        this.pendingStart.set(this.todayParts());
      }
      this.analogFace.set('hour');
      this.panelView.set('time');
    } else {
      if (!this.pendingStart()) {
        this.viewParts.set(this.todayParts());
      }
      this.panelView.set('date');
    }
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
    let readyForTime = false;

    if (this.isRange()) {
      const start = this.pendingStart();
      const end = this.pendingEnd();

      if (!start || (start && end)) {
        this.pendingStart.set(cell.parts);
        this.pendingEnd.set(null);
      } else {
        this.pendingEnd.set(cell.parts);
        readyForTime = true;
        if (!this.timeEnabled() && this.autoCommit()) {
          this.confirm();
          return;
        }
      }
    } else {
      this.pendingStart.set(cell.parts);
      this.pendingEnd.set(null);
      readyForTime = true;
      if (!this.timeEnabled() && this.autoCommit()) {
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

    if (readyForTime && this.showTime() && !this.timeOnly()) {
      this.analogFace.set('hour');
      this.panelView.set('time');
    }
  }

  protected backToCalendar(): void {
    this.panelView.set('date');
  }

  protected setAnalogFace(face: AnalogFace): void {
    this.analogFace.set(face);
  }

  protected onAnalogPointerDown(event: PointerEvent): void {
    if (this.$disabled()) {
      return;
    }
    this.analogDragging = true;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    this.applyAnalogPoint(event);
  }

  protected onAnalogPointerMove(event: PointerEvent): void {
    if (!this.analogDragging || this.$disabled()) {
      return;
    }
    this.applyAnalogPoint(event);
  }

  protected onAnalogPointerUp(event: PointerEvent): void {
    if (!this.analogDragging) {
      return;
    }
    this.analogDragging = false;
    (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
    const face = this.analogFace();
    if (face === 'hour') {
      this.analogFace.set('minute');
    } else if (face === 'minute' && this.showSeconds()) {
      this.analogFace.set('second');
    } else if (this.autoCommit()) {
      this.maybeAutoCommitTime();
    }
  }

  private applyAnalogPoint(event: MouseEvent | PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const dist = Math.sqrt(x * x + y * y);
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) {
      deg += 360;
    }

    const face = this.analogFace();
    if (face === 'hour') {
      if (this.hourFormat() === '24') {
        const ring = dist > (rect.width / 2) * 0.55 ? 'outer' : 'inner';
        const idx = Math.round(deg / 30) % 12;
        // Inner 0–11, outer 12–23 (idx 0 on outer → 12)
        const hour24 = ring === 'outer' ? (idx === 0 ? 12 : idx + 12) : idx;
        this.pendingHour.set(hour24);
        this.pendingPeriod.set(hour24 >= 12 ? 'pm' : 'am');
      } else {
        let h = Math.round(deg / 30) % 12;
        if (h === 0) {
          h = 12;
        }
        this.pendingHour.set(to24Hour(h, this.pendingPeriod()));
      }
    } else {
      const value = Math.round(deg / 6) % 60;
      if (face === 'minute') {
        this.pendingMinute.set(value);
      } else {
        this.pendingSecond.set(value);
      }
    }
    this.maybeAutoCommitTime();
  }

  protected confirm(): void {
    this.commitFromPending(true);
  }

  private commitFromPending(hideAfter: boolean): void {
    if (!this.canConfirm() || this.$disabled()) {
      return;
    }

    if (this.timeOnly() && !this.pendingStart()) {
      this.pendingStart.set(this.todayParts());
    }

    const start = this.pendingStart()!;
    let internal: Date | Date[];

    if (this.isRange() && !this.timeOnly()) {
      const end = this.pendingEnd()!;
      const [from, to] = normalizeJalaliRange(start, end);
      internal = [
        this.dateFromPartsWithPendingTime(from),
        this.dateFromPartsWithPendingTime(to),
      ];
      this.pendingStart.set(from);
      this.pendingEnd.set(to);
    } else {
      internal = this.dateFromPartsWithPendingTime(start);
    }

    if (!this.isInternalWithinBounds(internal)) {
      this.inputInvalid.set(true);
      return;
    }

    this.commitInternal(internal);

    if (hideAfter && !this.inline()) {
      this.hide();
    }
  }

  protected bumpHour(delta: number): void {
    if (this.$disabled()) {
      return;
    }
    if (this.hourFormat() === '12') {
      const { hour, period } = to12Hour(this.pendingHour());
      let next = hour + delta;
      let nextPeriod = period;
      if (next > 12) {
        next = 1;
      } else if (next < 1) {
        next = 12;
      }
      if ((hour === 11 && delta === 1) || (hour === 12 && delta === -1)) {
        nextPeriod = period === 'am' ? 'pm' : 'am';
      }
      this.pendingPeriod.set(nextPeriod);
      this.pendingHour.set(to24Hour(next, nextPeriod));
    } else {
      this.pendingHour.set(wrapUnit(this.pendingHour() + delta, 0, 23));
    }
    this.maybeAutoCommitTime();
  }

  protected bumpMinute(delta: number): void {
    if (this.$disabled()) {
      return;
    }
    this.pendingMinute.set(wrapUnit(this.pendingMinute() + delta, 0, 59));
    this.maybeAutoCommitTime();
  }

  protected bumpSecond(delta: number): void {
    if (this.$disabled()) {
      return;
    }
    this.pendingSecond.set(wrapUnit(this.pendingSecond() + delta, 0, 59));
    this.maybeAutoCommitTime();
  }

  protected setPeriod(period: Meridiem): void {
    if (this.$disabled()) {
      return;
    }
    const { hour } = to12Hour(this.pendingHour());
    this.pendingPeriod.set(period);
    this.pendingHour.set(to24Hour(hour, period));
    this.maybeAutoCommitTime();
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
    if (this.panelView() === 'time' && !this.timeOnly()) {
      this.panelView.set('date');
      return;
    }
    if (this.panelView() === 'month' || this.panelView() === 'year') {
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
    if (this.timeOnly()) {
      const time = parseTimeFromText(text) ?? parseTimeFromText(splitDateTimeText(text).timePart ?? '');
      if (!time) {
        return null;
      }
      const base =
        this.committedDates() instanceof Date
          ? (this.committedDates() as Date)
          : new Date();
      return applyTimeToDate(base, time.hour, time.minute, this.showSeconds() ? time.second : 0);
    }

    const { datePart, timePart } = this.timeEnabled()
      ? splitDateTimeText(text)
      : { datePart: text, timePart: null };

    let date: Date | null = null;
    if (this.inputCalendar() === 'gregorian' || this.calendar() === 'gregorian') {
      date =
        parseGregorianDateString(datePart) ??
        (() => {
          const parts = parseJalaliDateString(datePart);
          return parts ? toGregorianDate(parts) : null;
        })();
    } else {
      const parts = parseJalaliDateString(datePart);
      date = parts ? toGregorianDate(parts) : null;
    }

    if (!date) {
      return null;
    }

    if (this.timeEnabled() && timePart) {
      const time = parseTimeFromText(timePart);
      if (!time) {
        return null;
      }
      return applyTimeToDate(date, time.hour, time.minute, this.showSeconds() ? time.second : 0);
    }

    if (this.timeEnabled()) {
      return this.applyPendingTime(date);
    }

    return date;
  }

  private formatDateForInput(date: Date): string {
    const loc = this.t();
    if (this.timeOnly()) {
      return formatTimeDisplay(date.getHours(), date.getMinutes(), date.getSeconds(), {
        hourFormat: this.hourFormat(),
        showSeconds: this.showSeconds(),
        digits: loc.digits,
        am: loc.am,
        pm: loc.pm,
      });
    }

    const format = this.resolveDisplayFormat();
    let dateText: string;
    switch (format) {
      case 'jalali-long':
        dateText = formatJalaliDisplay(toJalaliParts(date), 'long');
        break;
      case 'jalali-slash':
        dateText = formatJalaliSlash(toJalaliParts(date), 'persian');
        break;
      case 'gregorian-slash':
        dateText = formatGregorianSlash(date, 'latin');
        break;
      case 'jalali-short':
      default:
        dateText = formatJalaliDisplay(toJalaliParts(date), 'short');
        break;
    }

    if (!this.timeEnabled()) {
      return dateText;
    }

    const timeText = formatTimeDisplay(date.getHours(), date.getMinutes(), date.getSeconds(), {
      hourFormat: this.hourFormat(),
      showSeconds: this.showSeconds(),
      digits: loc.digits,
      am: loc.am,
      pm: loc.pm,
    });
    return `${dateText} ${timeText}`;
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
      // Preserve times when ordering the range by calendar day.
      if (compareJalaliDay(toJalaliParts(next[0]), toJalaliParts(next[1])) <= 0) {
        next = [next[0], next[1]];
      } else {
        next = [next[1], next[0]];
      }
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
      const mapParts = (d: Date) =>
        this.timeEnabled() ? toJalaliDateTimeParts(d) : toJalaliParts(d);
      if (Array.isArray(internal)) {
        return internal.map(mapParts);
      }
      return mapParts(internal);
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
      const [from, to] =
        compareJalaliDay(toJalaliParts(dates[0]), toJalaliParts(dates[1])) <= 0
          ? [dates[0], dates[1]]
          : [dates[1], dates[0]];
      return [from, to];
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
        this.syncPendingTimeFromDate(value[0]);
        return;
      }
      this.pendingStart.set(null);
      this.pendingEnd.set(null);
      this.syncPendingTimeFromNow();
      return;
    }

    if (value instanceof Date) {
      const parts = toJalaliParts(value);
      this.pendingStart.set(parts);
      this.pendingEnd.set(null);
      this.viewParts.set(parts);
      this.focusedParts.set(parts);
      this.syncPendingTimeFromDate(value);
      return;
    }

    this.pendingStart.set(null);
    this.pendingEnd.set(null);
    this.syncPendingTimeFromNow();
  }

  private syncPendingTimeFromDate(date: Date): void {
    this.pendingHour.set(date.getHours());
    this.pendingMinute.set(date.getMinutes());
    this.pendingSecond.set(date.getSeconds());
    this.pendingPeriod.set(date.getHours() >= 12 ? 'pm' : 'am');
  }

  private syncPendingTimeFromNow(): void {
    const now = new Date();
    this.syncPendingTimeFromDate(now);
  }

  private dateFromPartsWithPendingTime(parts: JalaliDateParts): Date {
    const date = toGregorianDate({ jy: parts.jy, jm: parts.jm, jd: parts.jd });
    return this.timeEnabled() ? this.applyPendingTime(date) : date;
  }

  private applyPendingTime(date: Date): Date {
    return applyTimeToDate(
      date,
      this.pendingHour(),
      this.pendingMinute(),
      this.showSeconds() ? this.pendingSecond() : 0,
    );
  }

  private maybeAutoCommitTime(): void {
    if (!this.autoCommit() || !this.timeEnabled() || !this.canConfirm() || this.$disabled()) {
      return;
    }
    this.commitFromPending(false);
  }
}

export { JalaliDatePicker as DatepickerNg };
export { JALALI_DATEPICKER_VALUE_ACCESSOR };
