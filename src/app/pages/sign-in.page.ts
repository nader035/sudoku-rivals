import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { signalForm } from '@luistabotelho/angular-signal-forms';
import {
  signalFormErrors,
  signalFormSetTouched,
  signalFormValid,
  signalFormValue,
  resetSignalForm,
} from '@luistabotelho/angular-signal-forms';
import {
  Email,
  MaxLength,
  MinLength,
  Required,
} from '@luistabotelho/angular-signal-forms/validators';
import { AppStore } from '../store/app.store';
import { SupabaseService } from '../core/services/supabase.service';
import { AuthCredentials, GuestCredentials } from '../core/models';
import { SignalFormField } from '../shared/forms/signal-form-helpers';

@Component({
  selector: 'app-sign-in-page',
  standalone: true,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <!-- Background grid -->
      <div
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 opacity-[0.05]"
        style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%); -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);"
      ></div>

      <div class="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <!-- Left panel -->
        <section class="hidden rounded-3xl border border-border/60 bg-card/70 p-10 shadow-2xl backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div>
            <button class="text-lg font-black uppercase italic text-primary" type="button" (click)="goHome()">Sudoku Rival</button>
            <h1 class="mt-6 text-5xl font-black uppercase italic leading-[0.92] tracking-tight text-primary">
              Enter the<br />arena
            </h1>
            <p class="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Sign in to create rooms, track your progress, and challenge rivals in real time.
            </p>
          </div>
          <div class="mt-10 grid gap-4 sm:grid-cols-2">
            <div class="group rounded-xl border border-border/60 bg-background/60 p-5 transition-colors hover:border-primary/40">
              <div class="text-2xl">⚔️</div>
              <div class="mt-2 text-sm font-bold">Live Rooms</div>
              <div class="mt-1 text-xs text-muted-foreground">Real-time multiplayer matches</div>
            </div>
            <div class="group rounded-xl border border-border/60 bg-background/60 p-5 transition-colors hover:border-primary/40">
              <div class="text-2xl">🏆</div>
              <div class="mt-2 text-sm font-bold">Global Leaderboard</div>
              <div class="mt-1 text-xs text-muted-foreground">Climb the competitive ranks</div>
            </div>
          </div>
        </section>

        <!-- Right panel (form) -->
        <section class="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Welcome back</div>
              <h2 class="mt-2 text-3xl font-black uppercase italic text-primary">Sign in</h2>
            </div>
            <button class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40" type="button" (click)="goHome()">Home</button>
          </div>

          <div class="mt-6 space-y-5">
            <!-- Twitter OAuth -->
            <button
              class="flex w-full items-center justify-center gap-3 rounded-lg border border-border/60 bg-background/80 px-4 py-3 text-sm font-semibold transition-all hover:border-primary/60 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingInWithTwitter()"
              (click)="signInWithTwitter()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              {{ signingInWithTwitter() ? 'Redirecting...' : 'Continue with X' }}
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-4">
              <div class="h-px flex-1 bg-border/60"></div>
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">or</span>
              <div class="h-px flex-1 bg-border/60"></div>
            </div>

            <!-- Email / Password -->
            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signInForm.email.$currentValue()"
                (input)="setFieldValue(signInForm.email, $event)"
                (blur)="markTouched(signInForm.email)"
                type="email"
                placeholder="you@example.com"
              />
              @if (signInForm.email.$touched() && signInForm.email.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signInForm.email.$stateMessage() }}</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">Password</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signInForm.password.$currentValue()"
                (input)="setFieldValue(signInForm.password, $event)"
                (blur)="markTouched(signInForm.password)"
                type="password"
                placeholder="Password"
              />
              @if (signInForm.password.$touched() && signInForm.password.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signInForm.password.$stateMessage() }}</span>
              }
            </label>

            @if (statusMessage()) {
              <div class="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                {{ statusMessage() }}
              </div>
            }

            <button
              class="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingIn()"
              (click)="submitSignIn()"
            >
              {{ signingIn() ? 'Signing in...' : 'Sign in with Email' }}
            </button>

            <!-- Guest section -->
            <div class="rounded-2xl border border-border/60 bg-background/60 p-5">
              <div class="flex items-center gap-2">
                <span class="text-lg">👤</span>
                <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Quick play</div>
              </div>
              <label class="mt-3 block space-y-2">
                <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">Guest username</span>
                <input
                  class="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                  [value]="guestForm.username.$currentValue()"
                  (input)="setFieldValue(guestForm.username, $event)"
                  (blur)="markTouched(guestForm.username)"
                  type="text"
                  placeholder="Choose a username"
                />
                @if (guestForm.username.$touched() && guestForm.username.$stateMessage()) {
                  <span class="text-xs text-destructive">{{ guestForm.username.$stateMessage() }}</span>
                }
              </label>
              <button
                class="mt-4 w-full rounded-lg border border-border/60 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                [disabled]="guestSigningIn()"
                (click)="submitGuestSignIn()"
              >
                {{ guestSigningIn() ? 'Entering...' : 'Play as Guest' }}
              </button>
            </div>

            @if (signInErrors().length > 0) {
              <ul class="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                @for (error of signInErrors(); track error) {
                  <li>{{ error }}</li>
                }
              </ul>
            }

            <button
              class="w-full rounded-lg border border-border/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/40"
              type="button"
              (click)="goSignUp()"
            >
              Need an account? <span class="font-bold text-primary">Sign up</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly router = inject(Router);
  readonly appStore = inject(AppStore);
  readonly supabase = inject(SupabaseService);
  readonly signingIn = signal(false);
  readonly guestSigningIn = signal(false);
  readonly signingInWithTwitter = signal(false);
  readonly statusMessage = signal<string | null>(null);

  readonly signInForm = signalForm<AuthCredentials>({
    email: {
      initialValue: '',
      validators: [Required('Email is required'), Email()],
    },
    password: {
      initialValue: '',
      validators: [Required('Password is required'), MinLength(8)],
    },
  });

  readonly guestForm = signalForm<GuestCredentials>({
    username: {
      initialValue: '',
      validators: [Required('Username is required'), MinLength(3), MaxLength(24)],
    },
  });

  readonly signInValue = signalFormValue(this.signInForm);
  readonly guestValue = signalFormValue(this.guestForm);
  readonly signInValid = signalFormValid(this.signInForm);
  readonly signInErrors = signalFormErrors(this.signInForm);

  readonly redirectEffect = effect(() => {
    if (this.appStore.authLoaded() && this.appStore.isSignedIn()) {
      void this.router.navigateByUrl('/lobby');
    }
  });

  goHome(): void { void this.router.navigateByUrl('/'); }
  goSignUp(): void { void this.router.navigateByUrl('/sign-up'); }

  setFieldValue<T>(field: SignalFormField<T>, event: Event): void {
    const target = event.target as HTMLInputElement;
    field.$currentValue.set(target.value as T);
    field.$touched.set(true);
  }

  markTouched<T>(field: SignalFormField<T>): void {
    field.$touched.set(true);
  }

  async signInWithTwitter(): Promise<void> {
    this.signingInWithTwitter.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.signInWithTwitter();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to sign in with X');
      this.signingInWithTwitter.set(false);
    }
  }

  async submitSignIn(): Promise<void> {
    signalFormSetTouched(this.signInForm);
    this.statusMessage.set(null);
    if (!this.signInValid()) return;
    this.signingIn.set(true);
    try {
      await this.supabase.signInWithPassword(this.signInValue() as AuthCredentials);
      await this.router.navigateByUrl('/lobby');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      this.signingIn.set(false);
    }
  }

  async submitGuestSignIn(): Promise<void> {
    signalFormSetTouched(this.guestForm);
    this.statusMessage.set(null);
    if (!this.guestForm.username.$valid()) return;
    this.guestSigningIn.set(true);
    try {
      await this.supabase.signInAsGuest(this.guestValue() as GuestCredentials);
      await this.router.navigateByUrl('/lobby');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to enter as guest');
    } finally {
      this.guestSigningIn.set(false);
    }
  }
}
