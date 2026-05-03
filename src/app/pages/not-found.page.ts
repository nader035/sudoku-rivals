import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div class="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 shadow-2xl">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/15 text-destructive"
          >
            404
          </div>
          <h1 class="text-2xl font-bold">Page not found</h1>
        </div>
        <p class="mt-4 text-sm text-muted-foreground">
          Did you forget to add the page to the router?
        </p>
        <a
          routerLink="/"
          class="mt-6 inline-flex rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >Return home</a
        >
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
