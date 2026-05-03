import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStore } from '../store/game.store';
import { SudokuGridComponent } from '../shared/components/sudoku-grid.component';

@Component({
  selector: 'app-solo-page',
  standalone: true,
  imports: [SudokuGridComponent],
  template: `
    <div
      class="min-h-screen bg-background text-foreground"
      style="background-image: linear-gradient(rgba(34,211,238,0.03) 1px,transparent 1px), linear-gradient(90deg,rgba(34,211,238,0.03) 1px,transparent 1px); background-size: 60px 60px;"
    >
      <nav class="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <button
            class="flex items-center gap-2 font-black italic uppercase tracking-tight text-primary"
            type="button"
            (click)="goHome()"
          >
            <span class="text-base">←</span> Sudoku Rival
          </button>
          <div class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
            Solo Practice
          </div>
        </div>
      </nav>

      <main class="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 class="text-3xl font-black tracking-tight md:text-4xl">Practice Run</h1>
            <p class="mt-1 text-sm font-mono text-muted-foreground">
              Sharpen your skills before entering the multiplayer arena.
            </p>
          </div>

          <div class="flex gap-2">
            @for (difficulty of difficulties; track difficulty) {
              <button
                class="rounded-md px-3 py-2 text-sm font-mono uppercase transition-colors"
                [class.bg-primary]="gameStore.difficulty() === difficulty"
                [class.text-primary-foreground]="gameStore.difficulty() === difficulty"
                [class.border]="gameStore.difficulty() !== difficulty"
                [class.border-border/60]="gameStore.difficulty() !== difficulty"
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
          <div class="flex items-center justify-center py-24 font-mono text-muted-foreground">
            Generating puzzle...
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_240px]">
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


              <div
                class="flex w-full max-w-md justify-between text-xs font-mono text-muted-foreground"
              >
                <span>
                  Filled: <span class="text-primary">{{ filledCount() }}</span
                  >/{{ totalCount() }}
                </span>
                <span class="text-primary">{{ progress() }}%</span>
              </div>

              <div class="grid w-full max-w-md grid-cols-5 gap-2 sm:grid-cols-10">
                @for (num of numberPad; track num) {
                  <button
                    class="flex h-12 items-center justify-center rounded-md border border-border/60 bg-card/60 font-mono text-lg font-bold transition-colors hover:border-primary/60 hover:bg-primary/10 active:bg-primary/20"
                    type="button"
                    (click)="enterNumber(num)"
                  >
                    {{ num }}
                  </button>
                }
                <button
                  class="flex h-12 items-center justify-center rounded-md border border-border/60 bg-card/60 font-mono text-sm font-bold text-destructive transition-colors hover:border-destructive/60 hover:bg-destructive/10 active:bg-destructive/20"
                  type="button"
                  (click)="enterNumber(0)"
                >
                  ✕
                </button>
              </div>
            </div>

            <aside class="space-y-3">
              <h3 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Controls
              </h3>
              <button
                class="flex w-full items-center justify-start rounded-md border border-border/60 px-4 py-3 text-sm font-medium hover:bg-muted/40"
                type="button"
                (click)="toggleHighlight()"
              >
                <span class="mr-2">{{ gameStore.highlightSameNumbers() ? '◼' : '◻' }}</span>
                Number highlight
                <span
                  class="ml-auto text-[10px] font-mono uppercase"
                  [class.text-primary]="gameStore.highlightSameNumbers()"
                  [class.text-muted-foreground]="!gameStore.highlightSameNumbers()"
                >
                  {{ gameStore.highlightSameNumbers() ? 'On' : 'Off' }}
                </span>
              </button>
              <button
                class="flex w-full items-center justify-start rounded-md border border-border/60 px-4 py-3 text-sm font-medium hover:bg-muted/40"
                type="button"
                (click)="toggleValidation()"
              >
                <span class="mr-2">{{ gameStore.errorValidation() ? '◼' : '◻' }}</span>
                Error check
                <span
                  class="ml-auto text-[10px] font-mono uppercase"
                  [class.text-primary]="gameStore.errorValidation()"
                  [class.text-muted-foreground]="!gameStore.errorValidation()"
                >
                  {{ gameStore.errorValidation() ? 'On' : 'Off' }}
                </span>
              </button>
              <button
                class="flex w-full items-center justify-start rounded-md border border-border/60 px-4 py-3 text-sm font-medium hover:bg-muted/40"
                type="button"
                (click)="resetBoard()"
              >
                Reset board
              </button>
              <button
                class="flex w-full items-center justify-start rounded-md bg-secondary px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-secondary/80"
                type="button"
                (click)="goLobby()"
              >
                Go multiplayer
              </button>
            </aside>
          </div>
        }

        @if (gameStore.soloSolved()) {
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div
              class="w-full max-w-md rounded-2xl border border-border/60 bg-background p-6 text-center shadow-2xl"
            >
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">
                Puzzle solved
              </div>
              <h2 class="mt-3 text-3xl font-black uppercase italic text-primary">
                Sudoku Complete
              </h2>
              <p class="mt-4 text-sm text-muted-foreground">
                Great run. Start another puzzle or move into multiplayer.
              </p>
              <div class="mt-6 space-y-3">
                <button
                  class="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                  type="button"
                  (click)="playAgain()"
                >
                  Play again
                </button>
                <button
                  class="w-full rounded-md border border-border/60 px-4 py-3 text-sm font-mono uppercase tracking-wider hover:bg-muted/40"
                  type="button"
                  (click)="goLobby()"
                >
                  Enter multiplayer arena
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
  private readonly router = inject(Router);
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
    void this.router.navigateByUrl('/');
  }

  goLobby(): void {
    void this.router.navigateByUrl('/lobby');
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
}
