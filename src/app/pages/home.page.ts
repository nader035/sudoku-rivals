import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AppStore } from '../store/app.store';
import {
  ArrowRight,
  Clock3,
  Crown,
  Home,
  Info,
  Instagram,
  Linkedin,
  Play,
  Shield,
  Trophy,
  Twitter,
  Users,
  Zap,
} from 'lucide-angular/src/icons';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <header class="border-b border-border/70 bg-background/92 backdrop-blur">
        <div class="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <button class="inline-flex items-center" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-12 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-12 w-auto dark:hidden" />
          </button>

          <nav class="hidden items-center gap-2 lg:flex">
            <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary/12 px-3 py-2 text-sm font-semibold text-primary" type="button" (click)="goHome()">
              <i-lucide [img]="HomeIcon" [size]="16"></i-lucide>
              Home
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" type="button" (click)="goMultiplayer()">
              <i-lucide [img]="PlayIcon" [size]="16"></i-lucide>
              Play
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" type="button" (click)="goLeaderboard()">
              <i-lucide [img]="TrophyIcon" [size]="16"></i-lucide>
              Leaderboard
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" type="button" (click)="scrollToAbout()">
              <i-lucide [img]="UsersIcon" [size]="16"></i-lucide>
              About
            </button>
          </nav>

          <div class="flex items-center gap-2">
            @if (!appStore.isSignedIn()) {
              <button class="btn-game hidden rounded-lg border border-border/60 bg-card/70 px-4 py-2 text-sm font-semibold hover:bg-muted/40 md:inline-flex" type="button" (click)="goSignIn()">
                Log in
              </button>
            }
            <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:shadow-lg hover:shadow-primary/20" type="button" (click)="goMultiplayer()">
              <i-lucide [img]="ZapIcon" [size]="16"></i-lucide>
              Play Now
            </button>
          </div>
        </div>
      </header>

      <main>
        <section class="relative border-b border-border/60 py-12 sm:py-16">
          <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
            <div class="space-y-7">
              <div class="inline-flex items-center rounded-full border border-border/70 bg-card/70 px-4 py-2 text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
                Real-time multiplayer Sudoku
              </div>
              <h1 class="max-w-xl text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl">
                The Ultimate
                <br />
                Sudoku <span class="text-primary">Battle</span>
              </h1>
              <p class="max-w-xl text-xl leading-relaxed text-muted-foreground">
                Compete in real-time Sudoku matches against players worldwide. Fast thinking, sharp strategy, and precision decide the winner.
              </p>
              <div class="flex flex-col gap-3 sm:flex-row">
                <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-bold text-primary-foreground hover:shadow-lg hover:shadow-primary/20" type="button" (click)="goMultiplayer()">
                  <i-lucide [img]="ZapIcon" [size]="18"></i-lucide>
                  Play Now
                </button>
                <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-8 py-3 text-base font-semibold hover:bg-muted/40" type="button" (click)="showHowTo.set(true)">
                  <i-lucide [img]="InfoIcon" [size]="18"></i-lucide>
                  Learn More
                </button>
              </div>
            </div>

            <div class="surface-panel rounded-3xl p-4 sm:p-5">
              <div class="rounded-2xl border border-border/70 bg-background p-3 sm:p-4">
                <div class="mb-3 grid gap-3 sm:grid-cols-[220px_1fr]">
                  <div class="rounded-xl border border-border/70 bg-card/70 p-3">
                    <div class="text-xs font-mono uppercase tracking-wider text-muted-foreground">Live Match</div>
                    <div class="mt-2 text-sm font-semibold">Game #R7X9</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex items-center justify-between rounded-lg border border-border/60 px-2 py-2">
                        <span>Nader</span>
                        <span class="font-mono text-primary">1460</span>
                      </div>
                      <div class="text-center text-xs font-black uppercase tracking-wider text-primary">VS</div>
                      <div class="flex items-center justify-between rounded-lg border border-border/60 px-2 py-2">
                        <span>You</span>
                        <span class="font-mono text-primary">1680</span>
                      </div>
                    </div>
                    <div class="mt-4 text-xs font-mono text-muted-foreground">Mistakes: 2 / 10</div>
                  </div>

                  <div class="rounded-xl border border-border/70 bg-card/65 p-3">
                    <div class="aspect-square overflow-hidden rounded-lg border-2 border-border/85 bg-background/95 shadow-inner">
                      <div class="grid h-full grid-cols-9 grid-rows-9">
                        @for (cell of heroBoard; track $index; let index = $index) {
                          <div
                            class="flex items-center justify-center border-border/35 text-lg font-extrabold leading-none transition-colors sm:text-xl"
                            [class.border-r]="!isHeroLastCol(index) && !isHeroBoxRight(index)"
                            [class.border-b]="!isHeroLastRow(index) && !isHeroBoxBottom(index)"
                            [class.border-r-2]="isHeroBoxRight(index) && !isHeroLastCol(index)"
                            [class.border-b-2]="isHeroBoxBottom(index) && !isHeroLastRow(index)"
                            [class.bg-primary/4]="isHeroBoxTint(index) && !cell.active"
                            [class.bg-primary/22]="cell.active"
                            [class.text-primary]="cell.primary"
                            [class.text-foreground]="!cell.primary && !!cell.value"
                            [class.text-muted-foreground]="!cell.value"
                          >
                          {{ cell.value }}
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-sm">
                  @for (action of heroActions; track action) {
                    <div class="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-center font-medium">{{ action }}</div>
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              @for (feature of features; track feature.title) {
                <article class="surface-panel rounded-2xl p-5">
                  <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <i-lucide [img]="feature.icon" [size]="20"></i-lucide>
                  </div>
                  <div class="text-ui-kicker text-primary">{{ feature.kicker }}</div>
                  <h2 class="mt-2 text-2xl font-bold tracking-tight">{{ feature.title }}</h2>
                  <p class="mt-2 text-sm text-muted-foreground">{{ feature.description }}</p>
              </article>
            }
          </div>
        </section>

        <section class="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
          <div class="surface-panel rounded-2xl p-5 sm:p-6">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-ui-kicker text-muted-foreground">Top Players</h2>
              <button class="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" type="button" (click)="goLeaderboard()">
                View Full Leaderboard
                <i-lucide [img]="ArrowRightIcon" [size]="14"></i-lucide>
              </button>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              @for (player of topPlayers; track player.rank) {
                <article class="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
                  <div class="flex items-center justify-between">
                    <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/25 text-sm font-black text-primary">
                      {{ player.rank }}
                    </span>
                    <span class="font-mono text-xs text-muted-foreground">{{ player.points }}</span>
                  </div>
                  <div class="mt-2 text-base font-bold">{{ player.name }}</div>
                </article>
              }
            </div>
          </div>
        </section>

        <section id="about" class="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-ui-kicker text-muted-foreground">Team</h2>
            <span class="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">Built by Sudoku Rival Games</span>
          </div>
          <div class="grid gap-3 md:grid-cols-1">
            @for (member of team; track member.name) {
              <article class="surface-panel rounded-2xl p-5">
                <div class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/20 text-lg font-black text-primary">
                  {{ member.initial }}
                </div>
                <h3 class="mt-3 text-lg font-bold">{{ member.name }}</h3>
                <p class="text-sm text-primary">{{ member.role }}</p>
                <p class="mt-2 text-sm text-muted-foreground">{{ member.bio }}</p>
              </article>
            }
          </div>
        </section>
      </main>

      <footer class="border-t border-border/60 bg-card/45">
        <div class="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <div>
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-10 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-10 w-auto dark:hidden" />
            <p class="mt-3 max-w-xs text-sm text-muted-foreground">
              Think sharp. Compete hard. Be the rival.
            </p>
          </div>
          <div>
            <div class="text-sm font-bold">Game</div>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              <button class="block hover:text-foreground" type="button" (click)="goMultiplayer()">Play Now</button>
              <button class="block hover:text-foreground" type="button" (click)="showHowTo.set(true)">How To Play</button>
            </div>
          </div>
          <div>
            <div class="text-sm font-bold">Community</div>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              <button class="block hover:text-foreground" type="button" (click)="goLeaderboard()">Leaderboard</button>
              <span class="block">Tournaments</span>
            </div>
          </div>
          <div>
            <div class="text-sm font-bold">About</div>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              <button class="block hover:text-foreground" type="button" (click)="scrollToAbout()">Team</button>
              <span class="block">Contact</span>
            </div>
          </div>
          <div>
            <div class="text-sm font-bold">Follow Us</div>
            <div class="mt-3 flex gap-2">
              @for (social of socials; track social.label) {
                <a
                  class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border/60 bg-background/70 px-2 text-xs font-semibold transition-colors hover:border-primary/45 hover:bg-primary/10"
                  [href]="social.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  [title]="social.label"
                  [attr.aria-label]="social.label"
                >
                  <i-lucide [img]="social.icon" [size]="16"></i-lucide>
                </a>
              }
            </div>
          </div>
        </div>
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-2 border-t border-border/60 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {{ currentYear }} Sudoku Rival Games. All rights reserved.</span>
          <span>Privacy Policy | Terms of Service</span>
        </div>
      </footer>

      @if (showHowTo()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div class="surface-panel w-full max-w-xl rounded-2xl p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-ui-kicker text-primary">How To Play</div>
                <h2 class="mt-2 text-2xl font-black uppercase tracking-tight text-primary">Sudoku Rival</h2>
              </div>
              <button class="btn-game rounded-md border border-border/60 bg-card/70 px-3 py-2 text-xs font-semibold uppercase hover:bg-muted/40" type="button" (click)="showHowTo.set(false)">
                Close
              </button>
            </div>
            <ol class="mt-5 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Create or join a room.</li>
              <li>Solve the same puzzle faster than your rival.</li>
              <li>Avoid mistakes to prevent freeze penalties.</li>
              <li>First valid board wins the match.</li>
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
  readonly HomeIcon = Home;
  readonly PlayIcon = Play;
  readonly TrophyIcon = Trophy;
  readonly UsersIcon = Users;
  readonly ZapIcon = Zap;
  readonly InfoIcon = Info;
  readonly ArrowRightIcon = ArrowRight;
  readonly showHowTo = signal(false);
  readonly currentYear = new Date().getFullYear();

  readonly features = [
    {
      icon: Zap,
      kicker: 'Realtime',
      title: 'Real-Time Matches',
      description: 'Play live against real opponents and feel the pressure every move.',
    },
    {
      icon: Shield,
      kicker: 'Fair Play',
      title: 'Fair Play System',
      description: 'Balanced matchmaking and anti-cheat logic keep competitions clean.',
    },
    {
      icon: Crown,
      kicker: 'Ranked',
      title: 'Global Leaderboard',
      description: 'Earn points, stack wins, and climb to the top worldwide.',
    },
    {
      icon: Clock3,
      kicker: 'Penalty',
      title: 'Smart Penalties',
      description: 'Mistakes trigger freeze windows that reward precision over luck.',
    },
  ];

  readonly topPlayers = [
    { rank: 1, name: 'Nader', points: '2120' },
    { rank: 2, name: 'LogicMaster', points: '1987' },
    { rank: 3, name: 'SudokuSensei', points: '1875' },
    { rank: 4, name: 'GridWizard', points: '1764' },
    { rank: 5, name: 'NinePeak', points: '1650' },
  ];

  readonly team = [
    {
      initial: 'N',
      name: 'Nader Mohamed',
      role: 'Founder & Full-Stack Engineer',
      bio: 'Owns the core product direction, realtime architecture, and match logic quality.',
    },
  ];

  readonly socials = [
    { label: 'X', icon: Twitter, href: 'https://x.com/nader0305' },
    { label: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/in/nader0305/' },
    { label: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/nader.designss/' },
  ];

  readonly heroActions = ['Pause', 'Give Up', 'Notes', 'Erase', 'Undo', 'Hint'];

  readonly heroBoard = [
    { value: '5' }, { value: '3' }, { value: '' }, { value: '' }, { value: '7' }, { value: '' }, { value: '' }, { value: '' }, { value: '2', primary: true },
    { value: '6', primary: true }, { value: '' }, { value: '' }, { value: '1' }, { value: '9' }, { value: '5' }, { value: '' }, { value: '' }, { value: '' },
    { value: '' }, { value: '9' }, { value: '8' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '6' }, { value: '' },
    { value: '8' }, { value: '' }, { value: '' }, { value: '' }, { value: '3', primary: true }, { value: '' }, { value: '' }, { value: '' }, { value: '4', primary: true },
    { value: '' }, { value: '' }, { value: '' }, { value: '8' }, { value: '' }, { value: '6' }, { value: '' }, { value: '3', primary: true }, { value: '' },
    { value: '' }, { value: '' }, { value: '3', primary: true }, { value: '' }, { value: '7', active: true, primary: true }, { value: '' }, { value: '' }, { value: '1' }, { value: '' },
    { value: '2' }, { value: '' }, { value: '6' }, { value: '' }, { value: '' }, { value: '' }, { value: '5' }, { value: '' }, { value: '' },
    { value: '' }, { value: '2', primary: true }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '8', primary: true }, { value: '' },
    { value: '' }, { value: '' }, { value: '4' }, { value: '1' }, { value: '9' }, { value: '5' }, { value: '' }, { value: '' }, { value: '' },
  ];

  isHeroLastCol(index: number): boolean {
    return index % 9 === 8;
  }

  isHeroLastRow(index: number): boolean {
    return Math.floor(index / 9) === 8;
  }

  isHeroBoxRight(index: number): boolean {
    const col = index % 9;
    return col === 2 || col === 5;
  }

  isHeroBoxBottom(index: number): boolean {
    const row = Math.floor(index / 9);
    return row === 2 || row === 5;
  }

  isHeroBoxTint(index: number): boolean {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    return (boxRow + boxCol) % 2 === 0;
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goLeaderboard(): void {
    void this.router.navigateByUrl('/leaderboard');
  }

  goSignIn(): void {
    void this.router.navigateByUrl('/sign-in');
  }

  goMultiplayer(): void {
    void this.router.navigateByUrl(this.appStore.isSignedIn() ? '/lobby' : '/sign-in');
  }

  goSolo(): void {
    void this.router.navigateByUrl('/play/solo');
  }

  scrollToAbout(): void {
    const element = document.getElementById('about');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
