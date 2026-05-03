import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { SupabaseService } from '../core/services/supabase.service';
import { LeaderboardEntry, RecentMatch, StatsSummary } from '../core/models';

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
      <nav class="border-b border-border/60 bg-background/60 backdrop-blur">
        <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            class="text-lg font-black uppercase italic tracking-tight text-primary hover:opacity-90"
            type="button"
            (click)="goHome()"
          >
            Sudoku Rival
          </button>
          <button
            class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/40"
            type="button"
            (click)="goHome()"
          >
            Home
          </button>
        </div>
      </nav>

      <main class="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <header class="space-y-3">
          <h1 class="text-4xl font-black uppercase italic tracking-tight text-primary sm:text-5xl">
            Leaderboard
          </h1>
          <p class="font-mono text-sm text-muted-foreground">Top players ranked by total wins.</p>
        </header>

        @if (stats()) {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div class="rounded-md border border-border/60 bg-card/70 p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">
                {{ stats().activeRooms }}
              </div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Active Rooms
              </div>
            </div>
            <div class="rounded-md border border-border/60 bg-card/70 p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">
                {{ stats().playersOnline }}
              </div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Players Online
              </div>
            </div>
            <div class="rounded-md border border-border/60 bg-card/70 p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">
                {{ stats().matchesToday }}
              </div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Matches Today
              </div>
            </div>
            <div class="rounded-md border border-border/60 bg-card/70 p-4">
              <div class="mt-1 text-2xl font-black tabular-nums text-primary">
                {{ stats().totalMatches }}
              </div>
              <div class="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Total Matches
              </div>
            </div>
          </div>
        }

        <section class="space-y-3">
          <h2 class="text-xl font-bold uppercase tracking-tight">Top Players</h2>
          <div class="overflow-hidden rounded-md border border-border/60 bg-card/70">
            @if (leaderboard().length === 0) {
              <div class="p-6 font-mono text-sm text-muted-foreground">
                No players ranked yet. Be the first to win a match.
              </div>
            } @else {
              <ul class="divide-y divide-border/60">
                @for (entry of leaderboard(); track entry.playerId; let index = $index) {
                  <li class="flex items-center justify-between px-5 py-4">
                    <div class="flex items-center gap-4">
                      <div
                        class="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-muted/40 font-mono font-bold"
                        [class.text-primary]="index === 0"
                        [class.text-muted-foreground]="index > 0"
                      >
                        {{ index + 1 }}
                      </div>
                      <div class="space-y-0.5">
                        <div class="font-bold">{{ entry.username }}</div>
                        <div class="text-xs font-mono text-muted-foreground">
                          {{ entry.gamesPlayed }}
                          {{ entry.gamesPlayed === 1 ? 'match' : 'matches' }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-black tabular-nums text-primary">
                        {{ entry.wins }}
                      </div>
                      <div class="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Wins
                      </div>
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
            <div class="overflow-hidden rounded-md border border-border/60 bg-card/70">
              <ul class="divide-y divide-border/60">
                @for (match of recent().slice(0, 8); track match.roomId) {
                  <li class="flex items-center justify-between px-5 py-3 text-sm font-mono">
                    <div>
                      <span class="font-bold text-primary">{{ match.winnerUsername }}</span>
                      <span class="text-muted-foreground"> won </span>
                      <span>{{ match.roomName }}</span>
                    </div>
                    <div class="text-xs uppercase tracking-widest text-muted-foreground">
                      {{ match.difficulty }}
                    </div>
                  </li>
                }
              </ul>
            </div>
          </section>
        }

        <div class="flex justify-center pt-2">
          <button
            class="rounded-md bg-primary px-5 py-3 text-sm font-bold hover:bg-primary/90"
            type="button"
            (click)="goLobby()"
          >
            Go to Lobby
          </button>
        </div>
      </main>

      <footer class="border-t border-border/60">
        <div
          class="mx-auto max-w-6xl px-4 py-6 text-center text-xs font-mono text-muted-foreground sm:px-6"
        >
          Made by <span class="font-bold text-primary">Nader Mohamed</span>
        </div>
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class LeaderboardPage {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  readonly supabase = inject(SupabaseService);

  readonly leaderboard = toSignal(
    this.supabase.observeLeaderboard().pipe(catchError(() => of([] as LeaderboardEntry[]))),
    { initialValue: [] as LeaderboardEntry[], injector: this.injector },
  );

  readonly stats = toSignal(
    this.supabase.observeStatsSummary().pipe(catchError(() => of(EMPTY_STATS))),
    { initialValue: EMPTY_STATS, injector: this.injector },
  );

  readonly recent = toSignal(
    this.supabase.observeRecentMatches().pipe(catchError(() => of([] as RecentMatch[]))),
    { initialValue: [] as RecentMatch[], injector: this.injector },
  );

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goLobby(): void {
    void this.router.navigateByUrl('/lobby');
  }
}
