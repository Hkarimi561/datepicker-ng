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
import { PARENT_INSTANCE, BaseComponent } from 'primeng/basecomponent';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import {
  addJalaliMonths,
  addJalaliYears,
  applySlashDateMask,
  buildJalaliMonthGrid,
  buildJalaliYearWindow,
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
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAY_SHORT,
  normalizeJalaliRange,
  parseGregorianDateString,
  parseJalaliDateString,
  toGregorianDate,
  toJalaliParts,
  toPersianDigits,
} from './jalali-calendar';
import { JalaliDatePickerStyle } from './jalalidatepicker-style';

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

type CalendarPanelView = 'date' | 'month' | 'year';

const JALALI_DATEPICKER_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => JalaliDatePicker),
  multi: true,
};

/**
 * Persian (Jalali) datepicker styled with PrimeNG datepicker design tokens.
 *
 * @group Components
 */
@Component({
  selector: 'datepicker-ng',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, InputText, LucideX, LucideCalendar, LucideChevronLeft, LucideChevronRight],
  providers: [
    JalaliDatePickerStyle,
    JALALI_DATEPICKER_VALUE_ACCESSOR,
    { provide: PARENT_INSTANCE, useExisting: JalaliDatePicker },
  ],
  host: {
    '[class]': 'rootClass()',
    '[attr.data-p-disabled]': 'disabled() || null',
    style: 'position: relative; display: inline-flex; max-width: 100%;',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    @if (!inline()) {
      <input
        #inputEl
        pInputText
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
        [placeholder]="placeholder()"
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
          class="p-datepicker-clear-icon"
          role="button"
          tabindex="-1"
          [attr.aria-label]="clearLabel()"
          (mousedown)="$event.preventDefault()"
          (click)="clear($event)"
        >
          <svg lucideX [size]="14" aria-hidden="true"></svg>
        </span>
      }
      <span
        class="p-datepicker-input-icon-container"
        role="button"
        tabindex="-1"
        [attr.aria-label]="iconAriaLabel()"
        (mousedown)="$event.preventDefault()"
        (click)="onIconClick($event)"
      >
        <svg lucideCalendar [class]="cx('inputIcon')" [size]="14" aria-hidden="true"></svg>
      </span>
    }

    @if (inline() || overlayVisible()) {
      <div
        #panelEl
        [id]="panelId"
        role="dialog"
        [attr.aria-modal]="!inline()"
        [attr.aria-label]="ariaLabel() || (isRange() ? 'انتخاب بازه تاریخ' : 'انتخاب تاریخ')"
        [class]="panelClass()"
        [style.position]="inline() ? null : 'absolute'"
        [style.inset-inline-start]="inline() ? null : '0'"
        [style.top]="inline() ? null : 'calc(100% + 0.25rem)'"
        [style.z-index]="inline() ? null : '1000'"
      >
        @if (showSelectionBanner() && bannerContent(); as banner) {
          <div [class]="cx('selection')" aria-live="polite">
            <span class="p-jalali-datepicker-selection-year">{{ banner.year }}</span>
            <span class="p-jalali-datepicker-selection-date">{{ banner.date }}</span>
          </div>
        }

        <div [class]="cx('calendarContainer')">
          <div [class]="cx('calendar')">
            <div [class]="cx('header')">
              <button
                type="button"
                class="p-datepicker-prev-button p-button p-button-icon-only p-button-text p-button-secondary p-button-rounded"
                [attr.aria-label]="prevLabel()"
                [disabled]="disabled()"
                (click)="onPrev()"
              >
                <svg lucideChevronRight [size]="14" aria-hidden="true"></svg>
              </button>

              <div [class]="cx('title')">
                @if (panelView() === 'date') {
                  <button
                    type="button"
                    [class]="cx('selectMonth')"
                    [disabled]="disabled()"
                    (click)="openMonthView()"
                  >
                    {{ monthYearLabel() }}
                  </button>
                } @else if (panelView() === 'month') {
                  <button
                    type="button"
                    class="p-datepicker-select-year"
                    [disabled]="disabled()"
                    (click)="openYearView()"
                  >
                    {{ toPersianDigits(viewParts().jy) }}
                  </button>
                } @else {
                  <span class="p-datepicker-select-year">{{ decadeLabel() }}</span>
                }
              </div>

              <button
                type="button"
                class="p-datepicker-next-button p-button p-button-icon-only p-button-text p-button-secondary p-button-rounded"
                [attr.aria-label]="nextLabel()"
                [disabled]="disabled()"
                (click)="onNext()"
              >
                <svg lucideChevronLeft [size]="14" aria-hidden="true"></svg>
              </button>
            </div>

            @if (panelView() === 'date') {
              <table [class]="cx('dayView')" role="grid" [attr.aria-label]="monthYearLabel()">
                <thead>
                  <tr>
                    @for (day of weekdays; track day; let i = $index) {
                      <th [class]="cx('weekDayCell')">
                        <span
                          [class]="cx('weekDay')"
                          [class.p-jalali-friday]="i === 6"
                          >{{ day }}</span
                        >
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
                            [attr.aria-label]="formatJalaliDisplay(cell.parts, 'long')"
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
              <div class="p-datepicker-month-view" role="grid">
                @for (month of monthNames; track month; let i = $index) {
                  <span
                    role="gridcell"
                    tabindex="0"
                    class="p-datepicker-month"
                    [class.p-datepicker-month-selected]="viewParts().jm === i + 1"
                    [class.p-disabled]="isMonthDisabled(i + 1)"
                    (click)="selectMonth(i + 1)"
                    (keydown)="onMonthKeydown($event, i + 1)"
                  >
                    {{ month }}
                  </span>
                }
              </div>
            } @else {
              <div class="p-datepicker-year-view" role="grid">
                @for (year of yearWindow(); track year) {
                  <span
                    role="gridcell"
                    tabindex="0"
                    class="p-datepicker-year"
                    [class.p-datepicker-year-selected]="viewParts().jy === year"
                    [class.p-disabled]="isYearDisabled(year)"
                    (click)="selectYear(year)"
                    (keydown)="onYearKeydown($event, year)"
                  >
                    {{ toPersianDigits(year) }}
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <div [class]="cx('buttonbar')">
          @if (!autoCommit()) {
            <p-button
              type="button"
              [label]="selectLabel()"
              [disabled]="disabled() || !canConfirm()"
              (onClick)="confirm()"
            />
          }
          <button
            type="button"
            class="p-jalali-datepicker-link"
            [disabled]="disabled()"
            (click)="cancel()"
          >
            {{ cancelLabel() }}
          </button>
          @if (showClear()) {
            <button
              type="button"
              class="p-jalali-datepicker-link"
              [disabled]="disabled() || !$filled()"
              (click)="clear()"
            >
              {{ clearLabel() }}
            </button>
          }
          <span class="p-jalali-datepicker-buttonbar-spacer" aria-hidden="true"></span>
          <button
            type="button"
            class="p-jalali-datepicker-link"
            [disabled]="disabled() || isDayDisabled(todayParts())"
            (click)="goToday()"
          >
            {{ todayLabel() }}
          </button>
        </div>
      </div>
    }
  `,
})
export class JalaliDatePicker extends BaseComponent implements ControlValueAccessor {
  componentName = 'JalaliDatePicker';
  _componentStyle = inject(JalaliDatePickerStyle);

  readonly placeholder = input('مقدار پیش‌فرض');
  readonly inputId = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly iconAriaLabel = input('باز کردن تقویم');
  readonly styleClass = input<string | undefined>(undefined);
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
  readonly rangeSeparator = input(' تا ');
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
  readonly selectLabel = input('انتخاب');
  readonly cancelLabel = input('انصراف');
  readonly todayLabel = input('امروز');
  readonly clearLabel = input('پاک کردن');

  readonly onSelect = output<JalaliDatePickerValue>();
  readonly onClear = output<void>();
  readonly onInputInvalid = output<string>();
  readonly onShow = output<void>();
  readonly onHide = output<void>();

  protected readonly weekdays = JALALI_WEEKDAY_SHORT;
  protected readonly monthNames = JALALI_MONTH_NAMES;
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
  protected readonly todayParts = computed(() => toJalaliParts(new Date()));

  protected readonly weeks = computed(() => {
    const view = this.viewParts();
    return buildJalaliMonthGrid(view.jy, view.jm, this.todayParts());
  });

  protected readonly yearWindow = computed(() => buildJalaliYearWindow(this.viewParts().jy));

  protected readonly monthYearLabel = computed(() => {
    const view = this.viewParts();
    return formatJalaliMonthYear(view.jy, view.jm);
  });

  protected readonly decadeLabel = computed(() => {
    const years = this.yearWindow();
    return `${toPersianDigits(years[1])} – ${toPersianDigits(years[10])}`;
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
    if (this.isRange()) {
      const end = this.pendingEnd();
      if (end) {
        const [from, to] = normalizeJalaliRange(start, end);
        return {
          year: `${toPersianDigits(from.jy)} – ${toPersianDigits(to.jy)}`,
          date: formatJalaliRangeDisplay(from, to, this.rangeSeparator(), 'long'),
        };
      }
      return {
        year: toPersianDigits(start.jy),
        date: `${formatJalaliDisplay(start, 'long')} …`,
      };
    }
    return {
      year: toPersianDigits(start.jy),
      date: formatJalaliDisplay(start, 'long'),
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
    this.cn(
      this.cx('root'),
      {
        'p-invalid': this.inputInvalid(),
        'ng-invalid': this.inputInvalid(),
        'ng-dirty': this.inputInvalid(),
      },
      this.styleClass(),
    ),
  );

  protected readonly inputClass = computed(() =>
    this.cn(this.cx('pcInputText'), { 'p-invalid': this.inputInvalid() }),
  );

  protected readonly panelClass = computed(() => this.cx('panel'));

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
    switch (this.panelView()) {
      case 'month':
        return 'سال قبل';
      case 'year':
        return 'دهه قبل';
      default:
        return 'ماه قبل';
    }
  }

  protected nextLabel(): string {
    switch (this.panelView()) {
      case 'month':
        return 'سال بعد';
      case 'year':
        return 'دهه بعد';
      default:
        return 'ماه بعد';
    }
  }

  protected onPrev(): void {
    if (this.panelView() === 'date') {
      this.viewParts.update((current) => addJalaliMonths(current, -1));
    } else if (this.panelView() === 'month') {
      this.viewParts.update((current) => addJalaliYears(current, -1));
    } else {
      this.viewParts.update((current) => addJalaliYears(current, -10));
    }
  }

  protected onNext(): void {
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

  protected selectMonth(jm: number): void {
    if (this.$disabled() || this.isMonthDisabled(jm)) {
      return;
    }
    this.viewParts.update((current) => ({
      jy: current.jy,
      jm,
      jd: Math.min(current.jd, 29),
    }));
    this.panelView.set('date');
  }

  protected selectYear(jy: number): void {
    if (this.$disabled() || this.isYearDisabled(jy)) {
      return;
    }
    this.viewParts.update((current) => ({ ...current, jy }));
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
      this.viewParts.set({ jy: cell.parts.jy, jm: cell.parts.jm, jd: 1 });
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

  protected isMonthDisabled(jm: number): boolean {
    const jy = this.viewParts().jy;
    const min = this.minDate();
    const max = this.maxDate();
    if (min) {
      const minParts = toJalaliParts(min);
      if (jy < minParts.jy || (jy === minParts.jy && jm < minParts.jm)) {
        return true;
      }
    }
    if (max) {
      const maxParts = toJalaliParts(max);
      if (jy > maxParts.jy || (jy === maxParts.jy && jm > maxParts.jm)) {
        return true;
      }
    }
    return false;
  }

  protected isYearDisabled(jy: number): boolean {
    const min = this.minDate();
    const max = this.maxDate();
    if (min && jy < toJalaliParts(min).jy) {
      return true;
    }
    if (max && jy > toJalaliParts(max).jy) {
      return true;
    }
    return false;
  }

  protected isFocusedDay(parts: JalaliDateParts): boolean {
    return isSameJalaliDay(parts, this.focusedParts());
  }

  protected dayCellClass(cell: JalaliDayCell): string | undefined {
    return this.cx('dayCell', {
      otherMonth: cell.otherMonth,
      today: cell.today,
      friday: cell.friday,
    });
  }

  protected dayClass(cell: JalaliDayCell): string | undefined {
    return this.cx('day', {
      selected: this.isDaySelected(cell.parts),
      selectedRange: this.isDayInRange(cell.parts),
      disabled: this.isDayDisabled(cell.parts),
    });
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
      const digits = this.inputCalendar() === 'gregorian' ? 'latin' : 'persian';
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
      this.viewParts.update((current) => addJalaliMonths(current, event.shiftKey ? -12 : -1));
      return;
    }

    if (event.key === 'PageDown') {
      event.preventDefault();
      this.viewParts.update((current) => addJalaliMonths(current, event.shiftKey ? 12 : 1));
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
    const host = this.el.nativeElement as HTMLElement;
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
    // RTL grid: visual right is earlier days.
    switch (key) {
      case 'ArrowRight':
        return -1;
      case 'ArrowLeft':
        return 1;
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
      const focused = panel?.querySelector<HTMLElement>('.p-datepicker-day[tabindex="0"]');
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
      const parts = trimmed.split(this.rangeSeparator()).map((p) => p.trim());
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
    if (this.inputCalendar() === 'gregorian') {
      return parseGregorianDateString(text);
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
    return `${this.formatDateForInput(start)}${this.rangeSeparator()}${this.formatDateForInput(end)}`;
  }

  private resolveDisplayFormat(): JalaliDatePickerDisplayFormat {
    const explicit = this.displayFormat();
    if (explicit) {
      return explicit;
    }
    if (this.mask()) {
      return this.inputCalendar() === 'gregorian' ? 'gregorian-slash' : 'jalali-slash';
    }
    return this.inputCalendar() === 'gregorian' ? 'gregorian-slash' : 'jalali-short';
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
