import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
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
import { GsapCountUpDirective } from '../shared/directives/gsap-count-up.directive';
import { LocalizedRouterService } from '../core/services/localized-router.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslocoPipe } from '../core/i18n/transloco.pipe';
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Crown,
  DoorOpen,
  Gauge,
  Grid2x2,
  LayoutGrid,
  Lock,
  Play,
  Plus,
  ShieldAlert,
  Snowflake,
  Swords,
  Target,
  Trophy,
  User,
  Users,
  Wallet,
} from 'lucide-angular/src/icons';

const EMPTY_STATS: StatsSummary = {
  activeRooms: 0,
  playersOnline: 0,
  matchesToday: 0,
  totalMatches: 0,
};

@Component({
  selector: 'app-lobby-page',
  standalone: true,
  imports: [UserNavComponent, LucideAngularModule, GsapCountUpDirective, TranslocoPipe],
  template: `
    <div class="relative min-h-screen bg-background text-foreground">

      <nav class="sticky top-0 z-20 border-b border-border/60 bg-background/84 backdrop-blur-sm">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <button class="inline-flex items-center" type="button" (click)="goHome()">
            <img src="/assets/logo/logo-light.svg" alt="Sudoku Rival" class="hidden h-9 w-auto dark:block" />
            <img src="/assets/logo/logo-dark.svg" alt="Sudoku Rival" class="h-9 w-auto dark:hidden" />
          </button>
          <app-user-nav />
        </div>
      </nav>

      @if (!appStore.authLoaded() || (appStore.isSignedIn() && !player())) {
        <div class="relative z-10 flex min-h-[60vh] items-center justify-center font-mono text-muted-foreground">
          {{ 'lobby.loading' | transloco }}
        </div>
      } @else {
        <main class="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
          <section class="surface-panel rounded-lg border-border/80 p-5 md:p-6" data-gsap-surface>
            <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div class="min-w-0">
                <div class="text-ui-kicker text-primary">{{ 'lobby.kicker' | transloco }}</div>
                @if (player()) {
                  <h1 class="mt-2 text-4xl font-black tracking-tight md:text-5xl">
                    {{ 'lobby.welcome' | transloco }} <span class="text-primary">{{ player()?.username }}</span>
                  </h1>
                  <p class="mt-2 text-base text-muted-foreground">{{ 'lobby.subtitle' | transloco }}</p>
                } @else {
                  <h1 class="mt-2 text-4xl font-black tracking-tight md:text-5xl">{{ 'lobby.publicTitle' | transloco }}</h1>
                  <p class="mt-2 text-base text-muted-foreground">{{ 'lobby.publicSubtitle' | transloco }}</p>
                }
              </div>

              <button
                class="btn-game inline-flex items-center justify-center gap-2 rounded-lg border border-primary/65 bg-primary px-6 py-3 text-sm font-black uppercase tracking-wider text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/25"
                type="button"
                (click)="openCreateRoom()"
                data-gsap-lift
              >
                <i-lucide [img]="PlusIcon" [size]="16"></i-lucide>
                {{ appStore.isSignedIn() ? ('lobby.createRoom' | transloco) : ('lobby.signInToHost' | transloco) }}
              </button>
            </div>
          </section>

          @if (stats()) {
            <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <article class="surface-panel flex items-center gap-3 rounded-lg p-3.5" data-gsap-stagger>
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <i-lucide [img]="UsersIcon" [size]="18"></i-lucide>
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{{ 'lobby.stats.onlinePlayers' | transloco }}</div>
                  <div class="mt-1 text-2xl font-black tabular-nums" [appGsapCountUp]="stats().playersOnline"></div>
                </div>
              </article>

              <article class="surface-panel flex items-center gap-3 rounded-lg p-3.5" data-gsap-stagger>
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <i-lucide [img]="DoorOpenIcon" [size]="18"></i-lucide>
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{{ 'lobby.stats.activeRooms' | transloco }}</div>
                  <div class="mt-1 text-2xl font-black tabular-nums" [appGsapCountUp]="stats().activeRooms"></div>
                </div>
              </article>

              <article class="surface-panel flex items-center gap-3 rounded-lg p-3.5" data-gsap-stagger>
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <i-lucide [img]="PlayIcon" [size]="18"></i-lucide>
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{{ 'lobby.stats.todayMatches' | transloco }}</div>
                  <div class="mt-1 text-2xl font-black tabular-nums" [appGsapCountUp]="stats().matchesToday"></div>
                </div>
              </article>

              <article class="surface-panel flex items-center gap-3 rounded-lg p-3.5" data-gsap-stagger>
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <i-lucide [img]="TargetIcon" [size]="18"></i-lucide>
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{{ 'lobby.stats.totalMatches' | transloco }}</div>
                  <div class="mt-1 text-2xl font-black tabular-nums" [appGsapCountUp]="stats().totalMatches"></div>
                </div>
              </article>
            </section>
          }

          <section class="grid grid-cols-1 gap-4 xl:grid-cols-[1.75fr_0.95fr]">
            <section class="surface-panel space-y-3 rounded-lg p-3.5 md:p-4" data-gsap-surface>
              <div class="flex items-center justify-between">
                <h2 class="text-ui-kicker text-foreground">{{ 'lobby.openRooms' | transloco }}</h2>
                <span class="text-xs font-mono text-muted-foreground">{{ rooms().length }} {{ 'lobby.open' | transloco }}</span>
              </div>

              @if (rooms().length === 0) {
                <div class="rounded-lg border border-border/65 bg-background/50 py-12 text-center font-mono text-sm text-muted-foreground">
                  {{ 'lobby.noOpenRooms' | transloco }}
                  <button class="ml-1 text-primary hover:underline" type="button" (click)="openCreateRoom()">
                    {{ appStore.isSignedIn() ? ('lobby.createFirstRoom' | transloco) : ('lobby.signInToHost' | transloco) }}
                  </button>
                </div>
              }

              <div class="space-y-3">
                @for (room of rooms(); track room.id) {
                  <article class="rounded-lg border bg-card/64 p-3 transition-colors" [class.border-primary/65]="isRoomJoinable(room)" [class.border-border/65]="!isRoomJoinable(room)" [attr.data-room-id]="room.id" data-gsap-room-card data-gsap-stagger>
                    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start gap-3">
                          <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/65" [class.text-primary]="room.difficulty === 'medium'" [class.text-blue-400]="room.difficulty === 'hard'" [class.text-violet-400]="room.difficulty === 'easy'">
                            <i-lucide [img]="roomCardIcon(room)" [size]="28"></i-lucide>
                          </div>

                          <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                              <h3 class="truncate text-xl font-black tracking-tight">{{ room.name }}</h3>
                              @if (room.hasPassword) {
                                <span class="inline-flex items-center gap-1 rounded-md border border-border/65 bg-background/70 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                                  <i-lucide [img]="LockIcon" [size]="12"></i-lucide>
                                  {{ 'lobby.private' | transloco }}
                                </span>
                              }
                            </div>

                            <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em]">
                              <span class="rounded px-2 py-1 font-bold" [class.bg-emerald-500/18]="room.difficulty === 'easy'" [class.text-emerald-300]="room.difficulty === 'easy'" [class.bg-primary/18]="room.difficulty === 'medium'" [class.text-primary]="room.difficulty === 'medium'" [class.bg-red-500/18]="room.difficulty === 'hard'" [class.text-red-300]="room.difficulty === 'hard'">
                                {{ difficultyLabel(room.difficulty) }}
                              </span>
                              <span class="rounded px-2 py-1 font-bold" [class.bg-amber-400/18]="room.status === 'waiting'" [class.text-amber-300]="room.status === 'waiting'" [class.bg-blue-500/18]="room.status === 'playing'" [class.text-blue-300]="room.status === 'playing'" [class.bg-slate-500/18]="room.status !== 'waiting' && room.status !== 'playing'" [class.text-slate-300]="room.status !== 'waiting' && room.status !== 'playing'">
                                {{ roomStatusLabel(room) }}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div class="mt-3 grid grid-cols-2 gap-2 rounded-md border border-border/60 bg-background/55 p-2.5 text-xs md:grid-cols-4">
                          <div class="flex items-center gap-2">
                            <i-lucide [img]="WalletIcon" [size]="15" class="text-primary"></i-lucide>
                            <div>
                                <div class="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{{ 'lobby.entryFee' | transloco }}</div>
                              <div class="font-bold">{{ room.entryFee }}c</div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2">
                            <i-lucide [img]="TrophyIcon" [size]="15" class="text-primary"></i-lucide>
                            <div>
                                <div class="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{{ 'lobby.prizePool' | transloco }}</div>
                              <div class="font-bold">{{ room.prizePool }}c</div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2">
                            <i-lucide [img]="UsersIcon" [size]="15" class="text-primary"></i-lucide>
                            <div>
                                <div class="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{{ 'lobby.players' | transloco }}</div>
                              <div class="font-bold">{{ room.playerCount }} / {{ room.maxPlayers }}</div>
                            </div>
                          </div>
                          <div class="flex min-w-0 items-center gap-2">
                            <i-lucide [img]="UserIcon" [size]="15" class="text-primary"></i-lucide>
                            <div class="min-w-0">
                              <div class="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{{ 'lobby.host' | transloco }}</div>
                              <div class="truncate font-bold">{{ room.hostUsername }}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        class="btn-game inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold uppercase tracking-wide md:min-w-42"
                        [class.border-primary/70]="isRoomJoinable(room)"
                        [class.bg-primary]="isRoomJoinable(room)"
                        [class.text-primary-foreground]="isRoomJoinable(room)"
                        [class.hover:bg-primary/90]="isRoomJoinable(room)"
                        [class.border-border/65]="!isRoomJoinable(room)"
                        [class.bg-background/70]="!isRoomJoinable(room)"
                        [class.text-foreground]="!isRoomJoinable(room)"
                        [class.hover:border-primary/45]="!isRoomJoinable(room)"
                        type="button"
                        (click)="handleRoomAction(room)"
                        data-gsap-lift
                      >
                        {{ roomActionLabel(room) }}
                        <i-lucide [img]="ArrowRightIcon" [size]="15"></i-lucide>
                      </button>
                    </div>
                  </article>
                }
              </div>

              <button class="btn-game inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/65 bg-background/55 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] hover:border-primary/45 hover:bg-muted/30" type="button" (click)="goLeaderboard()" data-gsap-lift>
                <i-lucide [img]="Grid2x2Icon" [size]="15"></i-lucide>
                {{ 'lobby.viewLeaderboard' | transloco }}
              </button>
            </section>

            <aside class="space-y-4">
              <section class="surface-panel rounded-lg p-4" data-gsap-surface>
                <div class="mb-3 flex items-center gap-2">
                  <i-lucide [img]="CrownIcon" [size]="17" class="text-primary"></i-lucide>
                  <h2 class="text-ui-kicker text-foreground">{{ 'lobby.topPlayers' | transloco }}</h2>
                </div>

                <div class="space-y-2">
                  @if (leaderboard().length === 0) {
                    <div class="py-4 text-center text-xs font-mono text-muted-foreground">{{ 'lobby.noChampions' | transloco }}</div>
                  }

                  @for (entry of leaderboard().slice(0, 5); track entry.playerId; let index = $index) {
                    <div class="flex items-center justify-between rounded-md border border-border/55 bg-background/45 px-3 py-2.5 text-sm">
                      <div class="flex min-w-0 items-center gap-2">
                        <span class="w-5 text-center font-black" [class.text-primary]="index === 0" [class.text-slate-300]="index === 1" [class.text-amber-700]="index === 2" [class.text-muted-foreground]="index > 2">{{ index + 1 }}</span>
                        <span class="truncate font-semibold">{{ entry.username }}</span>
                      </div>
                      <span class="font-mono font-bold text-primary tabular-nums">{{ entry.wins }}W</span>
                    </div>
                  }
                </div>

                @if (leaderboard().length > 0) {
                  <button class="btn-game mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/65 bg-background/55 px-3 py-2 text-xs font-mono uppercase tracking-[0.12em] hover:border-primary/45 hover:bg-muted/40" type="button" (click)="goLeaderboard()">
                    <i-lucide [img]="LayoutGridIcon" [size]="14"></i-lucide>
                    {{ 'lobby.viewFullLeaderboard' | transloco }}
                  </button>
                }
              </section>

              <section class="surface-panel rounded-lg p-4" data-gsap-surface>
                <div class="mb-3 flex items-center gap-2">
                  <i-lucide [img]="CircleAlertIcon" [size]="17" class="text-primary"></i-lucide>
                  <h2 class="text-ui-kicker text-foreground">{{ 'lobby.penaltyRules' | transloco }}</h2>
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex items-center gap-2 rounded-md border border-border/55 bg-background/45 px-3 py-2">
                    <i-lucide [img]="Clock3Icon" [size]="16" class="text-blue-300"></i-lucide>
                    <span>{{ 'lobby.penalties.wrong' | transloco }}</span>
                  </div>
                  <div class="flex items-center gap-2 rounded-md border border-border/55 bg-background/45 px-3 py-2">
                    <i-lucide [img]="SnowflakeIcon" [size]="16" class="text-blue-300"></i-lucide>
                    <span>{{ 'lobby.penalties.megaFreeze' | transloco }}</span>
                  </div>
                  <div class="flex items-center gap-2 rounded-md border border-border/55 bg-background/45 px-3 py-2">
                    <i-lucide [img]="GaugeIcon" [size]="16" class="text-blue-300"></i-lucide>
                    <span>{{ 'lobby.penalties.reset' | transloco }}</span>
                  </div>
                  <div class="flex items-center gap-2 rounded-md border border-border/55 bg-background/45 px-3 py-2">
                    <i-lucide [img]="ShieldAlertIcon" [size]="16" class="text-blue-300"></i-lucide>
                    <span>{{ 'lobby.penalties.realtime' | transloco }}</span>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </main>
      }

      <footer class="relative z-10 mt-6 border-t border-border/40">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-xs font-mono text-muted-foreground md:px-6">
          <div>{{ 'lobby.madeBy' | transloco }} <span class="font-bold text-primary">Nader Mohamed</span></div>
          <div>&copy; {{ currentYear }}</div>
        </div>
      </footer>

      @if (createRoomOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div class="surface-panel max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl sm:p-7">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-ui-kicker text-primary">{{ 'lobby.hostMatch' | transloco }}</div>
                <h2 class="mt-2 text-2xl font-black uppercase tracking-tight text-primary">{{ 'lobby.createRoom' | transloco }}</h2>
              </div>
              <button class="btn-game rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/40" type="button" (click)="closeCreateRoom()">
                {{ 'common.close' | transloco }}
              </button>
            </div>

            <div class="mt-6 space-y-4">
              <label class="block space-y-2">
                <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'lobby.form.roomName' | transloco }}</span>
                <input
                  class="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  [value]="createRoomForm.name.$currentValue()"
                  (input)="setFieldValue(createRoomForm.name, $event)"
                  (blur)="markFieldTouched(createRoomForm.name)"
                  [placeholder]="roomNamePlaceholder()"
                />
                @if (createRoomForm.name.$touched() && createRoomForm.name.$stateMessage()) {
                  <span class="text-xs text-destructive">{{ createRoomForm.name.$stateMessage() }}</span>
                }
              </label>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'lobby.form.difficulty' | transloco }}</span>
                  <select
                    class="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    [value]="createRoomForm.difficulty.$currentValue()"
                    (change)="setFieldValue(createRoomForm.difficulty, $event)"
                    (blur)="markFieldTouched(createRoomForm.difficulty)"
                  >
                    @for (difficulty of difficultyOptions; track difficulty) {
                       <option [value]="difficulty">{{ difficultyLabel(difficulty) }}</option>
                    }
                  </select>
                  @if (createRoomForm.difficulty.$touched() && createRoomForm.difficulty.$stateMessage()) {
                    <span class="text-xs text-destructive">{{ createRoomForm.difficulty.$stateMessage() }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'lobby.form.maxPlayers' | transloco }}</span>
                  <select
                    class="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    [value]="createRoomForm.maxPlayers.$currentValue()"
                    (change)="setFieldValue(createRoomForm.maxPlayers, $event)"
                    (blur)="markFieldTouched(createRoomForm.maxPlayers)"
                  >
                    @for (count of playerCounts; track count) {
                      <option [value]="count">{{ count }} {{ 'lobby.players' | transloco }}</option>
                    }
                  </select>
                </label>
              </div>

              <label class="block space-y-2">
                <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'lobby.form.entryFee' | transloco }}</span>
                <select
                  class="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  [value]="createRoomForm.entryFee.$currentValue()"
                  (change)="setFieldValue(createRoomForm.entryFee, $event)"
                  (blur)="markFieldTouched(createRoomForm.entryFee)"
                >
                  @for (fee of entryFeeOptions(); track fee) {
                    <option [value]="fee">{{ fee }} {{ 'common.coins' | transloco }}</option>
                  }
                </select>
              </label>

              <label class="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-border/60"
                  [checked]="createRoomForm.isPrivate.$currentValue()"
                  (change)="setFieldValue(createRoomForm.isPrivate, $event)"
                />
                <span>
                  <span class="block text-sm font-semibold">{{ 'lobby.form.privateRoom' | transloco }}</span>
                  <span class="text-xs text-muted-foreground">{{ 'lobby.form.passwordRequired' | transloco }}</span>
                </span>
              </label>

              @if (createRoomForm.isPrivate.$currentValue()) {
                <label class="block space-y-2">
                  <span class="text-xs font-mono uppercase tracking-wider text-muted-foreground">{{ 'common.password' | transloco }}</span>
                  <input
                    class="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    [value]="createRoomForm.password.$currentValue()"
                    (input)="setFieldValue(createRoomForm.password, $event)"
                    (blur)="markFieldTouched(createRoomForm.password)"
                    [placeholder]="'lobby.form.roomPassword' | transloco"
                    type="password"
                  />
                  @if (createRoomForm.password.$touched() && createRoomForm.password.$stateMessage()) {
                    <span class="text-xs text-destructive">{{ createRoomForm.password.$stateMessage() }}</span>
                  }
                </label>
              }

              @if (createRoomSubmitAttempted() && createRoomErrors().length > 0) {
                <ul class="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  @for (error of createRoomErrors(); track error) {
                    <li>{{ error }}</li>
                  }
                </ul>
              }

              @if (createRoomError()) {
                <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  {{ createRoomError() }}
                </div>
              }

              <button
                class="btn-game flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                [disabled]="creatingRoom()"
                (click)="submitCreateRoom()"
              >
                {{ creatingRoom() ? ('lobby.form.creating' | transloco) : ('lobby.form.startHosting' | transloco) }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyPage implements AfterViewInit, OnDestroy {
  private readonly localizedRouter = inject(LocalizedRouterService);
  private readonly i18n = inject(I18nService);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  readonly appStore = inject(AppStore);
  readonly supabase = inject(SupabaseService);
  readonly currentYear = new Date().getFullYear();
  readonly createRoomOpen = signal(false);
  readonly creatingRoom = signal(false);
  readonly createRoomError = signal<string | null>(null);
  readonly createRoomSubmitAttempted = signal(false);
  readonly entryFeeOptions = signal<number[]>([10, 50, 100, 500]);
  private gsapCleanup: Array<() => void> = [];
  private roomMotionReady = false;
  private roomSignatures = new Map<string, string>();

  readonly PlusIcon = Plus;
  readonly UsersIcon = Users;
  readonly DoorOpenIcon = DoorOpen;
  readonly PlayIcon = Play;
  readonly TargetIcon = Target;
  readonly WalletIcon = Wallet;
  readonly TrophyIcon = Trophy;
  readonly UserIcon = User;
  readonly LockIcon = Lock;
  readonly ArrowRightIcon = ArrowRight;
  readonly Grid2x2Icon = Grid2x2;
  readonly LayoutGridIcon = LayoutGrid;
  readonly CrownIcon = Crown;
  readonly CircleAlertIcon = CircleAlert;
  readonly Clock3Icon = Clock3;
  readonly SnowflakeIcon = Snowflake;
  readonly GaugeIcon = Gauge;
  readonly ShieldAlertIcon = ShieldAlert;
  readonly SwordsIcon = Swords;

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
    if (theme === 'system') return this.i18n.t('common.system');
    return theme === 'dark' ? this.i18n.t('settings.theme.light') : this.i18n.t('settings.theme.dark');
  });

  readonly roomNamePlaceholder = computed(() => {
    const username = this.player()?.username;
    return username
      ? this.i18n.t('lobby.form.userRoom', { name: username })
      : this.i18n.t('lobby.form.roomName');
  });

  readonly createRoomForm = signalForm<RoomFormValue>({
    name: {
      initialValue: '',
      validators: [
        Required(this.i18n.t('lobby.form.errors.roomNameRequired')),
        MaxLength(32, this.i18n.t('lobby.form.errors.roomNameTooLong')),
      ],
    },
    difficulty: {
      initialValue: 'medium',
      validators: [Required(this.i18n.t('lobby.form.errors.difficultyRequired'))],
    },
    maxPlayers: {
      initialValue: 2,
      validators: [Min(2, this.i18n.t('lobby.form.errors.minimumPlayers'))],
    },
    entryFee: {
      initialValue: 10,
      validators: [Min(0, this.i18n.t('lobby.form.errors.entryFeeNegative'))],
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
            ? new Error(this.i18n.t('lobby.form.errors.passwordRequired'))
            : null,
        MaxLength(64, this.i18n.t('lobby.form.errors.passwordTooLong')),
      ],
    },
  });

  readonly createRoomValid = signalFormValid(this.createRoomForm);
  readonly createRoomErrors = signalFormErrors(this.createRoomForm);

  constructor() {
    void this.loadEntryFeeOptions();
    effect(() => this.scheduleRoomMotion(this.rooms()));
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

  get player() {
    return this.appStore.player;
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
    const surfaces = Array.from(root.querySelectorAll('[data-gsap-surface]')) as HTMLElement[];
    const stagger = Array.from(root.querySelectorAll('[data-gsap-stagger]')) as HTMLElement[];

    if (surfaces.length > 0) gsap.set(surfaces, { autoAlpha: 0, y: 22 });
    if (stagger.length > 0) gsap.set(stagger, { autoAlpha: 0, y: 14 });

    const tl = gsap.timeline({ defaults: { duration: 0.56, ease: 'power2.out' } });
    if (surfaces.length > 0) tl.to(surfaces, { autoAlpha: 1, y: 0, stagger: 0.08 }, 0);
    if (stagger.length > 0) tl.to(stagger, { autoAlpha: 1, y: 0, stagger: 0.03 }, 0.15);

    this.gsapCleanup.push(() => tl.kill());
    this.setupLiftInteractions(gsap, root);
    this.primeRoomMotion();
  }

  private primeRoomMotion(): void {
    this.roomMotionReady = true;
    this.roomSignatures = this.buildRoomSignatures(this.rooms());
  }

  private scheduleRoomMotion(rooms: RoomSummary[]): void {
    const nextSignatures = this.buildRoomSignatures(rooms);

    if (!this.roomMotionReady) {
      this.roomSignatures = nextSignatures;
      return;
    }

    const changes = rooms
      .map((room) => ({
        id: room.id,
        isNew: !this.roomSignatures.has(room.id),
        changed: this.roomSignatures.get(room.id) !== nextSignatures.get(room.id),
      }))
      .filter((change) => change.isNew || change.changed);

    this.roomSignatures = nextSignatures;
    if (changes.length === 0 || typeof window === 'undefined') return;

    const timer = window.setTimeout(() => this.animateRoomChanges(changes), 0);
    this.gsapCleanup.push(() => window.clearTimeout(timer));
  }

  private animateRoomChanges(changes: Array<{ id: string; isNew: boolean }>): void {
    const gsap = this.getGsap();
    if (!gsap || this.prefersReducedMotion()) return;

    const cards = Array.from(
      this.host.nativeElement.querySelectorAll('[data-gsap-room-card]'),
    ) as HTMLElement[];

    for (const change of changes) {
      const card = cards.find((item) => item.dataset['roomId'] === change.id);
      if (!card) continue;

      if (change.isNew) {
        gsap.fromTo(
          card,
          { autoAlpha: 0, x: -20, scale: 0.985 },
          { autoAlpha: 1, x: 0, scale: 1, duration: 0.46, ease: 'power3.out', overwrite: 'auto' },
        );
      } else {
        gsap.fromTo(
          card,
          { boxShadow: '0 0 0 1px rgba(198, 248, 19, 0.72), 0 0 28px rgba(198, 248, 19, 0.18)' },
          { boxShadow: '0 0 0 0 rgba(198, 248, 19, 0)', duration: 0.9, ease: 'power2.out', overwrite: 'auto' },
        );
      }
    }
  }

  private buildRoomSignatures(rooms: RoomSummary[]): Map<string, string> {
    return new Map(
      rooms.map((room) => [
        room.id,
        [room.status, room.playerCount, room.maxPlayers, room.entryFee, room.prizePool].join(':'),
      ]),
    );
  }

  private setupLiftInteractions(gsap: any, root: HTMLElement): void {
    const liftItems = Array.from(root.querySelectorAll('[data-gsap-lift]')) as HTMLElement[];
    if (liftItems.length === 0) return;

    for (const item of liftItems) {
      const onEnter = () => gsap.to(item, { y: -3, duration: 0.2, ease: 'power2.out' });
      const onLeave = () => gsap.to(item, { y: 0, duration: 0.22, ease: 'power2.out' });
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

  goSolo(): void {
    void this.localizedRouter.navigate('/play');
  }

  goRoom(roomId: string): void {
    void this.localizedRouter.navigate(`/room/${roomId}`);
  }

  goSignIn(): void {
    void this.localizedRouter.navigate('/sign-in');
  }

  openCreateRoom(): void {
    if (!this.appStore.isSignedIn()) {
      this.goSignIn();
      return;
    }

    this.createRoomError.set(null);
    this.createRoomSubmitAttempted.set(false);
    this.createRoomForm.name.$currentValue.set(this.roomNamePlaceholder());
    this.createRoomForm.name.$touched.set(false);
    this.createRoomForm.difficulty.$currentValue.set('medium');
    this.createRoomForm.entryFee.$currentValue.set(this.entryFeeOptions()[0] ?? 10);
    this.createRoomOpen.set(true);
  }

  joinRoom(roomId: string): void {
    if (!this.appStore.isSignedIn()) {
      this.goSignIn();
      return;
    }

    void this.localizedRouter.navigate(`/room/${roomId}`);
  }

  handleRoomAction(room: RoomSummary): void {
    if (this.isRoomJoinable(room)) {
      this.joinRoom(room.id);
      return;
    }

    if (!this.appStore.isSignedIn()) {
      this.goSignIn();
      return;
    }

    this.goRoom(room.id);
  }

  isRoomJoinable(room: RoomSummary): boolean {
    return room.status === 'waiting' && room.playerCount < room.maxPlayers;
  }

  roomActionLabel(room: RoomSummary): string {
    if (!this.appStore.isSignedIn()) return this.i18n.t('common.signIn');
    return this.isRoomJoinable(room) ? this.i18n.t('lobby.joinRoom') : this.i18n.t('lobby.viewDetails');
  }

  roomStatusLabel(room: RoomSummary): string {
    if (room.status === 'playing') return this.i18n.t('lobby.status.playing');
    if (room.status === 'waiting') return this.i18n.t('lobby.status.waiting');
    if (room.status === 'finished') return this.i18n.t('lobby.status.finished');
    return this.i18n.t('lobby.status.cancelled');
  }

  difficultyLabel(difficulty: Difficulty): string {
    return this.i18n.t(`lobby.difficulty.${difficulty}`);
  }

  roomCardIcon(room: RoomSummary): typeof Trophy {
    if (room.difficulty === 'hard') return this.SwordsIcon;
    if (room.difficulty === 'easy') return this.CrownIcon;
    return this.TrophyIcon;
  }

  toggleTheme(): void {
    this.appStore.toggleTheme();
  }

  async signOut(): Promise<void> {
    await this.appStore.signOut();
    await this.localizedRouter.navigate('/');
  }

  closeCreateRoom(): void {
    this.createRoomOpen.set(false);
    this.createRoomError.set(null);
    this.createRoomSubmitAttempted.set(false);
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

  async submitCreateRoom(): Promise<void> {
    this.createRoomSubmitAttempted.set(true);
    signalFormSetTouched(this.createRoomForm);
    this.createRoomError.set(null);

    if (!this.createRoomValid()) return;

    const player = this.appStore.player();
    if (!player) return;

    this.creatingRoom.set(true);

    try {
      const room = await this.supabase.createRoom(this.buildCreateRoomValue());
      this.createRoomOpen.set(false);
      this.createRoomSubmitAttempted.set(false);
      resetSignalForm(this.createRoomForm);
      await this.localizedRouter.navigate(`/room/${room.id}`);
    } catch (error) {
      this.createRoomError.set(error instanceof Error ? error.message : this.i18n.t('lobby.form.errors.createRoom'));
    } finally {
      this.creatingRoom.set(false);
    }
  }

  private buildCreateRoomValue(): RoomFormValue {
    const formDifficulty = String(this.createRoomForm.difficulty.$currentValue() ?? '')
      .trim()
      .toLowerCase();
    const difficulty: Difficulty = formDifficulty === 'easy' || formDifficulty === 'hard' ? formDifficulty : 'medium';

    return {
      name: String(this.createRoomForm.name.$currentValue() ?? '').trim(),
      difficulty,
      maxPlayers: Number(this.createRoomForm.maxPlayers.$currentValue() ?? 2),
      entryFee: Number(this.createRoomForm.entryFee.$currentValue() ?? 0),
      isPrivate: Boolean(this.createRoomForm.isPrivate.$currentValue()),
      password: String(this.createRoomForm.password.$currentValue() ?? ''),
    };
  }

  private async loadEntryFeeOptions(): Promise<void> {
    try {
      const settings = await this.supabase.getEconomySettings();
      const values = [...new Set(settings.allowedEntryFees.filter((value) => value >= 0))].sort(
        (a, b) => a - b,
      );
      if (values.length > 0) {
        this.entryFeeOptions.set(values);
        this.createRoomForm.entryFee.$currentValue.set(values[0]);
      }
    } catch {
      // keep defaults
    }
  }
}
