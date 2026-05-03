import { Injectable } from '@angular/core';
import { createClient, Session } from '@supabase/supabase-js';
import { hashSync } from 'bcryptjs';
import { Observable, shareReplay } from 'rxjs';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase.config';
import {
  ActivePlayerSummary,
  AuthCredentials,
  Difficulty,
  GuestCredentials,
  LeaderboardEntry,
  PlayerProfile,
  RecentMatch,
  RoomFormValue,
  RoomPlayerSnapshot,
  RoomSnapshot,
  RoomStatus,
  RoomSummary,
  StatsSummary,
  SignUpCredentials,
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

const EMPTY_BOARD = Array.from({ length: 81 }, () => 0);
const ACTIVE_WINDOW_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  constructor(private readonly sudokuLogic: SudokuLogicService) {}

  readonly authState$ = new Observable<AuthSnapshot>((subscriber) => {
    let alive = true;

    void this.client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          subscriber.error(error);
          return;
        }

        subscriber.next({ loaded: true, session: data.session });
      })
      .catch((error) => subscriber.error(error));

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
        emailRedirectTo: window.location.origin,
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

  async ensurePlayerProfile(user: Session['user'], username?: string): Promise<PlayerProfile> {
    const nextUsername = this.normalizeUsername(
      username ?? user.user_metadata?.['username'] ?? user.email,
    );
    const payload = {
      auth_id: user.id,
      username: nextUsername,
      email: user.email ?? null,
      last_seen_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from('players')
      .upsert(payload, { onConflict: 'auth_id' })
      .select('*')
      .maybeSingle();

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
      .select('id,name,difficulty,status,max_players,current_players,is_private,host_id,created_at')
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
      hasPassword: Boolean(row.is_private),
      hostUsername: usernameMap.get(String(row.host_id)) ?? 'Unknown',
      createdAt: String(row.created_at),
    }));
  }

  async getRoom(roomId: string): Promise<RoomSnapshot | null> {
    const { data: room, error } = await this.client
      .from('rooms')
      .select(
        'id,name,difficulty,status,max_players,is_private,host_id,puzzle,solution,winner_id,started_at,created_at',
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
    const passwordHash =
      values.isPrivate && values.password.trim().length > 0 ? hashSync(values.password, 10) : null;

    const { data: roomResult, error } = await this.client.rpc('create_room', {
      p_name: values.name.trim(),
      p_difficulty: values.difficulty,
      p_max_players: values.maxPlayers,
      p_is_private: values.isPrivate,
      p_password_hash: passwordHash,
      p_puzzle: EMPTY_BOARD,
      p_solution: EMPTY_BOARD,
      p_initial_board: EMPTY_BOARD,
      p_allow_hints: true,
      p_allow_mistakes: true,
      p_max_mistakes: 5,
      p_freeze_duration: 3,
      p_mega_freeze_duration: 10,
    });

    if (error) throw error;

    const roomId = typeof roomResult === 'string' ? roomResult : String(roomResult?.id ?? '');
    if (!roomId) throw new Error('Room creation did not return an id');

    const snapshot = await this.getRoom(roomId);
    if (!snapshot) {
      throw new Error('Could not load created room');
    }

    return snapshot;
  }

  async joinRoom(
    roomId: string,
    playerId: string,
    password?: string | null,
  ): Promise<RoomSnapshot> {
    const { error } = await this.client.rpc('join_room', {
      p_room_id: roomId,
      p_player_id: playerId,
      p_password: password ?? null,
    });

    if (error) throw error;

    const snapshot = await this.getRoom(roomId);
    if (!snapshot) {
      throw new Error('Could not load joined room');
    }

    return snapshot;
  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    const { error } = await this.client
      .from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('player_id', playerId);

    if (error) throw error;

    const { data: remaining, error: remainingError } = await this.client
      .from('room_players')
      .select('player_id')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (remainingError) throw remainingError;

    if (!remaining || remaining.length === 0) {
      const { error: roomDeleteError } = await this.client.from('rooms').delete().eq('id', roomId);
      if (roomDeleteError) throw roomDeleteError;
      return;
    }

    const { data: room, error: roomError } = await this.client
      .from('rooms')
      .select('host_id')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError) throw roomError;

    if (room && String(room.host_id) === playerId) {
      const nextHost = String((remaining[0] as RoomPlayerRow).player_id);
      const { error: hostUpdateError } = await this.client
        .from('rooms')
        .update({ host_id: nextHost })
        .eq('id', roomId);

      if (hostUpdateError) throw hostUpdateError;
    }
  }

  async startRoom(roomId: string, playerId: string): Promise<RoomSnapshot> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== playerId) throw new Error('Only host can start the game');
    if (room.status !== 'waiting') throw new Error('Room already started');
    if (room.players.length < 2) throw new Error('Need at least 2 players to start');

    const puzzle = this.sudokuLogic.generateSudoku(room.difficulty);

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

  private createRefreshStream<T>(
    label: string,
    refresh: () => Promise<T>,
    watchers: Array<RealtimeWatcher>,
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

      return () => {
        alive = false;
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

  private normalizeBoard(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;
    return value.map((cell) => (typeof cell === 'number' ? cell : 0));
  }

  private normalizeDifficulty(value: string): Difficulty {
    if (value === 'easy') return 'easy';
    if (value === 'medium') return 'medium';
    return 'hard';
  }

  private normalizeRoomStatus(value: string): RoomStatus {
    if (value === 'finished') return 'finished';
    if (value === 'active') return 'playing';
    return 'waiting';
  }

  private normalizeUsername(candidate: string | null | undefined): string {
    const raw = (candidate ?? '').trim();
    if (raw.length >= 2) return raw.slice(0, 24);

    return `Player${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
