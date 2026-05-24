import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
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
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-sign-up-page',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div class="pointer-events-none fixed inset-0 bg-background"></div>

      <div class="relative z-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section class="surface-panel rounded-3xl p-6 shadow-2xl sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-ui-kicker text-primary">{{ 'auth.signUp.kicker' | transloco }}</div>
              <h1 class="mt-2 text-3xl font-black uppercase tracking-tight text-primary">{{ 'common.signUp' | transloco }}</h1>
            </div>
            <button class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40" type="button" (click)="goHome()">{{ 'common.home' | transloco }}</button>
          </div>

          <div class="mt-6 space-y-5">
            <button
              class="btn-game flex w-full items-center justify-center gap-3 rounded-lg border border-border/60 bg-background/80 px-4 py-3 text-sm font-semibold transition-all hover:border-primary/60 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingUpWithX()"
              (click)="signUpWithX()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              {{ (signingUpWithX() ? 'auth.redirecting' : 'auth.continueWithX') | transloco }}
            </button>

            <div class="flex items-center gap-4">
              <div class="h-px flex-1 bg-border/60"></div>
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'auth.or' | transloco }}</span>
              <div class="h-px flex-1 bg-border/60"></div>
            </div>

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'auth.username' | transloco }}</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signUpForm.username.$currentValue()"
                (input)="setFieldValue(signUpForm.username, $event)"
                (blur)="markTouched(signUpForm.username)"
                type="text"
                [placeholder]="'auth.signUp.usernamePlaceholder' | transloco"
              />
              @if (signUpForm.username.$touched() && signUpForm.username.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signUpForm.username.$stateMessage() }}</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'common.email' | transloco }}</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signUpForm.email.$currentValue()"
                (input)="setFieldValue(signUpForm.email, $event)"
                (blur)="markTouched(signUpForm.email)"
                type="email"
                [placeholder]="'auth.emailPlaceholder' | transloco"
              />
              @if (signUpForm.email.$touched() && signUpForm.email.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signUpForm.email.$stateMessage() }}</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'common.password' | transloco }}</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signUpForm.password.$currentValue()"
                (input)="setFieldValue(signUpForm.password, $event)"
                (blur)="markTouched(signUpForm.password)"
                type="password"
                [placeholder]="'auth.signUp.passwordPlaceholder' | transloco"
              />
              @if (signUpForm.password.$touched() && signUpForm.password.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signUpForm.password.$stateMessage() }}</span>
              }
            </label>

            @if (statusMessage()) {
              <div class="rounded-lg border px-4 py-2.5 text-sm"
                [class]="statusSuccess() ? 'border-primary/30 bg-primary/5 text-primary' : 'border-destructive/30 bg-destructive/5 text-destructive'">
                {{ statusMessage() }}
              </div>
            }

            <button
              class="btn-game w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingUp()"
              (click)="submitSignUp()"
            >
              {{ (signingUp() ? 'auth.signUp.creating' : 'auth.signUp.createAccount') | transloco }}
            </button>

            @if (signUpErrors().length > 0) {
              <ul class="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                @for (error of signUpErrors(); track error) {
                  <li>{{ error }}</li>
                }
              </ul>
            }

            <button
              class="btn-game w-full rounded-lg border border-border/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/40"
              type="button"
              (click)="goSignIn()"
            >
              {{ 'auth.signUp.haveAccount' | transloco }} <span class="font-bold text-primary">{{ 'common.signIn' | transloco }}</span>
            </button>
          </div>
        </section>

        <section class="surface-panel hidden rounded-3xl p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <button class="inline-flex items-center" type="button" (click)="goHome()">
              <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-10 w-auto dark:block" />
              <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-10 w-auto dark:hidden" />
            </button>
            <h2 class="mt-6 text-5xl font-black uppercase leading-[0.92] tracking-tight text-primary">
              {{ 'auth.signUp.heroLine1' | transloco }}
              {{ 'auth.signUp.heroLine2' | transloco }}
            </h2>
            <p class="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              {{ 'auth.signUp.heroDescription' | transloco }}
            </p>
          </div>
          <div class="mt-10 grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-border/60 bg-background/60 p-5">
              <div class="text-ui-kicker text-primary">{{ 'auth.signUp.cards.statsKicker' | transloco }}</div>
              <div class="mt-2 text-sm font-bold">{{ 'auth.signUp.cards.progress' | transloco }}</div>
              <div class="mt-1 text-xs text-muted-foreground">{{ 'auth.signUp.cards.track' | transloco }}</div>
            </div>
            <div class="rounded-xl border border-border/60 bg-background/60 p-5">
              <div class="text-ui-kicker text-primary">{{ 'auth.signUp.cards.roomsKicker' | transloco }}</div>
              <div class="mt-2 text-sm font-bold">{{ 'auth.signUp.cards.privateMatches' | transloco }}</div>
              <div class="mt-1 text-xs text-muted-foreground">{{ 'auth.signUp.cards.privateDescription' | transloco }}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpPage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly i18n = inject(I18nService);
  readonly appStore = inject(AppStore);
  readonly supabase = inject(SupabaseService);
  readonly signingUp = signal(false);
  readonly signingUpWithX = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly statusSuccess = signal(false);

  readonly signUpForm = signalForm<SignUpCredentials>({
    username: {
      initialValue: '',
      validators: [Required(this.i18n.t('auth.errors.usernameRequired')), MinLength(3), MaxLength(24)],
    },
    email: {
      initialValue: '',
      validators: [Required(this.i18n.t('auth.errors.emailRequired')), Email()],
    },
    password: {
      initialValue: '',
      validators: [Required(this.i18n.t('auth.errors.passwordRequired')), MinLength(8)],
    },
  });

  readonly signUpValue = signalFormValue(this.signUpForm);
  readonly signUpValid = signalFormValid(this.signUpForm);
  readonly signUpErrors = signalFormErrors(this.signUpForm);

  readonly redirectEffect = effect(() => {
    if (this.appStore.authLoaded() && this.appStore.isSignedIn()) {
      void this.localizedRouter.navigate('/lobby');
    }
  });

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }
  goSignIn(): void {
    void this.localizedRouter.navigate('/sign-in');
  }

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
    this.statusSuccess.set(false);
    try {
      await this.supabase.signInWithX();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('auth.errors.signInWithX'));
      this.signingUpWithX.set(false);
    }
  }

  async submitSignUp(): Promise<void> {
    signalFormSetTouched(this.signUpForm);
    this.statusMessage.set(null);
    this.statusSuccess.set(false);
    if (!this.signUpValid()) return;
    this.signingUp.set(true);
    try {
      await this.supabase.signUp(this.signUpValue());
      this.statusSuccess.set(true);
      this.statusMessage.set(this.i18n.t('auth.signUp.checkEmail'));
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('auth.errors.createAccount'));
    } finally {
      this.signingUp.set(false);
    }
  }
}
