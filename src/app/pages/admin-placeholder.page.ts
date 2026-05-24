import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-admin-placeholder-page',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="h-full border-t border-border/60 bg-background/55 px-4 py-6 md:px-6">
      <div class="surface-panel max-w-4xl rounded-2xl p-6">
        <div class="text-ui-kicker text-primary">{{ 'common.admin' | transloco }}</div>
        <h1 class="mt-2 text-3xl font-black tracking-tight">{{ title() }}</h1>
        <p class="mt-3 text-sm font-mono text-muted-foreground">
          {{ 'admin.placeholder.description' | transloco }}
        </p>
        <button
          class="btn-game mt-4 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
          type="button"
          (click)="goAdmin()"
        >
          {{ 'admin.placeholder.back' | transloco }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlaceholderPage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);

  title() {
    const title = this.route.snapshot.data['title'];
    return title ? this.i18n.t(`admin.nav.${this.titleKey(String(title))}`) : this.i18n.t('admin.placeholder.title');
  }

  private titleKey(title: string): string {
    const map: Record<string, string> = {
      Users: 'users',
      'User Details': 'userDetails',
      Transactions: 'transactions',
      Matches: 'matches',
      'Match Details': 'matchDetails',
      Shop: 'shop',
      Leaderboard: 'leaderboard',
      Settings: 'settings',
      Disputes: 'disputes',
      'Audit Logs': 'auditLogs',
      Alerts: 'alerts',
    };
    return map[title] ?? 'overview';
  }

  goAdmin(): void {
    void this.localizedRouter.navigate('/admin');
  }
}
