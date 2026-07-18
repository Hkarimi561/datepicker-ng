# datepicker-ng

Angular Jalali (Persian / Shamsi) datepicker built on PrimeNG.

## Install

```bash
npm install datepicker-ng
```

### Peer dependencies

Your app must provide:

```bash
npm install @angular/core @angular/common @angular/forms primeng @primeuix/styles @lucide/angular rxjs
```

Configure a PrimeNG theme (same as other PrimeNG components), for example:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
  ],
};
```

## Usage

`JalaliDatePicker` is a standalone component and implements `ControlValueAccessor`.

```ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JalaliDatePicker } from 'datepicker-ng';

@Component({
  selector: 'app-demo',
  imports: [FormsModule, JalaliDatePicker],
  template: `
    <datepicker-ng [(ngModel)]="date" placeholder="انتخاب تاریخ" />
  `,
})
export class DemoComponent {
  date: Date | null = null;
}
```

### Range selection

```html
<datepicker-ng [(ngModel)]="range" selectionMode="range" />
```

### Common inputs

| Input | Description |
| --- | --- |
| `placeholder` | Input placeholder |
| `selectionMode` | `'single'` \| `'range'` |
| `inline` | Show calendar without overlay |
| `disabled` | Disable the control |
| `editable` | Allow typing in the input |
| `minDate` / `maxDate` | Bounds (`Date`) |
| `valueFormat` | `'date'` \| `'jalali'` \| `'custom'` |
| `inputCalendar` | `'jalali'` \| `'gregorian'` for typed input |
| `displayFormat` | e.g. `'jalali-short'`, `'jalali-slash'`, `'gregorian-slash'` |
| `showClear` | Show clear icon |
| `autoCommit` | Commit selection immediately |

### Outputs

`onSelect`, `onClear`, `onInputInvalid`, `onShow`, `onHide`

## API exports

```ts
import {
  JalaliDatePicker,
  DatepickerNg, // alias of JalaliDatePicker
  JalaliDatePickerStyle,
  // calendar helpers
  toJalaliParts,
  toGregorianDate,
  parseJalaliDateString,
  formatJalaliDisplay,
} from 'datepicker-ng';
```

## Showcase

```bash
npm install
npm start
```

Opens the demo app at `http://localhost:4400`.

```bash
npm run build:showcase
```

## CI / Publish

- **CI** (`.github/workflows/ci.yml`) — on push/PR to `main`: install, test, build library, build showcase.
- **Publish** (`.github/workflows/publish.yml`) — on GitHub Release (or manual dispatch): test, build, `npm publish` with provenance.

Add a repository secret named `NPM_TOKEN` (npm automation token) before publishing.

Publish from the built package locally:

```bash
npm run publish:lib
```

## License

MIT
