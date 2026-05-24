import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div class="w-full max-w-md rounded-md border border-border/60 bg-card/70 p-6 text-center shadow-xl">
        <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">{{ 'auth.callback.kicker' | transloco }}</div>
        <h1 class="mt-3 text-2xl font-black uppercase italic text-primary">
          {{ (error() ? 'auth.callback.errorTitle' : 'auth.callback.loadingTitle') | transloco }}
        </h1>
        <p class="mt-4 text-sm text-muted-foreground">
          {{ error() || ('auth.callback.description' | transloco) }}
        </p>
        @if (error()) {
          <button
            class="mt-6 rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            type="button"
            (click)="goSignIn()"
          >
            {{ 'auth.callback.back' | transloco }}
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackPage implements OnInit {
  private readonly router = inject(Router);
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly supabase = inject(SupabaseService);
  private readonly i18n = inject(I18nService);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const url = new URL(globalThis.location.href);
    const code = url.searchParams.get('code');
    const next = this.safeNext(url.searchParams.get('next'));

    try {
      if (code) {
        try {
          await this.supabase.completeOAuthSignIn(code);
        } catch (exchangeError) {
          // If the code was already processed (or the PKCE verifier is gone), continue with the active session.
          try {
            await this.supabase.completeCurrentSessionProfile();
          } catch {
            throw exchangeError;
          }
        }
      } else {
        await this.supabase.completeCurrentSessionProfile();
      }

      await this.router.navigateByUrl(next);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : this.i18n.t('auth.callback.errors.complete'));
    }
  }

  goSignIn(): void {
    void this.localizedRouter.navigate('/sign-in');
  }

  private safeNext(next: string | null): string {
    if (!next || !next.startsWith('/') || next.startsWith('//')) {
      return this.localizedRouter.localize('/lobby');
    }
    return next;
  }
}
