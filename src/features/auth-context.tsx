import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { configurationError, supabase } from '../lib/supabase';
import { authError } from '../lib/auth-api';
import { registerPushToken } from '../lib/notifications';
const AuthContext = createContext<{ session: Session | null; loading: boolean; error: string | null; retry: () => void }>({ session: null, loading: true, error: null, retry: () => {} });
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(configurationError);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    let authEventReceived = false;
    setLoading(true); setError(null);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!alive) return;
      authEventReceived = true;
      setSession(next); setLoading(false); setError(null);
    });
    supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!alive || authEventReceived) return;
      if (failure) setError(authError(failure));
      else setSession(data.session);
      setLoading(false);
    }).catch(failure => { if (alive) { setError(authError(failure)); setLoading(false); } });
    const refresh = (state: string) => {
      if (state === 'active') supabase!.auth.startAutoRefresh();
      else supabase!.auth.stopAutoRefresh();
    };
    const listener = Platform.OS !== 'web' ? AppState.addEventListener('change', refresh) : null;
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    return () => { alive = false; subscription.unsubscribe(); listener?.remove(); if (Platform.OS !== 'web') supabase!.auth.stopAutoRefresh(); };
  }, [attempt]);
  useEffect(() => {
    if (!session?.user.id) return;
    // Permission is requested only on real Android/iOS installs. Failure to
    // allow notifications must never block login or bookings.
    void registerPushToken(session.user.id).catch(() => undefined);
  }, [session?.user.id]);
  return <AuthContext.Provider value={{ session, loading, error, retry: () => setAttempt(n => n + 1) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
