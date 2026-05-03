import { Routes } from '@angular/router';
import { HomePage } from './pages/home.page';
import { LobbyPage } from './pages/lobby.page';
import { LeaderboardPage } from './pages/leaderboard.page';
import { NotFoundPage } from './pages/not-found.page';
import { RoomPage } from './pages/room.page';
import { SignInPage } from './pages/sign-in.page';
import { SignUpPage } from './pages/sign-up.page';
import { SoloPage } from './pages/solo.page';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomePage, pathMatch: 'full' },
  { path: 'play/solo', component: SoloPage },
  { path: 'lobby', component: LobbyPage, canActivate: [authGuard] },
  { path: 'room/:roomId', component: RoomPage, canActivate: [authGuard] },
  { path: 'sign-in', component: SignInPage },
  { path: 'sign-up', component: SignUpPage },
  { path: 'leaderboard', component: LeaderboardPage },
  { path: '**', component: NotFoundPage },
];
