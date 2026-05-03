import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../store/app.store';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <button
            class="font-black italic uppercase tracking-tight text-primary"
            type="button"
            (click)="goHome()"
          >
            SUDOKU RIVAL
          </button>
          <app-user-nav />
        </div>
      </nav>

      @if (!appStore.playerLoaded()) {
        <div class="flex min-h-[60vh] items-center justify-center font-mono text-muted-foreground">
          Loading profile...
        </div>
      } @else if (player()) {
        <main class="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
          <header class="grid gap-5 rounded-md border border-border/60 bg-card/50 p-5 md:grid-cols-[1fr_auto] md:items-end">
            <div class="flex items-center gap-4">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-md bg-primary font-mono text-3xl font-black uppercase text-primary-foreground"
              >
                {{ avatarInitial() }}
              </div>
              <div class="min-w-0">
                <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Player profile</div>
                <h1 class="mt-1 truncate text-3xl font-black tracking-tight md:text-4xl">
                  {{ player()?.username }}
                </h1>
                <p class="mt-1 text-sm font-mono text-muted-foreground">
                  {{ player()?.email || 'Guest profile' }}
                </p>
              </div>
            </div>
            <button
              class="rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              type="button"
              (click)="goLobby()"
            >
              Enter lobby
            </button>
          </header>

          <section class="grid grid-cols-2 gap-3 md:grid-cols-4">
            @for (stat of stats(); track stat.label) {
              <div class="rounded-md border border-border/60 bg-card/40 p-4">
                <div class="text-2xl font-black tabular-nums text-primary">{{ stat.value }}</div>
                <div class="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {{ stat.label }}
                </div>
              </div>
            }
          </section>

          <section class="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div class="rounded-md border border-border/60 bg-card/40 p-5">
              <h2 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Difficulty wins
              </h2>
              <div class="mt-5 space-y-4">
                @for (item of difficultyStats(); track item.label) {
                  <div>
                    <div class="mb-1 flex justify-between text-sm font-mono">
                      <span class="capitalize">{{ item.label }}</span>
                      <span class="text-primary">{{ item.value }}W</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-muted">
                      <div class="h-full rounded-full bg-primary" [style.width.%]="item.percent"></div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <aside class="space-y-3 rounded-md border border-border/60 bg-card/40 p-5">
              <h2 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Preferences
              </h2>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">Theme</span>
                  <span class="font-mono text-primary">{{ player()?.theme }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">Sound</span>
                  <span class="font-mono">{{ player()?.soundEnabled ? 'On' : 'Off' }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">Animations</span>
                  <span class="font-mono">{{ player()?.animationsEnabled ? 'On' : 'Off' }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-muted-foreground">Role</span>
                  <span class="font-mono capitalize">{{ player()?.role }}</span>
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
  private readonly router = inject(Router);
  readonly appStore = inject(AppStore);
  readonly player = this.appStore.player;

  readonly avatarInitial = computed(() => (this.player()?.username[0] ?? 'P').toUpperCase());
  readonly winRate = computed(() => {
    const player = this.player();
    if (!player || player.totalGames === 0) return 0;
    return Math.round((player.totalWins / player.totalGames) * 100);
  });

  readonly stats = computed(() => {
    const player = this.player();
    return [
      { label: 'Wins', value: player?.totalWins ?? 0 },
      { label: 'Matches', value: player?.totalGames ?? 0 },
      { label: 'Win rate', value: `${this.winRate()}%` },
      { label: 'Mistakes', value: player?.totalMistakes ?? 0 },
    ];
  });

  readonly difficultyStats = computed(() => {
    const player = this.player();
    const values = [
      { label: 'easy', value: player?.easyWins ?? 0 },
      { label: 'medium', value: player?.mediumWins ?? 0 },
      { label: 'hard', value: player?.hardWins ?? 0 },
      { label: 'expert', value: player?.expertWins ?? 0 },
    ];
    const max = Math.max(1, ...values.map((item) => item.value));
    return values.map((item) => ({ ...item, percent: Math.round((item.value / max) * 100) }));
  });

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goLobby(): void {
    void this.router.navigateByUrl('/lobby');
  }
}
