import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-admin-placeholder-page',
  standalone: true,
  template: `
    <div class="h-full border-t border-border/60 bg-background/55 px-4 py-6 md:px-6">
      <div class="surface-panel max-w-4xl rounded-2xl p-6">
        <div class="text-ui-kicker text-primary">Admin</div>
        <h1 class="mt-2 text-3xl font-black tracking-tight">{{ title() }}</h1>
        <p class="mt-3 text-sm font-mono text-muted-foreground">
          This sub-route is already wired into the admin shell and ready for the next feature implementation.
        </p>
        <button
          class="btn-game mt-4 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
          type="button"
          (click)="goAdmin()"
        >
          Back to Overview
        </button>
      </div>
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

  goAdmin(): void {
    void this.router.navigateByUrl('/admin');
  }
}
