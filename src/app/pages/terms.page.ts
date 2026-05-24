import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [TranslocoPipe, UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-sm">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <button class="inline-flex items-center" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-9 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-9 w-auto dark:hidden" />
          </button>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <div class="text-ui-kicker text-primary">{{ 'terms.kicker' | transloco }}</div>
        <h1 class="font-ar-display mt-3 text-4xl font-black tracking-tight md:text-5xl">{{ 'terms.title' | transloco }}</h1>
        <p class="font-ar-text mt-5 text-lg leading-8 text-muted-foreground">{{ 'terms.intro' | transloco }}</p>

        <section class="mt-8 grid gap-4">
          @for (item of sections; track item.titleKey) {
            <article class="surface-panel rounded-xl p-5">
              <h2 class="text-xl font-black">{{ item.titleKey | transloco }}</h2>
              <p class="font-ar-text mt-2 text-sm leading-6 text-muted-foreground">{{ item.bodyKey | transloco }}</p>
            </article>
          }
        </section>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  readonly sections = [
    { titleKey: 'terms.playTitle', bodyKey: 'terms.play' },
    { titleKey: 'terms.accountsTitle', bodyKey: 'terms.accounts' },
    { titleKey: 'terms.availabilityTitle', bodyKey: 'terms.availability' },
  ];

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }
}
