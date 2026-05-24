import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { languageGuard } from './core/guards/language.guard';

const adminChildren: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Users' },
  },
  {
    path: 'users/:id',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'User Details' },
  },
  {
    path: 'wallets',
    loadComponent: () => import('./pages/admin-wallets.page').then((m) => m.AdminWalletsPage),
  },
  {
    path: 'transactions',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Transactions' },
  },
  {
    path: 'matches',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Matches' },
  },
  {
    path: 'matches/:id',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Match Details' },
  },
  {
    path: 'shop',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Shop' },
  },
  {
    path: 'vouchers',
    loadComponent: () => import('./pages/admin-vouchers.page').then((m) => m.AdminVouchersPage),
  },
  {
    path: 'purchases',
    loadComponent: () => import('./pages/admin-purchases.page').then((m) => m.AdminPurchasesPage),
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Leaderboard' },
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Settings' },
  },
  {
    path: 'disputes',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Disputes' },
  },
  {
    path: 'audit-logs',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Audit Logs' },
  },
  {
    path: 'alerts',
    loadComponent: () => import('./pages/admin-placeholder.page').then((m) => m.AdminPlaceholderPage),
    data: { title: 'Alerts' },
  },
];

const localizedRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.page').then((m) => m.HomePage),
    pathMatch: 'full',
  },
  {
    path: 'play',
    loadComponent: () => import('./pages/solo.page').then((m) => m.SoloPage),
  },
  {
    path: 'play/solo',
    redirectTo: 'play',
    pathMatch: 'full',
  },
  {
    path: 'how-to-play',
    loadComponent: () => import('./pages/how-to-play.page').then((m) => m.HowToPlayPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy.page').then((m) => m.PrivacyPage),
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms.page').then((m) => m.TermsPage),
  },
  {
    path: 'lobby',
    loadComponent: () => import('./pages/lobby.page').then((m) => m.LobbyPage),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile.page').then((m) => m.ProfilePage),
    canActivate: [authGuard],
  },
  {
    path: 'wallet',
    loadComponent: () => import('./pages/wallet.page').then((m) => m.WalletPage),
    canActivate: [authGuard],
  },
  {
    path: 'shop',
    loadComponent: () => import('./pages/shop.page').then((m) => m.ShopPage),
    canActivate: [authGuard],
  },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications.page').then((m) => m.NotificationsPage),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./pages/admin-shell.page').then((m) => m.AdminShellPage),
    children: adminChildren,
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'room/:roomId',
    loadComponent: () => import('./pages/room.page').then((m) => m.RoomPage),
    canActivate: [authGuard],
  },
  {
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./pages/sign-up.page').then((m) => m.SignUpPage),
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard.page').then((m) => m.LeaderboardPage),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage),
  },
];

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'en',
    pathMatch: 'full',
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  { path: 'play', redirectTo: 'en/play', pathMatch: 'full' },
  { path: 'play/solo', redirectTo: 'en/play', pathMatch: 'full' },
  { path: 'how-to-play', redirectTo: 'en/how-to-play', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'en/settings', pathMatch: 'full' },
  { path: 'privacy', redirectTo: 'en/privacy', pathMatch: 'full' },
  { path: 'terms', redirectTo: 'en/terms', pathMatch: 'full' },
  { path: 'leaderboard', redirectTo: 'en/leaderboard', pathMatch: 'full' },
  { path: 'lobby', redirectTo: 'en/lobby', pathMatch: 'full' },
  { path: 'profile', redirectTo: 'en/profile', pathMatch: 'full' },
  { path: 'wallet', redirectTo: 'en/wallet', pathMatch: 'full' },
  { path: 'shop', redirectTo: 'en/shop', pathMatch: 'full' },
  { path: 'notifications', redirectTo: 'en/notifications', pathMatch: 'full' },
  { path: 'admin', redirectTo: 'en/admin', pathMatch: 'full' },
  { path: 'admin/:section', redirectTo: 'en/admin/:section', pathMatch: 'full' },
  { path: 'admin/:section/:id', redirectTo: 'en/admin/:section/:id', pathMatch: 'full' },
  { path: 'room/:roomId', redirectTo: 'en/room/:roomId', pathMatch: 'full' },
  { path: 'sign-in', redirectTo: 'en/sign-in', pathMatch: 'full' },
  { path: 'sign-up', redirectTo: 'en/sign-up', pathMatch: 'full' },
  {
    path: ':lang',
    canActivate: [languageGuard],
    children: localizedRoutes,
  },
  {
    path: '**',
    redirectTo: 'en',
  },
];
