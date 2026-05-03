export type ThemeMode = 'dark' | 'light' | 'system';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'idle' | 'solo' | 'multiplayer';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends AuthCredentials {
  username: string;
}

export interface GuestCredentials {
  username: string;
}

export interface RoomFormValue {
  name: string;
  difficulty: Difficulty;
  maxPlayers: number;
  isPrivate: boolean;
  password: string;
}

export interface PlayerProfile {
  id: string;
  authId: string | null;
  username: string;
  email: string | null;
  role: 'player' | 'moderator' | 'admin';
  totalWins: number;
  totalGames: number;
  totalMistakes: number;
  averageTime: number;
  easyWins: number;
  mediumWins: number;
  hardWins: number;
  expertWins: number;
  theme: ThemeMode;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface RoomPlayerSnapshot {
  playerId: string;
  username: string;
  progress: number;
  mistakes: number;
  board: number[] | null;
  frozenUntil: string | null;
  isHost: boolean;
  isFinished: boolean;
  finishedAt: string | null;
}

export interface RoomSnapshot {
  id: string;
  name: string;
  difficulty: Difficulty;
  status: RoomStatus;
  maxPlayers: number;
  hasPassword: boolean;
  hostId: string;
  players: RoomPlayerSnapshot[];
  puzzle: number[] | null;
  solution: number[] | null;
  winnerId: string | null;
  winnerUsername: string | null;
  startedAt: string | null;
  createdAt: string;
}

export interface RoomSummary {
  id: string;
  name: string;
  difficulty: Difficulty;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  hostUsername: string;
  createdAt: string;
}

export interface StatsSummary {
  activeRooms: number;
  playersOnline: number;
  matchesToday: number;
  totalMatches: number;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  wins: number;
  gamesPlayed: number;
  winRate: number;
}

export interface RecentMatch {
  roomId: string;
  roomName: string;
  difficulty: Difficulty;
  winnerUsername: string;
  playerCount: number;
  finishedAt: string;
}

export interface ActivePlayerSummary {
  id: string;
  username: string;
  role: string;
  totalWins: number;
  totalGames: number;
  lastSeenAt: string;
}

export interface SoloPuzzle {
  puzzle: number[];
  solution: number[];
  difficulty: Difficulty;
  givens: number;
}

export interface ValidationResult {
  complete: boolean;
  correct: boolean;
  filledCount: number;
  errors: number[];
}
