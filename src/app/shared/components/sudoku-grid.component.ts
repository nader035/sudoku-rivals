import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

type SudokuCellState = {
  index: number;
  value: number;
  isGiven: boolean;
  isSelected: boolean;
  isPeer: boolean;
  isSameValue: boolean;
  isError: boolean;
  isShaking: boolean;
  isRightThick: boolean;
  isBottomThick: boolean;
};

@Component({
  selector: 'app-sudoku-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [disabled]="frozen()"
      [class]="classes()"
      [attr.aria-label]="label()"
      (click)="clicked.emit(index())"
    >
      {{ value() !== 0 ? value() : '' }}
    </button>
  `,
})
export class SudokuCellComponent {
  private readonly i18n = inject(I18nService);
  readonly index = input.required<number>();
  readonly value = input.required<number>();
  readonly isGiven = input.required<boolean>();
  readonly isSelected = input(false);
  readonly isPeer = input(false);
  readonly isSameValue = input(false);
  readonly isError = input(false);
  readonly isShaking = input(false);
  readonly isRightThick = input(false);
  readonly isBottomThick = input(false);
  readonly frozen = input(false);

  readonly clicked = output<number>();

  readonly classes = computed(() => {
    const classNames = [
      'group relative flex h-10 w-10 items-center justify-center select-none border-r border-b border-border/70 font-mono text-lg font-semibold transition-all duration-150 sm:h-12 sm:w-12 sm:text-xl md:h-[3.15rem] md:w-[3.15rem] md:text-[1.24rem]',
      this.isRightThick() ? 'border-r-[2px] border-r-primary/75' : '',
      this.isBottomThick() ? 'border-b-[2px] border-b-primary/75' : '',
      this.index() % 9 === 8 ? 'border-r-0' : '',
      Math.floor(this.index() / 9) === 8 ? 'border-b-0' : '',
      this.isSelected() ? 'z-10 border-primary/90 bg-primary/20 ring-2 ring-primary/70 ring-inset shadow-[0_0_0_1px_hsl(var(--primary)/0.24)]' : '',
      this.isPeer() && !this.isSelected() ? 'bg-primary/8' : '',
      this.isSameValue() ? 'bg-primary/14 text-lime' : '',
      this.isError() ? 'bg-destructive/18 text-destructive' : '',
      this.isGiven() ? 'bg-muted/35 text-foreground' : 'text-primary',
      this.isShaking() ? 'animate-sr-shake bg-destructive/34 text-destructive ring-2 ring-destructive/45 ring-inset' : '',
      this.frozen() ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-primary/50 hover:bg-primary/14 active:scale-[0.98]',
    ];

    return classNames.filter(Boolean).join(' ');
  });

  readonly label = computed(() =>
    this.i18n.t('game.cellLabel', {
      index: this.index() + 1,
      value: this.value() || this.i18n.t('game.empty'),
    }),
  );
}

@Component({
  selector: 'app-sudoku-grid',
  standalone: true,
  imports: [SudokuCellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-fit rounded-2xl p-2.5 surface-panel sudoku-outline sm:p-3">
      <div
      class="grid w-fit grid-cols-9 overflow-hidden rounded-xl border-2 border-primary/70 bg-background/90 transition-opacity duration-300"
      [class.opacity-55]="frozen()"
      data-testid="sudoku-board"
      >
        @for (cell of cells(); track cell.index) {
          <app-sudoku-cell
            [index]="cell.index"
            [value]="cell.value"
            [isGiven]="cell.isGiven"
            [isSelected]="cell.isSelected"
            [isPeer]="cell.isPeer"
            [isSameValue]="cell.isSameValue"
            [isError]="cell.isError"
            [isShaking]="cell.isShaking"
            [isRightThick]="cell.isRightThick"
            [isBottomThick]="cell.isBottomThick"
            [frozen]="frozen()"
            (clicked)="cellClicked.emit($event)"
          />
        }
      </div>
    </div>
  `,
})
export class SudokuGridComponent {
  readonly puzzle = input.required<number[]>();
  readonly attempt = input.required<number[]>();
  readonly solution = input<number[] | null>(null);
  readonly selectedIndex = input<number | null>(null);
  readonly highlightSameNumbers = input(true);
  readonly errorValidation = input(true);
  readonly shakeIndex = input<number | null>(null);
  readonly frozen = input(false);

  readonly cellClicked = output<number>();

  readonly cells = computed<SudokuCellState[]>(() => {
    const puzzle = this.puzzle();
    const attempt = this.attempt();
    const selectedIndex = this.selectedIndex();
    const selectedValue = selectedIndex !== null ? (attempt[selectedIndex] ?? 0) : 0;
    const solution = this.solution();

    return attempt.map((value, index) => {
      const row = Math.floor(index / 9);
      const col = index % 9;
      const isGiven = puzzle[index] !== 0;
      const isSelected = selectedIndex === index;
      const selectedRow = selectedIndex !== null ? Math.floor(selectedIndex / 9) : -1;
      const selectedCol = selectedIndex !== null ? selectedIndex % 9 : -1;
      const selectedBox =
        selectedIndex !== null
          ? Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3)
          : -1;
      const cellBox = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      const isPeer =
        selectedIndex !== null &&
        !isSelected &&
        (row === selectedRow || col === selectedCol || cellBox === selectedBox);
      const isSameValue =
        this.highlightSameNumbers() &&
        selectedValue !== 0 &&
        value !== 0 &&
        value === selectedValue &&
        !isSelected;
      const isError =
        this.errorValidation() &&
        !isGiven &&
        value !== 0 &&
        solution !== null &&
        value !== solution[index];

      return {
        index,
        value,
        isGiven,
        isSelected,
        isPeer,
        isSameValue,
        isError,
        isShaking: this.shakeIndex() === index,
        isRightThick: col === 2 || col === 5,
        isBottomThick: row === 2 || row === 5,
      };
    });
  });
}
