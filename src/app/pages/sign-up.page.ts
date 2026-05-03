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
    <div
      class="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground"
    >
      <div class="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section
          class="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">
                Create account
              </div>
              <h1 class="mt-2 text-3xl font-black uppercase italic text-primary">Sign up</h1>
            </div>
            <button
              class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/40"
              type="button"
              (click)="goHome()"
            >
              Home
            </button>
          </div>

          <div class="mt-6 space-y-6">
            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground"
                >Username</span
              >
              <input
                class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                [value]="signUpForm.username.$currentValue()"
                (input)="setFieldValue(signUpForm.username, $event)"
                (blur)="markTouched(signUpForm.username)"
                type="text"
                placeholder="Choose a username"
              />
              @if (signUpForm.username.$touched() && signUpForm.username.$stateMessage()) {
                <span class="text-xs text-destructive">{{
                  signUpForm.username.$stateMessage()
                }}</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground"
                >Email</span
              >
              <input
                class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
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

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground"
                >Password</span
              >
              <input
                class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                [value]="signUpForm.password.$currentValue()"
                (input)="setFieldValue(signUpForm.password, $event)"
                (blur)="markTouched(signUpForm.password)"
                type="password"
                placeholder="Create a password"
              />
              @if (signUpForm.password.$touched() && signUpForm.password.$stateMessage()) {
                <span class="text-xs text-destructive">{{
                  signUpForm.password.$stateMessage()
                }}</span>
              }
            </label>

            @if (statusMessage()) {
              <div
                class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {{ statusMessage() }}
              </div>
            }

            <button
              class="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingUp()"
              (click)="submitSignUp()"
            >
              {{ signingUp() ? 'Creating account...' : 'Create account' }}
            </button>

            @if (signUpErrors().length > 0) {
              <ul
                class="space-y-1 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground"
              >
                @for (error of signUpErrors(); track error) {
                  <li>{{ error }}</li>
                }
              </ul>
            }

            <button
              class="w-full rounded-md border border-border/60 px-4 py-3 text-sm font-medium hover:bg-muted/40"
              type="button"
              (click)="goSignIn()"
            >
              Already have an account? Sign in
            </button>
          </div>
        </section>

        <section
          class="hidden rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur lg:block"
        >
          <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Welcome</div>
          <h2
            class="mt-4 text-5xl font-black uppercase italic leading-[0.95] tracking-tight text-primary"
          >
            Join the arena
          </h2>
          <p class="mt-5 max-w-md text-base text-muted-foreground">
            Create an account to save your stats, build private rooms, and climb the leaderboard.
          </p>
          <div class="mt-10 grid gap-4 sm:grid-cols-2">
            <div class="rounded-md border border-border/60 bg-background/60 p-4">
              <div class="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Stats
              </div>
              <div class="mt-2 text-xl font-black text-primary">Persistent progress</div>
            </div>
            <div class="rounded-md border border-border/60 bg-background/60 p-4">
              <div class="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Rooms
              </div>
              <div class="mt-2 text-xl font-black text-primary">Create private matches</div>
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

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goSignIn(): void {
    void this.router.navigateByUrl('/sign-in');
  }

  setFieldValue<T>(field: SignalFormField<T>, event: Event): void {
    const target = event.target as HTMLInputElement;
    field.$currentValue.set(target.value as T);
    field.$touched.set(true);
  }

  markTouched<T>(field: SignalFormField<T>): void {
    field.$touched.set(true);
  }

  async submitSignUp(): Promise<void> {
    signalFormSetTouched(this.signUpForm);
    this.statusMessage.set(null);

    if (!this.signUpValid()) return;

    this.signingUp.set(true);

    try {
      await this.supabase.signUp(this.signUpValue());
      await this.router.navigateByUrl('/lobby');
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to create account');
    } finally {
      this.signingUp.set(false);
    }
  }
}
