import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
      <button
        class="min-h-8 rounded-md px-2.5 text-xs font-black uppercase transition-colors"
        type="button"
        [class.bg-primary]="i18n.lang() === 'en'"
        [class.text-primary-foreground]="i18n.lang() === 'en'"
        [class.text-muted-foreground]="i18n.lang() !== 'en'"
        [attr.aria-label]="'nav.switchToEnglish' | transloco"
        [attr.aria-pressed]="i18n.lang() === 'en'"
        (click)="switchLanguage('en')"
      >
        EN
      </button>
      <button
        class="min-h-8 rounded-md px-2.5 text-xs font-black uppercase transition-colors"
        type="button"
        [class.bg-primary]="i18n.lang() === 'ar'"
        [class.text-primary-foreground]="i18n.lang() === 'ar'"
        [class.text-muted-foreground]="i18n.lang() !== 'ar'"
        [attr.aria-label]="'nav.switchToArabic' | transloco"
        [attr.aria-pressed]="i18n.lang() === 'ar'"
        (click)="switchLanguage('ar')"
      >
        AR
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  private readonly localizedRouter = inject(LocalizedRouterService);

  switchLanguage(lang: LanguageCode): void {
    void this.localizedRouter.switchLanguage(lang);
  }
}
