import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppStore } from '../store/app.store';
import { UserNavComponent } from '../shared/components/user-nav.component';
import { GsapCountUpDirective } from '../shared/directives/gsap-count-up.directive';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [UserNavComponent, GsapCountUpDirective, TranslocoPipe],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <button class="inline-flex items-center" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-9 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-9 w-auto dark:hidden" />
          </button>
          <app-user-nav />
        </div>
      </nav>

      @if (!appStore.playerLoaded()) {
        <div class="flex min-h-[60vh] items-center justify-center font-mono text-muted-foreground">
          {{ 'profile.loading' | transloco }}
        </div>
      } @else if (player()) {
        <main class="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
          <header class="surface-panel grid gap-5 rounded-2xl p-5 md:grid-cols-[1fr_auto] md:items-end">
            <div class="flex items-center gap-4">
              <div class="flex h-16 w-16 items-center justify-center rounded-xl bg-primary font-mono text-3xl font-black uppercase text-primary-foreground">
                {{ avatarInitial() }}
              </div>
              <div class="min-w-0">
                <div class="text-ui-kicker text-primary">{{ 'profile.kicker' | transloco }}</div>
                <h1 class="mt-1 truncate text-3xl font-black tracking-tight md:text-4xl">{{ player()?.username }}</h1>
                <p class="mt-1 text-sm font-mono text-muted-foreground">{{ player()?.email || ('profile.guestProfile' | transloco) }}</p>
              </div>
            </div>
            <button class="btn-game rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90" type="button" (click)="goLobby()">
              {{ 'profile.enterLobby' | transloco }}
            </button>
          </header>

          <section class="grid grid-cols-2 gap-3 md:grid-cols-5">
            @for (stat of stats(); track stat.label) {
              <div class="surface-panel rounded-xl p-4">
                <div class="text-2xl font-black tabular-nums text-primary" [appGsapCountUp]="stat.value"></div>
                <div class="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{{ stat.label }}</div>
              </div>
            }
          </section>

          <section class="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div class="surface-panel rounded-xl p-5">
              <h2 class="text-ui-kicker text-muted-foreground">{{ 'profile.difficultyWins' | transloco }}</h2>
              <div class="mt-5 space-y-4">
                @for (item of difficultyStats(); track item.label) {
                  <div>
                    <div class="mb-1 flex justify-between text-sm font-mono">
                      <span class="capitalize">{{ item.label }}</span>
                      <span class="text-primary">{{ item.value }}{{ 'profile.winsShort' | transloco }}</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-muted">
                      <div class="animate-sr-progress h-full rounded-full bg-primary" [style.width.%]="item.percent"></div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <aside class="surface-panel space-y-3 rounded-xl p-5">
              <h2 class="text-ui-kicker text-muted-foreground">{{ 'profile.preferences' | transloco }}</h2>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">{{ 'profile.theme' | transloco }}</span>
                  <span class="font-mono text-primary">{{ themeLabel(player()?.theme) }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">{{ 'profile.sound' | transloco }}</span>
                  <span class="font-mono">{{ booleanLabel(player()?.soundEnabled) }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">{{ 'profile.animations' | transloco }}</span>
                  <span class="font-mono">{{ booleanLabel(player()?.animationsEnabled) }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">{{ 'profile.role' | transloco }}</span>
                  <span class="font-mono capitalize">{{ roleLabel(player()?.role) }}</span>
                </div>
              </div>
            </aside>
          </section>
        </main>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly i18n = inject(I18nService);
  readonly appStore = inject(AppStore);
  readonly player = this.appStore.player;
  readonly wallet = this.appStore.wallet;

  readonly avatarInitial = computed(() => (this.player()?.username[0] ?? 'P').toUpperCase());
  readonly winRate = computed(() => {
    const player = this.player();
    if (!player || player.totalGames === 0) return 0;
    return Math.round((player.totalWins / player.totalGames) * 100);
  });

  readonly stats = computed(() => {
    const player = this.player();
    return [
      { label: this.i18n.t('profile.stats.wins'), value: player?.totalWins ?? 0 },
      { label: this.i18n.t('profile.stats.matches'), value: player?.totalGames ?? 0 },
      { label: this.i18n.t('profile.stats.winRate'), value: `${this.winRate()}%` },
      { label: this.i18n.t('profile.stats.mistakes'), value: player?.totalMistakes ?? 0 },
      { label: this.i18n.t('profile.stats.coins'), value: this.wallet()?.balance ?? 0 },
    ];
  });

  readonly difficultyStats = computed(() => {
    const player = this.player();
    const values = [
      { label: this.i18n.t('lobby.difficulty.easy'), value: player?.easyWins ?? 0 },
      { label: this.i18n.t('lobby.difficulty.medium'), value: player?.mediumWins ?? 0 },
      { label: this.i18n.t('lobby.difficulty.hard'), value: player?.hardWins ?? 0 },
      { label: this.i18n.t('lobby.difficulty.expert'), value: player?.expertWins ?? 0 },
    ];
    const max = Math.max(1, ...values.map((item) => item.value));
    return values.map((item) => ({ ...item, percent: Math.round((item.value / max) * 100) }));
  });

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }

  goLobby(): void {
    void this.localizedRouter.navigate('/lobby');
  }

  booleanLabel(value: boolean | undefined): string {
    return this.i18n.t(value ? 'profile.on' : 'profile.off');
  }

  themeLabel(theme: string | undefined): string {
    if (theme === 'light' || theme === 'dark') return this.i18n.t(`settings.theme.${theme}`);
    return this.i18n.t('common.system');
  }

  roleLabel(role: string | undefined): string {
    if (!role) return this.i18n.t('common.guest');
    return this.i18n.t(`profile.roles.${role}`);
  }
}
