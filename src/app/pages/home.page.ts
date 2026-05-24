import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
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
  Settings,
  Shield,
  Trophy,
  Twitter,
  Users,
  Zap,
} from 'lucide-angular/src/icons';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { LanguageSwitcherComponent } from '../shared/components/language-switcher.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [LucideAngularModule, TranslocoPipe, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <header class="border-b border-border/70 bg-background/92 backdrop-blur">
        <div class="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <button class="inline-flex items-center" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-12 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-12 w-auto dark:hidden" />
          </button>

          <nav class="hidden items-center gap-2 lg:flex">
            <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary/12 px-3 py-2 text-sm font-semibold text-primary" type="button" (click)="goHome()">
              <i-lucide [img]="HomeIcon" [size]="16"></i-lucide>
              {{ 'common.home' | transloco }}
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" type="button" (click)="goMultiplayer()">
              <i-lucide [img]="PlayIcon" [size]="16"></i-lucide>
              {{ 'common.play' | transloco }}
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" type="button" (click)="goHowToPlay()">
              <i-lucide [img]="InfoIcon" [size]="16"></i-lucide>
              {{ 'common.howToPlay' | transloco }}
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" type="button" (click)="goLeaderboard()">
              <i-lucide [img]="TrophyIcon" [size]="16"></i-lucide>
              {{ 'common.leaderboard' | transloco }}
            </button>
            <button class="btn-game inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" type="button" (click)="goSettings()">
              <i-lucide [img]="SettingsIcon" [size]="16"></i-lucide>
              {{ 'common.settings' | transloco }}
            </button>
          </nav>

          <div class="flex items-center gap-2">
            <app-language-switcher />
            @if (!appStore.isSignedIn()) {
              <button class="btn-game hidden rounded-lg border border-border/60 bg-card/70 px-4 py-2 text-sm font-semibold hover:bg-muted/40 md:inline-flex" type="button" (click)="goSignIn()">
                {{ 'common.logIn' | transloco }}
              </button>
            }
            <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:shadow-lg hover:shadow-primary/20" type="button" (click)="goMultiplayer()">
              <i-lucide [img]="ZapIcon" [size]="16"></i-lucide>
              {{ 'common.playNow' | transloco }}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section class="relative border-b border-border/60 py-12 sm:py-16" data-gsap-surface>
          <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
            <div class="space-y-7">
              <div class="inline-flex items-center rounded-full border border-border/70 bg-card/70 px-4 py-2 text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground" data-gsap-reveal>
                {{ 'home.kicker' | transloco }}
              </div>
              <h1 class="max-w-xl text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl" data-gsap-reveal>
                {{ 'home.titleLine1' | transloco }}
                <br />
                {{ 'home.titleLine2' | transloco }} <span class="text-primary">{{ 'home.titleAccent' | transloco }}</span>
              </h1>
              <p class="max-w-xl text-xl leading-relaxed text-muted-foreground" data-gsap-reveal>
                {{ 'home.description' | transloco }}
              </p>
              <div class="flex flex-col gap-3 sm:flex-row" data-gsap-reveal>
                <button class="btn-game inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-bold text-primary-foreground hover:shadow-lg hover:shadow-primary/20" type="button" (click)="goMultiplayer()" data-gsap-lift>
                  <i-lucide [img]="ZapIcon" [size]="18"></i-lucide>
                  {{ 'common.playNow' | transloco }}
                </button>
                <button class="btn-game inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-8 py-3 text-base font-semibold hover:bg-muted/40" type="button" (click)="goHowToPlay()" data-gsap-lift>
                  <i-lucide [img]="InfoIcon" [size]="18"></i-lucide>
                  {{ 'home.learnMore' | transloco }}
                </button>
              </div>
            </div>

            <div class="surface-panel rounded-3xl p-4 sm:p-5" data-gsap-reveal>
              <div class="rounded-2xl border border-border/70 bg-background p-3 sm:p-4">
                <div class="mb-3 grid gap-3 sm:grid-cols-[220px_1fr]">
                  <div class="rounded-xl border border-border/70 bg-card/70 p-3" data-gsap-reveal>
                    <div class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'home.liveMatch' | transloco }}</div>
                    <div class="mt-2 text-sm font-semibold">{{ 'home.gameCode' | transloco }}</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex items-center justify-between rounded-lg border border-border/60 px-2 py-2">
                        <span>{{ 'home.rivalName' | transloco }}</span>
                        <span class="font-mono text-primary">1460</span>
                      </div>
                      <div class="text-center text-xs font-black uppercase tracking-wider text-primary">{{ 'home.versus' | transloco }}</div>
                      <div class="flex items-center justify-between rounded-lg border border-border/60 px-2 py-2">
                        <span>{{ 'home.you' | transloco }}</span>
                        <span class="font-mono text-primary">1680</span>
                      </div>
                    </div>
                    <div class="mt-4 text-xs font-mono text-muted-foreground">{{ 'home.mistakes' | transloco }}</div>
                  </div>

                  <div class="rounded-xl border border-border/70 bg-card/65 p-3" data-gsap-reveal>
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
                  @for (action of heroActionKeys; track action) {
                    <div class="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-center font-medium" data-gsap-lift>{{ action | transloco }}</div>
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6" data-gsap-surface>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            @for (feature of features; track feature.titleKey) {
              <article class="surface-panel rounded-2xl p-5" data-gsap-stagger>
                <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <i-lucide [img]="feature.icon" [size]="20"></i-lucide>
                </div>
                <div class="text-ui-kicker text-primary">{{ feature.kickerKey | transloco }}</div>
                <h2 class="mt-2 text-2xl font-bold tracking-tight">{{ feature.titleKey | transloco }}</h2>
                <p class="mt-2 text-sm text-muted-foreground">{{ feature.descriptionKey | transloco }}</p>
              </article>
            }
          </div>
        </section>

        <section class="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6" data-gsap-surface>
          <div class="surface-panel rounded-2xl p-5 sm:p-6">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-ui-kicker text-muted-foreground">{{ 'home.topPlayers' | transloco }}</h2>
              <button class="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" type="button" (click)="goLeaderboard()">
                {{ 'home.viewFullLeaderboard' | transloco }}
                <i-lucide [img]="ArrowRightIcon" [size]="14"></i-lucide>
              </button>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              @for (player of topPlayers; track player.rank) {
                <article class="rounded-xl border border-border/60 bg-card/70 px-4 py-3" data-gsap-stagger>
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

        <section id="about" class="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6" data-gsap-surface>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-ui-kicker text-muted-foreground">{{ 'home.team' | transloco }}</h2>
            <span class="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">{{ 'home.builtBy' | transloco }}</span>
          </div>
          <div class="grid gap-3 md:grid-cols-1">
            <article class="surface-panel rounded-2xl p-5" data-gsap-stagger>
              <div class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/20 text-lg font-black text-primary">N</div>
              <h3 class="mt-3 text-lg font-bold">Nader Mohamed</h3>
              <p class="text-sm text-primary">{{ 'home.teamMember.role' | transloco }}</p>
              <p class="mt-2 text-sm text-muted-foreground">{{ 'home.teamMember.bio' | transloco }}</p>
            </article>
          </div>
        </section>
      </main>

      <footer class="border-t border-border/60 bg-card/45">
        <div class="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <div>
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-10 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-10 w-auto dark:hidden" />
            <p class="mt-3 max-w-xs text-sm text-muted-foreground">{{ 'home.footerTagline' | transloco }}</p>
          </div>
          <div>
            <div class="text-sm font-bold">{{ 'home.game' | transloco }}</div>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              <button class="block hover:text-foreground" type="button" (click)="goMultiplayer()">{{ 'common.playNow' | transloco }}</button>
              <button class="block hover:text-foreground" type="button" (click)="goHowToPlay()">{{ 'common.howToPlay' | transloco }}</button>
            </div>
          </div>
          <div>
            <div class="text-sm font-bold">{{ 'home.community' | transloco }}</div>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              <button class="block hover:text-foreground" type="button" (click)="goLeaderboard()">{{ 'common.leaderboard' | transloco }}</button>
              <span class="block">{{ 'home.tournaments' | transloco }}</span>
            </div>
          </div>
          <div>
            <div class="text-sm font-bold">{{ 'home.about' | transloco }}</div>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              <button class="block hover:text-foreground" type="button" (click)="scrollToAbout()">{{ 'home.team' | transloco }}</button>
              <span class="block">{{ 'home.contact' | transloco }}</span>
            </div>
          </div>
          <div>
            <div class="text-sm font-bold">{{ 'home.followUs' | transloco }}</div>
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
          <span>{{ 'home.copyright' | transloco: { year: currentYear } }}</span>
          <span class="inline-flex gap-3">
            <button type="button" class="hover:text-foreground" (click)="goPrivacy()">{{ 'common.privacy' | transloco }}</button>
            <button type="button" class="hover:text-foreground" (click)="goTerms()">{{ 'common.terms' | transloco }}</button>
          </span>
        </div>
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements AfterViewInit, OnDestroy {
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  readonly appStore = inject(AppStore);
  readonly HomeIcon = Home;
  readonly PlayIcon = Play;
  readonly TrophyIcon = Trophy;
  readonly UsersIcon = Users;
  readonly ZapIcon = Zap;
  readonly InfoIcon = Info;
  readonly SettingsIcon = Settings;
  readonly ArrowRightIcon = ArrowRight;
  readonly showHowTo = signal(false);
  readonly currentYear = new Date().getFullYear();
  private gsapCleanup: Array<() => void> = [];

  readonly features = [
    {
      icon: Zap,
      kickerKey: 'home.features.realtime.kicker',
      titleKey: 'home.features.realtime.title',
      descriptionKey: 'home.features.realtime.description',
    },
    {
      icon: Shield,
      kickerKey: 'home.features.fairPlay.kicker',
      titleKey: 'home.features.fairPlay.title',
      descriptionKey: 'home.features.fairPlay.description',
    },
    {
      icon: Crown,
      kickerKey: 'home.features.ranked.kicker',
      titleKey: 'home.features.ranked.title',
      descriptionKey: 'home.features.ranked.description',
    },
    {
      icon: Clock3,
      kickerKey: 'home.features.penalty.kicker',
      titleKey: 'home.features.penalty.title',
      descriptionKey: 'home.features.penalty.description',
    },
  ];

  readonly topPlayers = [
    { rank: 1, name: 'Nader', points: '2120' },
    { rank: 2, name: 'LogicMaster', points: '1987' },
    { rank: 3, name: 'SudokuSensei', points: '1875' },
    { rank: 4, name: 'GridWizard', points: '1764' },
    { rank: 5, name: 'NinePeak', points: '1650' },
  ];

  readonly socials = [
    { label: 'X', icon: Twitter, href: 'https://x.com/nader0305' },
    { label: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/in/nader0305/' },
    { label: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/nader.designss/' },
  ];

  readonly heroActionKeys = [
    'home.actions.pause',
    'home.actions.giveUp',
    'home.actions.notes',
    'home.actions.erase',
    'home.actions.undo',
    'home.actions.hint',
  ];

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

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      queueMicrotask(() => this.bootGsapAnimations());
    });
  }

  ngOnDestroy(): void {
    this.gsapCleanup.forEach((cleanup) => cleanup());
    this.gsapCleanup = [];
  }

  private bootGsapAnimations(attempt = 0): void {
    if (this.getGsap()) {
      this.runGsapAnimations();
      return;
    }

    if (attempt >= 20 || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => this.bootGsapAnimations(attempt + 1), 80);
    this.gsapCleanup.push(() => window.clearTimeout(timer));
  }

  private runGsapAnimations(): void {
    const gsap = this.getGsap();
    if (!gsap || this.prefersReducedMotion()) return;

    const root = this.host.nativeElement;
    const reveal = Array.from(root.querySelectorAll('[data-gsap-reveal]')) as HTMLElement[];
    const surfaces = Array.from(root.querySelectorAll('[data-gsap-surface]')) as HTMLElement[];
    const staggerCards = Array.from(root.querySelectorAll('[data-gsap-stagger]')) as HTMLElement[];

    if (reveal.length > 0) gsap.set(reveal, { autoAlpha: 0, y: 18 });
    if (surfaces.length > 0) gsap.set(surfaces, { autoAlpha: 0, y: 26, scale: 0.985 });
    if (staggerCards.length > 0) gsap.set(staggerCards, { autoAlpha: 0, y: 14 });

    const tl = gsap.timeline({ defaults: { duration: 0.62, ease: 'power2.out' } });
    if (surfaces.length > 0) {
      tl.to(surfaces, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.09, clearProps: 'transform' }, 0);
    }
    if (reveal.length > 0) {
      tl.to(reveal, { autoAlpha: 1, y: 0, stagger: 0.07 }, 0.1);
    }
    if (staggerCards.length > 0) {
      tl.to(staggerCards, { autoAlpha: 1, y: 0, stagger: 0.035 }, 0.25);
    }

    this.gsapCleanup.push(() => tl.kill());
    this.setupLiftInteractions(gsap, root);
  }

  private setupLiftInteractions(gsap: any, root: HTMLElement): void {
    const liftItems = Array.from(root.querySelectorAll('[data-gsap-lift]')) as HTMLElement[];
    if (liftItems.length === 0) return;

    for (const item of liftItems) {
      const onEnter = () => gsap.to(item, { y: -3, duration: 0.22, ease: 'power2.out' });
      const onLeave = () => gsap.to(item, { y: 0, duration: 0.24, ease: 'power2.out' });

      item.addEventListener('mouseenter', onEnter);
      item.addEventListener('mouseleave', onLeave);

      this.gsapCleanup.push(() => {
        item.removeEventListener('mouseenter', onEnter);
        item.removeEventListener('mouseleave', onLeave);
      });
    }
  }

  private getGsap(): any | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { gsap?: any }).gsap ?? null;
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }

  goLeaderboard(): void {
    void this.localizedRouter.navigate('/leaderboard');
  }

  goHowToPlay(): void {
    void this.localizedRouter.navigate('/how-to-play');
  }

  goPrivacy(): void {
    void this.localizedRouter.navigate('/privacy');
  }

  goTerms(): void {
    void this.localizedRouter.navigate('/terms');
  }

  goSettings(): void {
    void this.localizedRouter.navigate('/settings');
  }

  goSignIn(): void {
    void this.localizedRouter.navigate('/sign-in');
  }

  goMultiplayer(): void {
    if (this.appStore.isSignedIn()) {
      void this.localizedRouter.navigate('/lobby');
      return;
    }

    const next = encodeURIComponent(this.localizedRouter.localize('/lobby'));
    void this.localizedRouter.navigate(`/sign-in?next=${next}`);
  }

  scrollToAbout(): void {
    const element = document.getElementById('about');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
