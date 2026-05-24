import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { SupabaseService } from '../core/services/supabase.service';
import { PurchasePaymentMethod, PurchaseSnapshot, ShopPackage } from '../core/models';
import { UserNavComponent } from '../shared/components/user-nav.component';
import { LocalizedRouterService } from '../core/services/localized-router.service';

@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [UserNavComponent],
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

      <main class="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
        <header>
          <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Economy</div>
          <h1 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Coin Shop</h1>
          <p class="mt-2 text-sm font-mono text-muted-foreground">
            Transfer manually, then submit confirmation. Coins are credited only after admin approval.
          </p>
        </header>

        @if (statusMessage()) {
          <div class="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            {{ statusMessage() }}
          </div>
        }

        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (pkg of packages(); track pkg.id) {
            <article
              class="surface-panel rounded-xl p-4"
              [class.border-primary]="selectedPackageId() === pkg.id"
            >
              <div class="flex items-start justify-between gap-2">
                <h2 class="text-lg font-bold">{{ pkg.name }}</h2>
                @if (pkg.badge) {
                  <span class="rounded border border-primary/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-primary">
                    {{ pkg.badge }}
                  </span>
                }
              </div>
              <div class="mt-2 text-2xl font-black text-primary">{{ pkg.coinsAmount + pkg.bonusCoins }}</div>
              <div class="text-xs font-mono text-muted-foreground">
                {{ pkg.coinsAmount }} + {{ pkg.bonusCoins }} bonus
              </div>
              <div class="mt-3 text-sm font-mono">{{ pkg.price }} {{ pkg.currency }}</div>
              <button
                class="btn-game mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                type="button"
                (click)="selectPackage(pkg)"
              >
                Select
              </button>
            </article>
          }
        </section>

        <section class="surface-panel rounded-xl p-5">
          <h3 class="text-lg font-bold">Redeem Voucher</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Redeem free-coins vouchers here, or apply discount voucher in purchase below.
          </p>
          <div class="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              class="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm uppercase"
              placeholder="Voucher code"
              [value]="voucherCode()"
              (input)="voucherCode.set($any($event.target).value)"
            />
            <button
              class="btn-game rounded-lg border border-primary/40 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
              type="button"
              [disabled]="busy() || voucherCode().trim().length < 3"
              (click)="redeemFreeCoinsVoucher()"
            >
              Redeem Free Coins
            </button>
          </div>
        </section>

        @if (selectedPackage()) {
          <section class="surface-panel rounded-xl p-5">
            <h3 class="text-lg font-bold">Payment Method</h3>
            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <button
                class="btn-game rounded-lg border px-3 py-2 text-left text-sm font-semibold"
                [class.border-primary]="paymentMethod() === 'vodafone_cash'"
                [class.border-border]="paymentMethod() !== 'vodafone_cash'"
                type="button"
                (click)="paymentMethod.set('vodafone_cash')"
              >
                Vodafone Cash
              </button>
              <button
                class="btn-game rounded-lg border px-3 py-2 text-left text-sm font-semibold"
                [class.border-primary]="paymentMethod() === 'instapay'"
                [class.border-border]="paymentMethod() !== 'instapay'"
                type="button"
                (click)="paymentMethod.set('instapay')"
              >
                InstaPay
              </button>
            </div>

            <div class="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm font-mono">
              @if (paymentMethod() === 'vodafone_cash') {
                Please transfer {{ selectedPackage()?.price }} {{ selectedPackage()?.currency }} to Vodafone Cash number:
                <span class="font-bold text-primary">{{ settings().vodafoneCashNumber }}</span>
              } @else {
                Please transfer {{ selectedPackage()?.price }} {{ selectedPackage()?.currency }} via InstaPay:
                <a class="font-bold text-primary underline" [href]="settings().instapayLink" target="_blank" rel="noopener">
                  {{ settings().instapayLink }}
                </a>
              }
            </div>

            <button
              class="btn-game mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              type="button"
              [disabled]="busy()"
              (click)="beginTransferConfirmation()"
            >
              I transferred the money
            </button>

            <p class="mt-2 text-xs font-mono text-muted-foreground">
              Optional discount voucher: {{ voucherCode().trim() ? voucherCode().trim().toUpperCase() : 'none' }}
            </p>

            @if (showTransferForm()) {
              <div class="mt-5 grid gap-3 md:grid-cols-2">
                <label class="block">
                  <span class="text-xs font-mono uppercase text-muted-foreground">
                    @if (paymentMethod() === 'vodafone_cash') {
                      Vodafone sender phone (required)
                    } @else {
                      InstaPay sender number/username (required)
                    }
                  </span>
                  <input
                    class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                    [value]="senderPhone()"
                    (input)="senderPhone.set($any($event.target).value)"
                  />
                </label>
                <label class="block">
                  <span class="text-xs font-mono uppercase text-muted-foreground">Sender name (optional)</span>
                  <input
                    class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                    [value]="senderName()"
                    (input)="senderName.set($any($event.target).value)"
                  />
                </label>
                <label class="block">
                  <span class="text-xs font-mono uppercase text-muted-foreground">Payment reference (optional)</span>
                  <input
                    class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                    [value]="paymentReference()"
                    (input)="paymentReference.set($any($event.target).value)"
                  />
                </label>
                <label class="block">
                  <span class="text-xs font-mono uppercase text-muted-foreground">Screenshot URL (optional)</span>
                  <input
                    class="mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                    [value]="screenshotUrl()"
                    (input)="screenshotUrl.set($any($event.target).value)"
                  />
                </label>
              </div>
              <label class="mt-3 block">
                <span class="text-xs font-mono uppercase text-muted-foreground">Note to admin (optional)</span>
                <textarea
                  class="mt-1 min-h-20 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                  [value]="userNote()"
                  (input)="userNote.set($any($event.target).value)"
                ></textarea>
              </label>
              <button
                class="btn-game mt-4 rounded-lg border border-primary/40 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
                type="button"
                [disabled]="busy()"
                (click)="submitTransferConfirmation()"
              >
                Submit confirmation
              </button>
            }
          </section>
        }

        <section class="space-y-3">
          <h3 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Purchase history</h3>
          <div class="surface-panel overflow-hidden rounded-xl">
            @if (purchases().length === 0) {
              <div class="p-4 text-sm font-mono text-muted-foreground">No purchases yet.</div>
            } @else {
              <div class="divide-y divide-border/60">
                @for (purchase of purchases(); track purchase.id) {
                  <div class="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div class="min-w-0">
                      <div class="truncate font-semibold">{{ purchase.coinsReceived }} coins</div>
                      <div class="text-xs font-mono text-muted-foreground">
                        {{ purchase.paymentMethod }} / {{ purchase.amountPaid }} {{ purchase.currency }}
                      </div>
                    </div>
                    <span class="text-xs font-mono uppercase text-primary">{{ purchase.paymentStatus }}</span>
                    <span class="text-xs font-mono text-muted-foreground">{{ purchase.createdAt }}</span>
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
export class ShopPage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly injector = inject(Injector);
  private readonly supabase = inject(SupabaseService);

  readonly busy = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly paymentMethod = signal<PurchasePaymentMethod>('vodafone_cash');
  readonly selectedPackageId = signal<string | null>(null);
  readonly showTransferForm = signal(false);
  readonly pendingPurchaseId = signal<string | null>(null);
  readonly senderPhone = signal('');
  readonly senderName = signal('');
  readonly paymentReference = signal('');
  readonly screenshotUrl = signal('');
  readonly userNote = signal('');
  readonly voucherCode = signal('');

  readonly packages = toSignal(
    this.supabase.observeShopPackages().pipe(catchError(() => of([] as ShopPackage[]))),
    { initialValue: [] as ShopPackage[], injector: this.injector },
  );

  readonly purchases = toSignal(
    this.supabase.observeMyPurchases().pipe(catchError(() => of([] as PurchaseSnapshot[]))),
    { initialValue: [] as PurchaseSnapshot[], injector: this.injector },
  );

  readonly settings = signal({
    allowedEntryFees: [10, 50, 100, 500],
    vodafoneCashNumber: '+01022175316',
    instapayLink: 'https://ipn.eg/S/naderas109n/instapay/5ph2Pv',
    platformFeePercent: 0,
  });

  readonly selectedPackage = computed(
    () => this.packages().find((pkg) => pkg.id === this.selectedPackageId()) ?? null,
  );

  constructor() {
    void this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    try {
      const value = await this.supabase.getEconomySettings();
      this.settings.set(value);
    } catch {
      // keep defaults
    }
  }

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }

  selectPackage(pkg: ShopPackage): void {
    this.selectedPackageId.set(pkg.id);
    this.showTransferForm.set(false);
    this.pendingPurchaseId.set(null);
    this.statusMessage.set(null);
  }

  async beginTransferConfirmation(): Promise<void> {
    const pkg = this.selectedPackage();
    if (!pkg) return;

    this.showTransferForm.set(true);
    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      if (!this.pendingPurchaseId()) {
        const purchase = await this.supabase.createManualPurchase(
          pkg.id,
          this.paymentMethod(),
          undefined,
          this.voucherCode().trim() || undefined,
        );
        this.pendingPurchaseId.set(purchase.id);
      }
      this.statusMessage.set('Submit transfer confirmation now.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Could not create purchase');
    } finally {
      this.busy.set(false);
    }
  }

  async submitTransferConfirmation(): Promise<void> {
    const pkg = this.selectedPackage();
    if (!pkg) return;

    const sender = this.senderPhone().trim();
    if (this.paymentMethod() === 'vodafone_cash') {
      const validVodafoneNumber = /^\+?[0-9]{7,20}$/.test(sender);
      if (!validVodafoneNumber) {
        this.statusMessage.set('Please enter the Vodafone number you transferred from.');
        return;
      }
    } else if (sender.length < 3) {
      this.statusMessage.set('Please enter your InstaPay number or username.');
      return;
    }

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      if (!this.pendingPurchaseId()) {
        const purchase = await this.supabase.createManualPurchase(
          pkg.id,
          this.paymentMethod(),
          undefined,
          this.voucherCode().trim() || undefined,
        );
        this.pendingPurchaseId.set(purchase.id);
      }
      await this.supabase.confirmManualPurchaseTransfer({
        purchaseId: this.pendingPurchaseId()!,
        senderPhone: sender,
        senderName: this.senderName().trim() || undefined,
        paymentReference: this.paymentReference().trim() || undefined,
        transferScreenshotUrl: this.screenshotUrl().trim() || undefined,
        userNote: this.userNote().trim() || undefined,
      });
      this.statusMessage.set('Your payment is pending admin review. Coins will be added after approval.');
      this.showTransferForm.set(false);
      this.pendingPurchaseId.set(null);
      this.senderPhone.set('');
      this.senderName.set('');
      this.paymentReference.set('');
      this.screenshotUrl.set('');
      this.userNote.set('');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Could not submit confirmation');
    } finally {
      this.busy.set(false);
    }
  }

  async redeemFreeCoinsVoucher(): Promise<void> {
    const code = this.voucherCode().trim();
    if (code.length < 3) {
      this.statusMessage.set('Enter a valid voucher code.');
      return;
    }

    this.busy.set(true);
    this.statusMessage.set(null);
    try {
      const result = await this.supabase.redeemFreeCoinsVoucher(code);
      this.statusMessage.set(`Voucher ${result.code} redeemed: +${result.coinsAwarded} coins.`);
      this.voucherCode.set('');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Could not redeem voucher');
    } finally {
      this.busy.set(false);
    }
  }
}
