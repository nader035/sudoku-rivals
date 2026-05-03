import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { signalForm } from '@luistabotelho/angular-signal-forms';
import {
  signalFormErrors,
  signalFormSetTouched,
  signalFormValid,
  signalFormValue,
} from '@luistabotelho/angular-signal-forms';
import {
  Email,
  MaxLength,
  MinLength,
  Required,
} from '@luistabotelho/angular-signal-forms/validators';
import { AppStore } from '../store/app.store';
import { SupabaseService } from '../core/services/supabase.service';
import { SignUpCredentials } from '../core/models';
import { SignalFormField } from '../shared/forms/signal-form-helpers';

@Component({
  selector: 'app-sign-up-page',
  standalone: true,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <!-- Background grid -->
      <div
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 opacity-[0.05]"
        style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%); -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);"
      ></div>

      <div class="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <!-- Left panel (form) -->
        <section class="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Create account</div>
              <h1 class="mt-2 text-3xl font-black uppercase italic text-primary">Sign up</h1>
            </div>
            <button class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40" type="button" (click)="goHome()">Home</button>
          </div>

          <div class="mt-6 space-y-5">
            <!-- X OAuth -->
            <button
              class="flex w-full items-center justify-center gap-3 rounded-lg border border-border/60 bg-background/80 px-4 py-3 text-sm font-semibold transition-all hover:border-primary/60 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingUpWithX()"
              (click)="signUpWithX()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              {{ signingUpWithX() ? 'Redirecting...' : 'Continue with X' }}
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-4">
              <div class="h-px flex-1 bg-border/60"></div>
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">or</span>
              <div class="h-px flex-1 bg-border/60"></div>
            </div>

            <!-- Username -->
            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">Username</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signUpForm.username.$currentValue()"
                (input)="setFieldValue(signUpForm.username, $event)"
                (blur)="markTouched(signUpForm.username)"
                type="text"
                placeholder="Choose a username"
              />
              @if (signUpForm.username.$touched() && signUpForm.username.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signUpForm.username.$stateMessage() }}</span>
              }
            </label>

            <!-- Email -->
            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signUpForm.email.$currentValue()"
                (input)="setFieldValue(signUpForm.email, $event)"
                (blur)="markTouched(signUpForm.email)"
                type="email"
                placeholder="you@example.com"
              />
              @if (signUpForm.email.$touched() && signUpForm.email.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signUpForm.email.$stateMessage() }}</span>
              }
            </label>

            <!-- Password -->
            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">Password</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signUpForm.password.$currentValue()"
                (input)="setFieldValue(signUpForm.password, $event)"
                (blur)="markTouched(signUpForm.password)"
                type="password"
                placeholder="Create a password (min 8 chars)"
              />
              @if (signUpForm.password.$touched() && signUpForm.password.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signUpForm.password.$stateMessage() }}</span>
              }
            </label>

            @if (statusMessage()) {
              <div class="rounded-lg border px-4 py-2.5 text-sm"
                [class]="statusMessage()!.includes('Check your email') ? 'border-primary/30 bg-primary/5 text-primary' : 'border-destructive/30 bg-destructive/5 text-destructive'">
                {{ statusMessage() }}
              </div>
            }

            <button
              class="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingUp()"
              (click)="submitSignUp()"
            >
              {{ signingUp() ? 'Creating account...' : 'Create Account' }}
            </button>

            @if (signUpErrors().length > 0) {
              <ul class="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                @for (error of signUpErrors(); track error) {
                  <li>{{ error }}</li>
                }
              </ul>
            }

            <button
              class="w-full rounded-lg border border-border/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/40"
              type="button"
              (click)="goSignIn()"
            >
              Already have an account? <span class="font-bold text-primary">Sign in</span>
            </button>
          </div>
        </section>

        <!-- Right panel -->
        <section class="hidden rounded-3xl border border-border/60 bg-card/70 p-10 shadow-2xl backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div>
            <button class="text-lg font-black uppercase italic text-primary" type="button" (click)="goHome()">Sudoku Rival</button>
            <h2 class="mt-6 text-5xl font-black uppercase italic leading-[0.92] tracking-tight text-primary">
              Join the<br />arena
            </h2>
            <p class="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Create an account to save your stats, build private rooms, and climb the leaderboard.
            </p>
          </div>
          <div class="mt-10 grid gap-4 sm:grid-cols-2">
            <div class="group rounded-xl border border-border/60 bg-background/60 p-5 transition-colors hover:border-primary/40">
              <div class="text-2xl">📊</div>
              <div class="mt-2 text-sm font-bold">Persistent Stats</div>
              <div class="mt-1 text-xs text-muted-foreground">Track wins, times, and progress</div>
            </div>
            <div class="group rounded-xl border border-border/60 bg-background/60 p-5 transition-colors hover:border-primary/40">
              <div class="text-2xl">🔒</div>
              <div class="mt-2 text-sm font-bold">Private Rooms</div>
              <div class="mt-1 text-xs text-muted-foreground">Create password-protected matches</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpPage {
  private readonly router = inject(Router);
  readonly appStore = inject(AppStore);
  readonly supabase = inject(SupabaseService);
  readonly signingUp = signal(false);
  readonly signingUpWithX = signal(false);
  readonly statusMessage = signal<string | null>(null);

  readonly signUpForm = signalForm<SignUpCredentials>({
    username: {
      initialValue: '',
      validators: [Required('Username is required'), MinLength(3), MaxLength(24)],
    },
    email: {
      initialValue: '',
      validators: [Required('Email is required'), Email()],
    },
    password: {
      initialValue: '',
      validators: [Required('Password is required'), MinLength(8)],
    },
  });

  readonly signUpValue = signalFormValue(this.signUpForm);
  readonly signUpValid = signalFormValid(this.signUpForm);
  readonly signUpErrors = signalFormErrors(this.signUpForm);

  readonly redirectEffect = effect(() => {
    if (this.appStore.authLoaded() && this.appStore.isSignedIn()) {
      void this.router.navigateByUrl('/lobby');
    }
  });

  goHome(): void { void this.router.navigateByUrl('/'); }
  goSignIn(): void { void this.router.navigateByUrl('/sign-in'); }

  setFieldValue<T>(field: SignalFormField<T>, event: Event): void {
    const target = event.target as HTMLInputElement;
    field.$currentValue.set(target.value as T);
    field.$touched.set(true);
  }

  markTouched<T>(field: SignalFormField<T>): void {
    field.$touched.set(true);
  }

  async signUpWithX(): Promise<void> {
    this.signingUpWithX.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.signInWithX();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to sign in with X');
      this.signingUpWithX.set(false);
    }
  }

  async submitSignUp(): Promise<void> {
    signalFormSetTouched(this.signUpForm);
    this.statusMessage.set(null);
    if (!this.signUpValid()) return;
    this.signingUp.set(true);
    try {
      await this.supabase.signUp(this.signUpValue());
      this.statusMessage.set('Check your email to confirm your account.');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to create account');
    } finally {
      this.signingUp.set(false);
    }
  }
}
