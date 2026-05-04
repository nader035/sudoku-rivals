import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PurchaseSnapshot } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-admin-purchases-page',
  standalone: true,
  imports: [UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <button class="font-black italic uppercase tracking-tight text-primary" type="button" (click)="goHome()">
            SUDOKU RIVAL
          </button>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
        <header class="flex items-center justify-between gap-3">
          <div>
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Admin</div>
            <h1 class="mt-2 text-3xl font-black tracking-tight">Manual Purchases</h1>
          </div>
          <button class="rounded-md border border-border/60 px-3 py-2 text-sm" type="button" (click)="reload()">
            Refresh
          </button>
        </header>

        @if (statusMessage()) {
          <div class="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            {{ statusMessage() }}
          </div>
        }

        <div class="overflow-hidden rounded-md border border-border/60">
          @if (purchases().length === 0) {
            <div class="p-4 text-sm font-mono text-muted-foreground">No purchases found.</div>
          } @else {
            <div class="divide-y divide-border/60">
              @for (purchase of purchases(); track purchase.id) {
                <article class="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                  <div class="space-y-1">
                    <div class="font-semibold">{{ purchase.coinsReceived }} coins · {{ purchase.amountPaid }} {{ purchase.currency }}</div>
                    <div class="text-xs font-mono text-muted-foreground">
                      {{ purchase.paymentMethod }} · {{ purchase.paymentDestination }}
                    </div>
                    <div class="text-xs font-mono text-muted-foreground">
                      sender: {{ purchase.senderPhone || '-' }} | ref: {{ purchase.paymentReference || '-' }}
                    </div>
                    <div class="text-xs font-mono uppercase text-primary">{{ purchase.paymentStatus }}</div>
                    @if (purchase.userNote) {
                      <div class="text-sm text-muted-foreground">{{ purchase.userNote }}</div>
                    }
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      class="rounded-md border border-primary/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-40"
                      type="button"
                      [disabled]="busy() || purchase.paymentStatus !== 'pending_admin_review'"
                      (click)="approve(purchase)"
                    >
                      Approve
                    </button>
                    <button
                      class="rounded-md border border-destructive/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      type="button"
                      [disabled]="busy() || purchase.paymentStatus !== 'pending_admin_review'"
                      (click)="reject(purchase)"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPurchasesPage {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);

  readonly purchases = signal<PurchaseSnapshot[]>([]);

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    try {
      this.statusMessage.set(null);
      const data = await this.supabase.adminListPurchases();
      this.purchases.set(data);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to load purchases');
    }
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  async approve(purchase: PurchaseSnapshot): Promise<void> {
    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminApprovePurchase(purchase.id, 'Approved from admin purchases page');
      await this.reload();
      this.statusMessage.set(`Purchase ${purchase.id} approved.`);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to approve purchase');
    } finally {
      this.busy.set(false);
    }
  }

  async reject(purchase: PurchaseSnapshot): Promise<void> {
    const reason = globalThis.prompt('Rejection reason');
    if (!reason || reason.trim().length < 3) return;

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminRejectPurchase(purchase.id, reason.trim());
      await this.reload();
      this.statusMessage.set(`Purchase ${purchase.id} rejected.`);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to reject purchase');
    } finally {
      this.busy.set(false);
    }
  }
}
