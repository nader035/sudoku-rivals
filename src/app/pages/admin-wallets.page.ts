import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminWalletSummary } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-admin-wallets-page',
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
            <h1 class="mt-2 text-3xl font-black tracking-tight">Wallets</h1>
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

        <section class="overflow-hidden rounded-md border border-border/60">
          @if (wallets().length === 0) {
            <div class="p-4 text-sm font-mono text-muted-foreground">No wallets found.</div>
          } @else {
            <div class="divide-y divide-border/60">
              @for (wallet of wallets(); track wallet.walletId) {
                <article class="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                  <div class="min-w-0 space-y-1">
                    <div class="truncate font-semibold">{{ wallet.username }} · {{ wallet.balance }} coins</div>
                    <div class="truncate text-xs font-mono text-muted-foreground">user: {{ wallet.userId }}</div>
                    <div class="text-xs font-mono text-muted-foreground">
                      won {{ wallet.totalCoinsWon }} · spent {{ wallet.totalCoinsSpent }} · purchased {{ wallet.totalCoinsPurchased }}
                    </div>
                    <div class="text-xs font-mono uppercase" [class.text-destructive]="wallet.isFrozen" [class.text-primary]="!wallet.isFrozen">
                      {{ wallet.isFrozen ? 'frozen' : 'active' }}
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
                      type="button"
                      [disabled]="busy()"
                      (click)="adjustCoins(wallet, true)"
                    >
                      Add
                    </button>
                    <button
                      class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
                      type="button"
                      [disabled]="busy()"
                      (click)="adjustCoins(wallet, false)"
                    >
                      Remove
                    </button>
                    <button
                      class="rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                      [class.border-destructive/40]="!wallet.isFrozen"
                      [class.text-destructive]="!wallet.isFrozen"
                      [class.border-primary/40]="wallet.isFrozen"
                      [class.text-primary]="wallet.isFrozen"
                      type="button"
                      [disabled]="busy()"
                      (click)="toggleFreeze(wallet)"
                    >
                      {{ wallet.isFrozen ? 'Unfreeze' : 'Freeze' }}
                    </button>
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
export class AdminWalletsPage {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  readonly wallets = signal<AdminWalletSummary[]>([]);
  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);

  constructor() {
    void this.reload();
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  async reload(): Promise<void> {
    try {
      this.statusMessage.set(null);
      const rows = await this.supabase.adminListWallets(200);
      this.wallets.set(rows);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to load wallets');
    }
  }

  async adjustCoins(wallet: AdminWalletSummary, add: boolean): Promise<void> {
    const amountRaw = globalThis.prompt(add ? 'Add how many coins?' : 'Remove how many coins?');
    if (!amountRaw) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.statusMessage.set('Amount must be greater than zero.');
      return;
    }

    const reason = globalThis.prompt('Reason for this adjustment?');
    if (!reason || reason.trim().length < 3) {
      this.statusMessage.set('Reason is required.');
      return;
    }

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminAdjustWallet(wallet.userId, add ? Math.trunc(amount) : -Math.trunc(amount), reason.trim());
      await this.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to adjust wallet');
    } finally {
      this.busy.set(false);
    }
  }

  async toggleFreeze(wallet: AdminWalletSummary): Promise<void> {
    const next = !wallet.isFrozen;
    const reason = globalThis.prompt(next ? 'Reason for freezing wallet?' : 'Reason for unfreezing wallet?');
    if (!reason || reason.trim().length < 3) {
      this.statusMessage.set('Reason is required.');
      return;
    }

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminSetWalletFrozen(wallet.userId, next, reason.trim());
      await this.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to update wallet freeze state');
    } finally {
      this.busy.set(false);
    }
  }
}

