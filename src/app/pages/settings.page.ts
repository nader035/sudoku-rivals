import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Bell, Gamepad2, Languages, LogIn, LogOut, Moon, Sun, User, Volume2 } from 'lucide-angular/src/icons';
import { LanguageCode } from '../core/i18n/translations';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { SettingsService } from '../core/services/settings.service';
import { AppStore } from '../store/app.store';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [LucideAngularModule, TranslocoPipe, UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-sm">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <a class="inline-flex items-center" [href]="localizedRouter.localize('/')" (click)="goHome(); $event.preventDefault()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-9 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-9 w-auto dark:hidden" />
          </a>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <header class="mb-8">
          <div class="text-ui-kicker text-primary">{{ 'settings.kicker' | transloco }}</div>
          <h1 class="mt-3 text-4xl font-black tracking-tight md:text-5xl">{{ 'settings.title' | transloco }}</h1>
          <p class="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{{ 'settings.subtitle' | transloco }}</p>
        </header>

        <div class="grid gap-4 lg:grid-cols-2">
          <section class="surface-panel rounded-xl p-5">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i-lucide [img]="LanguageIcon" [size]="20"></i-lucide>
              </span>
              <div>
                <h2 class="text-xl font-black">{{ 'settings.language.title' | transloco }}</h2>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ 'settings.language.description' | transloco }}</p>
              </div>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-2">
              <button
                class="btn-game rounded-lg border px-3 py-3 text-sm font-bold"
                type="button"
                [class.border-primary]="settings.language() === 'en'"
                [class.bg-primary]="settings.language() === 'en'"
                [class.text-primary-foreground]="settings.language() === 'en'"
                [class.border-border]="settings.language() !== 'en'"
                (click)="switchLanguage('en')"
              >
                {{ 'settings.language.english' | transloco }}
              </button>
              <button
                class="btn-game rounded-lg border px-3 py-3 text-sm font-bold"
                type="button"
                [class.border-primary]="settings.language() === 'ar'"
                [class.bg-primary]="settings.language() === 'ar'"
                [class.text-primary-foreground]="settings.language() === 'ar'"
                [class.border-border]="settings.language() !== 'ar'"
                (click)="switchLanguage('ar')"
              >
                {{ 'settings.language.arabic' | transloco }}
              </button>
            </div>
          </section>

          <section class="surface-panel rounded-xl p-5">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i-lucide [img]="settings.theme() === 'dark' ? MoonIcon : SunIcon" [size]="20"></i-lucide>
              </span>
              <div>
                <h2 class="text-xl font-black">{{ 'settings.theme.title' | transloco }}</h2>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ 'settings.theme.description' | transloco }}</p>
              </div>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-2">
              <button
                class="btn-game rounded-lg border px-3 py-3 text-sm font-bold"
                type="button"
                [class.border-primary]="settings.theme() === 'light'"
                [class.bg-primary]="settings.theme() === 'light'"
                [class.text-primary-foreground]="settings.theme() === 'light'"
                [class.border-border]="settings.theme() !== 'light'"
                (click)="settings.setTheme('light')"
              >
                {{ 'settings.theme.light' | transloco }}
              </button>
              <button
                class="btn-game rounded-lg border px-3 py-3 text-sm font-bold"
                type="button"
                [class.border-primary]="settings.theme() === 'dark'"
                [class.bg-primary]="settings.theme() === 'dark'"
                [class.text-primary-foreground]="settings.theme() === 'dark'"
                [class.border-border]="settings.theme() !== 'dark'"
                (click)="settings.setTheme('dark')"
              >
                {{ 'settings.theme.dark' | transloco }}
              </button>
            </div>
          </section>

          <section class="surface-panel rounded-xl p-5">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i-lucide [img]="SoundIcon" [size]="20"></i-lucide>
              </span>
              <div>
                <h2 class="text-xl font-black">{{ 'settings.sound.title' | transloco }}</h2>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ 'settings.sound.description' | transloco }}</p>
              </div>
            </div>
            <label class="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/70 px-4 py-3">
              <span class="font-semibold">{{ 'settings.sound.enabled' | transloco }}</span>
              <input
                class="h-5 w-5 accent-primary"
                type="checkbox"
                [checked]="settings.soundEnabled()"
                (change)="settings.setSoundEnabled($any($event.target).checked)"
              />
            </label>
          </section>

          <section class="surface-panel rounded-xl p-5">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i-lucide [img]="BellIcon" [size]="20"></i-lucide>
              </span>
              <div>
                <h2 class="text-xl font-black">{{ 'settings.notifications.title' | transloco }}</h2>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ 'settings.notifications.description' | transloco }}</p>
              </div>
            </div>
            <label class="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/70 px-4 py-3">
              <span class="font-semibold">{{ 'settings.notifications.enabled' | transloco }}</span>
              <input
                class="h-5 w-5 accent-primary"
                type="checkbox"
                [checked]="settings.notificationsEnabled()"
                (change)="setNotifications($any($event.target).checked)"
              />
            </label>
            @if (settings.notificationMessage()) {
              <p class="mt-3 text-sm text-destructive">{{ settings.notificationMessage()! | transloco }}</p>
            }
          </section>

          <section class="surface-panel rounded-xl p-5 lg:col-span-2">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i-lucide [img]="GamepadIcon" [size]="20"></i-lucide>
              </span>
              <div>
                <h2 class="text-xl font-black">{{ 'settings.gamePreferences.title' | transloco }}</h2>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ 'settings.gamePreferences.description' | transloco }}</p>
              </div>
            </div>
            <div class="mt-5 grid gap-3 md:grid-cols-2">
              @for (preference of gamePreferences; track preference.key) {
                <label class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/70 px-4 py-3">
                  <span class="font-semibold">{{ preference.labelKey | transloco }}</span>
                  <input
                    class="h-5 w-5 accent-primary"
                    type="checkbox"
                    [checked]="preference.value()"
                    (change)="preference.update($any($event.target).checked)"
                  />
                </label>
              }
            </div>
          </section>

          <section class="surface-panel rounded-xl p-5 lg:col-span-2">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i-lucide [img]="UserIcon" [size]="20"></i-lucide>
              </span>
              <div>
                <h2 class="text-xl font-black">{{ 'settings.account.title' | transloco }}</h2>
                @if (appStore.isSignedIn()) {
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ 'settings.account.signedInAs' | transloco: { name: appStore.displayName() } }}
                  </p>
                } @else {
                  <p class="mt-1 text-sm text-muted-foreground">{{ 'settings.account.guestMessage' | transloco }}</p>
                }
              </div>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              @if (appStore.isSignedIn()) {
                <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/60 px-4 py-2 text-sm font-bold hover:bg-muted/40" type="button" (click)="goProfile()">
                  <i-lucide [img]="UserIcon" [size]="16"></i-lucide>
                  {{ 'settings.account.profile' | transloco }}
                </button>
                <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/15" type="button" (click)="logout()">
                  <i-lucide [img]="LogoutIcon" [size]="16"></i-lucide>
                  {{ 'settings.account.logout' | transloco }}
                </button>
              } @else {
                <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90" type="button" (click)="goSignIn()">
                  <i-lucide [img]="LoginIcon" [size]="16"></i-lucide>
                  {{ 'settings.account.login' | transloco }}
                </button>
                <button class="btn-game rounded-lg border border-border/60 px-4 py-2 text-sm font-bold hover:bg-muted/40" type="button" (click)="goSignUp()">
                  {{ 'settings.account.register' | transloco }}
                </button>
              }
            </div>
          </section>
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  readonly settings = inject(SettingsService);
  readonly appStore = inject(AppStore);
  readonly localizedRouter = inject(LocalizedRouterService);

  readonly LanguageIcon = Languages;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly SoundIcon = Volume2;
  readonly BellIcon = Bell;
  readonly GamepadIcon = Gamepad2;
  readonly UserIcon = User;
  readonly LoginIcon = LogIn;
  readonly LogoutIcon = LogOut;

  readonly gamePreferences = [
    {
      key: 'showMistakes',
      labelKey: 'settings.gamePreferences.showMistakes',
      value: this.settings.showMistakes,
      update: (enabled: boolean) => this.settings.setShowMistakes(enabled),
    },
    {
      key: 'highlightDuplicates',
      labelKey: 'settings.gamePreferences.highlightDuplicates',
      value: this.settings.highlightDuplicates,
      update: (enabled: boolean) => this.settings.setHighlightDuplicates(enabled),
    },
    {
      key: 'autoCheckAnswers',
      labelKey: 'settings.gamePreferences.autoCheck',
      value: this.settings.autoCheckAnswers,
      update: (enabled: boolean) => this.settings.setAutoCheckAnswers(enabled),
    },
    {
      key: 'timerEnabled',
      labelKey: 'settings.gamePreferences.timer',
      value: this.settings.timerEnabled,
      update: (enabled: boolean) => this.settings.setTimerEnabled(enabled),
    },
  ];

  switchLanguage(lang: LanguageCode): void {
    this.settings.setLanguage(lang);
    void this.localizedRouter.switchLanguage(lang);
  }

  setNotifications(enabled: boolean): void {
    void this.settings.setNotificationsEnabled(enabled);
  }

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }

  goProfile(): void {
    void this.localizedRouter.navigate('/profile');
  }

  goSignIn(): void {
    void this.localizedRouter.navigate('/sign-in');
  }

  goSignUp(): void {
    void this.localizedRouter.navigate('/sign-up');
  }

  async logout(): Promise<void> {
    await this.appStore.signOut();
    await this.localizedRouter.navigate('/');
  }
}
