import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { GameStore } from '../store/game.store';
import { SudokuGridComponent } from '../shared/components/sudoku-grid.component';
import { buildShareUrl, copyShareText, shareWin } from '../shared/utils/share';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { UserNavComponent } from '../shared/components/user-nav.component';

@Component({
  selector: 'app-solo-page',
  standalone: true,
  imports: [SudokuGridComponent, TranslocoPipe, UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <nav class="sticky top-0 z-20 border-b border-border/55 bg-background/85 backdrop-blur-sm">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <button class="inline-flex items-center gap-2" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-8 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-8 w-auto dark:hidden" />
          </button>
          <app-user-nav />
        </div>
      </nav>

      <main class="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 class="text-3xl font-black tracking-tight md:text-5xl">
              {{ 'play.practiceTitle' | transloco }}
            </h1>
            <p class="mt-1 text-sm font-mono text-muted-foreground">
              {{ 'play.practiceSubtitle' | transloco }}
            </p>
          </div>

          <div class="flex gap-2">
            @for (difficulty of difficulties; track difficulty) {
              <button
                class="btn-game rounded-lg px-3 py-2 text-sm font-mono uppercase transition-colors"
                [class.bg-primary]="gameStore.difficulty() === difficulty"
                [class.text-primary-foreground]="gameStore.difficulty() === difficulty"
                [class.border]="gameStore.difficulty() !== difficulty"
                [class.border-border/60]="gameStore.difficulty() !== difficulty"
                [class.bg-card/70]="gameStore.difficulty() !== difficulty"
                [class.hover:bg-muted/40]="gameStore.difficulty() !== difficulty"
                type="button"
                (click)="startSolo(difficulty)"
              >
                {{ difficulty }}
              </button>
            }
          </div>
        </div>

        @if (gameStore.mode() !== 'solo') {
          <div class="flex min-h-[40vh] items-center justify-center font-mono text-muted-foreground">
            {{ 'play.generating' | transloco }}
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
            <div class="flex flex-col items-center gap-4">
              <app-sudoku-grid
                [puzzle]="gameStore.puzzle()"
                [attempt]="gameStore.attempt()"
                [solution]="gameStore.solution()"
                [selectedIndex]="gameStore.selectedIndex()"
                [highlightSameNumbers]="gameStore.highlightSameNumbers()"
                [errorValidation]="gameStore.errorValidation()"
                [shakeIndex]="gameStore.shakeIndex()"
                [frozen]="false"
                (cellClicked)="selectCell($event)"
              />

              <div class="w-full max-w-md">
                <div class="mb-1 flex justify-between text-xs font-mono text-muted-foreground">
                  <span>{{ 'play.filled' | transloco }} <span class="text-primary">{{ filledCount() }}</span>/{{ totalCount() }}</span>
                  <span class="text-primary">{{ progress() }}%</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-muted">
                  <div class="animate-sr-progress h-full rounded-full bg-primary" [style.width.%]="progress()"></div>
                </div>
              </div>

              <div class="grid w-full max-w-md grid-cols-5 gap-2 sm:grid-cols-10">
                @for (num of numberPad; track num) {
                  <button
                    class="btn-game flex h-12 items-center justify-center rounded-lg border border-border/60 bg-card/70 font-mono text-lg font-bold transition-colors hover:border-primary/60 hover:bg-primary/10 active:bg-primary/20"
                    type="button"
                    (click)="enterNumber(num)"
                  >
                    {{ num }}
                  </button>
                }
                <button
                  class="btn-game flex h-12 items-center justify-center rounded-lg border border-destructive/45 bg-card/70 font-mono text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/20"
                  type="button"
                  (click)="enterNumber(0)"
                >
                  {{ 'play.delete' | transloco }}
                </button>
              </div>
            </div>

            <aside class="space-y-3">
              <h3 class="text-ui-kicker text-muted-foreground">{{ 'play.controls' | transloco }}</h3>
              <button
                class="btn-game flex w-full items-center justify-start rounded-lg border border-border/60 bg-card/70 px-4 py-3 text-sm font-medium hover:bg-muted/40"
                type="button"
                (click)="toggleHighlight()"
              >
                {{ 'play.numberHighlight' | transloco }}
                <span class="ml-auto text-[10px] font-mono uppercase" [class.text-primary]="gameStore.highlightSameNumbers()" [class.text-muted-foreground]="!gameStore.highlightSameNumbers()">
                  {{ gameStore.highlightSameNumbers() ? ('play.on' | transloco) : ('play.off' | transloco) }}
                </span>
              </button>
              <button
                class="btn-game flex w-full items-center justify-start rounded-lg border border-border/60 bg-card/70 px-4 py-3 text-sm font-medium hover:bg-muted/40"
                type="button"
                (click)="toggleValidation()"
              >
                {{ 'play.errorCheck' | transloco }}
                <span class="ml-auto text-[10px] font-mono uppercase" [class.text-primary]="gameStore.errorValidation()" [class.text-muted-foreground]="!gameStore.errorValidation()">
                  {{ gameStore.errorValidation() ? ('play.on' | transloco) : ('play.off' | transloco) }}
                </span>
              </button>
              <button
                class="btn-game flex w-full items-center justify-start rounded-lg border border-border/60 bg-card/70 px-4 py-3 text-sm font-medium hover:bg-muted/40"
                type="button"
                (click)="resetBoard()"
              >
                {{ 'play.resetBoard' | transloco }}
              </button>
              <button
                class="btn-game flex w-full items-center justify-start rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                type="button"
                (click)="goLobby()"
              >
                {{ 'play.goMultiplayer' | transloco }}
              </button>
            </aside>
          </div>
        }

        @if (gameStore.soloSolved()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div class="surface-panel w-full max-w-md rounded-2xl p-6 text-center shadow-2xl">
              <div class="text-ui-kicker text-primary">{{ 'play.solved' | transloco }}</div>
              <h2 class="mt-3 text-3xl font-black uppercase tracking-tight text-primary">{{ 'play.complete' | transloco }}</h2>
              <p class="mt-4 text-sm text-muted-foreground">
                {{ 'play.greatRun' | transloco }}
              </p>
              <div class="mt-5 grid grid-cols-2 gap-2">
                <button class="btn-game rounded-lg border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40" type="button" (click)="shareNative()">
                  {{ 'play.share' | transloco }}
                </button>
                <a class="btn-game rounded-lg border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40" [href]="shareLink('x')" target="_blank" rel="noopener">
                  X
                </a>
                <a class="btn-game rounded-lg border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40" [href]="shareLink('facebook')" target="_blank" rel="noopener">
                  Facebook
                </a>
                <button class="btn-game rounded-lg border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40" type="button" (click)="copyShare()">
                  {{ 'play.copy' | transloco }}
                </button>
              </div>
              <div class="mt-6 space-y-3">
                <button class="btn-game w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90" type="button" (click)="playAgain()">
                  {{ 'play.playAgain' | transloco }}
                </button>
                <button class="btn-game w-full rounded-xl border border-border/60 bg-card/70 px-4 py-3 text-sm font-mono uppercase tracking-wider hover:bg-muted/40" type="button" (click)="goLobby()">
                  {{ 'play.enterMultiplayer' | transloco }}
                </button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoloPage {
  private readonly localizedRouter = inject(LocalizedRouterService);
  readonly gameStore = inject(GameStore);
  readonly difficulties = ['easy', 'medium', 'hard'] as const;
  readonly numberPad = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  readonly totalCount = computed(
    () => this.gameStore.puzzle().filter((value) => value === 0).length,
  );

  readonly filledCount = computed(
    () =>
      this.gameStore
        .attempt()
        .filter((value, index) => value !== 0 && this.gameStore.puzzle()[index] === 0).length,
  );

  readonly progress = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.floor((this.filledCount() / total) * 100) : 0;
  });

  ngOnInit(): void {
    if (this.gameStore.mode() !== 'solo') {
      this.gameStore.startSolo('medium');
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (this.shouldIgnoreKeyEvent(event)) return;
    void this.gameStore.handleKeyDown(event);
  }

  private shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  }

  goHome(): void {
    void this.localizedRouter.navigate('/');
  }

  goLobby(): void {
    void this.localizedRouter.navigate('/lobby');
  }

  selectCell(index: number): void {
    this.gameStore.selectCell(index);
  }

  enterNumber(value: number): void {
    const selectedIndex = this.gameStore.selectedIndex();
    if (selectedIndex === null) return;
    void this.gameStore.enterCell(selectedIndex, value);
  }

  toggleHighlight(): void {
    this.gameStore.setHighlightSameNumbers(!this.gameStore.highlightSameNumbers());
  }

  toggleValidation(): void {
    this.gameStore.setErrorValidation(!this.gameStore.errorValidation());
  }

  resetBoard(): void {
    this.gameStore.resetSolo();
  }

  playAgain(): void {
    this.gameStore.startSolo(this.gameStore.difficulty());
  }

  startSolo(difficulty: (typeof this.difficulties)[number]): void {
    this.gameStore.startSolo(difficulty);
  }

  shareLink(destination: 'x' | 'facebook' | 'linkedin'): string {
    return buildShareUrl(destination, this.shareOptions());
  }

  async shareNative(): Promise<void> {
    const handled = await shareWin(this.shareOptions());
    if (!handled) {
      globalThis.open(this.shareLink('x'), '_blank', 'noopener');
    }
  }

  async copyShare(): Promise<void> {
    await copyShareText(this.shareOptions());
  }

  private shareOptions() {
    const difficulty = this.gameStore.difficulty();
    return {
      title: 'Sudoku Rival win',
      text: `I solved a ${difficulty} Sudoku Rival puzzle. Think you can beat my run?`,
      url: globalThis.location.origin,
    };
  }
}
