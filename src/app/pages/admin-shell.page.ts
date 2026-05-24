import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserNavComponent } from '../shared/components/user-nav.component';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-admin-shell-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UserNavComponent, TranslocoPipe],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <header class="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur">
        <div class="mx-auto flex h-18 w-full max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <button class="inline-flex items-center" type="button" [routerLink]="localizedRouter.localize('/')">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-11 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-11 w-auto dark:hidden" />
          </button>
          <app-user-nav [showGameLinks]="false" />
        </div>
      </header>

      <div class="mx-auto grid w-full max-w-[1500px] lg:grid-cols-[250px_1fr]">
        <aside class="border-b border-border/70 bg-card/52 lg:min-h-[calc(100vh-72px)] lg:border-b-0 lg:border-r">
          <nav class="grid gap-1.5 p-3">
            <a
              [routerLink]="localizedRouter.localize('/admin')"
              [routerLinkActiveOptions]="{ exact: true }"
              routerLinkActive="bg-primary text-primary-foreground border-primary/50"
              class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold"
            >
              {{ 'admin.nav.overview' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/purchases')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.purchases' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/wallets')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.wallets' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/vouchers')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.vouchers' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/users')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.users' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/matches')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.matches' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/shop')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.shop' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/settings')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.settings' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/audit-logs')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.auditLogs' | transloco }}
            </a>
            <a [routerLink]="localizedRouter.localize('/admin/alerts')" routerLinkActive="bg-primary text-primary-foreground border-primary/50" class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold">
              {{ 'admin.nav.alerts' | transloco }}
            </a>
          </nav>
        </aside>

        <main class="min-h-[calc(100vh-72px)]">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellPage {
  readonly localizedRouter = inject(LocalizedRouterService);
}
