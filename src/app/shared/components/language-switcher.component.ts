import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageCode } from '../../core/i18n/translations';
import { TranslocoPipe } from '../../core/i18n/transloco.pipe';
import { LocalizedRouterService } from '../../core/services/localized-router.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="inline-flex rounded-lg border border-border/60 bg-card/70 p-1" [attr.aria-label]="'nav.language' | transloco">
      <a
        class="min-h-8 inline-flex items-center rounded-md px-2.5 text-xs font-black uppercase transition-colors"
        [href]="enUrl()"
        [class.bg-primary]="i18n.lang() === 'en'"
        [class.text-primary-foreground]="i18n.lang() === 'en'"
        [class.text-muted-foreground]="i18n.lang() !== 'en'"
        [attr.aria-label]="'nav.switchToEnglish' | transloco"
        [attr.aria-pressed]="i18n.lang() === 'en'"
        (click)="switchLanguage('en', $event)"
      >
        EN
      </a>
      <a
        class="min-h-8 inline-flex items-center rounded-md px-2.5 text-xs font-black uppercase transition-colors"
        [href]="arUrl()"
        [class.bg-primary]="i18n.lang() === 'ar'"
        [class.text-primary-foreground]="i18n.lang() === 'ar'"
        [class.text-muted-foreground]="i18n.lang() !== 'ar'"
        [attr.aria-label]="'nav.switchToArabic' | transloco"
        [attr.aria-pressed]="i18n.lang() === 'ar'"
        (click)="switchLanguage('ar', $event)"
      >
        AR
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly localizedRouter = inject(LocalizedRouterService);

  enUrl(): string {
    return this.i18n.equivalentUrl('en', this.router.url);
  }

  arUrl(): string {
    return this.i18n.equivalentUrl('ar', this.router.url);
  }

  switchLanguage(lang: LanguageCode, event: MouseEvent): void {
    event.preventDefault();
    void this.localizedRouter.switchLanguage(lang);
  }
}
