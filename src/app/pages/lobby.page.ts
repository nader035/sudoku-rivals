import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AppStore } from '../store/app.store';
import { SupabaseService } from '../core/services/supabase.service';
import { Difficulty, LeaderboardEntry, RoomFormValue, RoomSummary, StatsSummary } from '../core/models';
import { signalForm } from '@luistabotelho/angular-signal-forms';
import {
  signalFormErrors,
  signalFormSetTouched,
  signalFormValid,
  resetSignalForm,
} from '@luistabotelho/angular-signal-forms';
import { MaxLength, Min, Required } from '@luistabotelho/angular-signal-forms/validators';
import { SignalFormField } from '../shared/forms/signal-form-helpers';
import { UserNavComponent } from '../shared/components/user-nav.component';

const EMPTY_STATS: StatsSummary = {
  activeRooms: 0,
  playersOnline: 0,
  matchesToday: 0,
  totalMatches: 0,
};

@Component({
  selector: 'app-lobby-page',
  standalone: true,
  template: `
    <div
      class="min-h-screen bg-background text-foreground"
      style="background-image: linear-gradient(rgba(34,211,238,0.03) 1px,transparent 1px), linear-gradient(90deg,rgba(34,211,238,0.03) 1px,transparent 1px); background-size: 60px 60px;"
    >
      <nav class="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <button
            class="font-black italic uppercase tracking-tight text-primary"
            type="button"
            (click)="goHome()"
          >
            SUDOKU RIVAL
          </button>
          <app-user-nav />
        </div>
      </nav>

      @if (!appStore.authLoaded() || (appStore.isSignedIn() && !player())) {
        <div class="flex min-h-[60vh] items-center justify-center font-mono text-muted-foreground">
          Loading lobby...
        </div>
      } @else {
        <main class="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
          <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div class="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-primary">
                Multiplayer Lobby
              </div>
              @if (player()) {
                <h1 class="text-3xl font-black tracking-tight md:text-4xl">
                  Welcome, <span class="text-primary">{{ player()?.username }}</span>
                </h1>
                <p class="mt-1 text-sm font-mono text-muted-foreground">
                  Join an open arena or host your own match.
                </p>
              } @else {
                <h1 class="text-3xl font-black tracking-tight md:text-4xl">
                  Browse the public lobby
                </h1>
                <p class="mt-1 text-sm font-mono text-muted-foreground">
                  Sign in to host rooms or join matches.
                </p>
              }
            </div>
            <button
              class="rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
              type="button"
              (click)="openCreateRoom()"
            >
              {{ appStore.isSignedIn() ? 'Create Room' : 'Sign in to host' }}
            </button>
          </div>

          @if (stats()) {
            <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div class="rounded-md border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
                <div class="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  Online
                </div>
                <div class="mt-1 text-2xl font-black tabular-nums">{{ stats().playersOnline }}</div>
              </div>
              <div class="rounded-md border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
                <div class="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  Active rooms
                </div>
                <div class="mt-1 text-2xl font-black tabular-nums">{{ stats().activeRooms }}</div>
              </div>
              <div class="rounded-md border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
                <div class="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  Today
                </div>
                <div class="mt-1 text-2xl font-black tabular-nums">{{ stats().matchesToday }}</div>
              </div>
              <div class="rounded-md border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
                <div class="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  Total matches
                </div>
                <div class="mt-1 text-2xl font-black tabular-nums">{{ stats().totalMatches }}</div>
              </div>
            </div>
          }

          <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section class="space-y-4 lg:col-span-2">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
                  Active rooms
                </h2>
                <span class="text-xs font-mono text-muted-foreground"
                  >{{ rooms().length }} open</span
                >
              </div>

              <div class="space-y-3">
                @if (rooms().length === 0) {
                  <div
                    class="rounded-md border border-dashed border-border/40 py-12 text-center font-mono text-sm text-muted-foreground"
                  >
                    No active rooms.<br />
                    <button
                      class="mt-2 inline-block text-primary hover:underline"
                      type="button"
                      (click)="openCreateRoom()"
                    >
                      {{
                        appStore.isSignedIn()
                          ? 'Be the first to host a match →'
                          : 'Sign in to host →'
                      }}
                    </button>
                  </div>
                }

                @for (room of rooms(); track room.id) {
                  <article
                    class="rounded-md border border-border/60 bg-card/40 backdrop-blur-sm transition-colors hover:border-primary/40"
                  >
                    <div class="flex items-center justify-between gap-3 p-4">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h3 class="truncate text-lg font-bold">{{ room.name }}</h3>
                          @if (room.hasPassword) {
                            <span
                              class="rounded border border-border/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
                              >Locked</span
                            >
                          }
                        </div>
                        <div
                          class="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs font-mono text-muted-foreground"
                        >
                          <span class="uppercase text-primary">{{ room.difficulty }}</span>
                          <span>•</span>
                          <span>{{ room.playerCount }}/{{ room.maxPlayers }} players</span>
                          <span>•</span>
                          <span
                            class="uppercase"
                            [class.text-yellow-400]="room.status === 'playing'"
                            [class.text-primary]="room.status === 'waiting'"
                          >
                            {{ room.status }}
                          </span>
                          <span>•</span>
                          <span class="truncate">host: {{ room.hostUsername }}</span>
                        </div>
                      </div>
                      <button
                        class="rounded-md bg-secondary px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        [disabled]="
                          room.status !== 'waiting' || room.playerCount >= room.maxPlayers
                        "
                        (click)="joinRoom(room.id)"
                      >
                        {{ appStore.isSignedIn() ? 'Join' : 'Sign in' }}
                      </button>
                    </div>
                  </article>
                }
              </div>
            </section>

            <aside class="space-y-4">
              <section>
                <h2
                  class="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground"
                >
                  Top players
                </h2>
                <div class="rounded-md border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
                  <div class="space-y-3">
                    @if (leaderboard().length === 0) {
                      <div class="py-4 text-center text-xs font-mono text-muted-foreground">
                        No champions yet.
                      </div>
                    }

                    @for (
                      entry of leaderboard().slice(0, 5);
                      track entry.playerId;
                      let index = $index
                    ) {
                      <div class="flex items-center justify-between gap-3 text-sm font-mono">
                        <span class="flex min-w-0 items-center gap-2">
                          <span
                            class="w-5 text-center font-bold"
                            [class.text-yellow-400]="index === 0"
                            [class.text-slate-300]="index === 1"
                            [class.text-amber-700]="index === 2"
                            [class.text-muted-foreground]="index > 2"
                          >
                            {{ index + 1 }}
                          </span>
                          <span class="truncate">{{ entry.username }}</span>
                        </span>
                        <span class="tabular-nums text-primary">{{ entry.wins }}W</span>
                      </div>
                    }
                  </div>
                  @if (leaderboard().length > 0) {
                    <button
                      class="mt-3 w-full rounded-md border border-border/60 px-3 py-2 text-xs font-mono hover:bg-muted/40"
                      type="button"
                      (click)="goLeaderboard()"
                    >
                      View full leaderboard →
                    </button>
                  }
                </div>
              </section>

              <section class="rounded-md border border-primary/30 bg-primary/5 p-4">
                <div class="text-xs font-mono uppercase tracking-wider text-primary">
                  Penalty rules
                </div>
                <ul class="mt-2 list-disc space-y-1.5 pl-4 text-xs font-mono text-muted-foreground">
                  <li>Wrong = 3s freeze + -3% penalty</li>
                  <li>5 mistakes = 10s mega-freeze</li>
                  <li>10 mistakes = board reset</li>
                  <li>Rivals see your bar drop in real-time</li>
                </ul>
              </section>
            </aside>
          </div>
        </main>
      }

      <footer class="mt-8 border-t border-border/40">
        <div
          class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs font-mono text-muted-foreground md:px-6"
        >
          <div>Made by <span class="font-bold text-primary">Nader Mohamed</span></div>
          <div>© {{ currentYear }}</div>
        </div>
      </footer>

      @if (createRoomOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            class="w-full max-w-lg rounded-2xl border border-border/60 bg-background p-6 shadow-2xl"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-mono uppercase tracking-[0.3em] text-primary">
                  Host a match
                </div>
                <h2 class="mt-2 text-2xl font-black uppercase italic text-primary">Create Room</h2>
              </div>
              <button
                class="rounded-md border border-border/60 px-3 py-2 text-sm font-medium"
                type="button"
                (click)="closeCreateRoom()"
              >
                Close
              </button>
            </div>

            <div class="mt-6 space-y-4">
              <label class="block space-y-2">
                <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground"
                  >Room name</span
                >
                <input
                  class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  [value]="createRoomForm.name.$currentValue()"
                  (input)="setFieldValue(createRoomForm.name, $event)"
                  (blur)="markFieldTouched(createRoomForm.name)"
                  [placeholder]="roomNamePlaceholder()"
                />
                @if (createRoomForm.name.$touched() && createRoomForm.name.$stateMessage()) {
                  <span class="text-xs text-destructive">{{
                    createRoomForm.name.$stateMessage()
                  }}</span>
                }
              </label>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground"
                    >Difficulty</span
                  >
                  <select
                    class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    [value]="selectedDifficulty()"
                    (change)="onDifficultyChange($event)"
                    (blur)="markFieldTouched(createRoomForm.difficulty)"
                  >
                    @for (difficulty of difficultyOptions; track difficulty) {
                      <option [value]="difficulty">{{ difficulty }}</option>
                    }
                  </select>
                </label>

                <label class="block space-y-2">
                  <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground"
                    >Max players</span
                  >
                  <select
                    class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    [value]="createRoomForm.maxPlayers.$currentValue()"
                    (change)="setFieldValue(createRoomForm.maxPlayers, $event)"
                    (blur)="markFieldTouched(createRoomForm.maxPlayers)"
                  >
                    @for (count of playerCounts; track count) {
                      <option [value]="count">{{ count }} Players</option>
                    }
                  </select>
                </label>
              </div>

              <label class="flex items-center gap-3 rounded-md border border-border/60 px-3 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-border/60"
                  [checked]="createRoomForm.isPrivate.$currentValue()"
                  (change)="setFieldValue(createRoomForm.isPrivate, $event)"
                />
                <span>
                  <span class="block text-sm font-semibold">Private room</span>
                  <span class="text-xs text-muted-foreground">Password required to join.</span>
                </span>
              </label>

              @if (createRoomForm.isPrivate.$currentValue()) {
                <label class="block space-y-2">
                  <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground"
                    >Password</span
                  >
                  <input
                    class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    [value]="createRoomForm.password.$currentValue()"
                    (input)="setFieldValue(createRoomForm.password, $event)"
                    (blur)="markFieldTouched(createRoomForm.password)"
                    placeholder="Room password"
                    type="password"
                  />
                  @if (
                    createRoomForm.password.$touched() && createRoomForm.password.$stateMessage()
                  ) {
                    <span class="text-xs text-destructive">{{
                      createRoomForm.password.$stateMessage()
                    }}</span>
                  }
                </label>
              }

              @if (createRoomErrors().length > 0) {
                <ul
                  class="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
                >
                  @for (error of createRoomErrors(); track error) {
                    <li>{{ error }}</li>
                  }
                </ul>
              }

              @if (createRoomError()) {
                <div class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  {{ createRoomError() }}
                </div>
              }

              <button
                class="flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                [disabled]="creatingRoom()"
                (click)="submitCreateRoom()"
              >
                {{ creatingRoom() ? 'Creating...' : 'Start hosting' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserNavComponent],
})
export class LobbyPage {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  readonly appStore = inject(AppStore);
  readonly supabase = inject(SupabaseService);
  readonly currentYear = new Date().getFullYear();
  readonly createRoomOpen = signal(false);
  readonly creatingRoom = signal(false);
  readonly createRoomError = signal<string | null>(null);
  readonly selectedDifficulty = signal<Difficulty>('medium');

  readonly difficultyOptions = ['easy', 'medium', 'hard'] as const;
  readonly playerCounts = [2, 3, 4, 5, 6] as const;

  readonly rooms = toSignal(
    this.supabase.observeRooms().pipe(catchError(() => of([] as RoomSummary[]))),
    { initialValue: [] as RoomSummary[], injector: this.injector },
  );

  readonly stats = toSignal(
    this.supabase.observeStatsSummary().pipe(catchError(() => of(EMPTY_STATS))),
    { initialValue: EMPTY_STATS, injector: this.injector },
  );

  readonly leaderboard = toSignal(
    this.supabase.observeLeaderboard().pipe(catchError(() => of([] as LeaderboardEntry[]))),
    { initialValue: [] as LeaderboardEntry[], injector: this.injector },
  );

  readonly themeLabel = computed(() => {
    const theme = this.appStore.theme();
    if (theme === 'system') return 'System';
    return theme === 'dark' ? 'Light mode' : 'Dark mode';
  });

  readonly roomNamePlaceholder = computed(() => {
    const username = this.player()?.username;
    return username ? `${username}'s Room` : 'Room name';
  });

  readonly createRoomForm = signalForm<RoomFormValue>({
    name: {
      initialValue: '',
      validators: [Required('Room name is required'), MaxLength(32, 'Room name is too long')],
    },
    difficulty: {
      initialValue: 'medium',
      validators: [Required('Difficulty is required')],
    },
    maxPlayers: {
      initialValue: 2,
      validators: [Min(2, 'Minimum 2 players')],
    },
    isPrivate: {
      initialValue: false,
      validators: [],
    },
    password: {
      initialValue: '',
      validators: [
        (value, form) =>
          form.isPrivate.$currentValue() && !value.trim()
            ? new Error('Password is required for private rooms')
            : null,
        MaxLength(64, 'Password is too long'),
      ],
    },
  });

  readonly createRoomValid = signalFormValid(this.createRoomForm);
  readonly createRoomErrors = signalFormErrors(this.createRoomForm);

  get player() {
    return this.appStore.player;
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goLeaderboard(): void {
    void this.router.navigateByUrl('/leaderboard');
  }

  goSolo(): void {
    void this.router.navigateByUrl('/play/solo');
  }

  goRoom(roomId: string): void {
    void this.router.navigate(['/room', roomId]);
  }

  goSignIn(): void {
    void this.router.navigateByUrl('/sign-in');
  }

  openCreateRoom(): void {
    if (!this.appStore.isSignedIn()) {
      this.goSignIn();
      return;
    }

    this.createRoomError.set(null);
    this.selectedDifficulty.set('medium');
    this.createRoomForm.difficulty.$currentValue.set('medium');
    this.createRoomOpen.set(true);
  }

  joinRoom(roomId: string): void {
    if (!this.appStore.isSignedIn()) {
      this.goSignIn();
      return;
    }

    void this.router.navigate(['/room', roomId]);
  }

  toggleTheme(): void {
    this.appStore.toggleTheme();
  }

  async signOut(): Promise<void> {
    await this.appStore.signOut();
    await this.router.navigateByUrl('/');
  }

  closeCreateRoom(): void {
    this.createRoomOpen.set(false);
    this.createRoomError.set(null);
    this.selectedDifficulty.set('medium');
    resetSignalForm(this.createRoomForm);
  }

  setFieldValue<T>(field: SignalFormField<T>, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;

    if (typeof field.$currentValue() === 'number') {
      field.$currentValue.set(Number(target.value) as T);
    } else if (typeof field.$currentValue() === 'boolean') {
      field.$currentValue.set(Boolean((target as HTMLInputElement).checked) as T);
    } else {
      field.$currentValue.set(target.value as T);
    }

    field.$touched.set(true);
  }

  markFieldTouched<T>(field: SignalFormField<T>): void {
    field.$touched.set(true);
  }

  onDifficultyChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = String(target.value).trim().toLowerCase();
    const difficulty: Difficulty = value === 'easy' || value === 'hard' ? value : 'medium';
    this.selectedDifficulty.set(difficulty);
    this.createRoomForm.difficulty.$currentValue.set(difficulty);
    this.createRoomForm.difficulty.$touched.set(true);
  }

  async submitCreateRoom(): Promise<void> {
    signalFormSetTouched(this.createRoomForm);
    this.createRoomError.set(null);

    if (!this.createRoomValid()) return;

    const player = this.appStore.player();
    if (!player) return;

    this.creatingRoom.set(true);

    try {
      const room = await this.supabase.createRoom(this.buildCreateRoomValue());
      this.createRoomOpen.set(false);
      resetSignalForm(this.createRoomForm);
      await this.router.navigate(['/room', room.id]);
    } catch (error) {
      this.createRoomError.set(error instanceof Error ? error.message : 'Could not create room');
    } finally {
      this.creatingRoom.set(false);
    }
  }

  private buildCreateRoomValue(): RoomFormValue {
    return {
      name: String(this.createRoomForm.name.$currentValue() ?? '').trim(),
      difficulty: this.selectedDifficulty(),
      maxPlayers: Number(this.createRoomForm.maxPlayers.$currentValue() ?? 2),
      isPrivate: Boolean(this.createRoomForm.isPrivate.$currentValue()),
      password: String(this.createRoomForm.password.$currentValue() ?? ''),
    };
  }
}
