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
  signUp: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<{ error: string | null; message?: string | null; needsEmailConfirmation?: boolean }>;
  updateNickname: (nickname: string) => Promise<{ error: string | null }>;
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

function normalizeAuthErrorMessage(message: string | null | undefined) {
  const normalized = (message ?? '').trim();
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return '인증 처리 중 오류가 발생했습니다.';
  }

  if (lower.includes('email not confirmed')) {
    return '이메일 확인이 아직 완료되지 않았습니다. 메일함에서 인증 메일을 확인해 주세요.';
  }

  if (lower.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }

  if (lower.includes('user already registered')) {
    return '이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 진행해 주세요.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed')
  ) {
    return 'Supabase 인증 서버에 연결하지 못했습니다. 배포 환경변수와 auditnote.cc 도메인의 Supabase Redirect URL 설정을 확인해 주세요.';
  }

  if (lower.includes('invalid flow state') || lower.includes('flow state')) {
    return '인증 상태가 올바르지 않습니다. auditnote.cc 도메인이 Supabase Redirect URL에 등록되어 있는지 확인해 주세요.';
  }

  return normalized;
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
            email: email || 'demo@auditnote.local',
            nickname: email.split('@')[0] || '샘플사용자',
            isDemo: true,
          };
          setDemoUser(demoUser);
          setUser(demoUser);
          return { error: null };
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? normalizeAuthErrorMessage(error.message) : null };
      },
      async signUp(email, password, nickname) {
        if (!isSupabaseConfigured || !supabase) {
          const demoUser: AuthUser = {
            id: 'demo-user',
            email: email || 'demo@auditnote.local',
            nickname: nickname || email.split('@')[0] || '샘플사용자',
            isDemo: true,
          };
          setDemoUser(demoUser);
          setUser(demoUser);
          return { error: null, needsEmailConfirmation: false, message: null };
        }

        const signUpResult = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nickname },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/confirmed`,
          },
        });

        if (signUpResult.error) {
          return {
            error: normalizeAuthErrorMessage(signUpResult.error.message),
            needsEmailConfirmation: false,
            message: null,
          };
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
          return {
            error: null,
            needsEmailConfirmation: true,
            message: '회원가입이 완료되었습니다. 이메일에서 인증 링크를 확인한 뒤 로그인해 주세요.',
          };
        }

        return { error: null, needsEmailConfirmation: false, message: null };
      },
      async signOut() {
        setDemoUser(null);
        if (!isSupabaseConfigured || !supabase) {
          setUser(null);
          return;
        }

        await supabase.auth.signOut();
      },
      async updateNickname(nickname) {
        const trimmedNickname = nickname.trim();

        if (!trimmedNickname) {
          return { error: '닉네임을 입력해 주세요.' };
        }

        if (!user) {
          return { error: '로그인 상태를 다시 확인해 주세요.' };
        }

        if (!isSupabaseConfigured || !supabase || user.isDemo) {
          const nextUser = {
            ...user,
            nickname: trimmedNickname,
            isDemo: true,
          } satisfies AuthUser;
          setDemoUser(nextUser);
          setUser(nextUser);
          return { error: null };
        }

        try {
          const { error: profileError } = await withTimeout(
            supabase
              .from('profiles')
              .upsert({ id: user.id, email: user.email, nickname: trimmedNickname }),
            AUTH_TIMEOUT_MS,
          );

          if (profileError) {
            return { error: profileError.message };
          }

          const { error: authError } = await withTimeout(
            supabase.auth.updateUser({
              data: {
                nickname: trimmedNickname,
              },
            }),
            AUTH_TIMEOUT_MS,
          );

          if (authError) {
            return { error: authError.message };
          }

          setUser({
            ...user,
            nickname: trimmedNickname,
          });

          return { error: null };
        } catch {
          return { error: '닉네임 저장 중 오류가 발생했습니다.' };
        }
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
