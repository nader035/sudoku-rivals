import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ThemeMode } from '../models';
import { I18nService } from '../i18n/i18n.service';
import { LanguageCode } from '../i18n/translations';
import { AppStore } from '../../store/app.store';

const SETTINGS_STORAGE_KEY = 'sudokuRival.settings';

interface StoredSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showMistakes: boolean;
  highlightDuplicates: boolean;
  autoCheckAnswers: boolean;
  timerEnabled: boolean;
}

const DEFAULT_SETTINGS: StoredSettings = {
  soundEnabled: true,
  notificationsEnabled: false,
  showMistakes: true,
  highlightDuplicates: true,
  autoCheckAnswers: true,
  timerEnabled: true,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly appStore = inject(AppStore);
  private readonly i18n = inject(I18nService);
  private readonly stored = this.readSettings();

  readonly language = this.i18n.lang;
  readonly theme = computed(() => this.appStore.theme());
  readonly soundEnabled = signal(this.stored.soundEnabled);
  readonly notificationsEnabled = signal(this.stored.notificationsEnabled);
  readonly showMistakes = signal(this.stored.showMistakes);
  readonly highlightDuplicates = signal(this.stored.highlightDuplicates);
  readonly autoCheckAnswers = signal(this.stored.autoCheckAnswers);
  readonly timerEnabled = signal(this.stored.timerEnabled);
  readonly notificationMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.writeSettings({
        soundEnabled: this.soundEnabled(),
        notificationsEnabled: this.notificationsEnabled(),
        showMistakes: this.showMistakes(),
        highlightDuplicates: this.highlightDuplicates(),
        autoCheckAnswers: this.autoCheckAnswers(),
        timerEnabled: this.timerEnabled(),
      });
    });
  }

  setLanguage(lang: LanguageCode): void {
    this.i18n.setLanguage(lang);
  }

  setTheme(theme: Exclude<ThemeMode, 'system'>): void {
    this.appStore.setTheme(theme);
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled.set(enabled);
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    this.notificationMessage.set(null);

    if (!enabled) {
      this.notificationsEnabled.set(false);
      return;
    }

    if (typeof Notification === 'undefined') {
      this.notificationMessage.set('settings.notifications.unsupported');
      this.notificationsEnabled.set(false);
      return;
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'denied') {
      this.notificationMessage.set('settings.notifications.denied');
      this.notificationsEnabled.set(false);
      return;
    }

    this.notificationsEnabled.set(true);
  }

  setShowMistakes(enabled: boolean): void {
    this.showMistakes.set(enabled);
  }

  setHighlightDuplicates(enabled: boolean): void {
    this.highlightDuplicates.set(enabled);
  }

  setAutoCheckAnswers(enabled: boolean): void {
    this.autoCheckAnswers.set(enabled);
  }

  setTimerEnabled(enabled: boolean): void {
    this.timerEnabled.set(enabled);
  }

  private readSettings(): StoredSettings {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;

    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null') as Partial<StoredSettings> | null;
      return { ...DEFAULT_SETTINGS, ...(parsed ?? {}) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private writeSettings(settings: StoredSettings): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}
