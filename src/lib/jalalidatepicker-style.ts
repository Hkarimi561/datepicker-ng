import { Injectable } from '@angular/core';
import { style as datepickerStyle } from '@primeuix/styles/datepicker';
import { BaseStyle } from 'primeng/base';

const style = /*css*/ `
${datepickerStyle}

/* Jalali datepicker — Figma extensions on top of PrimeNG datepicker tokens */
.p-jalali-datepicker {
    direction: rtl;
}

.p-jalali-datepicker .p-datepicker-panel {
    min-width: 19.5rem;
    padding: 0;
    overflow: hidden;
    background: dt('datepicker.panel.background');
    color: dt('datepicker.panel.color');
    border: 1px solid dt('datepicker.panel.border.color');
    border-radius: 10px;
    box-shadow: dt('datepicker.panel.shadow');
}

/* Modern rounded-square day cells (override Aura's 50% circles) */
.p-jalali-datepicker .p-datepicker-day {
    border-radius: 10px;
}

/* Tighter spacing between day cells */
.p-jalali-datepicker .p-datepicker-day-view {
    margin-block: 0.5rem 0.75rem;
    border-collapse: separate;
    border-spacing: 2px;
}

.p-jalali-datepicker .p-datepicker-day-cell {
    padding: 0;
}

.p-jalali-datepicker-selection {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem 1.25rem;
    background: dt('primary.color');
    color: dt('primary.contrast.color');
}

.p-jalali-datepicker-selection-year {
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.9;
}

.p-jalali-datepicker-selection-date {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
}

.p-jalali-datepicker .p-datepicker-header,
.p-jalali-datepicker .p-datepicker-calendar-container,
.p-jalali-datepicker .p-datepicker-buttonbar {
    padding-inline: 1rem;
}

.p-jalali-datepicker .p-datepicker-header {
    border-block-end: 0 none;
    padding-block-start: 1rem;
}

.p-jalali-datepicker .p-datepicker-weekday.p-jalali-friday,
.p-jalali-datepicker .p-datepicker-day-cell.p-jalali-friday .p-datepicker-day:not(.p-datepicker-day-selected):not(.p-datepicker-day-selected-range):not(.p-disabled) {
    color: dt('primary.color');
}

.p-jalali-datepicker .p-datepicker-other-month .p-datepicker-day {
    opacity: 0.45;
}

.p-jalali-datepicker .p-datepicker-today > .p-datepicker-day:not(.p-datepicker-day-selected):not(.p-datepicker-day-selected-range) {
    background: transparent;
    border-color: dt('primary.color');
    color: dt('datepicker.date.color');
}

.p-jalali-datepicker .p-datepicker-day.p-disabled,
.p-jalali-datepicker .p-datepicker-month.p-disabled,
.p-jalali-datepicker .p-datepicker-year.p-disabled {
    opacity: 0.35;
    cursor: default;
    pointer-events: none;
}

.p-jalali-datepicker .p-datepicker-select-month,
.p-jalali-datepicker .p-datepicker-select-year {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 10px;
}

.p-jalali-datepicker .p-datepicker-select-month:hover,
.p-jalali-datepicker .p-datepicker-select-year:hover {
    background: dt('datepicker.header.hover.background');
}

.p-jalali-datepicker .p-datepicker-month-view,
.p-jalali-datepicker .p-datepicker-year-view {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.35rem;
    padding: 0.5rem 1rem 0.75rem;
}

.p-jalali-datepicker .p-datepicker-month,
.p-jalali-datepicker .p-datepicker-year {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem;
    border-radius: 10px;
    cursor: pointer;
    color: dt('datepicker.date.color');
    background: transparent;
}

.p-jalali-datepicker .p-datepicker-month:hover:not(.p-disabled):not(.p-datepicker-month-selected),
.p-jalali-datepicker .p-datepicker-year:hover:not(.p-disabled):not(.p-datepicker-year-selected) {
    background: dt('datepicker.date.hover.background');
    color: dt('datepicker.date.hover.color');
}

.p-jalali-datepicker .p-datepicker-month-selected,
.p-jalali-datepicker .p-datepicker-year-selected {
    background: dt('datepicker.date.selected.background');
    color: dt('datepicker.date.selected.color');
}

.p-jalali-datepicker.p-invalid .p-datepicker-input,
.p-jalali-datepicker .p-datepicker-input.p-invalid {
    border-color: dt('form.field.invalid.border.color');
}

.p-jalali-datepicker .p-datepicker-clear-icon {
    position: absolute;
    inset-inline-end: 2.25rem;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: dt('form.field.icon.color');
    display: inline-flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
}

.p-jalali-datepicker .p-datepicker-buttonbar {
    gap: 0.75rem;
    justify-content: flex-start;
    border-block-start: 0 none;
    padding-block: 0.75rem 1rem;
}

.p-jalali-datepicker-buttonbar-spacer {
    flex: 1 1 auto;
}

.p-jalali-datepicker-link {
    border: 0;
    background: transparent;
    color: dt('primary.color');
    cursor: pointer;
    font: inherit;
    padding: 0.5rem 0.25rem;
}

.p-jalali-datepicker-link:hover {
    text-decoration: underline;
}

.p-jalali-datepicker-link:focus-visible {
    outline: dt('datepicker.date.focus.ring.width') dt('datepicker.date.focus.ring.style') dt('datepicker.date.focus.ring.color');
    outline-offset: dt('datepicker.date.focus.ring.offset');
    border-radius: 10px;
}
`;

type JalaliDatePickerInstance = {
  $filled?: () => boolean;
  $disabled?: () => boolean;
  $invalid?: () => boolean;
  overlayVisible?: (() => boolean) | boolean;
  inline?: (() => boolean) | boolean;
};

function readFlag(value: (() => boolean) | boolean | undefined): boolean {
  if (typeof value === 'function') {
    return value();
  }
  return !!value;
}

const classes = {
  root: ({ instance }: { instance: JalaliDatePickerInstance }) => [
    'p-datepicker p-jalali-datepicker p-component p-inputwrapper',
    {
      'p-inputwrapper-filled': instance.$filled?.(),
      'p-inputwrapper-focus': readFlag(instance.overlayVisible),
      'p-focus': readFlag(instance.overlayVisible),
      'p-disabled': instance.$disabled?.(),
      'p-invalid': instance.$invalid?.(),
    },
  ],
  pcInputText: 'p-datepicker-input',
  inputIconContainer: 'p-datepicker-input-icon-container',
  inputIcon: 'p-datepicker-input-icon',
  panel: ({ instance }: { instance: JalaliDatePickerInstance }) => [
    'p-datepicker-panel p-component',
    {
      'p-datepicker-panel-inline': readFlag(instance.inline),
    },
  ],
  selection: 'p-jalali-datepicker-selection',
  calendarContainer: 'p-datepicker-calendar-container',
  calendar: 'p-datepicker-calendar',
  header: 'p-datepicker-header',
  pcPrevButton: 'p-datepicker-prev-button',
  title: 'p-datepicker-title',
  selectMonth: 'p-datepicker-select-month',
  pcNextButton: 'p-datepicker-next-button',
  dayView: 'p-datepicker-day-view',
  weekDayCell: 'p-datepicker-weekday-cell',
  weekDay: 'p-datepicker-weekday',
  dayCell: ({ otherMonth, today, friday }: { otherMonth: boolean; today: boolean; friday: boolean }) => [
    'p-datepicker-day-cell',
    {
      'p-datepicker-other-month': otherMonth,
      'p-datepicker-today': today,
      'p-jalali-friday': friday,
    },
  ],
  day: ({
    selected,
    selectedRange,
    disabled,
  }: {
    selected: boolean;
    selectedRange: boolean;
    disabled: boolean;
  }) => [
    'p-datepicker-day',
    {
      'p-datepicker-day-selected': selected,
      'p-datepicker-day-selected-range': selectedRange,
      'p-disabled': disabled,
    },
  ],
  buttonbar: 'p-datepicker-buttonbar',
};

/**
 * Loads PrimeNG datepicker theme tokens/CSS and Jalali-specific Figma styles.
 * Configure theming via `providePrimeNG({ theme: { preset } })` like other PrimeNG components.
 *
 * Uses the `datepicker` style name so Aura/Lara/Nora panel tokens (background, etc.) are
 * injected. Jalali-only rules are scoped under `.p-jalali-datepicker`.
 */
@Injectable()
export class JalaliDatePickerStyle extends BaseStyle {
  override name = 'datepicker';
  override style = style;
  override classes = classes;
}

/**
 * CSS class names for `datepicker-ng` (extends PrimeNG datepicker classes).
 */
export enum JalaliDatePickerClasses {
  root = 'p-jalali-datepicker',
  selection = 'p-jalali-datepicker-selection',
  friday = 'p-jalali-friday',
  link = 'p-jalali-datepicker-link',
  buttonbarSpacer = 'p-jalali-datepicker-buttonbar-spacer',
}
