import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, from, of } from 'rxjs';
import { SupabaseService } from '../core/services/supabase.service';
import {
  AdminDashboardSummary,
  AdminPlayerSummary,
  AdminRoomSummary,
} from '../core/models';
import { UserNavComponent } from '../shared/components/user-nav.component';

const EMPTY_SUMMARY: AdminDashboardSummary = {
  totalPlayers: 0,
  activePlayers: 0,
  bannedPlayers: 0,
  waitingRooms: 0,
  activeRooms: 0,
  finishedRooms: 0,
  cancelledRooms: 0,
  matchesToday: 0,
};

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
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

      <main class="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
        <header class="flex flex-col justify-between gap-3 border-b border-border/60 pb-5 md:flex-row md:items-end">
          <div>
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Admin</div>
            <h1 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Dashboard</h1>
          </div>
          <button
            class="w-fit rounded-md border border-border/60 px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-muted/40"
            type="button"
            (click)="refresh()"
          >
            Refresh
          </button>
        </header>

        @if (statusMessage()) {
          <div class="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {{ statusMessage() }}
          </div>
        }

        <section class="grid grid-cols-2 gap-3 md:grid-cols-4">
          @for (metric of metrics(); track metric.label) {
            <div class="border-b border-border/60 py-3">
              <div class="text-2xl font-black tabular-nums text-primary">{{ metric.value }}</div>
              <div class="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {{ metric.label }}
              </div>
            </div>
          }
        </section>

        <section class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div class="space-y-3">
            <h2 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
              Recent rooms
            </h2>
            <div class="overflow-hidden rounded-md border border-border/60">
              @if (rooms().length === 0) {
                <div class="p-5 text-sm font-mono text-muted-foreground">No rooms found.</div>
              } @else {
                <div class="divide-y divide-border/60">
                  @for (room of rooms(); track room.id) {
                    <div
                      class="grid gap-3 px-4 py-3 hover:bg-muted/30 md:grid-cols-[1fr_100px_100px_140px] md:items-center"
                    >
                      <button class="min-w-0 text-left" type="button" (click)="goRoom(room.id)">
                        <span class="block truncate font-bold">{{ room.name }}</span>
                        <span class="mt-1 block truncate text-xs font-mono text-muted-foreground">
                          host {{ room.hostUsername }} · {{ room.playerCount }}/{{ room.maxPlayers }} players
                        </span>
                      </button>
                      <span class="text-xs font-mono uppercase text-primary">{{ room.difficulty }}</span>
                      <span
                        class="text-xs font-mono uppercase"
                        [class.text-primary]="room.status === 'waiting'"
                        [class.text-yellow-400]="room.status === 'playing'"
                        [class.text-muted-foreground]="room.status === 'finished'"
                        [class.text-destructive]="room.status === 'cancelled'"
                      >
                        {{ room.status }}
                      </span>
                      <button
                        class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider text-destructive hover:border-destructive/60 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        [disabled]="busy()"
                        (click)="deleteRoom(room.id, room.name)"
                      >
                        Remove
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
              Players
            </h2>
            <div class="overflow-hidden rounded-md border border-border/60">
              @if (players().length === 0) {
                <div class="p-5 text-sm font-mono text-muted-foreground">No players found.</div>
              } @else {
                <div class="divide-y divide-border/60">
                  @for (player of players(); track player.id) {
                    <div class="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto_96px] md:items-center">
                      <div class="min-w-0">
                        <div class="truncate font-bold">{{ player.username }}</div>
                        <div class="truncate text-xs font-mono text-muted-foreground">
                          {{ player.email || 'guest' }}
                        </div>
                      </div>
                      <div class="text-left text-xs font-mono md:text-right">
                        <div
                          class="uppercase"
                          [class.text-primary]="!player.isBanned"
                          [class.text-destructive]="player.isBanned"
                        >
                          {{ player.isBanned ? 'banned' : player.role }}
                        </div>
                        <div class="text-muted-foreground">{{ player.totalWins }}W / {{ player.totalGames }}G</div>
                      </div>
                      <button
                        class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
                        [class.text-destructive]="!player.isBanned"
                        [class.text-primary]="player.isBanned"
                        type="button"
                        [disabled]="busy()"
                        (click)="setPlayerBan(player)"
                      >
                        {{ player.isBanned ? 'Unban' : 'Ban' }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly supabase = inject(SupabaseService);
  private readonly refreshKey = { value: 0 };
  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);

  readonly summary = toSignal(
    from(this.supabase.getAdminDashboardSummary()).pipe(catchError(() => of(EMPTY_SUMMARY))),
    { initialValue: EMPTY_SUMMARY, injector: this.injector },
  );

  readonly rooms = toSignal(
    from(this.supabase.getAdminRooms()).pipe(catchError(() => of([] as AdminRoomSummary[]))),
    { initialValue: [] as AdminRoomSummary[], injector: this.injector },
  );

  readonly players = toSignal(
    from(this.supabase.getAdminPlayers()).pipe(catchError(() => of([] as AdminPlayerSummary[]))),
    { initialValue: [] as AdminPlayerSummary[], injector: this.injector },
  );

  metrics() {
    const summary = this.summary();
    return [
      { label: 'Players', value: summary.totalPlayers },
      { label: 'Online', value: summary.activePlayers },
      { label: 'Waiting rooms', value: summary.waitingRooms },
      { label: 'Active rooms', value: summary.activeRooms },
      { label: 'Finished', value: summary.finishedRooms },
      { label: 'Cancelled', value: summary.cancelledRooms },
      { label: 'Today', value: summary.matchesToday },
      { label: 'Banned', value: summary.bannedPlayers },
    ];
  }

  refresh(): void {
    this.refreshKey.value += 1;
    globalThis.location.reload();
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goRoom(roomId: string): void {
    void this.router.navigate(['/room', roomId]);
  }

  async deleteRoom(roomId: string, roomName: string): Promise<void> {
    if (!globalThis.confirm(`Remove room "${roomName}"? This cannot be undone.`)) return;

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminDeleteRoom(roomId);
      globalThis.location.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to remove room');
    } finally {
      this.busy.set(false);
    }
  }

  async setPlayerBan(player: AdminPlayerSummary): Promise<void> {
    const nextBanned = !player.isBanned;
    const action = nextBanned ? 'ban' : 'unban';
    if (!globalThis.confirm(`Are you sure you want to ${action} ${player.username}?`)) return;

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminSetPlayerBan(
        player.id,
        nextBanned,
        nextBanned ? 'Admin action' : undefined,
      );
      globalThis.location.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : `Unable to ${action} player`);
    } finally {
      this.busy.set(false);
    }
  }
}
