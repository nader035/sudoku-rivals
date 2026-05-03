import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

type SudokuCellState = {
  index: number;
  value: number;
  isGiven: boolean;
  isSelected: boolean;
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
  readonly index = input.required<number>();
  readonly value = input.required<number>();
  readonly isGiven = input.required<boolean>();
  readonly isSelected = input(false);
  readonly isSameValue = input(false);
  readonly isError = input(false);
  readonly isShaking = input(false);
  readonly isRightThick = input(false);
  readonly isBottomThick = input(false);
  readonly frozen = input(false);

  readonly clicked = output<number>();

  readonly classes = computed(() => {
    const classNames = [
      'flex h-10 w-10 items-center justify-center select-none border-r border-b border-border/60 font-mono text-lg transition-colors sm:h-12 sm:w-12 sm:text-xl',
      this.isRightThick() ? 'border-r-2 border-r-primary' : '',
      this.isBottomThick() ? 'border-b-2 border-b-primary' : '',
      this.index() % 9 === 8 ? 'border-r-0' : '',
      Math.floor(this.index() / 9) === 8 ? 'border-b-0' : '',
      this.isSelected() ? 'bg-primary/25 ring-2 ring-inset ring-primary' : '',
      this.isSameValue() ? 'bg-primary/10' : '',
      this.isError() ? 'bg-destructive/15 font-bold text-destructive' : '',
      this.isGiven() ? 'font-bold text-foreground' : 'text-primary',
      this.isShaking() ? 'animate-sr-shake bg-destructive/30 text-destructive' : '',
      this.frozen() ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-primary/10',
    ];

    return classNames.filter(Boolean).join(' ');
  });

  readonly label = computed(() => `Cell ${this.index() + 1}`);
}

@Component({
  selector: 'app-sudoku-grid',
  standalone: true,
  imports: [SudokuCellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="grid w-fit grid-cols-9 overflow-hidden rounded-md border-2 border-primary bg-background transition-opacity duration-300"
      [class.opacity-50]="frozen()"
      data-testid="sudoku-board"
    >
      @for (cell of cells(); track cell.index) {
        <app-sudoku-cell
          [index]="cell.index"
          [value]="cell.value"
          [isGiven]="cell.isGiven"
          [isSelected]="cell.isSelected"
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
        isSameValue,
        isError,
        isShaking: this.shakeIndex() === index,
        isRightThick: col === 2 || col === 5,
        isBottomThick: row === 2 || row === 5,
      };
    });
  });
}
