import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { LanguageCode } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LocalizedRouterService {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  localize(path: string): string {
    return this.i18n.localizePath(path);
  }

  navigate(path: string): Promise<boolean> {
    return this.router.navigateByUrl(this.localize(path));
  }

  switchLanguage(lang: LanguageCode): Promise<boolean> {
    this.i18n.setLanguage(lang);
    return this.router.navigateByUrl(this.i18n.equivalentUrl(lang, this.router.url));
  }
}
