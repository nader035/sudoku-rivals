import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div class="w-full max-w-md rounded-md border border-border/60 bg-card/70 p-6 text-center shadow-xl">
        <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">X sign in</div>
        <h1 class="mt-3 text-2xl font-black uppercase italic text-primary">
          {{ error() ? 'Unable to sign in' : 'Finishing sign in' }}
        </h1>
        <p class="mt-4 text-sm text-muted-foreground">
          {{ error() || 'Creating your Sudoku Rival profile and taking you to the lobby.' }}
        </p>
        @if (error()) {
          <button
            class="mt-6 rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            type="button"
            (click)="goSignIn()"
          >
            Back to sign in
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackPage implements OnInit {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
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
      this.error.set(error instanceof Error ? error.message : 'Unable to complete X sign in');
    }
  }

  goSignIn(): void {
    void this.router.navigateByUrl('/sign-in');
  }

  private safeNext(next: string | null): string {
    if (!next || !next.startsWith('/') || next.startsWith('//')) return '/lobby';
    return next;
  }
}
