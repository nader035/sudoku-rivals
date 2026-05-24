import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { AppStore } from '../../store/app.store';
import { I18nService } from '../i18n/i18n.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const appStore = inject(AppStore);
  const router = inject(Router);
  const i18n = inject(I18nService);

  return firstValueFrom(
    toObservable(appStore.playerLoaded).pipe(
      filter(Boolean),
      take(1),
      map(() => {
        if (!appStore.session()) {
          return router.parseUrl(
            `${i18n.localizePath('/sign-in')}?next=${encodeURIComponent(state.url)}`,
          );
        }

        return appStore.isAdmin() ? true : router.parseUrl(i18n.localizePath('/'));
      }),
    ),
  );
};
