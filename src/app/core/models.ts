export type ThemeMode = 'dark' | 'light' | 'system';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'idle' | 'solo' | 'multiplayer';
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'cancelled';

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
  entryFee: number;
  isPrivate: boolean;
  password: string;
}

export interface PlayerProfile {
  id: string;
  authId: string | null;
  username: string;
  email: string | null;
  role: 'player' | 'moderator' | 'admin' | 'owner';
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
  entryFee: number;
  prizePool: number;
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
  entryFee: number;
  prizePool: number;
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

export interface AdminDashboardSummary {
  totalPlayers: number;
  activePlayers: number;
  bannedPlayers: number;
  waitingRooms: number;
  activeRooms: number;
  finishedRooms: number;
  cancelledRooms: number;
  matchesToday: number;
}

export interface AdminRoomSummary {
  id: string;
  name: string;
  difficulty: Difficulty;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  hostUsername: string;
  winnerUsername: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface AdminPlayerSummary {
  id: string;
  username: string;
  email: string | null;
  role: PlayerProfile['role'];
  totalWins: number;
  totalGames: number;
  isActive: boolean;
  isBanned: boolean;
  lastSeenAt: string;
}

export interface AdminWalletSummary {
  walletId: string;
  userId: string;
  username: string;
  balance: number;
  totalCoinsWon: number;
  totalCoinsSpent: number;
  totalCoinsPurchased: number;
  isFrozen: boolean;
  updatedAt: string;
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

export type WalletTransactionType =
  | 'purchase'
  | 'entry_fee'
  | 'prize_win'
  | 'refund'
  | 'admin_adjustment'
  | 'platform_fee'
  | 'bonus';

export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface WalletSnapshot {
  id: string;
  userId: string;
  balance: number;
  totalCoinsWon: number;
  totalCoinsSpent: number;
  totalCoinsPurchased: number;
  isFrozen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionSnapshot {
  id: string;
  userId: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  relatedMatchId: string | null;
  relatedPurchaseId: string | null;
  adminId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ShopPackage {
  id: string;
  name: string;
  coinsAmount: number;
  bonusCoins: number;
  price: number;
  currency: string;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

export type PurchasePaymentMethod = 'vodafone_cash' | 'instapay';
export type PurchaseStatus =
  | 'awaiting_transfer'
  | 'pending_admin_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded';

export interface PurchaseSnapshot {
  id: string;
  userId: string;
  packageId: string;
  amountPaid: number;
  currency: string;
  coinsReceived: number;
  paymentMethod: PurchasePaymentMethod;
  paymentDestination: string;
  paymentReference: string | null;
  senderPhone: string | null;
  senderName: string | null;
  transferScreenshotUrl: string | null;
  userNote: string | null;
  adminNote: string | null;
  paymentStatus: PurchaseStatus;
  creditedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  idempotencyKey: string | null;
  voucherCode: string | null;
  voucherDiscountAmount: number;
  createdAt: string;
  updatedAt: string;
}

export type LeaderboardSort = 'coins' | 'coins_won' | 'wins' | 'win_rate';

export interface EconomyLeaderboardEntry {
  playerId: string;
  username: string;
  avatarUrl: string | null;
  currentCoins: number;
  totalCoinsWon: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface PlatformEconomySettings {
  allowedEntryFees: number[];
  vodafoneCashNumber: string;
  instapayLink: string;
  platformFeePercent: number;
}

export type VoucherKind = 'free_coins' | 'discount_percent' | 'discount_fixed';

export interface VoucherSnapshot {
  id: string;
  code: string;
  title: string;
  description: string | null;
  kind: VoucherKind;
  freeCoins: number;
  discountPercent: number;
  discountAmount: number;
  maxTotalRedemptions: number | null;
  maxRedemptionsPerUser: number;
  currentRedemptions: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'game_invite' | 'game_start' | 'game_finish' | 'achievement' | 'system';

export interface NotificationSnapshot {
  id: string;
  playerId: string;
  type: NotificationType;
  title: string;
  message: string;
  roomId: string | null;
  senderId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}
