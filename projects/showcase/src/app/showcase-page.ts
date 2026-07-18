import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  formatJalaliDisplay,
  isJalaliDateParts,
  JalaliDateParts,
  JalaliDatePicker,
  JalaliDatePickerValue,
  toJalaliParts,
} from 'datepicker-ng';

@Component({
  selector: 'app-showcase-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JalaliDatePicker, FormsModule, ReactiveFormsModule, JsonPipe],
  template: `
    <div class="page">
      <header class="hero">
        <p class="brand">datepicker-ng</p>
        <h1>تقویم جلالی برای Angular</h1>
        <p class="lead">
          کامپوننت مستقل روی PrimeNG — مقدار پیش‌فرض <code>Date</code> میلادی، نمایش و ورودی شمسی.
        </p>
        <p class="install"><code>npm install datepicker-ng</code></p>
      </header>

      <nav class="toc" aria-label="Demo sections">
        @for (item of toc; track item.id) {
          <a [href]="'#' + item.id">{{ item.label }}</a>
        }
      </nav>

      <section id="popup" class="demo">
        <h2>Popup</h2>
        <p>تایپ کنید: <code>۱۵ خرداد ۱۴۰۴</code> یا <code>فردا</code> / <code>tomorrow</code></p>
        <div class="demo-body" dir="rtl">
          <datepicker-ng
            placeholder="فردا یا ۱۵ خرداد ۱۴۰۴"
            [ngModel]="popupDate()"
            (ngModelChange)="onDateModelChange(popupDate, $event)"
            (onInputInvalid)="lastInvalid.set($event)"
          />
          <p class="meta">Gregorian: {{ formatGregorian(popupDate()) }}</p>
          <p class="meta">Jalali: {{ formatDate(popupDate()) }}</p>
          @if (lastInvalid()) {
            <p class="meta warn">Invalid: {{ lastInvalid() }}</p>
          }
        </div>
      </section>

      <section id="inline" class="demo">
        <h2>Inline</h2>
        <div class="demo-body wide" dir="rtl">
          <datepicker-ng
            [inline]="true"
            [ngModel]="inlineDate()"
            (ngModelChange)="onDateModelChange(inlineDate, $event)"
          />
          <p class="meta">Selected: {{ formatDate(inlineDate()) }}</p>
        </div>
      </section>

      <section id="range" class="demo">
        <h2>Range</h2>
        <div class="demo-body wide" dir="rtl">
          <datepicker-ng
            selectionMode="range"
            placeholder="از تاریخ تا تاریخ"
            [inline]="true"
            [ngModel]="rangeDates()"
            (ngModelChange)="onRangeModelChange($event)"
          />
          <p class="meta">Selected: {{ formatRange(rangeDates()) }}</p>
        </div>
      </section>

      <section id="bounds" class="demo">
        <h2>Min / max</h2>
        <div class="demo-body wide" dir="rtl">
          <datepicker-ng
            [inline]="true"
            [minDate]="minBound"
            [maxDate]="maxBound"
            [ngModel]="boundsDate()"
            (ngModelChange)="onDateModelChange(boundsDate, $event)"
          />
          <p class="meta">Selected: {{ formatDate(boundsDate()) }}</p>
        </div>
      </section>

      <section id="auto-commit" class="demo">
        <h2>Auto-commit</h2>
        <div class="demo-body" dir="rtl">
          <datepicker-ng
            [autoCommit]="true"
            placeholder="انتخاب تاریخ"
            [ngModel]="autoCommitDate()"
            (ngModelChange)="onDateModelChange(autoCommitDate, $event)"
          />
          <p class="meta">Selected: {{ formatDate(autoCommitDate()) }}</p>
        </div>
      </section>

      <section id="mask" class="demo">
        <h2>Slash mask</h2>
        <div class="demo-body" dir="rtl">
          <datepicker-ng
            [mask]="true"
            placeholder="۱۴۰۴/۰۳/۱۵"
            [ngModel]="maskDate()"
            (ngModelChange)="onDateModelChange(maskDate, $event)"
            (onInputInvalid)="lastInvalid.set($event)"
          />
          <p class="meta">Selected: {{ formatDate(maskDate()) }}</p>
        </div>
      </section>

      <section id="jalali-value" class="demo">
        <h2>Jalali value format</h2>
        <div class="demo-body" dir="rtl">
          <datepicker-ng
            valueFormat="jalali"
            placeholder="۱۵ خرداد ۱۴۰۴"
            [ngModel]="jalaliParts()"
            (ngModelChange)="onJalaliModelChange($event)"
          />
          <p class="meta">Model: {{ jalaliParts() | json }}</p>
        </div>
      </section>

      <section id="custom-value" class="demo">
        <h2>Custom ISO value</h2>
        <div class="demo-body" dir="rtl">
          <datepicker-ng
            valueFormat="custom"
            placeholder="۱۵ خرداد ۱۴۰۴"
            [parseValue]="parseIso"
            [formatValue]="formatIso"
            [ngModel]="customIso()"
            (ngModelChange)="onCustomModelChange($event)"
          />
          <p class="meta">ISO: {{ customIso() || '—' }}</p>
        </div>
      </section>

      <section id="gregorian-input" class="demo">
        <h2>Gregorian input text</h2>
        <div class="demo-body" dir="rtl">
          <datepicker-ng
            inputCalendar="gregorian"
            displayFormat="gregorian-slash"
            placeholder="2025/06/05"
            [ngModel]="gregorianInputDate()"
            (ngModelChange)="onDateModelChange(gregorianInputDate, $event)"
          />
          <p class="meta">Gregorian: {{ formatGregorian(gregorianInputDate()) }}</p>
        </div>
      </section>

      <section id="reactive" class="demo">
        <h2>Reactive forms</h2>
        <div class="demo-body" dir="rtl">
          <datepicker-ng [formControl]="dateControl" placeholder="تاریخ تولد" />
          <p class="meta">Form value: {{ formatDate(dateControl.value) }}</p>
          <div class="actions">
            <button type="button" (click)="setToday()">Today</button>
            <button type="button" (click)="dateControl.reset()">Clear</button>
            <button type="button" (click)="dateControl.disable()">Disable</button>
            <button type="button" (click)="dateControl.enable()">Enable</button>
          </div>
        </div>
      </section>

      <section id="disabled" class="demo">
        <h2>Disabled</h2>
        <div class="demo-body" dir="rtl">
          <datepicker-ng [disabled]="true" [ngModel]="disabledDate" />
        </div>
      </section>

      <footer class="footer">
        <p>MIT · Angular 22 · PrimeNG</p>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      max-width: 52rem;
      margin: 0 auto;
      padding: 2.5rem 1.25rem 4rem;
    }

    .hero {
      margin-bottom: 2rem;
    }

    .brand {
      margin: 0 0 0.75rem;
      font-size: clamp(2rem, 5vw, 2.75rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--ink);
    }

    h1 {
      margin: 0 0 0.75rem;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--muted);
    }

    .lead {
      margin: 0 0 1rem;
      max-width: 36rem;
      line-height: 1.7;
      color: var(--muted);
    }

    .install {
      margin: 0;
    }

    .install code,
    .demo code {
      font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
      font-size: 0.85em;
      padding: 0.15rem 0.4rem;
      border-radius: 0.35rem;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--ink);
    }

    .install code {
      display: inline-block;
      padding: 0.55rem 0.85rem;
      background: var(--panel);
      border: 1px solid var(--line);
    }

    .toc {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 0.85rem;
      margin-bottom: 2.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--line);
    }

    .toc a {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .toc a:hover {
      text-decoration: underline;
    }

    .demo {
      margin-bottom: 2.5rem;
      scroll-margin-top: 1rem;
    }

    .demo h2 {
      margin: 0 0 0.35rem;
      font-size: 1.15rem;
      font-weight: 600;
    }

    .demo > p {
      margin: 0 0 1rem;
      color: var(--muted);
      font-size: 0.95rem;
    }

    .demo-body {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-width: 22rem;
      padding: 1.25rem;
      border-radius: 1rem;
      background: var(--panel);
      border: 1px solid var(--line);
      box-shadow: 0 12px 40px color-mix(in srgb, var(--ink) 6%, transparent);
    }

    .demo-body.wide {
      max-width: none;
    }

    .meta {
      margin: 0;
      font-size: 0.875rem;
      color: var(--muted);
    }

    .meta.warn {
      color: #b42318;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .actions button {
      font: inherit;
      padding: 0.4rem 0.75rem;
      border-radius: 0.45rem;
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--ink) 4%, transparent);
      cursor: pointer;
    }

    .actions button:hover {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }

    .footer {
      margin-top: 3rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.875rem;
    }
  `,
})
export class ShowcasePage {
  protected readonly toc = [
    { id: 'popup', label: 'Popup' },
    { id: 'inline', label: 'Inline' },
    { id: 'range', label: 'Range' },
    { id: 'bounds', label: 'Min/max' },
    { id: 'auto-commit', label: 'Auto-commit' },
    { id: 'mask', label: 'Mask' },
    { id: 'jalali-value', label: 'Jalali value' },
    { id: 'custom-value', label: 'Custom ISO' },
    { id: 'gregorian-input', label: 'Gregorian input' },
    { id: 'reactive', label: 'Reactive' },
    { id: 'disabled', label: 'Disabled' },
  ] as const;

  protected readonly popupDate = signal<Date | null>(null);
  protected readonly inlineDate = signal<Date | null>(new Date());
  protected readonly rangeDates = signal<Date[] | null>(null);
  protected readonly boundsDate = signal<Date | null>(null);
  protected readonly autoCommitDate = signal<Date | null>(null);
  protected readonly maskDate = signal<Date | null>(null);
  protected readonly jalaliParts = signal<JalaliDateParts | null>(null);
  protected readonly customIso = signal<string | null>(null);
  protected readonly gregorianInputDate = signal<Date | null>(null);
  protected readonly lastInvalid = signal<string | null>(null);
  protected readonly disabledDate = new Date();

  protected readonly minBound = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  protected readonly maxBound = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

  protected readonly dateControl = new FormControl<Date | null>(null);

  protected readonly parseIso = (raw: unknown): Date | null => {
    if (typeof raw !== 'string' || !raw) {
      return null;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  protected readonly formatIso = (date: Date | Date[]): string => {
    const value = Array.isArray(date) ? date[0] : date;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  protected onDateModelChange(target: WritableSignal<Date | null>, value: JalaliDatePickerValue): void {
    target.set(value instanceof Date ? value : null);
  }

  protected onRangeModelChange(value: JalaliDatePickerValue): void {
    this.rangeDates.set(Array.isArray(value) && value.every((v) => v instanceof Date) ? value : null);
  }

  protected onJalaliModelChange(value: JalaliDatePickerValue): void {
    this.jalaliParts.set(isJalaliDateParts(value) ? value : null);
  }

  protected onCustomModelChange(value: JalaliDatePickerValue): void {
    this.customIso.set(typeof value === 'string' ? value : null);
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
}
