import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';

import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  ngOnInit(): void {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      this.supabase.authState$
        .pipe(
          filter((state) => state.loaded && !!state.session),
          take(1)
        )
        .subscribe((state) => {
          if (state.session) {
            this.supabase.ensurePlayerProfile(state.session.user).then(() => {
              // Clear the hash from the URL so it doesn't trigger again
              window.history.replaceState(null, '', window.location.pathname);
              void this.router.navigateByUrl('/lobby');
            });
          }
        });
    }
  }
}
