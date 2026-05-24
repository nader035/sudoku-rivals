import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { AuthCredentials, GuestCredentials } from '../core/models';
import { SignalFormField } from '../shared/forms/signal-form-helpers';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';

@Component({
  selector: 'app-sign-in-page',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div class="pointer-events-none fixed inset-0 bg-background"></div>

      <div class="relative z-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section class="surface-panel hidden rounded-3xl p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <button class="inline-flex items-center" type="button" (click)="goHome()">
              <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-10 w-auto dark:block" />
              <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-10 w-auto dark:hidden" />
            </button>
            <h1 class="mt-6 text-5xl font-black uppercase leading-[0.92] tracking-tight text-primary">
              {{ 'auth.signIn.heroLine1' | transloco }}
              {{ 'auth.signIn.heroLine2' | transloco }}
            </h1>
            <p class="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              {{ 'auth.signIn.heroDescription' | transloco }}
            </p>
          </div>
          <div class="mt-10 grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-border/60 bg-background/60 p-5">
              <div class="text-ui-kicker text-primary">{{ 'auth.signIn.cards.realtimeKicker' | transloco }}</div>
              <div class="mt-2 text-sm font-bold">{{ 'auth.signIn.cards.liveRooms' | transloco }}</div>
              <div class="mt-1 text-xs text-muted-foreground">{{ 'auth.signIn.cards.syncedMatches' | transloco }}</div>
            </div>
            <div class="rounded-xl border border-border/60 bg-background/60 p-5">
              <div class="text-ui-kicker text-primary">{{ 'auth.signIn.cards.rankedKicker' | transloco }}</div>
              <div class="mt-2 text-sm font-bold">{{ 'auth.signIn.cards.globalLeaderboard' | transloco }}</div>
              <div class="mt-1 text-xs text-muted-foreground">{{ 'auth.signIn.cards.compete' | transloco }}</div>
            </div>
          </div>
        </section>

        <section class="surface-panel rounded-3xl p-6 shadow-2xl sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-ui-kicker text-primary">{{ 'auth.signIn.kicker' | transloco }}</div>
              <h2 class="mt-2 text-3xl font-black uppercase tracking-tight text-primary">{{ 'common.signIn' | transloco }}</h2>
            </div>
            <button class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40" type="button" (click)="goHome()">{{ 'common.home' | transloco }}</button>
          </div>

          <div class="mt-6 space-y-5">
            <button
              class="btn-game flex w-full items-center justify-center gap-3 rounded-lg border border-border/60 bg-background/80 px-4 py-3 text-sm font-semibold transition-all hover:border-primary/60 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingInWithX()"
              (click)="signInWithX()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              {{ (signingInWithX() ? 'auth.redirecting' : 'auth.continueWithX') | transloco }}
            </button>

            <div class="flex items-center gap-4">
              <div class="h-px flex-1 bg-border/60"></div>
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'auth.or' | transloco }}</span>
              <div class="h-px flex-1 bg-border/60"></div>
            </div>

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'common.email' | transloco }}</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signInForm.email.$currentValue()"
                (input)="setFieldValue(signInForm.email, $event)"
                (blur)="markTouched(signInForm.email)"
                type="email"
                [placeholder]="'auth.emailPlaceholder' | transloco"
              />
              @if (signInForm.email.$touched() && signInForm.email.$stateMessage()) {
                <span class="text-xs text-destructive">{{ signInForm.email.$stateMessage() }}</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'common.password' | transloco }}</span>
              <input
                class="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                [value]="signInForm.password.$currentValue()"
                (input)="setFieldValue(signInForm.password, $event)"
                (blur)="markTouched(signInForm.password)"
                type="password"
                [placeholder]="'common.password' | transloco"
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
              class="btn-game w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              [disabled]="signingIn()"
              (click)="submitSignIn()"
            >
              {{ (signingIn() ? 'auth.signIn.signingIn' : 'auth.signIn.withEmail') | transloco }}
            </button>

            @if (signInErrors().length > 0) {
              <ul class="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                @for (error of signInErrors(); track error) {
                  <li>{{ error }}</li>
                }
              </ul>
            }

            <button
              class="btn-game w-full rounded-lg border border-border/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/40"
              type="button"
              (click)="goSignUp()"
            >
              {{ 'auth.signIn.needAccount' | transloco }} <span class="font-bold text-primary">{{ 'common.signUp' | transloco }}</span>
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
  private readonly route = inject(ActivatedRoute);
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly i18n = inject(I18nService);
  readonly appStore = inject(AppStore);
  readonly supabase = inject(SupabaseService);
  readonly signingIn = signal(false);
  readonly guestSigningIn = signal(false);
  readonly signingInWithX = signal(false);
  readonly statusMessage = signal<string | null>(null);

  readonly signInForm = signalForm<AuthCredentials>({
    email: {
      initialValue: '',
      validators: [Required(this.i18n.t('auth.errors.emailRequired')), Email()],
    },
    password: {
      initialValue: '',
      validators: [Required(this.i18n.t('auth.errors.passwordRequired')), MinLength(8)],
    },
  });

  readonly guestForm = signalForm<GuestCredentials>({
    username: {
      initialValue: '',
      validators: [Required(this.i18n.t('auth.errors.usernameRequired')), MinLength(3), MaxLength(24)],
    },
  });

  readonly signInValue = signalFormValue(this.signInForm);
  readonly guestValue = signalFormValue(this.guestForm);
  readonly signInValid = signalFormValid(this.signInForm);
  readonly signInErrors = signalFormErrors(this.signInForm);

  readonly redirectEffect = effect(() => {
    if (this.appStore.authLoaded() && this.appStore.isSignedIn()) {
      void this.router.navigateByUrl(this.nextUrl());
    }
  });

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }
  goSignUp(): void {
    void this.localizedRouter.navigate('/sign-up');
  }

  setFieldValue<T>(field: SignalFormField<T>, event: Event): void {
    const target = event.target as HTMLInputElement;
    field.$currentValue.set(target.value as T);
    field.$touched.set(true);
  }

  markTouched<T>(field: SignalFormField<T>): void {
    field.$touched.set(true);
  }

  async signInWithX(): Promise<void> {
    this.signingInWithX.set(true);
    this.statusMessage.set(null);
    try {
      await this.supabase.signInWithX(this.nextUrl());
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('auth.errors.signInWithX'));
      this.signingInWithX.set(false);
    }
  }

  async submitSignIn(): Promise<void> {
    signalFormSetTouched(this.signInForm);
    this.statusMessage.set(null);
    if (!this.signInValid()) return;
    this.signingIn.set(true);
    try {
      await this.supabase.signInWithPassword(this.signInValue() as AuthCredentials);
      await this.router.navigateByUrl(this.nextUrl());
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('auth.errors.signIn'));
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
      await this.router.navigateByUrl(this.nextUrl());
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : this.i18n.t('auth.errors.guest'));
    } finally {
      this.guestSigningIn.set(false);
    }
  }

  private nextUrl(): string {
    const next = this.route.snapshot.queryParamMap.get('next');
    if (!next || !next.startsWith('/') || next.startsWith('//')) {
      return this.localizedRouter.localize('/lobby');
    }
    return next;
  }
}
