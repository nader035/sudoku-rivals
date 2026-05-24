import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminWalletSummary } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-admin-wallets-page',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="h-full border-t border-border/60 bg-background/55">
      <header class="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 md:px-6">
        <div>
          <div class="text-ui-kicker text-muted-foreground">{{ 'admin.wallets.kicker' | transloco }}</div>
          <h1 class="mt-1 text-2xl font-black tracking-tight">{{ 'admin.wallets.title' | transloco }}</h1>
        </div>
        <button class="btn-game rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm hover:bg-muted/40" type="button" (click)="reload()">
          {{ 'admin.common.refresh' | transloco }}
        </button>
      </header>

      @if (statusMessage()) {
        <div class="mx-4 mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm md:mx-6">
          {{ statusMessage() }}
        </div>
      }

      <section class="px-4 py-4 md:px-6">
        <div class="surface-panel overflow-hidden rounded-xl">
          @if (wallets().length === 0) {
            <div class="p-4 text-sm font-mono text-muted-foreground">{{ 'admin.wallets.empty' | transloco }}</div>
          } @else {
            <div class="divide-y divide-border/60">
              @for (wallet of wallets(); track wallet.walletId) {
                <article class="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                  <div class="min-w-0 space-y-1">
                    <div class="truncate font-semibold">{{ wallet.username }} / {{ wallet.balance }} {{ 'common.coins' | transloco }}</div>
                    <div class="truncate text-xs font-mono text-muted-foreground">{{ 'admin.wallets.user' | transloco }}: {{ wallet.userId }}</div>
                    <div class="text-xs font-mono text-muted-foreground">
                      {{ 'admin.wallets.won' | transloco }} {{ wallet.totalCoinsWon }} / {{ 'admin.wallets.spent' | transloco }} {{ wallet.totalCoinsSpent }} / {{ 'admin.wallets.purchased' | transloco }} {{ wallet.totalCoinsPurchased }}
                    </div>
                    <div class="text-xs font-mono uppercase" [class.text-destructive]="wallet.isFrozen" [class.text-primary]="!wallet.isFrozen">
                      {{ (wallet.isFrozen ? 'admin.wallets.frozen' : 'admin.wallets.active') | transloco }}
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button class="btn-game rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50" type="button" [disabled]="busy()" (click)="adjustCoins(wallet, true)">
                      {{ 'admin.wallets.add' | transloco }}
                    </button>
                    <button class="btn-game rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50" type="button" [disabled]="busy()" (click)="adjustCoins(wallet, false)">
                      {{ 'admin.wallets.remove' | transloco }}
                    </button>
                    <button class="btn-game rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50" [class.border-destructive/40]="!wallet.isFrozen" [class.text-destructive]="!wallet.isFrozen" [class.border-primary/40]="wallet.isFrozen" [class.text-primary]="wallet.isFrozen" type="button" [disabled]="busy()" (click)="toggleFreeze(wallet)">
                      {{ (wallet.isFrozen ? 'admin.wallets.unfreeze' : 'admin.wallets.freeze') | transloco }}
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
export class AdminWalletsPage {
  private readonly supabase = inject(SupabaseService);
  private readonly i18n = inject(I18nService);

  readonly wallets = signal<AdminWalletSummary[]>([]);
  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    try {
      this.statusMessage.set(null);
      const rows = await this.supabase.adminListWallets(200);
      this.wallets.set(rows);
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.wallets.errors.load'));
    }
  }

  async adjustCoins(wallet: AdminWalletSummary, add: boolean): Promise<void> {
    const amountRaw = globalThis.prompt(
      this.i18n.t(add ? 'admin.wallets.promptAdd' : 'admin.wallets.promptRemove'),
    );
    if (!amountRaw) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.statusMessage.set(this.i18n.t('admin.wallets.errors.amount'));
      return;
    }

    const reason = globalThis.prompt(this.i18n.t('admin.wallets.promptReason'));
    if (!reason || reason.trim().length < 3) {
      this.statusMessage.set(this.i18n.t('admin.wallets.errors.reason'));
      return;
    }

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminAdjustWallet(wallet.userId, add ? Math.trunc(amount) : -Math.trunc(amount), reason.trim());
      await this.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.wallets.errors.adjust'));
    } finally {
      this.busy.set(false);
    }
  }

  async toggleFreeze(wallet: AdminWalletSummary): Promise<void> {
    const next = !wallet.isFrozen;
    const reason = globalThis.prompt(
      this.i18n.t(next ? 'admin.wallets.promptFreeze' : 'admin.wallets.promptUnfreeze'),
    );
    if (!reason || reason.trim().length < 3) {
      this.statusMessage.set(this.i18n.t('admin.wallets.errors.reason'));
      return;
    }

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminSetWalletFrozen(wallet.userId, next, reason.trim());
      await this.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.wallets.errors.freeze'));
    } finally {
      this.busy.set(false);
    }
  }
}
