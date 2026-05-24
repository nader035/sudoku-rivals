import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NotificationSnapshot } from '../core/models';
import { AppStore } from '../store/app.store';
import { SupabaseService } from '../core/services/supabase.service';
import { UserNavComponent } from '../shared/components/user-nav.component';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [UserNavComponent, TranslocoPipe],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <button
            class="inline-flex items-center"
            type="button"
            (click)="goHome()"
          >
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-9 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-9 w-auto dark:hidden" />
          </button>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
        <header class="flex items-center justify-between gap-3">
          <div>
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">{{ 'notifications.kicker' | transloco }}</div>
            <h1 class="mt-2 text-3xl font-black tracking-tight">{{ 'notifications.title' | transloco }}</h1>
          </div>
          <button
            class="btn-game rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            [disabled]="busy()"
            (click)="markAllAsRead()"
          >
            {{ 'notifications.markAllRead' | transloco }}
          </button>
        </header>

        @if (statusMessage()) {
          <div class="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            {{ statusMessage() }}
          </div>
        }

        <section class="surface-panel overflow-hidden rounded-xl">
          @if (notifications().length === 0) {
            <div class="p-5 text-sm font-mono text-muted-foreground">{{ 'notifications.empty' | transloco }}</div>
          } @else {
            <div class="divide-y divide-border/60">
              @for (item of notifications(); track item.id) {
                <article
                  class="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]"
                  [class.bg-primary/5]="!item.isRead"
                >
                  <button class="min-w-0 text-left" type="button" (click)="openNotification(item)">
                    <div class="flex items-center gap-2">
                      <span class="truncate font-semibold">{{ item.title }}</span>
                      @if (!item.isRead) {
                        <span class="rounded border border-primary/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-primary">
                          {{ 'notifications.new' | transloco }}
                        </span>
                      }
                    </div>
                    <p class="mt-1 text-sm text-muted-foreground">{{ item.message }}</p>
                  </button>
                  <div class="flex items-center gap-2 text-xs font-mono text-muted-foreground md:justify-end">
                    <span>{{ item.createdAt }}</span>
                    @if (!item.isRead) {
                      <button
                        class="btn-game rounded-md border border-border/60 px-2 py-1 text-[10px] uppercase tracking-wider hover:border-primary/40"
                        type="button"
                        (click)="markRead(item, $event)"
                      >
                        {{ 'notifications.markRead' | transloco }}
                      </button>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly i18n = inject(I18nService);
  readonly appStore = inject(AppStore);
  private readonly supabase = inject(SupabaseService);

  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly notifications = computed(() => this.appStore.notifications());

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }

  async markAllAsRead(): Promise<void> {
    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.markAllNotificationsRead();
      this.statusMessage.set(this.i18n.t('notifications.allRead'));
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('notifications.errors.markAll'));
    } finally {
      this.busy.set(false);
    }
  }

  async markRead(item: NotificationSnapshot, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (item.isRead) return;

    try {
      await this.supabase.markNotificationRead(item.id);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('notifications.errors.markOne'));
    }
  }

  async openNotification(item: NotificationSnapshot): Promise<void> {
    await this.markRead(item);
    if (item.roomId) {
      await this.localizedRouter.navigate(`/room/${item.roomId}`);
      return;
    }
    await this.localizedRouter.navigate('/lobby');
  }
}
