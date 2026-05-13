import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { SupabaseService } from '../core/services/supabase.service';
import { WalletSnapshot, WalletTransactionSnapshot } from '../core/models';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-wallet-page',
  standalone: true,
  imports: [UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <button class="inline-flex items-center" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-9 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-9 w-auto dark:hidden" />
          </button>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
        <header class="flex items-center justify-between gap-4">
          <div>
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Economy</div>
            <h1 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Wallet</h1>
          </div>
          <button
            class="btn-game rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            type="button"
            (click)="goShop()"
          >
            Buy Coins
          </button>
        </header>

        @if (wallet()) {
          <section class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div class="surface-panel rounded-xl p-4">
              <div class="text-xs font-mono uppercase text-muted-foreground">Balance</div>
              <div class="mt-1 text-2xl font-black text-primary">{{ wallet()!.balance }}</div>
            </div>
            <div class="surface-panel rounded-xl p-4">
              <div class="text-xs font-mono uppercase text-muted-foreground">Coins Won</div>
              <div class="mt-1 text-2xl font-black">{{ wallet()!.totalCoinsWon }}</div>
            </div>
            <div class="surface-panel rounded-xl p-4">
              <div class="text-xs font-mono uppercase text-muted-foreground">Coins Spent</div>
              <div class="mt-1 text-2xl font-black">{{ wallet()!.totalCoinsSpent }}</div>
            </div>
            <div class="surface-panel rounded-xl p-4">
              <div class="text-xs font-mono uppercase text-muted-foreground">Coins Purchased</div>
              <div class="mt-1 text-2xl font-black">{{ wallet()!.totalCoinsPurchased }}</div>
            </div>
          </section>
        }

        <section class="space-y-3">
          <h2 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Transaction history</h2>
          <div class="surface-panel overflow-hidden rounded-xl">
            @if (transactions().length === 0) {
              <div class="p-4 text-sm font-mono text-muted-foreground">No wallet transactions yet.</div>
            } @else {
              <div class="divide-y divide-border/60">
                @for (tx of transactions(); track tx.id) {
                  <div class="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr_auto_auto] md:items-center">
                    <span class="text-xs font-mono uppercase text-primary">{{ tx.type }}</span>
                    <span class="truncate text-sm">{{ tx.reason || 'No reason provided' }}</span>
                    <span class="font-mono text-sm" [class.text-destructive]="tx.amount < 0" [class.text-primary]="tx.amount > 0">
                      {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
                    </span>
                    <span class="text-xs font-mono text-muted-foreground">{{ tx.createdAt }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletPage {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly supabase = inject(SupabaseService);

  readonly wallet = toSignal(
    this.supabase.observeMyWallet().pipe(catchError(() => of(null as WalletSnapshot | null))),
    { initialValue: null as WalletSnapshot | null, injector: this.injector },
  );

  readonly transactions = toSignal(
    this.supabase.observeMyWalletTransactions().pipe(catchError(() => of([] as WalletTransactionSnapshot[]))),
    { initialValue: [] as WalletTransactionSnapshot[], injector: this.injector },
  );

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goShop(): void {
    void this.router.navigateByUrl('/shop');
  }
}
