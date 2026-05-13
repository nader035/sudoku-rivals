import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  Bell,
  ChevronDown,
  Gamepad2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShoppingBag,
  Sun,
  Trophy,
  User,
  Wallet,
  X,
} from 'lucide-angular/src/icons';
import { AppStore } from '../../store/app.store';

@Component({
  selector: 'app-user-nav',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="relative flex items-center justify-end gap-1.5">
      <button
        class="btn-game inline-flex items-center gap-1 border border-border/60 bg-card/70 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/40 hover:bg-muted/40 md:hidden"
        type="button"
        (click)="toggleMobileMenu()"
        aria-label="Toggle navigation"
      >
        <i-lucide [img]="menuOpen() ? CloseIcon : MenuIcon" [size]="14"></i-lucide>
        {{ menuOpen() ? 'Close' : 'Menu' }}
      </button>

      <div class="hidden items-center gap-1.5 md:flex">
        @if (appStore.isSignedIn()) {
          <button
            class="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-card/75 text-foreground transition-colors hover:border-primary/45 hover:bg-muted/35"
            type="button"
            (click)="goNotifications()"
            title="Notifications"
            aria-label="Notifications"
          >
            <i-lucide [img]="BellIcon" [size]="17"></i-lucide>
            @if (appStore.unreadNotifications() > 0) {
              <span class="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold text-primary-foreground">
                {{ appStore.unreadNotifications() > 99 ? '99+' : appStore.unreadNotifications() }}
              </span>
            }
          </button>
        }

        @if (showGameLinks() && appStore.isSignedIn()) {
          <button
            class="hidden h-10 items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/15 xl:inline-flex"
            type="button"
            (click)="goWallet()"
            title="Wallet"
          >
            <i-lucide [img]="WalletIcon" [size]="15"></i-lucide>
            <span class="tabular-nums">{{ appStore.wallet()?.balance ?? 0 }}</span>
            <span class="hidden text-[11px] font-mono uppercase tracking-wider lg:inline">coins</span>
          </button>

          <button
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:shadow-lg hover:shadow-primary/20"
            type="button"
            (click)="goShop()"
            title="Buy coins"
          >
            <i-lucide [img]="ShopIcon" [size]="15"></i-lucide>
            <span>Buy</span>
          </button>
        }

        @if (appStore.authLoaded() && appStore.isSignedIn()) {
          <button
            class="group inline-flex h-10 items-center gap-2 rounded-lg border border-primary/30 bg-card/80 px-2.5 text-left transition-colors hover:border-primary/60 hover:bg-muted/35"
            type="button"
            (click)="toggleDesktopMenu()"
            aria-label="Open account menu"
          >
            <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-mono text-sm font-black uppercase text-primary-foreground">
              {{ avatarInitial() }}
            </span>
            <span class="hidden min-w-0 xl:block">
              <span class="block max-w-[110px] truncate text-sm font-bold leading-tight text-foreground">
                {{ appStore.displayName() }}
              </span>
            </span>
            <i-lucide [img]="ChevronDownIcon" [size]="15" class="text-muted-foreground"></i-lucide>
          </button>
        } @else if (appStore.authLoaded()) {
          <button
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:shadow-lg hover:shadow-primary/20"
            type="button"
            (click)="goSignIn()"
          >
            <i-lucide [img]="LoginIcon" [size]="16"></i-lucide>
            Sign in
          </button>
        }
      </div>

      @if (menuOpen()) {
        <div class="absolute right-0 top-12 z-40 grid min-w-64 gap-2 rounded-2xl border border-border/75 bg-card/95 p-3 shadow-2xl backdrop-blur md:hidden">
          @if (appStore.authLoaded() && appStore.isSignedIn()) {
            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40" type="button" (click)="goProfile()">
              <i-lucide [img]="UserIcon" [size]="16"></i-lucide>
              Profile
            </button>

            @if (showGameLinks()) {
              <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/12 px-3 py-2 text-left text-sm font-semibold text-primary hover:border-primary/60 hover:bg-primary/18" type="button" (click)="goWallet()">
                <i-lucide [img]="WalletIcon" [size]="16"></i-lucide>
                {{ appStore.wallet()?.balance ?? 0 }} coins
              </button>
              <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-left text-sm font-bold text-primary-foreground" type="button" (click)="goShop()">
                <i-lucide [img]="ShopIcon" [size]="16"></i-lucide>
                Buy Coins
              </button>
              <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40" type="button" (click)="goLeaderboard()">
                <i-lucide [img]="TrophyIcon" [size]="16"></i-lucide>
                Leaderboard
              </button>
              <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40" type="button" (click)="goSolo()">
                <i-lucide [img]="SoloIcon" [size]="16"></i-lucide>
                Solo
              </button>
            }

            @if (appStore.isAdmin()) {
              <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40" type="button" (click)="goAdmin()">
                <i-lucide [img]="AdminIcon" [size]="16"></i-lucide>
                Admin
              </button>
            }

            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40" type="button" (click)="toggleTheme()">
              <i-lucide [img]="themeIcon()" [size]="16"></i-lucide>
              {{ themeLabel() }}
            </button>

            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/15" type="button" (click)="signOut()">
              <i-lucide [img]="LogoutIcon" [size]="16"></i-lucide>
              Sign out
            </button>
          } @else {
            <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-left text-sm font-semibold text-primary-foreground" type="button" (click)="goSignIn()">
              <i-lucide [img]="LoginIcon" [size]="16"></i-lucide>
              Sign in
            </button>
          }
        </div>
      }

      @if (desktopMenuOpen() && appStore.authLoaded() && appStore.isSignedIn()) {
        <div class="absolute right-0 top-12 z-40 hidden min-w-56 gap-1 rounded-xl border border-border/70 bg-card/96 p-2 shadow-2xl backdrop-blur md:grid">
          @if (showGameLinks()) {
            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium hover:border-primary/35 hover:bg-muted/35" type="button" (click)="goWallet()">
              <i-lucide [img]="WalletIcon" [size]="16"></i-lucide>
              Wallet: {{ appStore.wallet()?.balance ?? 0 }} coins
            </button>
          }

          <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium hover:border-primary/35 hover:bg-muted/35" type="button" (click)="goProfile()">
            <i-lucide [img]="UserIcon" [size]="16"></i-lucide>
            Profile
          </button>

          @if (showGameLinks()) {
            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium hover:border-primary/35 hover:bg-muted/35" type="button" (click)="goShop()">
              <i-lucide [img]="ShopIcon" [size]="16"></i-lucide>
              Buy coins
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium hover:border-primary/35 hover:bg-muted/35" type="button" (click)="goLeaderboard()">
              <i-lucide [img]="TrophyIcon" [size]="16"></i-lucide>
              Leaderboard
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium hover:border-primary/35 hover:bg-muted/35" type="button" (click)="goSolo()">
              <i-lucide [img]="SoloIcon" [size]="16"></i-lucide>
              Solo
            </button>
          }

          @if (appStore.isAdmin()) {
            <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium hover:border-primary/35 hover:bg-muted/35" type="button" (click)="goAdmin()">
              <i-lucide [img]="AdminIcon" [size]="16"></i-lucide>
              Admin
            </button>
          }

          <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium hover:border-primary/35 hover:bg-muted/35" type="button" (click)="toggleTheme()">
            <i-lucide [img]="themeIcon()" [size]="16"></i-lucide>
            {{ themeLabel() }}
          </button>

          <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium text-destructive hover:border-destructive/35 hover:bg-destructive/12" type="button" (click)="signOut()">
            <i-lucide [img]="LogoutIcon" [size]="16"></i-lucide>
            Sign out
          </button>
        </div>
      }

      @if (liveToast()) {
        <div class="animate-sr-fade-up fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-primary/35 bg-background/95 p-3 shadow-2xl backdrop-blur-sm">
          <div class="flex items-start gap-3">
            <span class="animate-sr-pulse-glow mt-0.5 inline-block h-2.5 w-2.5 rounded-full bg-primary"></span>
            <div class="min-w-0">
              <div class="truncate text-sm font-bold">{{ liveToast()!.title }}</div>
              <div class="mt-1 text-sm text-muted-foreground">{{ liveToast()!.message }}</div>
              <div class="mt-3 flex gap-2">
                <button class="btn-game rounded-md border border-primary/40 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10" type="button" (click)="openToastNotifications()">
                  View
                </button>
                <button class="btn-game rounded-md border border-border/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wider hover:border-primary/40" type="button" (click)="dismissToast()">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserNavComponent {
  private readonly router = inject(Router);
  readonly appStore = inject(AppStore);
  readonly showGameLinks = input(true);
  readonly menuOpen = signal(false);
  readonly desktopMenuOpen = signal(false);
  readonly liveToast = signal<{ id: string; title: string; message: string } | null>(null);
  private readonly latestSeenNotificationId = signal<string | null>(null);
  private readonly notificationsBootstrapped = signal(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly MenuIcon = Menu;
  readonly CloseIcon = X;
  readonly ChevronDownIcon = ChevronDown;
  readonly BellIcon = Bell;
  readonly TrophyIcon = Trophy;
  readonly SoloIcon = Gamepad2;
  readonly AdminIcon = Settings;
  readonly UserIcon = User;
  readonly WalletIcon = Wallet;
  readonly ShopIcon = ShoppingBag;
  readonly LogoutIcon = LogOut;
  readonly LoginIcon = LogIn;
  readonly themeIcon = computed(() => (this.appStore.theme() === 'dark' ? Sun : Moon));

  readonly themeLabel = computed(() => {
    const theme = this.appStore.theme();
    if (theme === 'system') return 'System';
    return theme === 'dark' ? 'Light' : 'Dark';
  });

  readonly avatarInitial = computed(() => {
    const name = this.appStore.displayName().trim();
    return (name[0] ?? 'P').toUpperCase();
  });

  constructor() {
    effect(() => {
      if (!this.appStore.isSignedIn()) {
        this.notificationsBootstrapped.set(false);
        this.latestSeenNotificationId.set(null);
        this.clearToastTimer();
        this.liveToast.set(null);
        this.menuOpen.set(false);
        this.desktopMenuOpen.set(false);
        return;
      }

      const notifications = this.appStore.notifications();
      if (notifications.length === 0) return;

      const latest = notifications[0];
      if (!this.notificationsBootstrapped()) {
        this.notificationsBootstrapped.set(true);
        this.latestSeenNotificationId.set(latest.id);
        return;
      }

      if (!latest.isRead && this.latestSeenNotificationId() !== latest.id) {
        this.latestSeenNotificationId.set(latest.id);
        this.liveToast.set({
          id: latest.id,
          title: latest.title,
          message: latest.message,
        });
        this.clearToastTimer();
        this.toastTimer = setTimeout(() => this.liveToast.set(null), 7000);
      }
    });
  }

  toggleMobileMenu(): void {
    this.desktopMenuOpen.set(false);
    this.menuOpen.set(!this.menuOpen());
  }

  toggleDesktopMenu(): void {
    this.menuOpen.set(false);
    this.desktopMenuOpen.set(!this.desktopMenuOpen());
  }

  goLeaderboard(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/leaderboard');
  }

  goSolo(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/play/solo');
  }

  goSignIn(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/sign-in');
  }

  goProfile(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/profile');
  }

  goAdmin(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/admin');
  }

  goShop(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/shop');
  }

  goWallet(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/wallet');
  }

  goNotifications(): void {
    this.closeMenus();
    void this.router.navigateByUrl('/notifications');
  }

  openToastNotifications(): void {
    this.dismissToast();
    void this.router.navigateByUrl('/notifications');
  }

  dismissToast(): void {
    this.clearToastTimer();
    this.liveToast.set(null);
  }

  private clearToastTimer(): void {
    if (!this.toastTimer) return;
    clearTimeout(this.toastTimer);
    this.toastTimer = null;
  }

  toggleTheme(): void {
    this.closeMenus();
    this.appStore.toggleTheme();
  }

  async signOut(): Promise<void> {
    this.closeMenus();
    await this.appStore.signOut();
    await this.router.navigateByUrl('/');
  }

  private closeMenus(): void {
    this.menuOpen.set(false);
    this.desktopMenuOpen.set(false);
  }
}
