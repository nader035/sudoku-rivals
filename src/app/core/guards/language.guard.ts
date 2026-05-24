import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';

export const languageGuard: CanActivateFn = (route) => {
  const i18n = inject(I18nService);
  const router = inject(Router);
  const lang = route.paramMap.get('lang');

  if (!i18n.isSupportedLanguage(lang)) {
    return router.parseUrl('/en');
  }

  i18n.setLanguage(lang);
  return true;
};
