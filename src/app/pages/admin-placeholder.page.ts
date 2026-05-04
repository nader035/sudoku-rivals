import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-admin-placeholder-page',
  standalone: true,
  imports: [UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <button class="font-black italic uppercase tracking-tight text-primary" type="button" (click)="goHome()">
            SUDOKU RIVAL
          </button>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-5xl space-y-4 px-4 py-8 md:px-6">
        <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Admin</div>
        <h1 class="text-3xl font-black tracking-tight">{{ title() }}</h1>
        <p class="text-sm font-mono text-muted-foreground">
          This admin section is wired in routing and reserved for the full workflow implementation.
        </p>
        <button
          class="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
          type="button"
          (click)="goAdmin()"
        >
          Back to Admin Dashboard
        </button>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlaceholderPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  title() {
    return this.route.snapshot.data['title'] || 'Admin Section';
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goAdmin(): void {
    void this.router.navigateByUrl('/admin');
  }
}
