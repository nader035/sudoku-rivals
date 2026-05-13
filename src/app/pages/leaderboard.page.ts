import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SupabaseService } from '../core/services/supabase.service';
import { EconomyLeaderboardEntry, LeaderboardSort, RecentMatch, StatsSummary } from '../core/models';
import { UserNavComponent } from '../shared/components/user-nav.component';

const EMPTY_STATS: StatsSummary = {
  activeRooms: 0,
  playersOnline: 0,
  matchesToday: 0,
  totalMatches: 0,
};

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  template: `
    <div class="min-h-screen w-full bg-background text-foreground">
      <nav class="border-b border-border/60 bg-background/80 backdrop-blur">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button class="inline-flex items-center" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-9 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-9 w-auto dark:hidden" />
          </button>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <header class="space-y-3">
          <div class="text-ui-kicker text-primary">Global Ranking</div>
          <h1 class="text-4xl font-black uppercase tracking-tight text-primary sm:text-5xl">Leaderboard</h1>
          <p class="font-mono text-sm text-muted-foreground">Rank players by wins, win rate, or coin performance.</p>
        </header>

        @if (stats()) {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div class="surface-panel rounded-xl p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">{{ stats().activeRooms }}</div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Active Rooms</div>
            </div>
            <div class="surface-panel rounded-xl p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">{{ stats().playersOnline }}</div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Players Online</div>
            </div>
            <div class="surface-panel rounded-xl p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">{{ stats().matchesToday }}</div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Matches Today</div>
            </div>
            <div class="surface-panel rounded-xl p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">{{ stats().totalMatches }}</div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Total Matches</div>
            </div>
          </div>
        }

        <section class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-xl font-bold uppercase tracking-tight">Top Players</h2>
            <div class="flex flex-wrap gap-2">
              @for (item of sortOptions; track item.value) {
                <button
                  class="btn-game rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                  [class.border-primary]="sortBy() === item.value"
                  [class.bg-primary/15]="sortBy() === item.value"
                  [class.text-primary]="sortBy() === item.value"
                  [class.border-border]="sortBy() !== item.value"
                  [class.bg-card/70]="sortBy() !== item.value"
                  type="button"
                  (click)="changeSort(item.value)"
                >
                  {{ item.label }}
                </button>
              }
            </div>
          </div>
          <div class="surface-panel overflow-hidden rounded-xl">
            @if (leaderboard().length === 0) {
              <div class="p-6 font-mono text-sm text-muted-foreground">No players ranked yet.</div>
            } @else {
              <ul class="divide-y divide-border/60">
                @for (entry of leaderboard(); track entry.playerId; let index = $index) {
                  <li class="flex items-center justify-between px-5 py-4">
                    <div class="flex items-center gap-4">
                      <div class="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/30 font-mono font-bold" [class.text-primary]="index === 0" [class.text-muted-foreground]="index > 0">
                        {{ index + 1 }}
                      </div>
                      <div class="space-y-0.5">
                        <div class="font-bold">{{ entry.username }}</div>
                        <div class="text-xs font-mono text-muted-foreground">
                          {{ entry.wins + entry.losses }} {{ entry.wins + entry.losses === 1 ? 'match' : 'matches' }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-base font-black tabular-nums text-primary">{{ entry.currentCoins }} coins</div>
                      <div class="text-xs font-mono text-muted-foreground">{{ entry.wins }}W / {{ entry.losses }}L / {{ entry.winRate }}%</div>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </section>

        @if (recent().length > 0) {
          <section class="space-y-3">
            <h2 class="text-xl font-bold uppercase tracking-tight">Recent Matches</h2>
            <div class="surface-panel overflow-hidden rounded-xl">
              <ul class="divide-y divide-border/60">
                @for (match of recent().slice(0, 8); track match.roomId) {
                  <li class="flex items-center justify-between px-5 py-3 text-sm font-mono">
                    <div>
                      <span class="font-bold text-primary">{{ match.winnerUsername }}</span>
                      <span class="text-muted-foreground"> won </span>
                      <span>{{ match.roomName }}</span>
                    </div>
                    <div class="text-xs uppercase tracking-widest text-muted-foreground">{{ match.difficulty }}</div>
                  </li>
                }
              </ul>
            </div>
          </section>
        }

        <div class="flex justify-center pt-2">
          <button class="btn-game rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90" type="button" (click)="goLobby()">
            Go to Lobby
          </button>
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserNavComponent],
})
export class LeaderboardPage {
  private readonly router = inject(Router);
  readonly supabase = inject(SupabaseService);
  readonly sortBy = signal<LeaderboardSort>('wins');
  readonly leaderboard = signal<EconomyLeaderboardEntry[]>([]);
  readonly sortOptions: Array<{ label: string; value: LeaderboardSort }> = [
    { label: 'Wins', value: 'wins' },
    { label: 'Win Rate', value: 'win_rate' },
    { label: 'Coins', value: 'coins' },
    { label: 'Coins Won', value: 'coins_won' },
  ];

  readonly stats = signal<StatsSummary>(EMPTY_STATS);
  readonly recent = signal<RecentMatch[]>([]);

  constructor() {
    void this.loadLeaderboard();
    this.supabase
      .observeStatsSummary()
      .pipe(catchError(() => of(EMPTY_STATS)))
      .subscribe((value) => this.stats.set(value));
    this.supabase
      .observeRecentMatches()
      .pipe(catchError(() => of([] as RecentMatch[])))
      .subscribe((value) => this.recent.set(value));
  }

  async loadLeaderboard(): Promise<void> {
    const data = await this.supabase.getEconomyLeaderboard(this.sortBy(), 50, 0);
    this.leaderboard.set(data);
  }

  async changeSort(next: LeaderboardSort): Promise<void> {
    if (this.sortBy() === next) return;
    this.sortBy.set(next);
    await this.loadLeaderboard();
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goLobby(): void {
    void this.router.navigateByUrl('/lobby');
  }
}
