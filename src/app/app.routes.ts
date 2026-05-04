import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.page').then(m => m.HomePage),
    pathMatch: 'full',
  },
  {
    path: 'play/solo',
    loadComponent: () => import('./pages/solo.page').then(m => m.SoloPage),
  },
  {
    path: 'lobby',
    loadComponent: () => import('./pages/lobby.page').then(m => m.LobbyPage),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard],
  },
  {
    path: 'wallet',
    loadComponent: () => import('./pages/wallet.page').then(m => m.WalletPage),
    canActivate: [authGuard],
  },
  {
    path: 'shop',
    loadComponent: () => import('./pages/shop.page').then(m => m.ShopPage),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin-dashboard.page').then(m => m.AdminDashboardPage),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Users' },
  },
  {
    path: 'admin/users/:id',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'User Details' },
  },
  {
    path: 'admin/wallets',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Wallets' },
  },
  {
    path: 'admin/transactions',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Transactions' },
  },
  {
    path: 'admin/matches',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Matches' },
  },
  {
    path: 'admin/matches/:id',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Match Details' },
  },
  {
    path: 'admin/shop',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Shop' },
  },
  {
    path: 'admin/purchases',
    loadComponent: () => import('./pages/admin-purchases.page').then(m => m.AdminPurchasesPage),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/leaderboard',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Leaderboard' },
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Settings' },
  },
  {
    path: 'admin/disputes',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Disputes' },
  },
  {
    path: 'admin/audit-logs',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Audit Logs' },
  },
  {
    path: 'admin/alerts',
    loadComponent: () => import('./pages/admin-placeholder.page').then(m => m.AdminPlaceholderPage),
    canActivate: [adminGuard],
    data: { title: 'Alerts' },
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback.page').then(m => m.AuthCallbackPage),
  },
  {
    path: 'room/:roomId',
    loadComponent: () => import('./pages/room.page').then(m => m.RoomPage),
    canActivate: [authGuard],
  },
  {
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in.page').then(m => m.SignInPage),
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./pages/sign-up.page').then(m => m.SignUpPage),
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard.page').then(m => m.LeaderboardPage),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found.page').then(m => m.NotFoundPage),
  },
];
