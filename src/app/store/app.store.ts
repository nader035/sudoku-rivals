import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { NotificationSnapshot, PlayerProfile, ThemeMode, WalletSnapshot } from '../core/models';
import { SupabaseService } from '../core/services/supabase.service';

const THEME_STORAGE_KEY = 'sudokuRival.theme';

function readStoredTheme(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'dark';

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  return 'dark';
}

function resolveTheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export const AppStore = signalStore(
  { providedIn: 'root', protectedState: false },
  withState(() => ({
    theme: readStoredTheme(),
  })),
  withProps(() => {
    const supabase = inject(SupabaseService);
    const injector = inject(Injector);

    const authState = toSignal(supabase.authState$, {
      initialValue: { loaded: false, session: null },
      injector,
    });

    const playerState = toSignal(supabase.playerState$, {
      initialValue: { loaded: false, player: null as PlayerProfile | null },
      injector,
    });

    const walletState = toSignal(supabase.observeMyWallet(), {
      initialValue: null as WalletSnapshot | null,
      injector,
    });

    const adminAccessState = toSignal(supabase.adminAccessState$, {
      initialValue: false,
      injector,
    });

    const notificationsState = toSignal(supabase.observeMyNotifications(), {
      initialValue: [] as NotificationSnapshot[],
      injector,
    });

    return {
      supabase,
      authState,
      playerState,
      walletState,
      adminAccessState,
      notificationsState,
      session: computed(() => authState().session),
      player: computed(() => playerState().player),
      wallet: computed(() => walletState()),
      notifications: computed(() => notificationsState()),
      unreadNotifications: computed(() => notificationsState().filter((item) => !item.isRead).length),
      authLoaded: computed(() => authState().loaded),
      playerLoaded: computed(() => playerState().loaded),
      isSignedIn: computed(() => Boolean(authState().session)),
      isAdmin: computed(() => playerState().player?.role === 'admin' || adminAccessState() === true),
      displayName: computed(() => playerState().player?.username ?? 'Guest'),
    };
  }),
  withHooks((store) => {
    let syncEffect = effect(() => {
      const theme = store.theme();
      applyTheme(theme);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    });

    return {
      onInit() {
        applyTheme(store.theme());
      },
      onDestroy() {
        syncEffect.destroy();
      },
    };
  }),
  withMethods((store) => {
    const supabase = store.supabase;

    return {
      setTheme(theme: ThemeMode): void {
        patchState(store, { theme });
      },

      toggleTheme(): void {
        const current = store.theme();
        patchState(store, {
          theme: resolveTheme(current) === 'dark' ? 'light' : 'dark',
        });
      },

      setSystemTheme(): void {
        patchState(store, { theme: 'system' });
      },

      async signOut(): Promise<void> {
        await supabase.signOut();
      },
    };
  }),
);
