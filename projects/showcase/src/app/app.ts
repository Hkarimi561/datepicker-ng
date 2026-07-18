import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShowcasePage } from './showcase-page';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ShowcasePage],
  template: `<app-showcase-page />`,
})
export class App {}
