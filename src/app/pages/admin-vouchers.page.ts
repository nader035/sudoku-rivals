import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { VoucherKind, VoucherSnapshot } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-admin-vouchers-page',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="h-full border-t border-border/60 bg-background/55">
      <header class="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 md:px-6">
        <div>
          <div class="text-ui-kicker text-muted-foreground">{{ 'admin.vouchers.kicker' | transloco }}</div>
          <h1 class="mt-1 text-2xl font-black tracking-tight">{{ 'admin.vouchers.title' | transloco }}</h1>
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

      <section class="grid gap-4 px-4 py-4 xl:grid-cols-[1.1fr_1fr] md:px-6">
        <section class="surface-panel rounded-xl p-4">
          <h2 class="text-lg font-bold">{{ (editingId() ? 'admin.vouchers.editVoucher' : 'admin.vouchers.createVoucher') | transloco }}</h2>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.code' | transloco }}</span>
              <input class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm uppercase" [value]="code()" (input)="code.set($any($event.target).value)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.fieldTitle' | transloco }}</span>
              <input class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="title()" (input)="title.set($any($event.target).value)" />
            </label>
            <label class="block md:col-span-2">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.description' | transloco }}</span>
              <input class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="description()" (input)="description.set($any($event.target).value)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.kind' | transloco }}</span>
              <select class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="kind()" (change)="kind.set($any($event.target).value)">
                <option value="free_coins">{{ 'admin.vouchers.freeCoins' | transloco }}</option>
                <option value="discount_percent">{{ 'admin.vouchers.discountPercent' | transloco }}</option>
                <option value="discount_fixed">{{ 'admin.vouchers.discountFixed' | transloco }}</option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.freeCoins' | transloco }}</span>
              <input type="number" min="0" class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="freeCoins()" (input)="freeCoins.set(+$any($event.target).value || 0)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.discountPercent' | transloco }}</span>
              <input type="number" min="0" max="100" step="0.01" class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="discountPercent()" (input)="discountPercent.set(+$any($event.target).value || 0)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.discountAmount' | transloco }}</span>
              <input type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="discountAmount()" (input)="discountAmount.set(+$any($event.target).value || 0)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.maxTotalUses' | transloco }}</span>
              <input type="number" min="1" class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="maxTotalRedemptions()" (input)="maxTotalRedemptions.set($any($event.target).value ? +$any($event.target).value : null)" />
            </label>
            <label class="block">
              <span class="text-xs font-mono uppercase text-muted-foreground">{{ 'admin.vouchers.maxPerUser' | transloco }}</span>
              <input type="number" min="1" class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm" [value]="maxPerUser()" (input)="maxPerUser.set(+$any($event.target).value || 1)" />
            </label>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button class="btn-game rounded-md border border-primary/40 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-60" type="button" [disabled]="busy()" (click)="saveVoucher()">
              {{ (editingId() ? 'admin.vouchers.updateVoucher' : 'admin.vouchers.createVoucher') | transloco }}
            </button>
            <button class="btn-game rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-muted/40" type="button" [disabled]="busy()" (click)="resetForm()">
              {{ 'admin.vouchers.reset' | transloco }}
            </button>
          </div>
        </section>

        <section class="surface-panel overflow-hidden rounded-xl">
          @if (vouchers().length === 0) {
            <div class="p-4 text-sm font-mono text-muted-foreground">{{ 'admin.vouchers.empty' | transloco }}</div>
          } @else {
            <div class="divide-y divide-border/60">
              @for (voucher of vouchers(); track voucher.id) {
                <article class="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                  <div class="min-w-0">
                    <div class="truncate font-semibold">{{ voucher.code }} / {{ voucher.title }}</div>
                    <div class="text-xs font-mono text-muted-foreground">
                      {{ voucherKindLabel(voucher.kind) }} / {{ 'admin.vouchers.uses' | transloco }} {{ voucher.currentRedemptions }}/{{ voucher.maxTotalRedemptions ?? ('admin.vouchers.unlimited' | transloco) }}
                    </div>
                    <div class="text-xs font-mono text-muted-foreground">
                      {{ 'admin.vouchers.free' | transloco }} {{ voucher.freeCoins }} / % {{ voucher.discountPercent }} / {{ 'admin.vouchers.fixed' | transloco }} {{ voucher.discountAmount }}
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button class="btn-game rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted/40" type="button" [disabled]="busy()" (click)="editVoucher(voucher)">
                      {{ 'admin.vouchers.edit' | transloco }}
                    </button>
                    <button class="btn-game rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider" [class.border-destructive/40]="voucher.isActive" [class.text-destructive]="voucher.isActive" [class.border-primary/40]="!voucher.isActive" [class.text-primary]="!voucher.isActive" type="button" [disabled]="busy()" (click)="toggleVoucher(voucher)">
                      {{ (voucher.isActive ? 'admin.vouchers.disable' : 'admin.vouchers.enable') | transloco }}
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminVouchersPage {
  private readonly supabase = inject(SupabaseService);
  private readonly i18n = inject(I18nService);

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

  async reload(): Promise<void> {
    try {
      this.statusMessage.set(null);
      this.vouchers.set(await this.supabase.adminListVouchers());
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.vouchers.errors.load'));
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

  voucherKindLabel(kind: VoucherKind): string {
    return this.i18n.t(`admin.vouchers.kinds.${kind}`);
  }

  async saveVoucher(): Promise<void> {
    if (this.code().trim().length < 3 || this.title().trim().length < 3) {
      this.statusMessage.set(this.i18n.t('admin.vouchers.errors.required'));
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
      this.statusMessage.set(this.i18n.t('admin.vouchers.saved'));
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.vouchers.errors.save'));
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
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('admin.vouchers.errors.status'));
    } finally {
      this.busy.set(false);
    }
  }
}
