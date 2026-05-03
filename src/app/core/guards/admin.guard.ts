import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { AppStore } from '../../store/app.store';

export const adminGuard: CanActivateFn = () => {
  const appStore = inject(AppStore);
  const router = inject(Router);

  return firstValueFrom(
    toObservable(appStore.playerLoaded).pipe(
      filter(Boolean),
      take(1),
      map(() => {
        if (!appStore.session()) {
          return router.createUrlTree(['/sign-in'], { queryParams: { next: '/admin' } });
        }

        return appStore.player()?.role === 'admin' ? true : router.createUrlTree(['/']);
      }),
    ),
  );
};
