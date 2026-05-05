import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { NotificationSnapshot } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-notifications-page',
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

      <main class="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
        <header class="flex items-center justify-between gap-3">
          <div>
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Inbox</div>
            <h1 class="mt-2 text-3xl font-black tracking-tight">Notifications</h1>
          </div>
          <button
            class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            [disabled]="busy()"
            (click)="markAllAsRead()"
          >
            Mark all read
          </button>
        </header>

        @if (statusMessage()) {
          <div class="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            {{ statusMessage() }}
          </div>
        }

        <section class="overflow-hidden rounded-md border border-border/60">
          @if (notifications().length === 0) {
            <div class="p-5 text-sm font-mono text-muted-foreground">No notifications yet.</div>
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
                          New
                        </span>
                      }
                    </div>
                    <p class="mt-1 text-sm text-muted-foreground">{{ item.message }}</p>
                  </button>
                  <div class="flex items-center gap-2 text-xs font-mono text-muted-foreground md:justify-end">
                    <span>{{ item.createdAt }}</span>
                    @if (!item.isRead) {
                      <button
                        class="rounded-md border border-border/60 px-2 py-1 text-[10px] uppercase tracking-wider hover:border-primary/40"
                        type="button"
                        (click)="markRead(item, $event)"
                      >
                        Mark read
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
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly supabase = inject(SupabaseService);

  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);

  readonly notifications = toSignal(
    this.supabase.observeMyNotifications().pipe(catchError(() => of([] as NotificationSnapshot[]))),
    { initialValue: [] as NotificationSnapshot[], injector: this.injector },
  );

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  async markAllAsRead(): Promise<void> {
    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.markAllNotificationsRead();
      this.statusMessage.set('All notifications marked as read.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to mark notifications as read');
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
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to mark notification as read');
    }
  }

  async openNotification(item: NotificationSnapshot): Promise<void> {
    await this.markRead(item);
    if (item.roomId) {
      await this.router.navigate(['/room', item.roomId]);
      return;
    }
    await this.router.navigateByUrl('/lobby');
  }
}

