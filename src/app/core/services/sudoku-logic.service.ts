import { Injectable } from '@angular/core';
import { Difficulty, SoloPuzzle, ValidationResult } from '../models';

type Cell = number;

const SIZE = 9;
const BOX = 3;

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex]!, next[index]!];
  }

  return next;
}

function isValidPlacement(grid: Cell[], row: number, col: number, num: Cell): boolean {
  for (let index = 0; index < SIZE; index += 1) {
    if (grid[row * SIZE + index] === num) return false;
    if (grid[index * SIZE + col] === num) return false;
  }

  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;

  for (let r = boxRow; r < boxRow + BOX; r += 1) {
    for (let c = boxCol; c < boxCol + BOX; c += 1) {
      if (grid[r * SIZE + c] === num) return false;
    }
  }

  return true;
}

function solve(grid: Cell[]): boolean {
  for (let index = 0; index < SIZE * SIZE; index += 1) {
    if (grid[index] === 0) {
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      for (const num of numbers) {
        if (isValidPlacement(grid, row, col, num)) {
          grid[index] = num;
          if (solve(grid)) return true;
          grid[index] = 0;
        }
      }

      return false;
    }
  }

  return true;
}

function countSolutions(grid: Cell[], cap = 2): number {
  let solutions = 0;

  function recurse(candidate: Cell[]): void {
    if (solutions >= cap) return;

    for (let index = 0; index < SIZE * SIZE; index += 1) {
      if (candidate[index] === 0) {
        const row = Math.floor(index / SIZE);
        const col = index % SIZE;

        for (let num = 1; num <= 9; num += 1) {
          if (isValidPlacement(candidate, row, col, num)) {
            candidate[index] = num;
            recurse(candidate);
            candidate[index] = 0;

            if (solutions >= cap) return;
          }
        }

        return;
      }
    }

    solutions += 1;
  }

  recurse([...grid]);
  return solutions;
}

const DIFFICULTY_CELLS_TO_REMOVE: Record<Difficulty, number> = {
  easy: 38,
  medium: 48,
  hard: 56,
};

@Injectable({ providedIn: 'root' })
export class SudokuLogicService {
  generateSudoku(difficulty: Difficulty): SoloPuzzle {
    const board: Cell[] = new Array(SIZE * SIZE).fill(0);
    solve(board);
    const solution = [...board];
    const targetRemove = DIFFICULTY_CELLS_TO_REMOVE[difficulty];
    const positions = shuffle(Array.from({ length: SIZE * SIZE }, (_, index) => index));

    let removed = 0;
    for (const position of positions) {
      if (removed >= targetRemove) break;

      const backup = board[position]!;
      board[position] = 0;

      if (difficulty === 'hard') {
        const solutions = countSolutions(board, 2);
        if (solutions !== 1) {
          board[position] = backup;
          continue;
        }
      }

      removed += 1;
    }

    return {
      puzzle: board,
      solution,
      difficulty,
      givens: SIZE * SIZE - removed,
    };
  }

  validateAttempt(solution: number[], attempt: number[]): ValidationResult {
    const errors: number[] = [];
    let filledCount = 0;

    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const attemptValue = attempt[index] ?? 0;
      const solutionValue = solution[index] ?? 0;

      if (attemptValue !== 0) {
        filledCount += 1;
        if (attemptValue !== solutionValue) errors.push(index);
      }
    }

    const complete = filledCount === SIZE * SIZE;

    return {
      complete,
      correct: complete && errors.length === 0,
      filledCount,
      errors,
    };
  }
}
