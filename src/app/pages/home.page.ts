import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../store/app.store';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [UserNavComponent],
  template: `
    <div class="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 opacity-[0.07]"
        style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%); -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);"
      ></div>

      <!-- NAV -->
      <nav class="sticky top-0 z-30 border-b border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button class="text-lg font-black uppercase italic tracking-tight text-primary" type="button" (click)="goHome()">
            Sudoku Rival
          </button>
          <app-user-nav />
        </div>
      </nav>

      <!-- HERO -->
      <section class="relative z-10 flex flex-col items-center px-4 pb-16 pt-20 sm:pb-24 sm:pt-32">
        <div class="w-full max-w-3xl space-y-8 text-center">
          <div class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary">
            ⚡ Real-time multiplayer
          </div>
          <h1 class="text-5xl font-black uppercase italic leading-[0.92] tracking-tight text-primary sm:text-7xl lg:text-8xl">
            Sudoku<br />Rival
          </h1>
          <p class="mx-auto max-w-lg text-lg font-mono text-muted-foreground sm:text-xl">
            The competitive Sudoku arena. Create rooms, race opponents in real-time, and climb the global leaderboard.
          </p>
          @if (appStore.isSignedIn()) {
            <p class="text-sm font-mono text-muted-foreground">
              Welcome back, <span class="font-bold text-primary">{{ appStore.displayName() }}</span>
            </p>
          }
          <div class="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:gap-4">
            <button class="group relative h-14 flex-1 overflow-hidden rounded-md bg-primary px-6 text-lg font-bold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/25" type="button" (click)="goMultiplayer()">
              <span class="relative z-10">Multiplayer Arena</span>
              <div class="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 transition-opacity group-hover:opacity-100"></div>
            </button>
            <button class="h-14 flex-1 rounded-md border border-border/60 bg-secondary px-6 text-lg font-bold transition-colors hover:border-primary/40 hover:bg-secondary/80" type="button" (click)="goSolo()">
              Solo Practice
            </button>
          </div>
        </div>
      </section>

      <!-- FEATURES -->
      <section id="features" class="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div class="mb-12 text-center">
          <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Features</div>
          <h2 class="mt-3 text-3xl font-black uppercase italic tracking-tight sm:text-4xl">Built for Competition</h2>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (feature of features; track feature.title) {
            <div class="group rounded-xl border border-border/60 bg-card/50 p-6 shadow-sm backdrop-blur transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
              <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">{{ feature.icon }}</div>
              <h3 class="text-sm font-bold uppercase tracking-wider">{{ feature.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ feature.description }}</p>
            </div>
          }
        </div>
      </section>

      <!-- HOW IT WORKS -->
      <section class="relative z-10 border-y border-border/60 bg-card/30 py-20 backdrop-blur">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="mb-12 text-center">
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">How it works</div>
            <h2 class="mt-3 text-3xl font-black uppercase italic tracking-tight sm:text-4xl">Three Steps to Victory</h2>
          </div>
          <div class="grid gap-8 sm:grid-cols-3">
            @for (step of steps; track step.number) {
              <div class="text-center">
                <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xl font-black text-primary">{{ step.number }}</div>
                <h3 class="text-sm font-bold uppercase tracking-wider">{{ step.title }}</h3>
                <p class="mt-2 text-sm text-muted-foreground">{{ step.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- STATS -->
      <section class="relative z-10 py-20">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="grid grid-cols-2 gap-6 sm:grid-cols-4">
            @for (stat of stats; track stat.label) {
              <div class="text-center">
                <div class="text-3xl font-black text-primary sm:text-4xl">{{ stat.value }}</div>
                <div class="mt-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">{{ stat.label }}</div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- TECH STACK -->
      <!-- <section class="relative z-10 border-y border-border/60 bg-card/30 py-20 backdrop-blur">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="mb-12 text-center">
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Under the hood</div>
            <h2 class="mt-3 text-3xl font-black uppercase italic tracking-tight sm:text-4xl">Tech Stack</h2>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            @for (tech of techStack; track tech.name) {
              <div class="rounded-xl border border-border/60 bg-background/60 p-5 text-center backdrop-blur">
                <div class="text-2xl">{{ tech.icon }}</div>
                <div class="mt-2 text-sm font-bold">{{ tech.name }}</div>
                <div class="mt-1 text-xs text-muted-foreground">{{ tech.role }}</div>
              </div>
            }
          </div>
        </div>
      </section> -->

      <!-- ABOUT / BUILDER -->
      <section class="relative z-10 border-y border-border/60 bg-card/30 py-20 backdrop-blur">
        <div class="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">About</div>
          <h2 class="mt-3 text-3xl font-black uppercase italic tracking-tight sm:text-4xl">Who Built This?</h2>
          <div class="mt-8 rounded-2xl border border-border/60 bg-card/50 p-8 shadow-sm backdrop-blur">
            <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-black text-primary">N</div>
            <h3 class="mt-4 text-xl font-black">Nader Mohamed</h3>
            <p class="mt-1 text-sm font-mono text-primary">Full-Stack Software Engineer</p>
            <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
              Passionate about building real-time applications and competitive gaming platforms. Sudoku Rival was built as a showcase of modern web technologies — Angular 21, Supabase Realtime, and signal-based state management — all working together to deliver a seamless multiplayer experience.
            </p>
            <div class="mt-6 flex items-center justify-center gap-4">
              <a href="https://github.com/nader035" target="_blank" rel="noopener" class="flex items-center gap-2 rounded-md border border-border/60 px-4 py-2 text-sm font-medium transition-colors hover:border-primary/60 hover:bg-muted/40" aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </a>
              <a href="https://twitter.com/nader0305" target="_blank" rel="noopener" class="flex items-center gap-2 rounded-md border border-border/60 px-4 py-2 text-sm font-medium transition-colors hover:border-primary/60 hover:bg-muted/40" aria-label="Twitter / X">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter
              </a>
              <a href="https://linkedin.com/in/nader0305" target="_blank" rel="noopener" class="flex items-center gap-2 rounded-md border border-border/60 px-4 py-2 text-sm font-medium transition-colors hover:border-primary/60 hover:bg-muted/40" aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="relative z-10 py-20">
        <div class="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 class="text-3xl font-black uppercase italic tracking-tight text-primary sm:text-5xl">Ready to Compete?</h2>
          <p class="mt-4 text-muted-foreground">Join the arena and prove you're the fastest solver.</p>
          <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <button class="h-14 w-full rounded-md bg-primary px-8 text-lg font-bold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/25 sm:w-auto" type="button" (click)="goMultiplayer()">
              Enter the Arena
            </button>
            <button class="h-14 w-full rounded-md border border-border/60 px-8 text-lg font-bold transition-colors hover:border-primary/40 hover:bg-secondary/80 sm:w-auto" type="button" (click)="goSolo()">
              Practice Solo
            </button>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="relative z-10 border-t border-border/60 bg-card/30 backdrop-blur">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div class="grid gap-8 sm:grid-cols-3">
            <div>
              <div class="text-lg font-black uppercase italic text-primary">Sudoku Rival</div>
              <p class="mt-2 text-sm text-muted-foreground">Real-time competitive Sudoku arena. Built with modern web technologies.</p>
            </div>
            <div>
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Quick Links</div>
              <div class="mt-3 flex flex-col gap-2">
                <button class="w-fit text-sm text-muted-foreground transition-colors hover:text-primary" type="button" (click)="goSolo()">Solo Practice</button>
                <button class="w-fit text-sm text-muted-foreground transition-colors hover:text-primary" type="button" (click)="goMultiplayer()">Multiplayer</button>
                <button class="w-fit text-sm text-muted-foreground transition-colors hover:text-primary" type="button" (click)="goLeaderboard()">Leaderboard</button>
              </div>
            </div>
            <div>
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Connect</div>
              <div class="mt-3 flex gap-3">
                <a href="https://github.com/nader035" target="_blank" rel="noopener" class="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary" aria-label="GitHub">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
                <a href="https://twitter.com/nader0305" target="_blank" rel="noopener" class="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary" aria-label="Twitter">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://linkedin.com/in/nader0305" target="_blank" rel="noopener" class="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary" aria-label="LinkedIn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div class="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/40 pt-6 text-xs font-mono text-muted-foreground sm:flex-row">
            <div>Built by <span class="font-bold text-primary">Nader Mohamed</span> — Full-Stack Software Engineer</div>
            <div>© {{ currentYear }} Sudoku Rival. All rights reserved.</div>
          </div>
        </div>
      </footer>

      <!-- HOW TO PLAY MODAL -->
      @if (showHowTo()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div class="w-full max-w-xl rounded-2xl border border-border/60 bg-background p-6 shadow-2xl">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">How to play</div>
                <h2 class="mt-2 text-2xl font-black uppercase italic text-primary">Sudoku Rival</h2>
              </div>
              <button class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/40" type="button" (click)="showHowTo.set(false)">Close</button>
            </div>
            <ol class="mt-6 space-y-4 text-sm text-muted-foreground">
              <li><span class="font-bold text-primary">01.</span> Pick single player for practice or multiplayer for live matches.</li>
              <li><span class="font-bold text-primary">02.</span> Fill every row, column, and 3×3 box with digits 1-9 — no repeats.</li>
              <li><span class="font-bold text-primary">03.</span> In multiplayer, the first player to complete a valid board wins the room.</li>
              <li><span class="font-bold text-primary">04.</span> Wrong answers freeze your grid and cost progress — play carefully!</li>
            </ol>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly router = inject(Router);
  readonly appStore = inject(AppStore);
  readonly showHowTo = signal(false);
  readonly currentYear = new Date().getFullYear();

  readonly features = [
    { icon: '⚡', title: 'Real-time Multiplayer', description: 'Race opponents live with instant board synchronization. Every move counts in real-time.' },
    { icon: '🏆', title: 'Global Leaderboard', description: 'Track your wins, climb the ranks, and compete for the top spot across all difficulties.' },
    { icon: '🔒', title: 'Private Rooms', description: 'Create password-protected rooms to play exclusively with friends and teammates.' },
    { icon: '🧊', title: 'Freeze Mechanics', description: 'Wrong answers freeze your grid and cost progress. Five mistakes trigger a mega-freeze.' },
    { icon: '📊', title: 'Live Progress Tracking', description: 'Watch your opponents progress bars in real-time. Know exactly how close the race is.' },
    { icon: '🎯', title: 'Three Difficulty Levels', description: 'Easy, Medium, and Hard puzzles — each with unique solution guarantees and cell counts.' },
  ];

  readonly steps = [
    { number: '1', title: 'Create or Join a Room', description: 'Host a new match with custom settings or join an open room from the lobby.' },
    { number: '2', title: 'Race to Solve', description: 'Fill the 9×9 grid before your opponents. Every cell you complete pushes your progress bar.' },
    { number: '3', title: 'Win & Climb', description: 'First valid completion wins. Earn stats, rise on the leaderboard, and challenge the best.' },
  ];

  readonly stats = [
    { value: '9×9', label: 'Grid Size' },
    { value: '3', label: 'Difficulties' },
    { value: '∞', label: 'Unique Puzzles' },
    { value: '<50ms', label: 'Sync Latency' },
  ];

  readonly techStack = [
    { icon: '🅰️', name: 'Angular 21', role: 'Frontend Framework' },
    { icon: '⚡', name: 'Supabase', role: 'Backend & Realtime' },
    { icon: '📡', name: 'PostgreSQL', role: 'Database & RPC' },
    { icon: '🔄', name: 'NgRx Signals', role: 'State Management' },
  ];

  readonly themeLabel = computed(() => {
    const theme = this.appStore.theme();
    if (theme === 'system') return 'System';
    return theme === 'dark' ? 'Light mode' : 'Dark mode';
  });

  goHome(): void { void this.router.navigateByUrl('/'); }
  goLeaderboard(): void { void this.router.navigateByUrl('/leaderboard'); }
  goSignIn(): void { void this.router.navigateByUrl('/sign-in'); }
  goLobby(): void { void this.router.navigateByUrl('/lobby'); }
  goSolo(): void { void this.router.navigateByUrl('/play/solo'); }
  goMultiplayer(): void { void this.router.navigateByUrl(this.appStore.isSignedIn() ? '/lobby' : '/sign-in'); }
  toggleTheme(): void { this.appStore.toggleTheme(); }
  async signOut(): Promise<void> { await this.appStore.signOut(); await this.router.navigateByUrl('/'); }
}
