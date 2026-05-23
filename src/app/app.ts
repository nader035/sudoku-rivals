import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  OnInit,
} from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';

import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div data-gsap-route-shell>
      <router-outlet />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private routeAnimationSub: Subscription | null = null;
  private routeAnimationCleanup: Array<() => void> = [];

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

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      queueMicrotask(() => this.bootRouteAnimations());
    });
  }

  ngOnDestroy(): void {
    this.routeAnimationSub?.unsubscribe();
    this.routeAnimationSub = null;
    this.routeAnimationCleanup.forEach((cleanup) => cleanup());
    this.routeAnimationCleanup = [];
  }

  private bootRouteAnimations(attempt = 0): void {
    const gsap = this.getGsap();
    if (!gsap) {
      if (attempt >= 20 || typeof window === 'undefined') return;
      const timer = window.setTimeout(() => this.bootRouteAnimations(attempt + 1), 80);
      this.routeAnimationCleanup.push(() => window.clearTimeout(timer));
      return;
    }

    const shell = this.host.nativeElement.querySelector('[data-gsap-route-shell]') as HTMLElement | null;
    if (!shell || this.prefersReducedMotion()) return;

    const playLeave = () => {
      gsap.to(shell, {
        autoAlpha: 0.88,
        y: -12,
        scale: 0.992,
        duration: 0.18,
        ease: 'power2.in',
        overwrite: 'auto',
      });
    };

    const playEnter = () => {
      gsap.fromTo(
        shell,
        { autoAlpha: 0, y: 18, scale: 0.988 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out', overwrite: 'auto' },
      );
    };

    playEnter();

    this.routeAnimationSub = this.router.events
      .pipe(filter((event): event is NavigationStart | NavigationEnd => event instanceof NavigationStart || event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          playLeave();
          return;
        }

        playEnter();
      });
  }

  private getGsap(): any | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { gsap?: any }).gsap ?? null;
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
