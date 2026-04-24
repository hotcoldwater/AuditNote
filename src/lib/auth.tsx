import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthUser } from '../types';
import { getDemoUser, setDemoUser } from './localStore';
import { isSupabaseConfigured, supabase } from './supabase';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  supabaseEnabled: boolean;
  usingDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nickname: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), timeoutMs);
    }),
  ]);
}

function fallbackAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    nickname: user.user_metadata.nickname ?? user.email?.split('@')[0] ?? '사용자',
  };
}

async function loadProfile(user: User): Promise<AuthUser> {
  if (!supabase) {
    return fallbackAuthUser(user);
  }

  const { data } = await withTimeout(
    supabase.from('profiles').select('nickname, email').eq('id', user.id).maybeSingle(),
    AUTH_TIMEOUT_MS,
  );

  return {
    id: user.id,
    email: data?.email ?? user.email ?? '',
    nickname: data?.nickname ?? user.user_metadata.nickname ?? user.email?.split('@')[0] ?? '사용자',
  };
}

async function syncSession(session: Session | null) {
  if (!session?.user) {
    return null;
  }

  try {
    return await loadProfile(session.user);
  } catch {
    return fallbackAuthUser(session.user);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(getDemoUser());
      setLoading(false);
      return;
    }

    let mounted = true;

    withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS)
      .then(async ({ data }) => {
        if (!mounted) {
          return;
        }

        setUser(await syncSession(data.session));
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(await syncSession(session));
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      supabaseEnabled: isSupabaseConfigured,
      usingDemo: Boolean(user?.isDemo) || !isSupabaseConfigured,
      async signIn(email, password) {
        if (!isSupabaseConfigured || !supabase) {
          const demoUser: AuthUser = {
            id: 'demo-user',
            email: email || 'demo@gamsanote.local',
            nickname: email.split('@')[0] || '샘플사용자',
            isDemo: true,
          };
          setDemoUser(demoUser);
          setUser(demoUser);
          return { error: null };
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUp(email, password, nickname) {
        if (!isSupabaseConfigured || !supabase) {
          const demoUser: AuthUser = {
            id: 'demo-user',
            email: email || 'demo@gamsanote.local',
            nickname: nickname || email.split('@')[0] || '샘플사용자',
            isDemo: true,
          };
          setDemoUser(demoUser);
          setUser(demoUser);
          return { error: null };
        }

        const signUpResult = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nickname },
          },
        });

        if (signUpResult.error) {
          return { error: signUpResult.error.message };
        }

        const authUser = signUpResult.data.user;

        if (authUser) {
          await supabase.from('profiles').upsert({
            id: authUser.id,
            email,
            nickname,
          });
        }

        if (!signUpResult.data.session) {
          const signInResult = await supabase.auth.signInWithPassword({ email, password });
          if (signInResult.error) {
            return { error: signInResult.error.message };
          }
        }

        return { error: null };
      },
      async signOut() {
        setDemoUser(null);
        if (!isSupabaseConfigured || !supabase) {
          setUser(null);
          return;
        }

        await supabase.auth.signOut();
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
