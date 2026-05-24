import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, from, of } from 'rxjs';
import { SupabaseService } from '../core/services/supabase.service';
import {
  AdminDashboardSummary,
  AdminPlayerSummary,
  AdminRoomSummary,
} from '../core/models';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

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
  imports: [TranslocoPipe],
  template: `
    <div class="h-full border-t border-border/60 bg-background/55">
      <header class="border-b border-border/60 px-4 py-4 md:px-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-ui-kicker text-muted-foreground">{{ 'admin.dashboard.kicker' | transloco }}</div>
            <h1 class="mt-1 text-2xl font-black tracking-tight">{{ 'admin.dashboard.title' | transloco }}</h1>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-game rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted/40" type="button" (click)="goAdminPurchases()">
              {{ 'admin.dashboard.reviewPayments' | transloco }}
            </button>
            <button class="btn-game rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted/40" type="button" (click)="goAdminWallets()">
              {{ 'admin.dashboard.walletControls' | transloco }}
            </button>
            <button class="btn-game rounded-lg bg-primary px-3 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground" type="button" (click)="refresh()">
              {{ 'admin.dashboard.sync' | transloco }}
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
                <h2 class="text-base font-bold">{{ 'admin.dashboard.roomPulse' | transloco }}</h2>
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.dashboard.today' | transloco }}</span>
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
              <h2 class="text-base font-bold">{{ 'admin.dashboard.broadcast' | transloco }}</h2>
              <label class="mt-3 block">
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.dashboard.broadcastTitle' | transloco }}</span>
                <input class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="broadcastTitle()" (input)="broadcastTitle.set($any($event.target).value)" [placeholder]="'admin.dashboard.announcementTitle' | transloco" />
              </label>
              <label class="mt-3 block">
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.dashboard.broadcastMessage' | transloco }}</span>
                <textarea class="mt-1 min-h-24 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="broadcastMessage()" (input)="broadcastMessage.set($any($event.target).value)" [placeholder]="'admin.dashboard.broadcastMessagePlaceholder' | transloco"></textarea>
              </label>
              <label class="mt-3 block">
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.dashboard.reason' | transloco }}</span>
                <input class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="broadcastReason()" (input)="broadcastReason.set($any($event.target).value)" [placeholder]="'admin.dashboard.internalNote' | transloco" />
              </label>
              <button class="btn-game mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" type="button" [disabled]="busy()" (click)="sendBroadcast()">
                {{ 'admin.dashboard.sendBroadcast' | transloco }}
              </button>
            </section>
          </div>

          <div class="mt-4 grid gap-4 2xl:grid-cols-2">
            <section class="rounded-xl border border-border/60 bg-card/72 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-base font-bold">{{ 'admin.dashboard.recentRooms' | transloco }}</h2>
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ rooms().length }}</span>
              </div>
              @if (rooms().length === 0) {
                <div class="rounded-lg border border-dashed border-border/55 bg-background/65 p-5 text-center text-sm text-muted-foreground">
                  {{ 'admin.dashboard.noRoomActivity' | transloco }}
                </div>
              } @else {
                <div class="space-y-2">
                  @for (room of rooms().slice(0, 6); track room.id) {
                    <article class="grid gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <button class="min-w-0 text-left" type="button" (click)="goRoom(room.id)">
                        <div class="truncate text-sm font-semibold">{{ room.name }}</div>
                        <div class="truncate text-xs font-mono text-muted-foreground">
                          {{ 'admin.dashboard.host' | transloco }} {{ room.hostUsername }} / {{ room.playerCount }}/{{ room.maxPlayers }}
                        </div>
                      </button>
                      <span class="text-xs font-mono uppercase text-primary">{{ room.difficulty }}</span>
                      <button class="btn-game rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold uppercase text-destructive hover:bg-destructive/20" type="button" [disabled]="busy()" (click)="deleteRoom(room.id, room.name)">
                        {{ 'admin.dashboard.remove' | transloco }}
                      </button>
                    </article>
                  }
                </div>
              }
            </section>

            <section class="rounded-xl border border-border/60 bg-card/72 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-base font-bold">{{ 'admin.dashboard.players' | transloco }}</h2>
                <span class="text-xs font-mono uppercase text-muted-foreground">{{ players().length }}</span>
              </div>
              @if (players().length === 0) {
                <div class="rounded-lg border border-dashed border-border/55 bg-background/65 p-5 text-center text-sm text-muted-foreground">
                  {{ 'admin.dashboard.noPlayers' | transloco }}
                </div>
              } @else {
                <div class="space-y-2">
                  @for (player of players().slice(0, 6); track player.id) {
                    <article class="grid gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <div class="min-w-0">
                        <div class="truncate text-sm font-semibold">{{ player.username }}</div>
                        <div class="truncate text-xs font-mono text-muted-foreground">{{ player.totalWins }}W / {{ player.totalGames }}G</div>
                      </div>
                       <span class="text-xs font-mono uppercase" [class.text-destructive]="player.isBanned" [class.text-primary]="!player.isBanned">{{ player.isBanned ? ('admin.dashboard.banned' | transloco) : player.role }}</span>
                      <button class="btn-game rounded-md border border-border/60 bg-card/70 px-2 py-1 text-[11px] font-semibold uppercase hover:bg-muted/40" [class.text-destructive]="!player.isBanned" [class.text-primary]="player.isBanned" type="button" [disabled]="busy()" (click)="setPlayerBan(player)">
                        {{ player.isBanned ? ('admin.dashboard.unban' | transloco) : ('admin.dashboard.ban' | transloco) }}
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
            <h2 class="text-base font-bold">{{ 'common.notifications' | transloco }}</h2>
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
            <h3 class="text-base font-bold">{{ 'admin.dashboard.activity' | transloco }}</h3>
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
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly i18n = inject(I18nService);
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
      { label: this.i18n.t('admin.dashboard.metrics.totalPlayers'), value: s.totalPlayers, trend: 12 },
      { label: this.i18n.t('admin.dashboard.metrics.activeToday'), value: s.activePlayers, trend: 8 },
      { label: this.i18n.t('admin.dashboard.metrics.matchesToday'), value: s.matchesToday, trend: 14 },
      { label: this.i18n.t('admin.dashboard.metrics.bannedPlayers'), value: s.bannedPlayers, trend: s.bannedPlayers > 0 ? -4 : 0 },
    ];
  });

  readonly pulseCards = computed(() => {
    const s = this.summary();
    const totalRooms = Math.max(1, s.waitingRooms + s.activeRooms + s.finishedRooms + s.cancelledRooms);
    return [
      { label: this.i18n.t('admin.dashboard.metrics.waitingRooms'), value: s.waitingRooms, progress: Math.min(100, Math.round((s.waitingRooms / totalRooms) * 100)) },
      { label: this.i18n.t('admin.dashboard.metrics.activeRooms'), value: s.activeRooms, progress: Math.min(100, Math.round((s.activeRooms / totalRooms) * 100)) },
      { label: this.i18n.t('admin.dashboard.metrics.completedRooms'), value: s.finishedRooms, progress: Math.min(100, Math.round((s.finishedRooms / totalRooms) * 100)) },
    ];
  });

  readonly notices = computed(() => {
    const s = this.summary();
    return [
      { title: this.i18n.t('admin.dashboard.notices.activeUsers', { count: s.activePlayers }), detail: this.i18n.t('admin.dashboard.notices.liveNow') },
      { title: this.i18n.t('admin.dashboard.notices.waitingRooms', { count: s.waitingRooms }), detail: this.i18n.t('admin.dashboard.notices.lobbyState') },
      { title: this.i18n.t('admin.dashboard.notices.cancelledRooms', { count: s.cancelledRooms }), detail: this.i18n.t('admin.dashboard.notices.needsReview') },
      { title: this.i18n.t('admin.dashboard.notices.bannedAccounts', { count: s.bannedPlayers }), detail: this.i18n.t('admin.dashboard.notices.securityStatus') },
    ];
  });

  activityFeed(): string[] {
    const playerEvents = this.players()
      .slice(0, 3)
      .map((player) =>
        this.i18n.t('admin.dashboard.activityPlayer', {
          name: player.username,
          wins: player.totalWins,
          matches: player.totalGames,
        }),
      );
    const roomEvents = this.rooms()
      .slice(0, 3)
      .map((room) =>
        this.i18n.t('admin.dashboard.activityRoom', {
          name: room.name,
          status: room.status,
          count: `${room.playerCount}/${room.maxPlayers}`,
        }),
      );
    const events = [...playerEvents, ...roomEvents];
    return events.length > 0 ? events : [this.i18n.t('admin.dashboard.noRecentActivity')];
  }

  refresh(): void {
    globalThis.location.reload();
  }

  goRoom(roomId: string): void {
    void this.localizedRouter.navigate(`/room/${roomId}`);
  }

  goAdminPurchases(): void {
    void this.localizedRouter.navigate('/admin/purchases');
  }

  goAdminWallets(): void {
    void this.localizedRouter.navigate('/admin/wallets');
  }

  async deleteRoom(roomId: string, roomName: string): Promise<void> {
    if (!globalThis.confirm(this.i18n.t('admin.dashboard.confirmRemoveRoom', { name: roomName }))) return;

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminDeleteRoom(roomId);
      globalThis.location.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.dashboard.errors.removeRoom'));
    } finally {
      this.busy.set(false);
    }
  }

  async setPlayerBan(player: AdminPlayerSummary): Promise<void> {
    const nextBanned = !player.isBanned;
    const action = nextBanned ? this.i18n.t('admin.dashboard.ban') : this.i18n.t('admin.dashboard.unban');
    if (!globalThis.confirm(this.i18n.t('admin.dashboard.confirmBan', { action, name: player.username }))) return;

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminSetPlayerBan(
        player.id,
        nextBanned,
        nextBanned ? this.i18n.t('admin.dashboard.adminAction') : undefined,
      );
      globalThis.location.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.dashboard.errors.updatePlayer'));
    } finally {
      this.busy.set(false);
    }
  }

  async sendBroadcast(): Promise<void> {
    const title = this.broadcastTitle().trim();
    const message = this.broadcastMessage().trim();
    const reason = this.broadcastReason().trim();

    if (title.length < 3) {
      this.statusMessage.set(this.i18n.t('admin.dashboard.errors.titleLength'));
      return;
    }
    if (message.length < 5) {
      this.statusMessage.set(this.i18n.t('admin.dashboard.errors.messageLength'));
      return;
    }

    if (!globalThis.confirm(this.i18n.t('admin.dashboard.confirmBroadcast'))) return;

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      const sent = await this.supabase.adminBroadcastNotification(title, message, reason || undefined);
      this.statusMessage.set(this.i18n.t('admin.dashboard.broadcastSent', { count: sent }));
      this.broadcastTitle.set('');
      this.broadcastMessage.set('');
      this.broadcastReason.set('');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.dashboard.errors.broadcast'));
    } finally {
      this.busy.set(false);
    }
  }
}
