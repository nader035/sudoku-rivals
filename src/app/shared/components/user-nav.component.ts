import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../../store/app.store';

@Component({
  selector: 'app-user-nav',
  standalone: true,
  template: `
    <div class="relative flex items-center justify-end">
      <button
        class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-muted/40 md:hidden"
        type="button"
        (click)="menuOpen.set(!menuOpen())"
        aria-label="Toggle navigation"
      >
        Menu
      </button>

      <div
        class="absolute right-0 top-11 z-40 grid min-w-56 gap-2 rounded-md border border-border/60 bg-background p-2 shadow-xl md:static md:flex md:min-w-0 md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none"
        [class.hidden]="!menuOpen()"
        [class.md:flex]="true"
      >
        @if (showGameLinks()) {
          @if (appStore.isSignedIn()) {
            <button
              class="relative rounded-md border border-border/60 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40"
              type="button"
              (click)="goNotifications()"
              title="Notifications"
              aria-label="Notifications"
            >
              <span class="inline-flex items-center gap-2">
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                <span>Alerts</span>
              </span>
              @if (appStore.unreadNotifications() > 0) {
                <span
                  class="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold text-primary-foreground"
                >
                  {{ appStore.unreadNotifications() > 99 ? '99+' : appStore.unreadNotifications() }}
                </span>
              }
            </button>
            <button
              class="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-left text-xs font-mono font-bold uppercase tracking-wider text-primary hover:border-primary/70 hover:bg-primary/15"
              type="button"
              (click)="goWallet()"
            >
              {{ appStore.wallet()?.balance ?? 0 }} Coins
            </button>
            <button
              class="rounded-md bg-primary px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              type="button"
              (click)="goShop()"
            >
              Buy Coins
            </button>
          }
          <button
            class="rounded-md border border-border/60 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40"
            type="button"
            (click)="goLeaderboard()"
          >
            Leaderboard
          </button>
          <button
            class="rounded-md border border-border/60 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40"
            type="button"
            (click)="goSolo()"
          >
            Solo
          </button>
        }
        @if (appStore.isAdmin()) {
          <button
            class="rounded-md border border-border/60 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40"
            type="button"
            (click)="goAdmin()"
          >
            Admin
          </button>
        }

        <button
          class="rounded-md border border-border/60 px-3 py-2 text-left text-sm font-medium hover:border-primary/40 hover:bg-muted/40"
          type="button"
          (click)="toggleTheme()"
        >
          {{ themeLabel() }}
        </button>

        @if (appStore.authLoaded() && appStore.isSignedIn()) {
          <button
            class="group flex max-w-[190px] items-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-left transition-colors hover:border-primary/70 hover:bg-primary/15"
            type="button"
            (click)="goProfile()"
            title="Open profile"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-sm font-black uppercase text-primary-foreground"
            >
              {{ avatarInitial() }}
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-bold leading-tight text-foreground">
                {{ appStore.displayName() }}
              </span>
              <span class="block text-[10px] font-mono uppercase tracking-wider text-primary">
                Profile
              </span>
            </span>
          </button>
          <button
            class="rounded-md border border-border/60 px-3 py-2 text-left text-sm font-medium hover:border-destructive/40 hover:text-destructive"
            type="button"
            (click)="signOut()"
          >
            Sign out
          </button>
        } @else if (appStore.authLoaded()) {
          <button
            class="rounded-md bg-primary px-4 py-2 text-left text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            type="button"
            (click)="goSignIn()"
          >
            Sign in
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserNavComponent {
  private readonly router = inject(Router);
  readonly appStore = inject(AppStore);
  readonly showGameLinks = input(true);
  readonly menuOpen = signal(false);

  readonly themeLabel = computed(() => {
    const theme = this.appStore.theme();
    if (theme === 'system') return 'System';
    return theme === 'dark' ? 'Light' : 'Dark';
  });

  readonly avatarInitial = computed(() => {
    const name = this.appStore.displayName().trim();
    return (name[0] ?? 'P').toUpperCase();
  });

  goLeaderboard(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/leaderboard');
  }

  goSolo(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/play/solo');
  }

  goSignIn(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/sign-in');
  }

  goProfile(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/profile');
  }

  goAdmin(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/admin');
  }

  goShop(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/shop');
  }

  goWallet(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/wallet');
  }

  goNotifications(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/notifications');
  }

  toggleTheme(): void {
    this.menuOpen.set(false);
    this.appStore.toggleTheme();
  }

  async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.appStore.signOut();
    await this.router.navigateByUrl('/');
  }
}
