import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { VoucherKind, VoucherSnapshot } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-admin-vouchers-page',
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
            <h1 class="mt-2 text-3xl font-black tracking-tight">Vouchers</h1>
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

        <section class="rounded-md border border-border/60 p-4">
          <h2 class="text-lg font-bold">{{ editingId() ? 'Edit Voucher' : 'Create Voucher' }}</h2>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Code</span>
              <input class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm uppercase"
                [value]="code()" (input)="code.set($any($event.target).value)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Title</span>
              <input class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="title()" (input)="title.set($any($event.target).value)" />
            </label>
            <label class="block md:col-span-2">
              <span class="text-xs font-mono uppercase text-muted-foreground">Description</span>
              <input class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="description()" (input)="description.set($any($event.target).value)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Kind</span>
              <select class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="kind()" (change)="kind.set($any($event.target).value)">
                <option value="free_coins">Free Coins</option>
                <option value="discount_percent">Discount %</option>
                <option value="discount_fixed">Discount Fixed</option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Free Coins</span>
              <input type="number" min="0" class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="freeCoins()" (input)="freeCoins.set(+$any($event.target).value || 0)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Discount %</span>
              <input type="number" min="0" max="100" step="0.01" class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="discountPercent()" (input)="discountPercent.set(+$any($event.target).value || 0)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Discount Amount</span>
              <input type="number" min="0" step="0.01" class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="discountAmount()" (input)="discountAmount.set(+$any($event.target).value || 0)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Max Total Uses</span>
              <input type="number" min="1" class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="maxTotalRedemptions()" (input)="maxTotalRedemptions.set($any($event.target).value ? +$any($event.target).value : null)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">Max Per User</span>
              <input type="number" min="1" class="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                [value]="maxPerUser()" (input)="maxPerUser.set(+$any($event.target).value || 1)" />
            </label>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button class="rounded-md border border-primary/40 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-60"
              type="button" [disabled]="busy()" (click)="saveVoucher()">
              {{ editingId() ? 'Update Voucher' : 'Create Voucher' }}
            </button>
            <button class="rounded-md border border-border/60 px-4 py-2 text-sm"
              type="button" [disabled]="busy()" (click)="resetForm()">
              Reset
            </button>
          </div>
        </section>

        <section class="overflow-hidden rounded-md border border-border/60">
          @if (vouchers().length === 0) {
            <div class="p-4 text-sm font-mono text-muted-foreground">No vouchers yet.</div>
          } @else {
            <div class="divide-y divide-border/60">
              @for (voucher of vouchers(); track voucher.id) {
                <article class="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                  <div class="min-w-0">
                    <div class="truncate font-semibold">{{ voucher.code }} · {{ voucher.title }}</div>
                    <div class="text-xs font-mono text-muted-foreground">
                      {{ voucher.kind }} · uses {{ voucher.currentRedemptions }}/{{ voucher.maxTotalRedemptions ?? '∞' }}
                    </div>
                    <div class="text-xs font-mono text-muted-foreground">
                      free {{ voucher.freeCoins }} · % {{ voucher.discountPercent }} · fixed {{ voucher.discountAmount }}
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                      type="button" [disabled]="busy()" (click)="editVoucher(voucher)">
                      Edit
                    </button>
                    <button class="rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider"
                      [class.border-destructive/40]="voucher.isActive" [class.text-destructive]="voucher.isActive"
                      [class.border-primary/40]="!voucher.isActive" [class.text-primary]="!voucher.isActive"
                      type="button" [disabled]="busy()" (click)="toggleVoucher(voucher)">
                      {{ voucher.isActive ? 'Disable' : 'Enable' }}
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
export class AdminVouchersPage {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  readonly vouchers = signal<VoucherSnapshot[]>([]);
  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);

  readonly editingId = signal<string | null>(null);
  readonly code = signal('');
  readonly title = signal('');
  readonly description = signal('');
  readonly kind = signal<VoucherKind>('free_coins');
  readonly freeCoins = signal(0);
  readonly discountPercent = signal(0);
  readonly discountAmount = signal(0);
  readonly maxTotalRedemptions = signal<number | null>(null);
  readonly maxPerUser = signal(1);

  constructor() {
    void this.reload();
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  async reload(): Promise<void> {
    try {
      this.statusMessage.set(null);
      this.vouchers.set(await this.supabase.adminListVouchers());
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to load vouchers');
    }
  }

  resetForm(): void {
    this.editingId.set(null);
    this.code.set('');
    this.title.set('');
    this.description.set('');
    this.kind.set('free_coins');
    this.freeCoins.set(0);
    this.discountPercent.set(0);
    this.discountAmount.set(0);
    this.maxTotalRedemptions.set(null);
    this.maxPerUser.set(1);
  }

  editVoucher(voucher: VoucherSnapshot): void {
    this.editingId.set(voucher.id);
    this.code.set(voucher.code);
    this.title.set(voucher.title);
    this.description.set(voucher.description ?? '');
    this.kind.set(voucher.kind);
    this.freeCoins.set(voucher.freeCoins);
    this.discountPercent.set(voucher.discountPercent);
    this.discountAmount.set(voucher.discountAmount);
    this.maxTotalRedemptions.set(voucher.maxTotalRedemptions);
    this.maxPerUser.set(voucher.maxRedemptionsPerUser);
  }

  async saveVoucher(): Promise<void> {
    if (this.code().trim().length < 3 || this.title().trim().length < 3) {
      this.statusMessage.set('Code and title are required.');
      return;
    }

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminUpsertVoucher({
        id: this.editingId(),
        code: this.code(),
        title: this.title(),
        description: this.description(),
        kind: this.kind(),
        freeCoins: this.freeCoins(),
        discountPercent: this.discountPercent(),
        discountAmount: this.discountAmount(),
        maxTotalRedemptions: this.maxTotalRedemptions(),
        maxRedemptionsPerUser: this.maxPerUser(),
        isActive: true,
      });
      this.resetForm();
      await this.reload();
      this.statusMessage.set('Voucher saved.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to save voucher');
    } finally {
      this.busy.set(false);
    }
  }

  async toggleVoucher(voucher: VoucherSnapshot): Promise<void> {
    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.adminSetVoucherActive(voucher.id, !voucher.isActive);
      await this.reload();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to update voucher status');
    } finally {
      this.busy.set(false);
    }
  }
}

