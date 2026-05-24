import { Injectable } from '@angular/core';
import { createClient, Session } from '@supabase/supabase-js';
import { Observable, shareReplay } from 'rxjs';
import { APP_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase.config';
import {
  ActivePlayerSummary,
  AdminDashboardSummary,
  AdminPlayerSummary,
  AdminRoomSummary,
  AdminWalletSummary,
  AuthCredentials,
  Difficulty,
  GuestCredentials,
  EconomyLeaderboardEntry,
  LeaderboardEntry,
  LeaderboardSort,
  PlatformEconomySettings,
  PlayerProfile,
  NotificationSnapshot,
  PurchasePaymentMethod,
  PurchaseSnapshot,
  RecentMatch,
  RoomFormValue,
  RoomPlayerSnapshot,
  RoomSnapshot,
  RoomStatus,
  RoomSummary,
  ShopPackage,
  StatsSummary,
  SignUpCredentials,
  VoucherKind,
  VoucherSnapshot,
  WalletSnapshot,
  WalletTransactionSnapshot,
} from '../models';
import { SudokuLogicService } from './sudoku-logic.service';

type AuthSnapshot = {
  loaded: boolean;
  session: Session | null;
};

type PlayerSnapshot = {
  loaded: boolean;
  player: PlayerProfile | null;
};

interface RoomRow {
  id: string;
  name: string;
  difficulty: string;
  status: string;
  max_players: number | null;
  is_private: boolean | null;
  host_id: string;
  puzzle: unknown;
  solution: unknown;
  winner_id: string | null;
  started_at: string | null;
  created_at: string;
  finished_at?: string | null;
}

interface RoomPlayerRow {
  room_id: string;
  player_id: string;
  progress: number | null;
  mistakes: number | null;
  board: unknown;
  frozen_until: string | null;
  is_finished: boolean | null;
  finished_at: string | null;
  joined_at?: string | null;
  started_at?: string | null;
  last_seen_at?: string | null;
  last_move_at?: string | null;
  hints_used?: number | null;
  finish_position?: number | null;
  completion_time?: number | null;
  mega_freeze_count?: number | null;
}

interface PlayerRow {
  id: string;
  auth_id: string | null;
  username: string;
  email: string | null;
  role: string | null;
  total_wins: number | null;
  total_games: number | null;
  total_mistakes: number | null;
  average_time: number | null;
  easy_wins: number | null;
  medium_wins: number | null;
  hard_wins: number | null;
  expert_wins: number | null;
  theme: string | null;
  sound_enabled: boolean | null;
  animations_enabled: boolean | null;
  is_active: boolean | null;
  is_banned: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_seen_at: string | null;
}

interface AdminRoomRow {
  id: string;
  name: string;
  difficulty: string;
  status: string;
  current_players: number | null;
  max_players: number | null;
  host_id: string;
  winner_id: string | null;
  created_at: string;
  finished_at: string | null;
}

interface LeaderboardRow {
  id: string;
  username: string;
  total_wins: number | null;
  total_games: number | null;
  is_active: boolean | null;
  is_banned: boolean | null;
}

interface ActivePlayerRow {
  id: string;
  username: string;
  role: string | null;
  total_wins: number | null;
  total_games: number | null;
  last_seen_at: string | null;
  is_active: boolean | null;
  is_banned: boolean | null;
}

interface WalletRow {
  id: string;
  user_id: string;
  balance: number | null;
  total_coins_won: number | null;
  total_coins_spent: number | null;
  total_coins_purchased: number | null;
  is_frozen: boolean | null;
  created_at: string;
  updated_at: string;
}

interface WalletTransactionRow {
  id: string;
  user_id: string;
  wallet_id: string;
  type: string;
  amount: number | null;
  balance_before: number | null;
  balance_after: number | null;
  status: string;
  related_match_id: string | null;
  related_purchase_id: string | null;
  admin_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ShopPackageRow {
  id: string;
  name: string;
  coins_amount: number | null;
  bonus_coins: number | null;
  price: number | string | null;
  currency: string | null;
  badge: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

interface PurchaseRow {
  id: string;
  user_id: string;
  package_id: string;
  amount_paid: number | string | null;
  currency: string | null;
  coins_received: number | null;
  payment_method: string;
  payment_destination: string;
  payment_reference: string | null;
  sender_phone: string | null;
  sender_name: string | null;
  transfer_screenshot_url: string | null;
  user_note: string | null;
  admin_note: string | null;
  payment_status: string;
  credited_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  idempotency_key: string | null;
  voucher_code?: string | null;
  voucher_discount_amount?: number | string | null;
  created_at: string;
  updated_at: string;
}

interface VoucherRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  kind: string;
  free_coins: number | null;
  discount_percent: number | string | null;
  discount_amount: number | string | null;
  max_total_redemptions: number | null;
  max_redemptions_per_user: number | null;
  current_redemptions: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  player_id: string;
  type: string;
  title: string;
  message: string;
  room_id: string | null;
  sender_id: string | null;
  is_read: boolean | null;
  created_at: string;
  read_at: string | null;
}

interface RealtimeWatcher {
  table: string;
  filter?: string;
}

interface RealtimeChangeFilter {
  event: string;
  schema: string;
  table: string;
  filter?: string;
}

interface RefreshStreamOptions {
  refreshOnAuthChange?: boolean;
}

const EMPTY_BOARD = Array.from({ length: 81 }, () => 0);
const ACTIVE_WINDOW_MS = 60 * 1000;
const AUTH_RECOVERY_PATTERNS = [
  'invalid refresh token',
  'refresh token not found',
  'refresh_token_not_found',
  'jwt expired',
];

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabaseUrl = SUPABASE_URL.trim();
  private readonly supabaseAnonKey = SUPABASE_ANON_KEY.trim();
  private readonly configuredAppUrl = APP_URL.trim();
  private readonly fetchWithApiKey: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers ?? {});
    if (!headers.has('apikey') && this.supabaseAnonKey) {
      headers.set('apikey', this.supabaseAnonKey);
    }
    return fetch(input, { ...init, headers });
  };

  private readonly client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        apikey: this.supabaseAnonKey,
      },
      fetch: this.fetchWithApiKey,
    },
  });

  constructor(private readonly sudokuLogic: SudokuLogicService) {
    this.assertSupabaseConfig();
  }

  readonly authState$ = new Observable<AuthSnapshot>((subscriber) => {
    let alive = true;

    void this.client.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!alive) return;
        if (error) {
          const recovered = await this.recoverAuthSession(error);
          if (!alive) return;
          if (recovered) {
            subscriber.next({ loaded: true, session: null });
            return;
          }
          subscriber.error(error);
          return;
        }

        subscriber.next({ loaded: true, session: data.session });
      })
      .catch(async (error) => {
        const recovered = await this.recoverAuthSession(error);
        if (!alive) return;
        if (recovered) {
          subscriber.next({ loaded: true, session: null });
          return;
        }
        subscriber.error(error);
      });

    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      subscriber.next({ loaded: true, session });
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly playerState$ = new Observable<PlayerSnapshot>((subscriber) => {
    const subscription = this.authState$.subscribe({
      next: (authState) => {
        if (!authState.loaded) {
          subscriber.next({ loaded: false, player: null });
          return;
        }

        if (!authState.session) {
          subscriber.next({ loaded: true, player: null });
          return;
        }

        const session = authState.session;

        (async () => {
          try {
            const player = await this.ensurePlayerProfile(session.user);
            subscriber.next({ loaded: true, player });
          } catch (err) {
            if (err instanceof Error) subscriber.error(err);
            else subscriber.error(new Error('Unknown error fetching player'));
          }
        })();
      },
      error: (error) => subscriber.error(error),
    });

    return () => subscription.unsubscribe();
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly adminAccessState$ = new Observable<boolean>((subscriber) => {
    const subscription = this.authState$.subscribe({
      next: (authState) => {
        if (!authState.session?.user?.id) {
          subscriber.next(false);
          return;
        }

        (async () => {
          const { data, error } = await this.client.rpc('is_admin', {
            p_user_id: authState.session!.user.id,
          });
          if (error) {
            subscriber.next(false);
            return;
          }
          subscriber.next(Boolean(data));
        })();
      },
      error: () => subscriber.next(false),
    });

    return () => subscription.unsubscribe();
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  async signInWithPassword(credentials: AuthCredentials): Promise<void> {
    const { data, error } = await this.client.auth.signInWithPassword(credentials);
    if (error) throw error;
    if (data.session) {
      await this.ensurePlayerProfile(data.session.user, undefined);
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<void> {
    const { data, error } = await this.client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        emailRedirectTo: `${this.getAuthOrigin()}/auth/callback`,
        data: {
          username: credentials.username,
        },
      },
    });

    if (error) throw error;

    if (data.session) {
      await this.ensurePlayerProfile(data.session.user, credentials.username);
    }
  }
  async signInWithX(next = '/lobby'): Promise<void> {
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/lobby';
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'x',
      options: {
        redirectTo: `${this.getAuthOrigin()}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        scopes: 'tweet.read users.read',
      },
    });
    if (error) throw error;
  }

  async completeOAuthSignIn(code: string): Promise<PlayerProfile> {
    const { data, error } = await this.client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session?.user) {
      throw new Error('X sign-in completed without a user session');
    }

    return this.ensurePlayerProfile(data.session.user);
  }

  async completeCurrentSessionProfile(): Promise<PlayerProfile> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) {
      throw new Error('X sign-in completed without a user session');
    }

    return this.ensurePlayerProfile(data.session.user);
  }

  async signInAsGuest(credentials: GuestCredentials): Promise<void> {
    const { data, error } = await this.client.auth.signInAnonymously();
    if (error) throw error;

    if (!data.user) {
      throw new Error('Guest authentication failed');
    }

    await this.ensurePlayerProfile(data.user, credentials.username);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  private assertSupabaseConfig(): void {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('Supabase config missing: set SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY.');
    }
  }

  private getAuthOrigin(): string {
    if (typeof window === 'undefined') return this.toOrigin(this.configuredAppUrl) ?? '';
    return this.toOrigin(this.configuredAppUrl) ?? window.location.origin;
  }

  private toOrigin(value: string): string | null {
    const raw = value.trim();
    if (!raw) return null;

    try {
      const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
      return parsed.origin;
    } catch {
      return null;
    }
  }

  private async recoverAuthSession(error: unknown): Promise<boolean> {
    if (!this.isRecoverableAuthError(error)) return false;

    // Remove stale local session first, then ask Supabase Auth to only clear local scope.
    this.clearStaleAuthStorage();
    await this.client.auth.signOut({ scope: 'local' });
    return true;
  }

  private isRecoverableAuthError(error: unknown): boolean {
    const message = String((error as { message?: unknown })?.message ?? '').toLowerCase();
    return AUTH_RECOVERY_PATTERNS.some((pattern) => message.includes(pattern));
  }

  private clearStaleAuthStorage(): void {
    if (typeof localStorage === 'undefined') return;

    const staleKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (this.isPkceVerifierStorageKey(key)) continue;
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        staleKeys.push(key);
      }
    }

    staleKeys.forEach((key) => localStorage.removeItem(key));
  }

  private isPkceVerifierStorageKey(key: string): boolean {
    return key.startsWith('sb-') && key.includes('-code-verifier');
  }

  async ensurePlayerProfile(user: Session['user'], username?: string): Promise<PlayerProfile> {
    const meta = user.user_metadata ?? {};
    const nextUsername = this.normalizeUsername(
      username
        ?? meta['username']
        ?? meta['user_name']
        ?? meta['preferred_username']
        ?? meta['name']
        ?? user.email,
    );

    const existing = await this.getPlayerByAuthId(user.id);
    if (existing) {
      const { data, error } = await this.client
        .from('players')
        .update({
          email: user.email ?? existing.email,
          last_seen_at: new Date().toISOString(),
        })
        .eq('auth_id', user.id)
        .select('*')
        .maybeSingle();

      if (error) {
        if (this.isPlayersPolicyRecursionError(error)) return existing;
        throw error;
      }

      return data ? this.mapPlayer(data as PlayerRow) : existing;
    }

    const payload = {
      auth_id: user.id,
      username: nextUsername,
      email: user.email ?? null,
      last_seen_at: new Date().toISOString(),
    };

    let { data, error } = await this.client.from('players').insert(payload).select('*').maybeSingle();

    if (error && this.isUniqueViolation(error)) {
      const retryPayload = {
        ...payload,
        username: this.buildUniqueUsername(nextUsername, user.id),
        email: this.isEmailUniqueViolation(error) ? null : payload.email,
      };
      const retry = await this.client.from('players').insert(retryPayload).select('*').maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (this.isPlayersPolicyRecursionError(error)) {
        return this.buildFallbackPlayerProfile(user, nextUsername);
      }
      throw error;
    }

    if (!data) return this.buildFallbackPlayerProfile(user, nextUsername);

    return this.mapPlayer(data as PlayerRow);
  }

  async getPlayerByAuthId(authId: string): Promise<PlayerProfile | null> {
    const { data, error } = await this.client
      .from('players')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle();

    if (error) {
      if (this.isPlayersPolicyRecursionError(error)) return null;
      throw error;
    }

    return data ? this.mapPlayer(data as PlayerRow) : null;
  }

  async getCurrentPlayer(playerId: string): Promise<PlayerProfile | null> {
    const { data, error } = await this.client
      .from('players')
      .select('*')
      .eq('id', playerId)
      .maybeSingle();

    if (error) {
      if (this.isPlayersPolicyRecursionError(error)) return null;
      throw error;
    }

    return data ? this.mapPlayer(data as PlayerRow) : null;
  }

  observeRooms(): Observable<RoomSummary[]> {
    return this.createRefreshStream('rooms-list', () => this.listRooms(), [
      { table: 'rooms' },
      { table: 'room_players' },
      { table: 'players' },
    ]);
  }

  observeRoom(roomId: string): Observable<RoomSnapshot | null> {
    return this.createRefreshStream(`room-${roomId}`, () => this.getRoom(roomId), [
      { table: 'rooms', filter: `id=eq.${roomId}` },
      { table: 'room_players', filter: `room_id=eq.${roomId}` },
      { table: 'players' },
    ]);
  }

  observeStatsSummary(): Observable<StatsSummary> {
    return this.createRefreshStream('stats-summary', () => this.getStatsSummary(), [
      { table: 'rooms' },
      { table: 'room_players' },
      { table: 'players' },
    ]);
  }

  observeLeaderboard(): Observable<LeaderboardEntry[]> {
    return this.createRefreshStream('leaderboard', () => this.getLeaderboard(), [
      { table: 'players' },
    ]);
  }

  observeRecentMatches(): Observable<RecentMatch[]> {
    return this.createRefreshStream('recent-matches', () => this.getRecentMatches(), [
      { table: 'rooms' },
      { table: 'room_players' },
      { table: 'players' },
    ]);
  }

  observeActivePlayers(): Observable<ActivePlayerSummary[]> {
    return this.createRefreshStream('active-players', () => this.getActivePlayers(), [
      { table: 'players' },
      { table: 'room_players' },
    ]);
  }

  async listRooms(): Promise<RoomSummary[]> {
    const { data: rooms, error } = await this.client
      .from('rooms')
      .select('id,name,difficulty,status,max_players,current_players,is_private,host_id,entry_fee,prize_pool,created_at')
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!rooms || rooms.length === 0) return [];

    const hostIds = [...new Set((rooms as any[]).map((r) => String(r.host_id)))];
    const usernameMap = await this.getPlayerUsernameMap(hostIds);

    return (rooms as any[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      difficulty: this.normalizeDifficulty(String(row.difficulty)),
      status: this.normalizeRoomStatus(String(row.status)),
      playerCount: Number(row.current_players ?? 0),
      maxPlayers: Number(row.max_players ?? 4),
      entryFee: Number(row.entry_fee ?? 0),
      prizePool: Number(row.prize_pool ?? 0),
      hasPassword: Boolean(row.is_private),
      hostUsername: usernameMap.get(String(row.host_id)) ?? 'Unknown',
      createdAt: String(row.created_at),
    }));
  }

  async getRoom(roomId: string): Promise<RoomSnapshot | null> {
    const { data: room, error } = await this.client
      .from('rooms')
      .select(
        'id,name,difficulty,status,max_players,is_private,host_id,entry_fee,prize_pool,puzzle,solution,winner_id,started_at,created_at',
      )
      .eq('id', roomId)
      .maybeSingle();

    if (error) throw error;
    if (!room) return null;

    const { data: roomPlayers, error: roomPlayersError } = await this.client
      .from('room_players')
      .select('player_id,progress,mistakes,board,frozen_until,is_finished,finished_at')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (roomPlayersError) throw roomPlayersError;

    const playerIds = (roomPlayers ?? []).map((row) => String((row as RoomPlayerRow).player_id));
    const usernameMap = await this.getPlayerUsernameMap(playerIds);

    const winnerUsername = room.winner_id
      ? (usernameMap.get(String(room.winner_id)) ??
        (await this.getPlayerUsername(String(room.winner_id))))
      : null;

    return {
      id: String(room.id),
      name: String(room.name),
      difficulty: this.normalizeDifficulty(String(room.difficulty)),
      status: this.normalizeRoomStatus(String(room.status)),
      maxPlayers: Number(room.max_players ?? 4),
      entryFee: Number(room.entry_fee ?? 0),
      prizePool: Number(room.prize_pool ?? 0),
      hasPassword: Boolean(room.is_private),
      hostId: String(room.host_id),
      players: (roomPlayers ?? []).map((row) =>
        this.mapRoomPlayer(row as RoomPlayerRow, usernameMap, String(room.host_id)),
      ),
      puzzle: this.normalizeBoard(room.puzzle),
      solution: this.normalizeBoard(room.solution),
      winnerId: room.winner_id ? String(room.winner_id) : null,
      winnerUsername,
      startedAt: room.started_at ? String(room.started_at) : null,
      createdAt: String(room.created_at),
    };
  }

  async createRoom(values: RoomFormValue): Promise<RoomSnapshot> {
    const requestedDifficulty = this.normalizeDifficulty(String(values.difficulty));
    const plainPassword =
      values.isPrivate && values.password.trim().length > 0 ? values.password.trim() : null;
    const generated = this.sudokuLogic.generateSudoku(values.difficulty);

    const { data: roomResult, error } = await this.client.rpc('create_room', {
      p_name: values.name.trim(),
      p_difficulty: values.difficulty,
      p_max_players: values.maxPlayers,
      p_is_private: values.isPrivate,
      p_password_hash: plainPassword,
      p_puzzle: generated.puzzle,
      p_solution: generated.solution,
      p_initial_board: generated.puzzle,
      p_allow_hints: true,
      p_allow_mistakes: true,
      p_max_mistakes: 5,
      p_freeze_duration: 3,
      p_mega_freeze_duration: 10,
      p_entry_fee: Number(values.entryFee ?? 0),
    });

    if (error) throw error;

    const roomId = typeof roomResult === 'string' ? roomResult : String(roomResult?.id ?? '');
    if (!roomId) throw new Error('Room creation did not return an id');

    const snapshot = await this.getRoom(roomId);
    if (!snapshot) {
      throw new Error('Could not load created room');
    }
    if (snapshot.difficulty !== requestedDifficulty) {
      throw new Error(
        `Difficulty mismatch: selected "${requestedDifficulty}" but room stored "${snapshot.difficulty}". Apply latest Supabase migrations (013-016).`,
      );
    }

    return snapshot;
  }

  async joinRoom(
    roomId: string,
    playerId: string,
    password?: string | null,
  ): Promise<RoomSnapshot> {
    let { data, error } = await this.client.rpc('join_room', {
      p_room_id: roomId,
      p_player_id: playerId,
      p_password: password ?? null,
    });

    if (error && this.shouldFallbackJoinRoomMutation(error)) {
      const fallback = await this.client.rpc('join_room', {
        p_room_id: roomId,
        p_password: password ?? null,
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error && this.shouldFallbackJoinRoomMutation(error)) {
      const fallback = await this.client.rpc('join_room', {
        room_id: roomId,
        player_id: playerId,
        password: password ?? null,
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    const rpcResult = data as { success?: boolean; error?: string } | null;
    if (rpcResult && rpcResult.success === false) {
      throw new Error(rpcResult.error ?? 'Unable to join room');
    }

    const snapshot = await this.getRoom(roomId);
    if (!snapshot) {
      throw new Error('Could not load joined room');
    }

    return snapshot;
  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    const { error } = await this.client.rpc('forfeit_room', {
      p_room_id: roomId,
      p_player_id: playerId,
    });
    if (error) throw error;
  }

  async startRoom(roomId: string, playerId: string): Promise<RoomSnapshot> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== playerId) throw new Error('Only host can start the game');
    if (room.status !== 'waiting') throw new Error('Room already started');
    if (room.players.length < 2) throw new Error('Need at least 2 players to start');

    const hasStoredPuzzle = room.puzzle?.some((cell) => cell === 0) && room.solution?.every(Boolean);
    const puzzle = hasStoredPuzzle
      ? { puzzle: room.puzzle!, solution: room.solution! }
      : this.sudokuLogic.generateSudoku(room.difficulty);

    const { data: result, error } = await this.client.rpc('start_room_with_puzzle', {
      p_room_id: roomId,
      p_puzzle: puzzle.puzzle,
      p_solution: puzzle.solution,
    });

    if (error) throw error;

    const rpcResult = result as { success: boolean; error?: string } | null;
    if (rpcResult && !rpcResult.success) {
      throw new Error(rpcResult.error ?? 'Failed to start room');
    }

    const snapshot = await this.getRoom(roomId);
    if (!snapshot) throw new Error('Could not reload room');
    return snapshot;
  }

  async updatePlayerProgress(
    roomId: string,
    playerId: string,
    board: number[],
    progress: number,
    mistakes: number,
  ): Promise<{ completed: boolean; room: RoomSnapshot | null }> {
    const { error } = await this.client.rpc('update_player_progress', {
      p_room_id: roomId,
      p_player_id: playerId,
      p_board: board,
      p_progress: progress,
      p_mistakes: mistakes,
    });

    if (error) throw error;

    const room = await this.getRoom(roomId);
    return {
      completed: Boolean(room?.status === 'finished' || progress >= 100),
      room,
    };
  }

  async getStatsSummary(): Promise<StatsSummary> {
    const [activeRooms, playersOnline, matchesToday, totalMatches] = await Promise.all([
      this.countRooms({ excludeFinished: true }),
      this.countOnlinePlayers(),
      this.countMatchesToday(),
      this.countRooms({ onlyFinished: true }),
    ]);

    return { activeRooms, playersOnline, matchesToday, totalMatches };
  }

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from('players')
      .select('id,username,total_wins,total_games,is_active,is_banned')
      .eq('is_active', true)
      .eq('is_banned', false)
      .order('total_wins', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data) return [];

    return (data as LeaderboardRow[]).map((row) => {
      const wins = Number(row.total_wins ?? 0);
      const games = Number(row.total_games ?? 0);
      return {
        playerId: String(row.id),
        username: String(row.username),
        wins,
        gamesPlayed: games,
        winRate: games > 0 ? Math.round((wins / games) * 100) : 0,
      };
    });
  }

  async getRecentMatches(limit = 8): Promise<RecentMatch[]> {
    const { data, error } = await this.client
      .from('rooms')
      .select('id,name,difficulty,winner_id,current_players,finished_at')
      .eq('status', 'finished')
      .not('winner_id', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const winnerIds = [...new Set((data as any[]).map((r) => String(r.winner_id)))];
    const usernameMap = await this.getPlayerUsernameMap(winnerIds);

    return (data as any[]).map((row) => ({
      roomId: String(row.id),
      roomName: String(row.name),
      difficulty: this.normalizeDifficulty(String(row.difficulty)),
      winnerUsername: usernameMap.get(String(row.winner_id)) ?? 'Unknown',
      playerCount: Number(row.current_players ?? 0),
      finishedAt: String(row.finished_at ?? ''),
    }));
  }

  async getActivePlayers(): Promise<ActivePlayerSummary[]> {
    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
    const { data, error } = await this.client
      .from('players')
      .select('id,username,role,total_wins,total_games,last_seen_at,is_active,is_banned')
      .eq('is_active', true)
      .eq('is_banned', false)
      .gte('last_seen_at', cutoff)
      .order('last_seen_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!data) return [];

    return (data as ActivePlayerRow[]).map((row) => ({
      id: String(row.id),
      username: String(row.username),
      role: String(row.role ?? 'player'),
      totalWins: Number(row.total_wins ?? 0),
      totalGames: Number(row.total_games ?? 0),
      lastSeenAt: String(row.last_seen_at ?? ''),
    }));
  }

  async getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPlayers,
      activePlayers,
      bannedPlayers,
      waitingRooms,
      activeRooms,
      finishedRooms,
      cancelledRooms,
      matchesToday,
    ] = await Promise.all([
      this.countPlayers({}),
      this.countPlayers({ active: true, banned: false }),
      this.countPlayers({ banned: true }),
      this.countRoomsByStatus('waiting'),
      this.countRoomsByStatus('active'),
      this.countRoomsByStatus('finished'),
      this.countRoomsByStatus('cancelled'),
      this.countRoomsByStatus('finished', today.toISOString()),
    ]);

    return {
      totalPlayers,
      activePlayers,
      bannedPlayers,
      waitingRooms,
      activeRooms,
      finishedRooms,
      cancelledRooms,
      matchesToday,
    };
  }

  async getAdminRooms(limit = 12): Promise<AdminRoomSummary[]> {
    const { data, error } = await this.client
      .from('rooms')
      .select('id,name,difficulty,status,current_players,max_players,host_id,winner_id,created_at,finished_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const rows = data as AdminRoomRow[];
    const playerIds = [
      ...new Set(rows.flatMap((row) => [row.host_id, row.winner_id].filter(Boolean) as string[])),
    ];
    const usernameMap = await this.getPlayerUsernameMap(playerIds);

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      difficulty: this.normalizeDifficulty(String(row.difficulty)),
      status: this.normalizeRoomStatus(String(row.status)),
      playerCount: Number(row.current_players ?? 0),
      maxPlayers: Number(row.max_players ?? 0),
      hostUsername: usernameMap.get(String(row.host_id)) ?? 'Unknown',
      winnerUsername: row.winner_id ? (usernameMap.get(String(row.winner_id)) ?? 'Unknown') : null,
      createdAt: String(row.created_at),
      finishedAt: row.finished_at ? String(row.finished_at) : null,
    }));
  }

  async getAdminPlayers(limit = 12): Promise<AdminPlayerSummary[]> {
    const { data, error } = await this.client
      .from('players')
      .select('id,username,email,role,total_wins,total_games,is_active,is_banned,last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data) return [];

    return (data as PlayerRow[]).map((row) => ({
      id: String(row.id),
      username: String(row.username),
      email: row.email ? String(row.email) : null,
      role: String(row.role ?? 'player') as PlayerProfile['role'],
      totalWins: Number(row.total_wins ?? 0),
      totalGames: Number(row.total_games ?? 0),
      isActive: Boolean(row.is_active ?? true),
      isBanned: Boolean(row.is_banned ?? false),
      lastSeenAt: String(row.last_seen_at ?? ''),
    }));
  }

  async adminDeleteRoom(roomId: string): Promise<void> {
    const { error } = await this.client.rpc('admin_delete_room', { p_room_id: roomId });
    if (error) throw error;
  }

  async adminSetPlayerBan(playerId: string, banned: boolean, reason?: string): Promise<void> {
    const { error } = await this.client.rpc('admin_set_player_ban', {
      p_player_id: playerId,
      p_banned: banned,
      p_reason: reason ?? null,
    });
    if (error) throw error;
  }

  observeMyWallet(): Observable<WalletSnapshot | null> {
    return this.createRefreshStream(
      'my-wallet',
      () => this.getMyWallet(),
      [{ table: 'wallets' }],
      { refreshOnAuthChange: true },
    );
  }

  observeMyPurchases(limit = 50): Observable<PurchaseSnapshot[]> {
    return this.createRefreshStream(
      'my-purchases',
      () => this.getMyPurchases(limit),
      [{ table: 'purchases' }],
      { refreshOnAuthChange: true },
    );
  }

  observeMyWalletTransactions(limit = 100): Observable<WalletTransactionSnapshot[]> {
    return this.createRefreshStream(
      'my-wallet-transactions',
      () => this.getMyWalletTransactions(limit),
      [{ table: 'wallet_transactions' }],
      { refreshOnAuthChange: true },
    );
  }

  observeShopPackages(): Observable<ShopPackage[]> {
    return this.createRefreshStream('shop-packages', () => this.getShopPackages(), [
      { table: 'shop_packages' },
    ]);
  }

  observeMyNotifications(limit = 50): Observable<NotificationSnapshot[]> {
    return this.createRefreshStream(
      'my-notifications',
      () => this.getMyNotifications(limit),
      [
        { table: 'notifications' },
        { table: 'players' },
      ],
      { refreshOnAuthChange: true },
    );
  }

  async getMyWallet(): Promise<WalletSnapshot | null> {
    const userId = (await this.client.auth.getUser()).data.user?.id;
    if (!userId) return null;

    const { data, error } = await this.client
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return this.mapWallet(data as WalletRow);
  }

  async getMyWalletTransactions(limit = 100): Promise<WalletTransactionSnapshot[]> {
    const userId = (await this.client.auth.getUser()).data.user?.id;
    if (!userId) return [];

    const { data, error } = await this.client
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as WalletTransactionRow[] | null)?.map((row) => this.mapWalletTransaction(row)) ?? [];
  }

  async getShopPackages(): Promise<ShopPackage[]> {
    const { data, error } = await this.client
      .from('shop_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as ShopPackageRow[] | null)?.map((row) => this.mapShopPackage(row)) ?? [];
  }

  async getMyPurchases(limit = 50): Promise<PurchaseSnapshot[]> {
    const userId = (await this.client.auth.getUser()).data.user?.id;
    if (!userId) return [];

    const { data, error } = await this.client
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as PurchaseRow[] | null)?.map((row) => this.mapPurchase(row)) ?? [];
  }

  async getMyNotifications(limit = 50): Promise<NotificationSnapshot[]> {
    const { data, error } = await this.client.rpc('get_my_notifications', {
      p_limit: Math.max(1, Math.trunc(limit)),
    });

    if (error) throw error;
    return (data as NotificationRow[] | null)?.map((row) => this.mapNotification(row)) ?? [];
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await this.client.rpc('mark_notification_read_secure', {
      p_notification_id: notificationId,
    });
    if (error) throw error;
  }

  async markAllNotificationsRead(): Promise<void> {
    const { error } = await this.client.rpc('mark_all_notifications_read_secure');
    if (error) throw error;
  }

  async createManualPurchase(
    packageId: string,
    paymentMethod: PurchasePaymentMethod,
    idempotencyKey?: string,
    voucherCode?: string,
  ): Promise<PurchaseSnapshot> {
    const normalizedVoucher = voucherCode?.trim().toUpperCase() || null;

    if (normalizedVoucher) {
      const rpcVoucher = await this.client.rpc('create_manual_purchase', {
        p_package_id: packageId,
        p_payment_method: paymentMethod,
        p_idempotency_key: idempotencyKey ?? null,
        p_voucher_code: normalizedVoucher,
      });
      if (rpcVoucher.error) throw rpcVoucher.error;
      return this.mapPurchase(rpcVoucher.data as PurchaseRow);
    }

    const settings = await this.getEconomySettings();
    const { data: pkg, error: pkgError } = await this.client
      .from('shop_packages')
      .select('id,price,currency,coins_amount,bonus_coins,is_active')
      .eq('id', packageId)
      .eq('is_active', true)
      .maybeSingle();

    if (pkgError) throw pkgError;
    if (!pkg) throw new Error('Invalid or inactive package');

    const userId = (await this.client.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Authentication required');

    const destination =
      paymentMethod === 'vodafone_cash' ? settings.vodafoneCashNumber : settings.instapayLink;
    const fallbackKey =
      idempotencyKey ??
      `purchase-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const insert = await this.client
      .from('purchases')
      .insert({
        user_id: userId,
        package_id: packageId,
        amount_paid: Number((pkg as Record<string, unknown>)['price'] ?? 0),
        currency: String((pkg as Record<string, unknown>)['currency'] ?? 'EGP'),
        coins_received:
          Number((pkg as Record<string, unknown>)['coins_amount'] ?? 0) +
          Number((pkg as Record<string, unknown>)['bonus_coins'] ?? 0),
        payment_method: paymentMethod,
        payment_destination: destination,
        payment_status: 'awaiting_transfer',
        idempotency_key: fallbackKey,
      })
      .select('*')
      .maybeSingle();

    if (!insert.error && insert.data) return this.mapPurchase(insert.data as PurchaseRow);

    if (insert.error && this.isUniqueViolation(insert.error)) {
      const existing = await this.client
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('idempotency_key', fallbackKey)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return this.mapPurchase(existing.data as PurchaseRow);
    }

    const rpc = await this.client.rpc('create_manual_purchase', {
      p_package_id: packageId,
      p_payment_method: paymentMethod,
      p_idempotency_key: fallbackKey,
    });
    if (!rpc.error) return this.mapPurchase(rpc.data as PurchaseRow);

    if (!this.shouldFallbackPurchaseMutation(rpc.error) && insert.error) {
      throw insert.error;
    }
    if (rpc.error) throw rpc.error;
    if (!insert.data) throw new Error('Could not create purchase');
    return this.mapPurchase(insert.data as PurchaseRow);
  }

  async confirmManualPurchaseTransfer(input: {
    purchaseId: string;
    senderPhone: string;
    senderName?: string;
    paymentReference?: string;
    transferScreenshotUrl?: string;
    userNote?: string;
  }): Promise<PurchaseSnapshot> {
    const update = await this.client
      .from('purchases')
      .update({
        sender_phone: input.senderPhone.trim(),
        sender_name: input.senderName?.trim() || null,
        payment_reference: input.paymentReference?.trim() || null,
        transfer_screenshot_url: input.transferScreenshotUrl?.trim() || null,
        user_note: input.userNote?.trim() || null,
        payment_status: 'pending_admin_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.purchaseId)
      .in('payment_status', ['awaiting_transfer', 'pending_admin_review'])
      .select('*')
      .maybeSingle();

    if (!update.error && update.data) return this.mapPurchase(update.data as PurchaseRow);

    const rpc = await this.client.rpc('confirm_manual_purchase_transfer', {
      p_purchase_id: input.purchaseId,
      p_sender_phone: input.senderPhone,
      p_sender_name: input.senderName ?? null,
      p_payment_reference: input.paymentReference ?? null,
      p_transfer_screenshot_url: input.transferScreenshotUrl ?? null,
      p_user_note: input.userNote ?? null,
    });
    if (!rpc.error) return this.mapPurchase(rpc.data as PurchaseRow);

    if (update.error) throw update.error;
    if (rpc.error) throw rpc.error;
    throw new Error('Purchase not found or cannot be updated');
  }

  async redeemFreeCoinsVoucher(code: string): Promise<{ code: string; coinsAwarded: number }> {
    const { data, error } = await this.client.rpc('redeem_free_coins_voucher', {
      p_code: code.trim().toUpperCase(),
    });
    if (error) throw error;
    const payload = data as Record<string, unknown>;
    return {
      code: String(payload['code'] ?? code.trim().toUpperCase()),
      coinsAwarded: Number(payload['coinsAwarded'] ?? 0),
    };
  }

  async getEconomyLeaderboard(
    sort: LeaderboardSort,
    limit = 50,
    offset = 0,
  ): Promise<EconomyLeaderboardEntry[]> {
    const orderColumn =
      sort === 'coins'
        ? 'current_coins'
        : sort === 'coins_won'
          ? 'total_coins_won'
          : sort === 'win_rate'
            ? 'win_rate'
            : 'wins';

    const { data, error } = await this.client
      .from('leaderboard_public')
      .select('player_id,username,avatar_url,current_coins,total_coins_won,wins,losses,win_rate')
      .order(orderColumn, { ascending: false })
      .order('wins', { ascending: false })
      .range(offset, offset + Math.max(1, limit) - 1);

    if (error) throw error;
    const mapped = ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
      playerId: String(row['player_id']),
      username: String(row['username']),
      avatarUrl: row['avatar_url'] ? String(row['avatar_url']) : null,
      currentCoins: Number(row['current_coins'] ?? 0),
      totalCoinsWon: Number(row['total_coins_won'] ?? 0),
      wins: Number(row['wins'] ?? 0),
      losses: Number(row['losses'] ?? 0),
      winRate: Number(row['win_rate'] ?? 0),
    }));

    const bySelectedSort = (entry: EconomyLeaderboardEntry): number => {
      if (sort === 'coins') return entry.currentCoins;
      if (sort === 'coins_won') return entry.totalCoinsWon;
      if (sort === 'win_rate') return entry.winRate;
      return entry.wins;
    };

    return mapped.sort((left, right) => {
      const delta = bySelectedSort(right) - bySelectedSort(left);
      if (delta !== 0) return delta;

      const winsDelta = right.wins - left.wins;
      if (winsDelta !== 0) return winsDelta;

      const coinsDelta = right.currentCoins - left.currentCoins;
      if (coinsDelta !== 0) return coinsDelta;

      return left.username.localeCompare(right.username);
    });
  }

  async getEconomySettings(): Promise<PlatformEconomySettings> {
    const { data, error } = await this.client
      .from('platform_settings')
      .select('key,value')
      .in('key', [
        'allowed_match_entry_fees',
        'vodafone_cash_number',
        'instapay_link',
        'platform_fee_percentage',
      ]);

    if (error) throw error;

    const settings = new Map<string, unknown>();
    for (const row of (data ?? []) as { key: string; value: unknown }[]) {
      settings.set(row.key, row.value);
    }

    const allowedRaw = settings.get('allowed_match_entry_fees');
    const allowedEntryFees = Array.isArray(allowedRaw)
      ? allowedRaw.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [10, 50, 100, 500];

    return {
      allowedEntryFees: allowedEntryFees.length > 0 ? allowedEntryFees : [10, 50, 100, 500],
      vodafoneCashNumber: String(settings.get('vodafone_cash_number') ?? '+01022175316'),
      instapayLink: String(settings.get('instapay_link') ?? 'https://ipn.eg/S/naderas109n/instapay/5ph2Pv'),
      platformFeePercent: Number(settings.get('platform_fee_percentage') ?? 0),
    };
  }

  async adminListPurchases(limit = 100): Promise<PurchaseSnapshot[]> {
    const { data, error } = await this.client
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as PurchaseRow[] | null)?.map((row) => this.mapPurchase(row)) ?? [];
  }

  async adminApprovePurchase(purchaseId: string, reason?: string): Promise<PurchaseSnapshot> {
    const { data, error } = await this.client.rpc('admin_approve_purchase', {
      p_purchase_id: purchaseId,
      p_reason: reason ?? null,
    });
    if (error) throw error;
    return this.mapPurchase(data as PurchaseRow);
  }

  async adminRejectPurchase(purchaseId: string, rejectionReason: string): Promise<PurchaseSnapshot> {
    const { data, error } = await this.client.rpc('admin_reject_purchase', {
      p_purchase_id: purchaseId,
      p_rejection_reason: rejectionReason,
    });
    if (error) throw error;
    return this.mapPurchase(data as PurchaseRow);
  }

  async adminBroadcastNotification(title: string, message: string, reason?: string): Promise<number> {
    const { data, error } = await this.client.rpc('admin_broadcast_notification', {
      p_title: title,
      p_message: message,
      p_reason: reason ?? null,
    });
    if (error) throw error;
    return Number(data ?? 0);
  }

  async adminListVouchers(limit = 200): Promise<VoucherSnapshot[]> {
    const { data, error } = await this.client
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as VoucherRow[] | null)?.map((row) => this.mapVoucher(row)) ?? [];
  }

  async adminUpsertVoucher(input: {
    id?: string | null;
    code: string;
    title: string;
    description?: string;
    kind: VoucherKind;
    freeCoins?: number;
    discountPercent?: number;
    discountAmount?: number;
    maxTotalRedemptions?: number | null;
    maxRedemptionsPerUser?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive?: boolean;
  }): Promise<VoucherSnapshot> {
    const { data, error } = await this.client.rpc('admin_upsert_voucher', {
      p_id: input.id ?? null,
      p_code: input.code.trim().toUpperCase(),
      p_title: input.title.trim(),
      p_kind: input.kind,
      p_free_coins: Math.max(0, Math.trunc(input.freeCoins ?? 0)),
      p_discount_percent: Math.max(0, Number(input.discountPercent ?? 0)),
      p_discount_amount: Math.max(0, Number(input.discountAmount ?? 0)),
      p_max_total_redemptions:
        input.maxTotalRedemptions === null || input.maxTotalRedemptions === undefined
          ? null
          : Math.max(1, Math.trunc(input.maxTotalRedemptions)),
      p_max_redemptions_per_user: Math.max(1, Math.trunc(input.maxRedemptionsPerUser ?? 1)),
      p_starts_at: input.startsAt ?? null,
      p_ends_at: input.endsAt ?? null,
      p_is_active: input.isActive ?? true,
      p_description: input.description?.trim() || null,
    });
    if (error) throw error;
    return this.mapVoucher(data as VoucherRow);
  }

  async adminSetVoucherActive(voucherId: string, isActive: boolean): Promise<VoucherSnapshot> {
    const { data, error } = await this.client.rpc('admin_set_voucher_active', {
      p_voucher_id: voucherId,
      p_is_active: isActive,
    });
    if (error) throw error;
    return this.mapVoucher(data as VoucherRow);
  }

  async adminAdjustWallet(targetUserId: string, amount: number, reason: string): Promise<WalletTransactionSnapshot> {
    const { data, error } = await this.client.rpc('admin_adjust_wallet', {
      p_target_user_id: targetUserId,
      p_amount: Math.trunc(amount),
      p_reason: reason,
    });
    if (error) throw error;
    return this.mapWalletTransaction(data as WalletTransactionRow);
  }

  async adminListWallets(limit = 100): Promise<AdminWalletSummary[]> {
    const { data, error } = await this.client
      .from('wallets')
      .select('id,user_id,balance,total_coins_won,total_coins_spent,total_coins_purchased,is_frozen,updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const rows = (data as WalletRow[] | null) ?? [];
    const userIds = [...new Set(rows.map((row) => String(row.user_id)))];
    const usernameMap = await this.getProfileUsernameMap(userIds);

    return rows.map((row) => ({
      walletId: String(row.id),
      userId: String(row.user_id),
      username: usernameMap.get(String(row.user_id)) ?? 'Unknown',
      balance: Number(row.balance ?? 0),
      totalCoinsWon: Number(row.total_coins_won ?? 0),
      totalCoinsSpent: Number(row.total_coins_spent ?? 0),
      totalCoinsPurchased: Number(row.total_coins_purchased ?? 0),
      isFrozen: Boolean(row.is_frozen ?? false),
      updatedAt: String(row.updated_at),
    }));
  }

  async adminSetWalletFrozen(targetUserId: string, isFrozen: boolean, reason?: string): Promise<void> {
    const { error } = await this.client.rpc('admin_set_wallet_frozen', {
      p_target_user_id: targetUserId,
      p_is_frozen: isFrozen,
      p_reason: reason ?? null,
    });
    if (error) throw error;
  }

  private createRefreshStream<T>(
    label: string,
    refresh: () => Promise<T>,
    watchers: Array<RealtimeWatcher>,
    options?: RefreshStreamOptions,
  ): Observable<T> {
    return new Observable<T>((subscriber) => {
      let alive = true;

      const emit = async () => {
        try {
          const value = await refresh();
          if (alive) subscriber.next(value);
        } catch (error) {
          if (alive) subscriber.error(error);
        }
      };

      void emit();

      const channels = watchers.map((watcher, index) => {
        const channel = this.client.channel(`${label}:${index}:${watcher.table}`);
        const changeFilter: RealtimeChangeFilter = {
          event: '*',
          schema: 'public',
          table: watcher.table,
        };

        if (watcher.filter) {
          changeFilter.filter = watcher.filter;
        }

        channel.on('postgres_changes' as any, changeFilter as any, () => {
          void emit();
        });
        channel.subscribe();
        return channel;
      });

      const authSubscription = options?.refreshOnAuthChange
        ? this.client.auth.onAuthStateChange(() => {
            void emit();
          }).data.subscription
        : null;

      return () => {
        alive = false;
        authSubscription?.unsubscribe();
        channels.forEach((channel) => {
          void this.client.removeChannel(channel);
        });
      };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  private async countRooms(options: {
    onlyFinished?: boolean;
    excludeFinished?: boolean;
  }): Promise<number> {
    let query = this.client.from('rooms').select('id', { count: 'exact', head: true });

    if (options.onlyFinished) {
      query = query.eq('status', 'finished');
    } else if (options.excludeFinished) {
      query = query.in('status', ['waiting', 'active']);
    }

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  }

  private async countOnlinePlayers(): Promise<number> {
    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
    const { count, error } = await this.client
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_banned', false)
      .gte('last_seen_at', cutoff);

    if (error) return 0;
    return count ?? 0;
  }

  private async countPlayers(options: { active?: boolean; banned?: boolean }): Promise<number> {
    let query = this.client.from('players').select('id', { count: 'exact', head: true });

    if (typeof options.active === 'boolean') query = query.eq('is_active', options.active);
    if (typeof options.banned === 'boolean') query = query.eq('is_banned', options.banned);

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  }

  private async countRoomsByStatus(status: string, finishedAfter?: string): Promise<number> {
    let query = this.client
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);

    if (finishedAfter) query = query.gte('finished_at', finishedAfter);

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  }

  private async countMatchesToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error } = await this.client
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'finished')
      .gte('finished_at', today.toISOString());

    if (error) return 0;
    return count ?? 0;
  }

  private async getRoomPlayerCounts(roomIds: string[]): Promise<Map<string, number>> {
    if (roomIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from('room_players')
      .select('room_id')
      .in('room_id', roomIds);

    if (error || !data) return new Map();

    const counts = new Map<string, number>();
    for (const row of data as { room_id: string }[]) {
      const id = String(row.room_id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  private async getPlayerUsernameMap(playerIds: string[]): Promise<Map<string, string>> {
    if (playerIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from('players')
      .select('id,username')
      .in('id', playerIds);

    if (error || !data) return new Map();

    const map = new Map<string, string>();
    for (const row of data as { id: string; username: string }[]) {
      map.set(String(row.id), String(row.username));
    }
    return map;
  }

  private async getPlayerUsername(playerId: string): Promise<string> {
    const { data, error } = await this.client
      .from('players')
      .select('username')
      .eq('id', playerId)
      .maybeSingle();

    if (error || !data) return 'Unknown';
    return String((data as { username: string }).username);
  }

  private async getProfileUsernameMap(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from('profiles')
      .select('id,username')
      .in('id', userIds);

    if (error || !data) return new Map();

    const map = new Map<string, string>();
    for (const row of data as { id: string; username: string }[]) {
      map.set(String(row.id), String(row.username));
    }
    return map;
  }

  private buildFallbackPlayerProfile(user: Session['user'], username?: string): PlayerProfile {
    const now = new Date().toISOString();
    const fallbackUsername = this.normalizeUsername(
      username ?? user.user_metadata?.['username'] ?? user.email,
    );

    return {
      id: String(user.id),
      authId: String(user.id),
      username: fallbackUsername,
      email: user.email ?? null,
      role: 'player',
      totalWins: 0,
      totalGames: 0,
      totalMistakes: 0,
      averageTime: 0,
      easyWins: 0,
      mediumWins: 0,
      hardWins: 0,
      expertWins: 0,
      theme: 'system',
      soundEnabled: true,
      animationsEnabled: true,
      isActive: true,
      isBanned: false,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };
  }

  private isPlayersPolicyRecursionError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const maybeError = error as { code?: string; message?: string };
    return (
      maybeError.code === '42P17' &&
      typeof maybeError.message === 'string' &&
      maybeError.message.includes('infinite recursion detected in policy for relation "players"')
    );
  }

  private mapPlayer(row: PlayerRow): PlayerProfile {
    return {
      id: String(row.id),
      authId: row.auth_id ? String(row.auth_id) : null,
      username: String(row.username),
      email: row.email ? String(row.email) : null,
      role: String(row.role ?? 'player') as PlayerProfile['role'],
      totalWins: Number(row.total_wins ?? 0),
      totalGames: Number(row.total_games ?? 0),
      totalMistakes: Number(row.total_mistakes ?? 0),
      averageTime: Number(row.average_time ?? 0),
      easyWins: Number(row.easy_wins ?? 0),
      mediumWins: Number(row.medium_wins ?? 0),
      hardWins: Number(row.hard_wins ?? 0),
      expertWins: Number(row.expert_wins ?? 0),
      theme: String(row.theme ?? 'system') as PlayerProfile['theme'],
      soundEnabled: Boolean(row.sound_enabled ?? true),
      animationsEnabled: Boolean(row.animations_enabled ?? true),
      isActive: Boolean(row.is_active ?? true),
      isBanned: Boolean(row.is_banned ?? false),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      lastSeenAt: String(row.last_seen_at ?? new Date().toISOString()),
    };
  }

  private mapRoomPlayer(
    row: RoomPlayerRow,
    usernames: Map<string, string>,
    hostId: string,
  ): RoomPlayerSnapshot {
    const playerId = String(row.player_id);

    return {
      playerId,
      username: usernames.get(playerId) ?? 'Unknown',
      progress: Number(row.progress ?? 0),
      mistakes: Number(row.mistakes ?? 0),
      board: this.normalizeBoard(row.board),
      frozenUntil: row.frozen_until ? String(row.frozen_until) : null,
      isHost: playerId === hostId,
      isFinished: Boolean(row.is_finished ?? false),
      finishedAt: row.finished_at ? String(row.finished_at) : null,
    };
  }

  private mapWallet(row: WalletRow): WalletSnapshot {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      balance: Number(row.balance ?? 0),
      totalCoinsWon: Number(row.total_coins_won ?? 0),
      totalCoinsSpent: Number(row.total_coins_spent ?? 0),
      totalCoinsPurchased: Number(row.total_coins_purchased ?? 0),
      isFrozen: Boolean(row.is_frozen ?? false),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapWalletTransaction(row: WalletTransactionRow): WalletTransactionSnapshot {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      walletId: String(row.wallet_id),
      type: String(row.type) as WalletTransactionSnapshot['type'],
      amount: Number(row.amount ?? 0),
      balanceBefore: Number(row.balance_before ?? 0),
      balanceAfter: Number(row.balance_after ?? 0),
      status: String(row.status) as WalletTransactionSnapshot['status'],
      relatedMatchId: row.related_match_id ? String(row.related_match_id) : null,
      relatedPurchaseId: row.related_purchase_id ? String(row.related_purchase_id) : null,
      adminId: row.admin_id ? String(row.admin_id) : null,
      reason: row.reason ? String(row.reason) : null,
      metadata: row.metadata ?? null,
      createdAt: String(row.created_at),
    };
  }

  private mapShopPackage(row: ShopPackageRow): ShopPackage {
    return {
      id: String(row.id),
      name: String(row.name),
      coinsAmount: Number(row.coins_amount ?? 0),
      bonusCoins: Number(row.bonus_coins ?? 0),
      price: Number(row.price ?? 0),
      currency: String(row.currency ?? 'EGP'),
      badge: row.badge ? String(row.badge) : null,
      sortOrder: Number(row.sort_order ?? 0),
      isActive: Boolean(row.is_active ?? true),
    };
  }

  private mapPurchase(row: PurchaseRow): PurchaseSnapshot {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      packageId: String(row.package_id),
      amountPaid: Number(row.amount_paid ?? 0),
      currency: String(row.currency ?? 'EGP'),
      coinsReceived: Number(row.coins_received ?? 0),
      paymentMethod: String(row.payment_method) as PurchasePaymentMethod,
      paymentDestination: String(row.payment_destination),
      paymentReference: row.payment_reference ? String(row.payment_reference) : null,
      senderPhone: row.sender_phone ? String(row.sender_phone) : null,
      senderName: row.sender_name ? String(row.sender_name) : null,
      transferScreenshotUrl: row.transfer_screenshot_url ? String(row.transfer_screenshot_url) : null,
      userNote: row.user_note ? String(row.user_note) : null,
      adminNote: row.admin_note ? String(row.admin_note) : null,
      paymentStatus: String(row.payment_status) as PurchaseSnapshot['paymentStatus'],
      creditedAt: row.credited_at ? String(row.credited_at) : null,
      reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
      rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
      idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
      voucherCode: row.voucher_code ? String(row.voucher_code) : null,
      voucherDiscountAmount: Number(row.voucher_discount_amount ?? 0),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapVoucher(row: VoucherRow): VoucherSnapshot {
    return {
      id: String(row.id),
      code: String(row.code),
      title: String(row.title),
      description: row.description ? String(row.description) : null,
      kind: String(row.kind) as VoucherKind,
      freeCoins: Number(row.free_coins ?? 0),
      discountPercent: Number(row.discount_percent ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      maxTotalRedemptions: row.max_total_redemptions === null ? null : Number(row.max_total_redemptions),
      maxRedemptionsPerUser: Number(row.max_redemptions_per_user ?? 1),
      currentRedemptions: Number(row.current_redemptions ?? 0),
      startsAt: row.starts_at ? String(row.starts_at) : null,
      endsAt: row.ends_at ? String(row.ends_at) : null,
      isActive: Boolean(row.is_active ?? true),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapNotification(row: NotificationRow): NotificationSnapshot {
    return {
      id: String(row.id),
      playerId: String(row.player_id),
      type: String(row.type) as NotificationSnapshot['type'],
      title: String(row.title),
      message: String(row.message),
      roomId: row.room_id ? String(row.room_id) : null,
      senderId: row.sender_id ? String(row.sender_id) : null,
      isRead: Boolean(row.is_read ?? false),
      createdAt: String(row.created_at),
      readAt: row.read_at ? String(row.read_at) : null,
    };
  }

  private normalizeBoard(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;
    return value.map((cell) => (typeof cell === 'number' ? cell : 0));
  }

  private normalizeDifficulty(value: string): Difficulty {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'easy') return 'easy';
    if (normalized === 'medium') return 'medium';
    if (normalized === 'hard') return 'hard';
    return 'medium';
  }

  private normalizeRoomStatus(value: string): RoomStatus {
    if (value === 'finished') return 'finished';
    if (value === 'active') return 'playing';
    if (value === 'cancelled') return 'cancelled';
    return 'waiting';
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
  }

  private isEmailUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const maybeError = error as { message?: string };
    return typeof maybeError.message === 'string' && maybeError.message.includes('players_email_key');
  }

  private buildUniqueUsername(base: string, userId: string): string {
    const suffix = userId.replace(/-/g, '').slice(0, 6);
    return `${base.slice(0, Math.max(2, 17 - suffix.length))}-${suffix}`;
  }

  private normalizeUsername(candidate: string | null | undefined): string {
    const raw = (candidate ?? '').trim();
    if (raw.length >= 2) return raw.slice(0, 24);

    return `Player${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private shouldFallbackPurchaseMutation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const code = String((error as { code?: string }).code ?? '');
    const message = String((error as { message?: string }).message ?? '').toLowerCase();
    return (
      code === '42883' ||
      code === 'PGRST202' ||
      message.includes('function create_manual_purchase') ||
      message.includes('function confirm_manual_purchase_transfer')
    );
  }

  private shouldFallbackJoinRoomMutation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const code = String((error as { code?: string }).code ?? '');
    const message = String((error as { message?: string }).message ?? '').toLowerCase();
    return (
      code === '42883' ||
      code === 'PGRST202' ||
      code === 'PGRST204' ||
      message.includes('function join_room') ||
      message.includes('p_player_id') ||
      message.includes('unexpected parameter')
    );
  }
}
