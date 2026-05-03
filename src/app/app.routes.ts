import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
