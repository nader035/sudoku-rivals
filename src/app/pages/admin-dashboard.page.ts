import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, from, of } from 'rxjs';
import { SupabaseService } from '../core/services/supabase.service';
import {
  AdminDashboardSummary,
  AdminPlayerSummary,
  AdminRoomSummary,
} from '../core/models';

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
  template: `
    <div class="h-full border-t border-border/60 bg-background/55">
      <header class="border-b border-border/60 px-4 py-4 md:px-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-ui-kicker text-muted-foreground">Admin / Overview</div>
            <h1 class="mt-1 text-2xl font-black tracking-tight">Control Center</h1>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-game rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted/40" type="button" (click)="goAdminPurchases()">
              Review Payments
            </button>
            <button class="btn-game rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted/40" type="button" (click)="goAdminWallets()">
              Wallet Controls
            </button>
            <button class="btn-game rounded-lg bg-primary px-3 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground" type="button" (click)="refresh()">
              Sync
            </button>
          </div>
        </div>
      </header>

      @if (statusMessage()) {
        <div class="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive md:mx-6">
          {{ statusMessage() }}
        </div>
      }

      <section class="grid gap-0 xl:grid-cols-[1.45fr_1fr]">
        <div class="border-b border-border/60 px-4 py-4 md:px-6 xl:border-b-0 xl:border-r">
          <div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            @for (metric of heroMetrics(); track metric.label) {
              <article class="rounded-xl border border-border/60 bg-card/75 p-4">
                <div class="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{{ metric.label }}</div>
                <div class="mt-2 text-3xl font-black tabular-nums">{{ metric.value }}</div>
                <div class="mt-1 text-xs font-mono" [class.text-primary]="metric.trend >= 0" [class.text-destructive]="metric.trend < 0">
                  {{ metric.trend >= 0 ? '+' : '' }}{{ metric.trend }}%
                </div>
              </article>
            }
          </div>

          <div class="mt-4 grid gap-4 2xl:grid-cols-[1.1fr_1fr]">
            <section class="rounded-xl border border-border/60 bg-card/72 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-base font-bold">Room Pulse</h2>
                <span class="text-xs font-mono uppercase text-muted-foreground">Today</span>
              </div>
              <div class="grid gap-3 sm:grid-cols-3">
                @for (pulse of pulseCards(); track pulse.label) {
                  <div class="rounded-lg border border-border/60 bg-background/65 p-3">
                    <div class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ pulse.label }}</div>
                    <div class="mt-2 text-2xl font-black tabular-nums">{{ pulse.value }}</div>
                    <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div class="h-full rounded-full bg-primary" [style.width.%]="pulse.progress"></div>
                    </div>
                  </div>
                }
              </div>
            </section>

            <section class="rounded-xl border border-border/60 bg-card/72 p-4">
              <h2 class="text-base font-bold">Broadcast</h2>
              <label class="mt-3 block">
                <span class="text-xs font-mono uppercase text-muted-foreground">Title</span>
                <input class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="broadcastTitle()" (input)="broadcastTitle.set($any($event.target).value)" placeholder="Announcement title" />
              </label>
              <label class="mt-3 block">
                <span class="text-xs font-mono uppercase text-muted-foreground">Message</span>
                <textarea class="mt-1 min-h-24 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="broadcastMessage()" (input)="broadcastMessage.set($any($event.target).value)" placeholder="Broadcast message"></textarea>
              </label>
              <label class="mt-3 block">
                <span class="text-xs font-mono uppercase text-muted-foreground">Reason</span>
                <input class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="broadcastReason()" (input)="broadcastReason.set($any($event.target).value)" placeholder="Internal note" />
              </label>
              <button class="btn-game mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" type="button" [disabled]="busy()" (click)="sendBroadcast()">
                Send Broadcast
              </button>
            </section>
          </div>

          <div class="mt-4 grid gap-4 2xl:grid-cols-2">
            <section class="rounded-xl border border-border/60 bg-card/72 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-base font-bold">Recent Rooms</h2>
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ rooms().length }}</span>
              </div>
              @if (rooms().length === 0) {
                <div class="rounded-lg border border-dashed border-border/55 bg-background/65 p-5 text-center text-sm text-muted-foreground">
                  No room activity yet.
                </div>
              } @else {
                <div class="space-y-2">
                  @for (room of rooms().slice(0, 6); track room.id) {
                    <article class="grid gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <button class="min-w-0 text-left" type="button" (click)="goRoom(room.id)">
                        <div class="truncate text-sm font-semibold">{{ room.name }}</div>
                        <div class="truncate text-xs font-mono text-muted-foreground">
                          host {{ room.hostUsername }} / {{ room.playerCount }}/{{ room.maxPlayers }}
                        </div>
                      </button>
                      <span class="text-xs font-mono uppercase text-primary">{{ room.difficulty }}</span>
                      <button class="btn-game rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold uppercase text-destructive hover:bg-destructive/20" type="button" [disabled]="busy()" (click)="deleteRoom(room.id, room.name)">
                        Remove
                      </button>
                    </article>
                  }
                </div>
              }
            </section>

            <section class="rounded-xl border border-border/60 bg-card/72 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-base font-bold">Players</h2>
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ players().length }}</span>
              </div>
              @if (players().length === 0) {
                <div class="rounded-lg border border-dashed border-border/55 bg-background/65 p-5 text-center text-sm text-muted-foreground">
                  No players found.
                </div>
              } @else {
                <div class="space-y-2">
                  @for (player of players().slice(0, 6); track player.id) {
                    <article class="grid gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <div class="min-w-0">
                        <div class="truncate text-sm font-semibold">{{ player.username }}</div>
                        <div class="truncate text-xs font-mono text-muted-foreground">{{ player.totalWins }}W / {{ player.totalGames }}G</div>
                      </div>
                      <span class="text-xs font-mono uppercase" [class.text-destructive]="player.isBanned" [class.text-primary]="!player.isBanned">{{ player.isBanned ? 'banned' : player.role }}</span>
                      <button class="btn-game rounded-md border border-border/60 bg-card/70 px-2 py-1 text-[11px] font-semibold uppercase hover:bg-muted/40" [class.text-destructive]="!player.isBanned" [class.text-primary]="player.isBanned" type="button" [disabled]="busy()" (click)="setPlayerBan(player)">
                        {{ player.isBanned ? 'Unban' : 'Ban' }}
                      </button>
                    </article>
                  }
                </div>
              }
            </section>
          </div>
        </div>

        <aside class="px-4 py-4 md:px-6">
          <section class="rounded-xl border border-border/60 bg-card/72 p-4">
            <h2 class="text-base font-bold">Notifications</h2>
            <div class="mt-3 space-y-2">
              @for (notice of notices(); track notice.title) {
                <article class="rounded-lg border border-border/60 bg-background/65 p-3">
                  <div class="text-sm font-semibold">{{ notice.title }}</div>
                  <div class="mt-1 text-xs text-muted-foreground">{{ notice.detail }}</div>
                </article>
              }
            </div>
          </section>

          <section class="mt-4 rounded-xl border border-border/60 bg-card/72 p-4">
            <h3 class="text-base font-bold">Activity</h3>
            <div class="mt-2 space-y-2">
              @for (event of activityFeed(); track event) {
                <div class="rounded-lg border border-border/60 bg-background/65 px-3 py-2 text-sm text-muted-foreground">{{ event }}</div>
              }
            </div>
          </section>
        </aside>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly supabase = inject(SupabaseService);
  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly broadcastTitle = signal('');
  readonly broadcastMessage = signal('');
  readonly broadcastReason = signal('');

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

  readonly heroMetrics = computed(() => {
    const s = this.summary();
    return [
      { label: 'Total Players', value: s.totalPlayers, trend: 12 },
      { label: 'Active Today', value: s.activePlayers, trend: 8 },
      { label: 'Matches Today', value: s.matchesToday, trend: 14 },
      { label: 'Banned Players', value: s.bannedPlayers, trend: s.bannedPlayers > 0 ? -4 : 0 },
    ];
  });

  readonly pulseCards = computed(() => {
    const s = this.summary();
    const totalRooms = Math.max(1, s.waitingRooms + s.activeRooms + s.finishedRooms + s.cancelledRooms);
    return [
      { label: 'Waiting Rooms', value: s.waitingRooms, progress: Math.min(100, Math.round((s.waitingRooms / totalRooms) * 100)) },
      { label: 'Active Rooms', value: s.activeRooms, progress: Math.min(100, Math.round((s.activeRooms / totalRooms) * 100)) },
      { label: 'Completed Rooms', value: s.finishedRooms, progress: Math.min(100, Math.round((s.finishedRooms / totalRooms) * 100)) },
    ];
  });

  readonly notices = computed(() => {
    const s = this.summary();
    return [
      { title: `${s.activePlayers} active users online`, detail: 'Live now' },
      { title: `${s.waitingRooms} rooms waiting for players`, detail: 'Lobby state' },
      { title: `${s.cancelledRooms} cancelled rooms today`, detail: 'Needs review' },
      { title: `${s.bannedPlayers} banned accounts`, detail: 'Security status' },
    ];
  });

  activityFeed(): string[] {
    const playerEvents = this.players()
      .slice(0, 3)
      .map((player) => `${player.username} has ${player.totalWins} wins and ${player.totalGames} matches`);
    const roomEvents = this.rooms()
      .slice(0, 3)
      .map((room) => `Room "${room.name}" is ${room.status} with ${room.playerCount}/${room.maxPlayers} players`);
    const events = [...playerEvents, ...roomEvents];
    return events.length > 0 ? events : ['No recent activity yet.'];
  }

  refresh(): void {
    globalThis.location.reload();
  }

  goRoom(roomId: string): void {
    void this.router.navigate(['/room', roomId]);
  }

  goAdminPurchases(): void {
    void this.router.navigateByUrl('/admin/purchases');
  }

  goAdminWallets(): void {
    void this.router.navigateByUrl('/admin/wallets');
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

  async sendBroadcast(): Promise<void> {
    const title = this.broadcastTitle().trim();
    const message = this.broadcastMessage().trim();
    const reason = this.broadcastReason().trim();

    if (title.length < 3) {
      this.statusMessage.set('Broadcast title must be at least 3 characters.');
      return;
    }
    if (message.length < 5) {
      this.statusMessage.set('Broadcast message must be at least 5 characters.');
      return;
    }

    if (!globalThis.confirm('Send this broadcast to all active users?')) return;

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      const sent = await this.supabase.adminBroadcastNotification(title, message, reason || undefined);
      this.statusMessage.set(`Broadcast sent to ${sent} users.`);
      this.broadcastTitle.set('');
      this.broadcastMessage.set('');
      this.broadcastReason.set('');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to send broadcast');
    } finally {
      this.busy.set(false);
    }
  }
}
