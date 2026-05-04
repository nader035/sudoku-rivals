import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { filter, switchMap } from 'rxjs/operators';
import { AppStore } from './app.store';
import {
  Difficulty,
  GameMode,
  RoomPlayerSnapshot,
  RoomSnapshot,
  RoomStatus,
  SoloPuzzle,
} from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';
import { SudokuLogicService } from '../core/services/sudoku-logic.service';

const BOARD_SIZE = 81;
const EMPTY_BOARD = Array.from({ length: BOARD_SIZE }, () => 0);
const PENALTY_PERCENT = 3;
const FREEZE_MS = 3000;
const MEGA_FREEZE_MS = 10000;
const MEGA_FREEZE_THRESHOLD = 5;
const BOARD_RESET_MISTAKE_THRESHOLD = 10;

interface GameStoreState {
  mode: GameMode;
  difficulty: Difficulty;
  roomId: string | null;
  loadedRoomId: string | null;
  roomStatus: RoomStatus;
  roomName: string | null;
  roomHasPassword: boolean;
  roomMaxPlayers: number;
  roomHostId: string | null;
  roomWinnerId: string | null;
  roomWinnerUsername: string | null;
  roomPlayers: RoomPlayerSnapshot[];
  puzzle: number[];
  solution: number[];
  attempt: number[];
  selectedIndex: number | null;
  highlightSameNumbers: boolean;
  errorValidation: boolean;
  mistakes: number;
  rawProgress: number;
  penaltyPoints: number;
  frozenUntil: number | null;
  now: number;
  shakeIndex: number | null;
  loading: boolean;
  error: string | null;
  soloSolved: boolean;
}

function createBoard(): number[] {
  return Array.from({ length: BOARD_SIZE }, () => 0);
}

function cloneBoard(board: number[]): number[] {
  return [...board];
}

function isBoardEmpty(board: number[]): boolean {
  return board.every((value) => value === 0);
}

function parseIsoToMillis(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export const GameStore = signalStore(
  { providedIn: 'root', protectedState: false },
  withState<GameStoreState>({
    mode: 'idle',
    difficulty: 'medium',
    roomId: null,
    loadedRoomId: null,
    roomStatus: 'waiting',
    roomName: null,
    roomHasPassword: false,
    roomMaxPlayers: 0,
    roomHostId: null,
    roomWinnerId: null,
    roomWinnerUsername: null,
    roomPlayers: [],
    puzzle: createBoard(),
    solution: createBoard(),
    attempt: createBoard(),
    selectedIndex: null,
    highlightSameNumbers: true,
    errorValidation: true,
    mistakes: 0,
    rawProgress: 0,
    penaltyPoints: 0,
    frozenUntil: null,
    now: Date.now(),
    shakeIndex: null,
    loading: false,
    error: null,
    soloSolved: false,
  }),
  withProps(() => {
    const supabase = inject(SupabaseService);
    const sudokuLogic = inject(SudokuLogicService);
    const appStore = inject(AppStore);
    const injector = inject(Injector);
    const roomId = signal<string | null>(null);

    const roomSnapshot = toSignal(
      toObservable(roomId).pipe(
        switchMap((currentRoomId) =>
          currentRoomId ? supabase.observeRoom(currentRoomId) : [null],
        ),
      ),
      {
        initialValue: null as RoomSnapshot | null,
        injector,
      },
    );

    return {
      supabase,
      sudokuLogic,
      appStore,
      roomId,
      roomSnapshot,
    };
  }),
  withHooks((store) => {
    let heartbeat: number | null = null;
    let snapshotEffect = effect(() => {
      const snapshot = store.roomSnapshot();
      const currentPlayerId = store.appStore.player()?.id ?? null;

      if (!snapshot) {
        if (store.roomId() === null && store.mode() !== 'solo') {
          patchState(store, {
            mode: 'idle',
            roomStatus: 'waiting',
            roomName: null,
            roomHasPassword: false,
            roomMaxPlayers: 0,
            roomHostId: null,
            roomWinnerId: null,
            roomWinnerUsername: null,
            roomPlayers: [],
            puzzle: createBoard(),
            solution: createBoard(),
            attempt: createBoard(),
            loadedRoomId: null,
            highlightSameNumbers: true,
            errorValidation: true,
            rawProgress: 0,
            penaltyPoints: 0,
            mistakes: 0,
            frozenUntil: null,
            shakeIndex: null,
            loading: false,
            error: null,
            soloSolved: false,
          });
        }

        return;
      }

      const currentPlayer = currentPlayerId
        ? (snapshot.players.find((player) => player.playerId === currentPlayerId) ?? null)
        : null;
      const loadedRoomId = store.loadedRoomId();
      const shouldSeedAttempt =
        snapshot.status !== 'waiting' &&
        (loadedRoomId !== snapshot.id || isBoardEmpty(store.attempt()));

      patchState(store, {
        mode: 'multiplayer',
        difficulty: snapshot.difficulty,
        roomStatus: snapshot.status,
        roomName: snapshot.name,
        roomHasPassword: snapshot.hasPassword,
        roomMaxPlayers: snapshot.maxPlayers,
        roomHostId: snapshot.hostId,
        roomWinnerId: snapshot.winnerId,
        roomWinnerUsername: snapshot.winnerUsername,
        roomPlayers: snapshot.players,
        puzzle: snapshot.puzzle ?? createBoard(),
        solution: snapshot.solution ?? createBoard(),
        rawProgress: currentPlayer?.progress ?? 0,
        mistakes: currentPlayer?.mistakes ?? 0,
        penaltyPoints: (currentPlayer?.mistakes ?? 0) * PENALTY_PERCENT,
        frozenUntil: parseIsoToMillis(currentPlayer?.frozenUntil ?? null),
        loadedRoomId: snapshot.id,
        loading: false,
        error: null,
      });

      if (shouldSeedAttempt) {
        const seededBoard =
          currentPlayer?.board && currentPlayer.board.length === BOARD_SIZE
            ? currentPlayer.board
            : (snapshot.puzzle ?? createBoard());

        patchState(store, { attempt: cloneBoard(seededBoard) });
      }
    });

    return {
      onInit() {
        heartbeat = window.setInterval(() => {
          patchState(store, { now: Date.now() });
        }, 250);
      },
      onDestroy() {
        if (heartbeat !== null) {
          window.clearInterval(heartbeat);
        }

        snapshotEffect.destroy();
      },
    };
  }),
  withMethods((store) => {
    const supabase = store.supabase;
    const sudokuLogic = store.sudokuLogic;
    const appStore = store.appStore;
    const resetGameState = (): void => {
      store.roomId.set(null);
      patchState(store, {
        mode: 'idle',
        roomId: null,
        loadedRoomId: null,
        roomStatus: 'waiting',
        roomName: null,
        roomHasPassword: false,
        roomHostId: null,
        roomWinnerId: null,
        roomWinnerUsername: null,
        roomPlayers: [],
        puzzle: createBoard(),
        solution: createBoard(),
        attempt: createBoard(),
        selectedIndex: null,
        mistakes: 0,
        rawProgress: 0,
        penaltyPoints: 0,
        frozenUntil: null,
        shakeIndex: null,
        loading: false,
        error: null,
        soloSolved: false,
      });
    };

    function getPlayerId(): string | null {
      return appStore.player()?.id ?? null;
    }

    function currentPuzzle(): number[] {
      return store.puzzle();
    }

    function currentSolution(): number[] {
      return store.solution();
    }

    function computeRawProgress(board: number[]): number {
      const puzzle = currentPuzzle();
      const solution = currentSolution();

      if (!solution || solution.length !== BOARD_SIZE) return 0;

      const nonGivens = puzzle.filter((value) => value === 0).length;
      if (nonGivens === 0) return 0;

      let correct = 0;
      for (let index = 0; index < BOARD_SIZE; index += 1) {
        if (puzzle[index] === 0 && board[index] !== 0 && board[index] === solution[index]) {
          correct += 1;
        }
      }

      return Math.max(0, Math.floor((correct / nonGivens) * 100));
    }

    async function syncProgress(board: number[], mistakes: number): Promise<void> {
      const roomId = store.roomId();
      const playerId = getPlayerId();

      if (!roomId || !playerId || store.mode() !== 'multiplayer') return;

      const rawProgress = computeRawProgress(board);
      patchState(store, { rawProgress });

      await supabase.updatePlayerProgress(roomId, playerId, board, rawProgress, mistakes);
    }

    function setFrozenFor(durationMs: number): void {
      patchState(store, {
        frozenUntil: Date.now() + durationMs,
        now: Date.now(),
      });
    }

    function clearAndSetAttempt(board: number[]): void {
      patchState(store, { attempt: cloneBoard(board) });
    }

    function moveSelection(deltaRow: number, deltaCol: number): void {
      const selectedIndex = store.selectedIndex();
      if (selectedIndex === null) return;
      if (store.frozenUntil() !== null && store.now() < store.frozenUntil()!) return;

      const currentRow = Math.floor(selectedIndex / 9);
      const currentCol = selectedIndex % 9;
      const nextRow = Math.min(8, Math.max(0, currentRow + deltaRow));
      const nextCol = Math.min(8, Math.max(0, currentCol + deltaCol));

      patchState(store, { selectedIndex: nextRow * 9 + nextCol });
    }

    async function enterCell(index: number, value: number): Promise<void> {
      const board = cloneBoard(store.attempt());
      const puzzle = currentPuzzle();
      const solution = currentSolution();
      const roomStatus = store.roomStatus();

      if (store.mode() === 'multiplayer' && roomStatus !== 'playing') return;
      if (puzzle[index] !== 0) return;
      if (store.frozenUntil() !== null && store.now() < store.frozenUntil()!) return;

      if (store.mode() === 'solo') {
        board[index] = value;
        patchState(store, {
          attempt: board,
          selectedIndex: index,
          shakeIndex: null,
        });

        const rawProgress = computeRawProgress(board);
        patchState(store, { rawProgress });

        await syncProgress(board, store.mistakes());

        if (board.every((cell) => cell !== 0)) {
          const validation = sudokuLogic.validateAttempt(solution, board);
          if (validation.correct) {
            patchState(store, { soloSolved: true });
          }
        }

        return;
      }

      if (value === 0) {
        board[index] = 0;
        patchState(store, {
          attempt: board,
          selectedIndex: index,
          shakeIndex: null,
        });

        await syncProgress(board, store.mistakes());
        return;
      }

      if (solution[index] !== value) {
        const stableBoard = cloneBoard(board);
        const newMistakes = store.mistakes() + 1;
        const triggersMegaFreeze = newMistakes % MEGA_FREEZE_THRESHOLD === 0;
        const triggersBoardReset =
          newMistakes % BOARD_RESET_MISTAKE_THRESHOLD === 0;
        const freezeMs = triggersMegaFreeze ? MEGA_FREEZE_MS : FREEZE_MS;

        if (triggersBoardReset) {
          const resetBoard = cloneBoard(store.puzzle());
          patchState(store, {
            attempt: resetBoard,
            mistakes: 0,
            penaltyPoints: 0,
            shakeIndex: index,
            selectedIndex: null,
          });
          setFrozenFor(freezeMs);
          window.setTimeout(() => patchState(store, { shakeIndex: null }), 600);
          void syncProgress(resetBoard, 0);
          return;
        }

        board[index] = value;
        patchState(store, {
          attempt: board,
          mistakes: newMistakes,
          penaltyPoints: store.penaltyPoints() + PENALTY_PERCENT,
          shakeIndex: index,
          selectedIndex: index,
        });
        setFrozenFor(freezeMs);

        window.setTimeout(() => patchState(store, { shakeIndex: null }), 600);
        window.setTimeout(() => {
          const currentBoard = cloneBoard(store.attempt());
          if (currentBoard[index] === value) {
            currentBoard[index] = stableBoard[index];
            clearAndSetAttempt(currentBoard);
          }
        }, freezeMs);

        void syncProgress(stableBoard, newMistakes);
        return;
      }

      board[index] = value;
      patchState(store, {
        attempt: board,
        selectedIndex: index,
        shakeIndex: null,
      });

      const rawProgress = computeRawProgress(board);
      patchState(store, { rawProgress });

      await syncProgress(board, store.mistakes());

      if (board.every((cell) => cell !== 0) && store.mode() === 'solo') {
        const validation = sudokuLogic.validateAttempt(solution, board);
        if (validation.correct) {
          patchState(store, { soloSolved: true });
        }
      }
    }

    return {
      setHighlightSameNumbers(enabled: boolean): void {
        patchState(store, { highlightSameNumbers: enabled });
      },

      setErrorValidation(enabled: boolean): void {
        patchState(store, { errorValidation: enabled });
      },

      selectCell(index: number): void {
        if (store.mode() === 'multiplayer' && store.roomStatus() !== 'playing') return;
        if (store.frozenUntil() !== null && store.now() < store.frozenUntil()!) return;
        patchState(store, { selectedIndex: index });
      },

      moveSelection,

      startSolo(difficulty: Difficulty): SoloPuzzle {
        const puzzle = sudokuLogic.generateSudoku(difficulty);
        patchState(store, {
          mode: 'solo',
          difficulty,
          roomId: null,
          loadedRoomId: null,
          roomStatus: 'waiting',
          roomName: null,
          roomHasPassword: false,
          roomMaxPlayers: 0,

          roomHostId: null,
          roomWinnerId: null,
          roomWinnerUsername: null,
          roomPlayers: [],
          puzzle: cloneBoard(puzzle.puzzle),
          solution: cloneBoard(puzzle.solution),
          attempt: cloneBoard(puzzle.puzzle),
          selectedIndex: null,
          highlightSameNumbers: true,
          errorValidation: true,
          mistakes: 0,
          rawProgress: 0,
          penaltyPoints: 0,
          frozenUntil: null,
          shakeIndex: null,
          loading: false,
          error: null,
          soloSolved: false,
        });

        return puzzle;
      },

      loadRoom(roomId: string): void {
        patchState(store, {
          mode: 'multiplayer',
          roomId,
          loading: true,
          error: null,
          soloSolved: false,
          highlightSameNumbers: true,
          errorValidation: false,
        });
        store.roomId.set(roomId);
      },

      clearRoom(): void {
        resetGameState();
      },

      async joinRoom(password?: string | null): Promise<void> {
        const roomId = store.roomId();
        const playerId = getPlayerId();

        if (!roomId || !playerId) return;

        patchState(store, { loading: true, error: null });
        await supabase.joinRoom(roomId, playerId, password ?? null);
      },

      async leaveRoom(): Promise<void> {
        const roomId = store.roomId();
        const playerId = getPlayerId();

        if (!roomId || !playerId) return;

        await supabase.leaveRoom(roomId, playerId);
        resetGameState();
      },

      async startRoom(): Promise<void> {
        const roomId = store.roomId();
        const playerId = getPlayerId();

        if (!roomId || !playerId) return;

        patchState(store, { loading: true, error: null });
        await supabase.startRoom(roomId, playerId);
      },

      enterCell,

      async handleKeyDown(event: KeyboardEvent): Promise<void> {
        if (store.mode() === 'multiplayer' && store.roomStatus() !== 'playing') return;
        if (store.selectedIndex() === null) return;
        if (store.frozenUntil() !== null && store.now() < store.frozenUntil()!) return;

        const selectedIndex = store.selectedIndex()!;

        if (event.key >= '1' && event.key <= '9') {
          event.preventDefault();
          await enterCell(selectedIndex, Number(event.key));
          return;
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault();
          await enterCell(selectedIndex, 0);
          return;
        }

        if (event.key === 'ArrowUp' && selectedIndex >= 9) {
          event.preventDefault();
          moveSelection(-1, 0);
        } else if (event.key === 'ArrowDown' && selectedIndex < 72) {
          event.preventDefault();
          moveSelection(1, 0);
        } else if (event.key === 'ArrowLeft' && selectedIndex % 9 !== 0) {
          event.preventDefault();
          moveSelection(0, -1);
        } else if (event.key === 'ArrowRight' && selectedIndex % 9 !== 8) {
          event.preventDefault();
          moveSelection(0, 1);
        }
      },

      resetSolo(): void {
        if (store.mode() !== 'solo') return;

        patchState(store, {
          attempt: cloneBoard(store.puzzle()),
          selectedIndex: null,
          mistakes: 0,
          rawProgress: 0,
          penaltyPoints: 0,
          frozenUntil: null,
          shakeIndex: null,
          soloSolved: false,
        });
      },

      clearMistakeState(): void {
        patchState(store, {
          mistakes: 0,
          penaltyPoints: 0,
          frozenUntil: null,
          shakeIndex: null,
        });
      },
    };
  }),
);
