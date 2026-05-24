import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BookOpen, CheckCircle2, Gamepad2, Trophy } from 'lucide-angular/src/icons';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-how-to-play-page',
  standalone: true,
  imports: [LucideAngularModule, TranslocoPipe, UserNavComponent],
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

      <main class="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section class="space-y-6">
          <div class="text-ui-kicker text-primary">{{ 'howToPlay.kicker' | transloco }}</div>
          <h1 class="font-ar-display max-w-2xl text-4xl font-black tracking-tight md:text-6xl">
            {{ 'howToPlay.title' | transloco }}
          </h1>
          <p class="font-ar-text max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {{ 'howToPlay.subtitle' | transloco }}
          </p>
          <button
            class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
            type="button"
            (click)="goPlay()"
          >
            <i-lucide [img]="GamepadIcon" [size]="17"></i-lucide>
            {{ 'howToPlay.cta' | transloco }}
          </button>
        </section>

        <section class="grid gap-4">
          @for (item of sections; track item.titleKey) {
            <article class="surface-panel rounded-xl p-5">
              <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i-lucide [img]="item.icon" [size]="20"></i-lucide>
              </div>
              <h2 class="text-xl font-black">{{ item.titleKey | transloco }}</h2>
              <p class="font-ar-text mt-2 text-sm leading-6 text-muted-foreground">{{ item.bodyKey | transloco }}</p>
            </article>
          }

          <article class="rounded-xl border border-border/70 bg-card/70 p-5">
            <h2 class="text-xl font-black">{{ 'howToPlay.tipsTitle' | transloco }}</h2>
            <ul class="mt-4 grid gap-3 text-sm text-muted-foreground">
              <li class="flex gap-3">
                <i-lucide class="mt-0.5 shrink-0 text-primary" [img]="CheckIcon" [size]="16"></i-lucide>
                <span class="font-ar-text">{{ 'howToPlay.tipsOne' | transloco }}</span>
              </li>
              <li class="flex gap-3">
                <i-lucide class="mt-0.5 shrink-0 text-primary" [img]="CheckIcon" [size]="16"></i-lucide>
                <span class="font-ar-text">{{ 'howToPlay.tipsTwo' | transloco }}</span>
              </li>
              <li class="flex gap-3">
                <i-lucide class="mt-0.5 shrink-0 text-primary" [img]="CheckIcon" [size]="16"></i-lucide>
                <span class="font-ar-text">{{ 'howToPlay.tipsThree' | transloco }}</span>
              </li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowToPlayPage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  readonly GamepadIcon = Gamepad2;
  readonly CheckIcon = CheckCircle2;

  readonly sections = [
    { icon: BookOpen, titleKey: 'howToPlay.basicsTitle', bodyKey: 'howToPlay.basics' },
    { icon: Gamepad2, titleKey: 'howToPlay.onlineTitle', bodyKey: 'howToPlay.online' },
    { icon: Trophy, titleKey: 'howToPlay.challengeTitle', bodyKey: 'howToPlay.challenge' },
  ];

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }

  goPlay(): void {
    void this.localizedRouter.navigate('/play');
  }
}
