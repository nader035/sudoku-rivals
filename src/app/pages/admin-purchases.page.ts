import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PurchaseSnapshot } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-admin-purchases-page',
  standalone: true,
  template: `
    <div class="h-full border-t border-border/60 bg-background/55">
      <header class="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 md:px-6">
        <div>
          <div class="text-ui-kicker text-muted-foreground">Admin / Purchases</div>
          <h1 class="mt-1 text-2xl font-black tracking-tight">Manual Payments</h1>
        </div>
        <button class="btn-game rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm hover:bg-muted/40" type="button" (click)="reload()">
          Refresh
        </button>
      </header>

      @if (statusMessage()) {
        <div class="mx-4 mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm md:mx-6">
          {{ statusMessage() }}
        </div>
      }

      <section class="px-4 py-4 md:px-6">
        <div class="surface-panel overflow-hidden rounded-xl">
          @if (purchases().length === 0) {
            <div class="p-4 text-sm font-mono text-muted-foreground">No purchases found.</div>
          } @else {
            <div class="divide-y divide-border/60">
              @for (purchase of purchases(); track purchase.id) {
                <article class="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                  <div class="space-y-1">
                    <div class="font-semibold">{{ purchase.coinsReceived }} coins / {{ purchase.amountPaid }} {{ purchase.currency }}</div>
                    <div class="text-xs font-mono text-muted-foreground">
                      {{ purchase.paymentMethod }} / {{ purchase.paymentDestination }}
                    </div>
                    <div class="text-xs font-mono text-muted-foreground">
                      sender: {{ purchase.senderPhone || '-' }} / ref: {{ purchase.paymentReference || '-' }}
                    </div>
                    @if (purchase.voucherCode) {
                      <div class="text-xs font-mono text-primary">
                        voucher: {{ purchase.voucherCode }} (discount {{ purchase.voucherDiscountAmount }} {{ purchase.currency }})
                      </div>
                    }
                    <div class="text-xs font-mono uppercase text-primary">{{ purchase.paymentStatus }}</div>
                    @if (purchase.userNote) {
                      <div class="text-sm text-muted-foreground">{{ purchase.userNote }}</div>
                    }
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button class="btn-game rounded-md border border-primary/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-40" type="button" [disabled]="busy() || purchase.paymentStatus !== 'pending_admin_review'" (click)="approve(purchase)">
                      Approve
                    </button>
                    <button class="btn-game rounded-md border border-destructive/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 disabled:opacity-40" type="button" [disabled]="busy() || purchase.paymentStatus !== 'pending_admin_review'" (click)="reject(purchase)">
                      Reject
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPurchasesPage {
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
