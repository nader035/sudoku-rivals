import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { LanguageCode, SUPPORTED_LANGUAGES, TRANSLATIONS, TranslationTree } from './translations';

const LANGUAGE_STORAGE_KEY = 'sudokuRival.language';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly activeLanguage = signal<LanguageCode>(this.readInitialLanguage());

  readonly lang = this.activeLanguage.asReadonly();
  readonly direction = computed(() => (this.activeLanguage() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    effect(() => {
      const lang = this.activeLanguage();
      const dir = this.direction();
      const root = this.document.documentElement;
      root.lang = lang;
      root.dir = dir;
      root.dataset['lang'] = lang;

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      }
    });
  }

  isSupportedLanguage(value: string | null | undefined): value is LanguageCode {
    return SUPPORTED_LANGUAGES.includes(value as LanguageCode);
  }

  setLanguage(lang: LanguageCode): void {
    this.activeLanguage.set(lang);
  }

  languageFromUrl(url: string): LanguageCode | null {
    const firstSegment = this.pathSegments(url)[0];
    return this.isSupportedLanguage(firstSegment) ? firstSegment : null;
  }

  stripLanguagePrefix(url: string): string {
    const { path, suffix } = this.splitUrl(url);
    const segments = path.split('/').filter(Boolean);
    if (this.isSupportedLanguage(segments[0])) {
      segments.shift();
    }

    const cleanPath = segments.length > 0 ? `/${segments.join('/')}` : '/';
    return `${this.normalizeLegacyPath(cleanPath)}${suffix}`;
  }

  localizePath(path: string, lang = this.activeLanguage()): string {
    const { path: cleanPath, suffix } = this.splitUrl(path || '/');
    const withoutLang = this.stripLanguagePrefix(cleanPath);
    const normalized = this.normalizeLegacyPath(this.splitUrl(withoutLang).path);
    return `/${lang}${normalized === '/' ? '' : normalized}${suffix}`;
  }

  equivalentUrl(targetLang: LanguageCode, currentUrl: string): string {
    const stripped = this.stripLanguagePrefix(currentUrl || '/');
    return this.localizePath(stripped, targetLang);
  }

  t(key: string, params: Record<string, string | number> = {}): string {
    const value = this.lookup(TRANSLATIONS[this.activeLanguage()], key)
      ?? this.lookup(TRANSLATIONS.en, key)
      ?? key;

    return Object.entries(params).reduce(
      (text, [paramKey, paramValue]) => text.replaceAll(`{{ ${paramKey} }}`, String(paramValue)),
      value,
    );
  }

  private lookup(tree: TranslationTree, key: string): string | null {
    let current: string | TranslationTree | undefined = tree;
    for (const part of key.split('.')) {
      if (typeof current !== 'object' || current === null) return null;
      current = current[part];
    }

    return typeof current === 'string' ? current : null;
  }

  private readInitialLanguage(): LanguageCode {
    if (typeof location !== 'undefined') {
      const lang = this.languageFromUrl(location.pathname);
      if (lang) return lang;
    }

    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (this.isSupportedLanguage(stored)) return stored;
    }

    return 'en';
  }

  private pathSegments(url: string): string[] {
    return this.splitUrl(url).path.split('/').filter(Boolean);
  }

  private splitUrl(url: string): { path: string; suffix: string } {
    const match = url.match(/^([^?#]*)(.*)$/);
    const path = match?.[1] || '/';
    return {
      path: path.startsWith('/') ? path : `/${path}`,
      suffix: match?.[2] ?? '',
    };
  }

  private normalizeLegacyPath(path: string): string {
    if (path === '/play/solo') return '/play';
    return path || '/';
  }
}
