import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStore } from '../store/app.store';
import { GameStore } from '../store/game.store';
import { SudokuGridComponent } from '../shared/components/sudoku-grid.component';
import { UserNavComponent } from '../shared/components/user-nav.component';
import { buildShareUrl, copyShareText, shareWin } from '../shared/utils/share';

const PENALTY_PERCENT = 3;
const FREEZE_MS = 3000;
const MEGA_FREEZE_MS = 10000;
const MEGA_FREEZE_THRESHOLD = 5;

@Component({
  selector: 'app-room-page',
  standalone: true,
  imports: [SudokuGridComponent, UserNavComponent],
  template: `
    <div class="min-h-screen bg-background text-foreground">
      @if (gameStore.loading() && !gameStore.roomName()) {
        <div class="flex min-h-screen items-center justify-center font-mono text-muted-foreground">
          Loading match...
        </div>
      } @else if (gameStore.error()) {
        <div class="flex min-h-screen items-center justify-center p-4">
          <div
            class="max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-xl"
          >
            <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">Room error</div>
            <h1 class="mt-3 text-2xl font-black uppercase italic text-primary">
              Unable to load room
            </h1>
            <p class="mt-4 text-sm text-muted-foreground">{{ gameStore.error() }}</p>
            <button
              class="mt-6 rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              type="button"
              (click)="goLobby()"
            >
              Return to lobby
            </button>
          </div>
        </div>
      } @else {
        <header
          class="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm"
        >
          <div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
            <div class="flex min-w-0 items-center gap-3">
              <button
                class="truncate font-black italic uppercase tracking-tight text-primary"
                type="button"
                (click)="goLobby()"
              >
                Sudoku Rival
              </button>
              <span class="hidden text-xs font-mono text-muted-foreground md:inline"
                >/ {{ gameStore.roomName() }}</span
              >
            </div>

            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="uppercase tracking-wider text-muted-foreground hidden sm:inline"
                >Mistakes</span
              >
              <div class="flex gap-1">
                @for (index of mistakesDots; track index) {
                  <div
                    class="h-2 w-2 rounded-full border"
                    [class.bg-destructive]="index < gameStore.mistakes()"
                    [class.border-destructive]="index < gameStore.mistakes()"
                    [class.border-border]="index >= gameStore.mistakes()"
                  ></div>
                }
              </div>
              <span
                class="tabular-nums"
                [class.text-destructive]="gameStore.mistakes() >= MEGA_FREEZE_THRESHOLD"
                >{{ gameStore.mistakes() }}/{{ MEGA_FREEZE_THRESHOLD }}</span
              >
            </div>

            <div class="flex items-center gap-2">
              <app-user-nav [showGameLinks]="false" />
              <button
                class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive"
                type="button"
                (click)="forfeit()"
              >
                Forfeit
              </button>
            </div>
          </div>
          <div class="mx-auto max-w-7xl px-4 pb-3 md:px-6">
            <div
              class="flex justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
            >
              <span>Your progress</span>
              <span class="text-primary">{{ myProgress() }}%</span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary transition-all"
                [style.width.%]="myProgress()"
              ></div>
            </div>
          </div>
        </header>

        @if (gameStore.roomStatus() === 'waiting') {
          <main
            class="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[1fr_280px] md:px-6"
          >
            <div class="space-y-8">
              <div class="space-y-3 text-center">
                <div
                  class="inline-block rounded border border-primary/40 px-3 py-1 text-xs font-mono uppercase tracking-[0.3em] text-primary"
                >
                  Waiting room
                </div>
                <h1 class="text-4xl font-black tracking-tight md:text-5xl">
                  {{ gameStore.roomName() }}
                </h1>
                <div
                  class="flex flex-wrap items-center justify-center gap-3 text-sm font-mono text-muted-foreground"
                >
                  <span class="uppercase text-primary">{{ gameStore.difficulty() }}</span>
                  <span>•</span>
                  <span
                    >{{ gameStore.roomPlayers().length }}/{{
                      gameStore.roomMaxPlayers() || gameStore.roomPlayers().length
                    }}
                    players</span
                  >
                  <span>•</span>
                  <span>Room ID: {{ roomId }}</span>
                </div>
              </div>

              <div class="flex justify-center gap-3">
                <button
                  class="rounded-md border border-border/60 px-4 py-2 text-sm font-medium hover:bg-muted/40"
                  type="button"
                  (click)="copyLink()"
                >
                  Copy invite link
                </button>
                <button
                  class="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
                  type="button"
                  (click)="toggleTheme()"
                >
                  {{ themeLabel() }}
                </button>
              </div>

              @if (!isMember()) {
                <section
                  class="mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card/60 p-6 shadow-lg"
                >
                  <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">
                    Join room
                  </div>
                  <h2 class="mt-2 text-2xl font-black uppercase italic text-primary">
                    Enter the match
                  </h2>
                  @if (gameStore.roomHasPassword()) {
                    <p class="mt-2 text-sm text-muted-foreground">
                      This room is private. Enter the password to join.
                    </p>
                  } @else {
                    <p class="mt-2 text-sm text-muted-foreground">
                      This room is open. Join to start playing.
                    </p>
                  }

                  <div class="mt-5 space-y-4">
                    @if (gameStore.roomHasPassword()) {
                      <input
                        class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                        [value]="joinPassword()"
                        (input)="joinPassword.set($any($event.target).value)"
                        placeholder="Room password"
                        type="password"
                      />
                    }

                    @if (joinMessage()) {
                      <div
                        class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                      >
                        {{ joinMessage() }}
                      </div>
                    }

                    <button
                      class="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      [disabled]="joining()"
                      (click)="joinRoom()"
                    >
                      {{
                        joining()
                          ? 'Joining...'
                          : gameStore.roomHasPassword()
                            ? 'Unlock and join'
                            : 'Join room'
                      }}
                    </button>
                  </div>
                </section>
              }

              <section class="space-y-3">
                <h2
                  class="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground"
                >
                  Roster
                </h2>
                <div class="grid gap-2">
                  @for (
                    player of gameStore.roomPlayers();
                    track player.playerId;
                    let index = $index
                  ) {
                    <div
                      class="flex items-center justify-between rounded-md border border-border/60 bg-card/50 p-4 backdrop-blur-sm"
                    >
                      <div class="flex items-center gap-3">
                        <span class="w-5 text-xs font-mono text-muted-foreground"
                          >P{{ index + 1 }}</span
                        >
                        <span class="font-mono font-bold"
                          >{{ player.username }}
                          @if (player.playerId === currentPlayerId()) {
                            <span class="text-primary"> (you)</span>
                          }
                        </span>
                      </div>
                      @if (player.isHost) {
                        <span
                          class="rounded border border-primary/50 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-primary"
                          >Host</span
                        >
                      }
                    </div>
                  }
                  @for (index of emptySlots(); track index) {
                    <div
                      class="rounded-md border border-dashed border-border/40 p-4 text-center font-mono text-sm text-muted-foreground"
                    >
                      Waiting for rival...
                    </div>
                  }
                </div>
              </section>

              @if (isHost()) {
                <button
                  class="h-14 rounded-md bg-primary px-6 text-lg font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  [disabled]="starting()"
                  (click)="startMatch()"
                >
                  {{ starting() ? 'Starting...' : 'Start Match' }}
                </button>
              } @else {
                <div class="py-4 text-center text-sm font-mono text-muted-foreground">
                  Waiting for host to start the match...
                </div>
              }
            </div>

            <aside class="space-y-6">
              <div class="rounded-md border border-border/60 bg-card/40 p-4">
                <div class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
                  Room details
                </div>
                <div class="mt-3 space-y-2 text-sm">
                  <div class="flex justify-between gap-4">
                    <span class="text-muted-foreground">Difficulty</span
                    ><span class="font-mono text-primary">{{ gameStore.difficulty() }}</span>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span class="text-muted-foreground">Players</span
                    ><span class="font-mono">{{ gameStore.roomPlayers().length }}</span>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span class="text-muted-foreground">Password</span
                    ><span class="font-mono">{{ gameStore.roomHasPassword() ? 'Yes' : 'No' }}</span>
                  </div>
                </div>
              </div>

              <div class="rounded-md border border-primary/30 bg-primary/5 p-4">
                <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">
                  Match rules
                </div>
                <ul class="mt-2 list-disc space-y-1.5 pl-4 text-xs font-mono text-muted-foreground">
                  <li>Wrong = 3s freeze + -3% penalty</li>
                  <li>5 mistakes = 10s mega-freeze</li>
                  <li>The first valid board wins</li>
                </ul>
              </div>
            </aside>
          </main>
        } @else {
          <main
            class="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[1fr_280px] md:px-6"
          >
            <div class="flex flex-col items-center gap-6">
              <div class="relative">
                <app-sudoku-grid
                  [puzzle]="gameStore.puzzle()"
                  [attempt]="gameStore.attempt()"
                  [solution]="gameStore.solution()"
                  [selectedIndex]="gameStore.selectedIndex()"
                  [highlightSameNumbers]="gameStore.highlightSameNumbers()"
                  [errorValidation]="gameStore.errorValidation()"
                  [shakeIndex]="gameStore.shakeIndex()"
                  [frozen]="isFrozen()"
                  (cellClicked)="selectCell($event)"
                />

                @if (isFrozen()) {
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center rounded-md border-2 border-destructive/60 bg-background/70 backdrop-blur-sm"
                  >
                    <div class="mb-3 text-5xl">❄</div>
                    <div
                      class="text-lg font-black uppercase tracking-[0.3em]"
                      [class.text-destructive]="isMegaFreeze()"
                      [class.text-primary]="!isMegaFreeze()"
                    >
                      {{ isMegaFreeze() ? 'Mega-Freeze' : 'Recalibrating' }}
                    </div>
                    <div class="mt-2 font-mono text-5xl font-black tabular-nums">
                      {{ freezeSecondsLeft() }}s
                    </div>
                    <div
                      class="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Penalty applied: -{{ PENALTY_PERCENT }}%
                    </div>
                  </div>
                }
              </div>

              <div class="max-w-md text-center text-xs font-mono text-muted-foreground">
                Click a cell and type 1-9. Wrong answers freeze the grid for
                <span class="text-primary">{{ FREEZE_MS / 1000 }}s</span> and cost
                <span class="text-destructive">-{{ PENALTY_PERCENT }}%</span>. 5 mistakes triggers a
                <span class="text-destructive">{{ MEGA_FREEZE_MS / 1000 }}s mega-freeze</span>.
              </div>

              <div class="grid w-full max-w-md grid-cols-5 gap-2 sm:grid-cols-10">
                @for (num of numberPad; track num) {
                  <button
                    class="flex h-12 items-center justify-center rounded-md border border-border/60 bg-card/60 font-mono text-lg font-bold transition-colors hover:border-primary/60 hover:bg-primary/10 active:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    [disabled]="isFrozen()"
                    (click)="enterNumber(num)"
                  >
                    {{ num }}
                  </button>
                }
                <button
                  class="flex h-12 items-center justify-center rounded-md border border-border/60 bg-card/60 font-mono text-sm font-bold text-destructive transition-colors hover:border-destructive/60 hover:bg-destructive/10 active:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  [disabled]="isFrozen()"
                  (click)="enterNumber(0)"
                >
                  ✕
                </button>
              </div>
            </div>

            <aside class="space-y-6 lg:sticky lg:top-32 lg:self-start">
              <section>
                <h2
                  class="mb-4 flex items-center gap-2 border-b border-border/60 pb-2 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground"
                >
                  Rivals
                </h2>
                <div class="space-y-4">
                  @if (opponents().length === 0) {
                    <div
                      class="rounded border border-dashed border-border/40 py-4 text-center text-xs font-mono text-muted-foreground/60"
                    >
                      Solo run — no rivals connected
                    </div>
                  }
                  @for (player of opponents(); track player.playerId) {
                    <div class="space-y-1.5">
                      <div class="flex justify-between text-sm font-mono">
                        <span class="truncate">{{ player.username }}</span>
                        <span class="tabular-nums" [class.text-primary]="player.isFinished"
                          >{{ player.progress }}%</span
                        >
                      </div>
                      <div class="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-primary transition-all"
                          [style.width.%]="player.progress"
                        ></div>
                      </div>
                    </div>
                  }
                </div>
              </section>

              <section class="space-y-2 rounded-md border border-border/60 bg-card/40 p-4">
                <h3 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
                  Penalty stats
                </h3>
                <div class="flex justify-between text-sm font-mono">
                  <span>Mistakes</span
                  ><span [class.text-destructive]="gameStore.mistakes() >= MEGA_FREEZE_THRESHOLD">{{
                    gameStore.mistakes()
                  }}</span>
                </div>
                <div class="flex justify-between text-sm font-mono">
                  <span>Penalty</span
                  ><span class="text-destructive">-{{ gameStore.penaltyPoints() }}%</span>
                </div>
              </section>
            </aside>
          </main>
        }

        @if (gameStore.roomStatus() === 'finished') {
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div
              class="w-full max-w-md rounded-2xl border border-border/60 bg-background p-6 text-center shadow-2xl"
            >
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">
                Match finished
              </div>
              <h2 class="mt-3 text-3xl font-black uppercase italic text-primary">
                Sudoku Complete
              </h2>
              <div class="mt-4 text-2xl font-mono">
                Winner:
                <span class="font-black text-primary">{{ gameStore.roomWinnerUsername() }}</span>
              </div>
              <div class="mt-4 space-y-1 text-sm font-mono text-muted-foreground">
                <div>Your mistakes: {{ gameStore.mistakes() }}</div>
                <div>Total penalty: -{{ gameStore.penaltyPoints() }}%</div>
              </div>
              @if (isWinner()) {
                <div class="mt-5 grid grid-cols-2 gap-2">
                  <button
                    class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40"
                    type="button"
                    (click)="shareNative()"
                  >
                    Share
                  </button>
                  <a
                    class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40"
                    [href]="shareLink('x')"
                    target="_blank"
                    rel="noopener"
                  >
                    X
                  </a>
                  <a
                    class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40"
                    [href]="shareLink('facebook')"
                    target="_blank"
                    rel="noopener"
                  >
                    Facebook
                  </a>
                  <button
                    class="rounded-md border border-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:bg-muted/40"
                    type="button"
                    (click)="copyShare()"
                  >
                    Copy
                  </button>
                </div>
              }
              <button
                class="mt-6 w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                type="button"
                (click)="goLobby()"
              >
                Return to lobby
              </button>
            </div>
          </div>
        }

        @if (gameStore.roomStatus() === 'cancelled') {
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div
              class="w-full max-w-md rounded-2xl border border-border/60 bg-background p-6 text-center shadow-2xl"
            >
              <div class="text-xs font-mono uppercase tracking-[0.3em] text-destructive">
                Match cancelled
              </div>
              <h2 class="mt-3 text-3xl font-black uppercase italic text-primary">
                Room closed
              </h2>
              <p class="mt-4 text-sm text-muted-foreground">
                A player forfeited, so this room is no longer listed in the lobby.
              </p>
              <button
                class="mt-6 w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                type="button"
                (click)="goLobby()"
              >
                Return to lobby
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly appStore = inject(AppStore);
  readonly gameStore = inject(GameStore);
  readonly roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
  readonly joinPassword = signal('');
  readonly joinMessage = signal<string | null>(null);
  readonly joining = signal(false);
  readonly starting = signal(false);
  readonly autoJoinAttempted = signal(false);
  readonly PENALTY_PERCENT = PENALTY_PERCENT;
  readonly FREEZE_MS = FREEZE_MS;
  readonly MEGA_FREEZE_MS = MEGA_FREEZE_MS;
  readonly MEGA_FREEZE_THRESHOLD = MEGA_FREEZE_THRESHOLD;
  readonly mistakesDots = Array.from({ length: MEGA_FREEZE_THRESHOLD }, (_, index) => index);
  readonly numberPad = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  readonly currentPlayerId = computed(() => this.appStore.player()?.id ?? null);
  readonly isMember = computed(() => {
    const playerId = this.currentPlayerId();
    if (!playerId) return false;
    return this.gameStore.roomPlayers().some((player) => player.playerId === playerId);
  });

  readonly isHost = computed(() => this.gameStore.roomHostId() === this.currentPlayerId());
  readonly themeLabel = computed(() =>
    this.appStore.theme() === 'dark'
      ? 'Light mode'
      : this.appStore.theme() === 'light'
        ? 'Dark mode'
        : 'System',
  );
  readonly myProgress = computed(() => (this.isMember() ? this.gameStore.rawProgress() : 0));
  readonly isFrozen = computed(
    () =>
      this.gameStore.frozenUntil() !== null && this.gameStore.now() < this.gameStore.frozenUntil()!,
  );
  readonly freezeSecondsLeft = computed(() =>
    this.isFrozen()
      ? Math.max(0, Math.ceil((this.gameStore.frozenUntil()! - this.gameStore.now()) / 1000))
      : 0,
  );
  readonly isMegaFreeze = computed(
    () => this.isFrozen() && this.gameStore.frozenUntil()! - this.gameStore.now() > FREEZE_MS,
  );
  readonly opponents = computed(() =>
    this.gameStore.roomPlayers().filter((player) => player.playerId !== this.currentPlayerId()),
  );
  readonly isWinner = computed(() => this.gameStore.roomWinnerId() === this.currentPlayerId());
  readonly emptySlots = computed(() => {
    const maxPlayers = this.gameStore.roomMaxPlayers() || 2;
    return Array.from(
      { length: Math.max(0, maxPlayers - this.gameStore.roomPlayers().length) },
      (_, index) => index,
    );
  });


  readonly autoJoinEffect = effect(() => {
    const playerId = this.currentPlayerId();
    if (
      !playerId ||
      this.autoJoinAttempted() ||
      this.gameStore.loadedRoomId() !== this.roomId ||
      this.gameStore.roomStatus() !== 'waiting' ||
      this.gameStore.roomHasPassword() ||
      this.isMember()
    ) {
      return;
    }

    this.autoJoinAttempted.set(true);
    void this.joinRoom();
  });

  ngOnInit(): void {
    if (!this.roomId) {
      void this.router.navigateByUrl('/lobby');
      return;
    }

    this.gameStore.loadRoom(this.roomId);
  }

  ngOnDestroy(): void {
    if (this.gameStore.roomId() === this.roomId) {
      this.gameStore.clearRoom();
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

  goLobby(): void {
    void this.router.navigateByUrl('/lobby');
  }

  toggleTheme(): void {
    this.appStore.toggleTheme();
  }

  async copyLink(): Promise<void> {
    await navigator.clipboard.writeText(globalThis.location.href);
  }

  selectCell(index: number): void {
    this.gameStore.selectCell(index);
  }

  enterNumber(value: number): void {
    const selectedIndex = this.gameStore.selectedIndex();
    if (selectedIndex === null) return;
    void this.gameStore.enterCell(selectedIndex, value);
  }

  async joinRoom(): Promise<void> {
    const playerId = this.currentPlayerId();
    if (!playerId) return;

    this.joining.set(true);
    this.joinMessage.set(null);

    try {
      await this.gameStore.joinRoom(this.joinPassword().trim() || null);
      this.joinPassword.set('');
    } catch (error) {
      this.joinMessage.set(error instanceof Error ? error.message : 'Unable to join room');
    } finally {
      this.joining.set(false);
    }
  }

  async startMatch(): Promise<void> {
    this.starting.set(true);

    try {
      await this.gameStore.startRoom();
    } finally {
      this.starting.set(false);
    }
  }

  async forfeit(): Promise<void> {
    await this.gameStore.leaveRoom();
    await this.router.navigateByUrl('/lobby');
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
    return {
      title: 'Sudoku Rival win',
      text: `I won ${this.gameStore.roomName() ?? 'a match'} on Sudoku Rival (${this.gameStore.difficulty()}).`,
      url: globalThis.location.href,
    };
  }
}
