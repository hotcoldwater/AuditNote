import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { styled } from '../styles/stitches.config';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
  justifyItems: 'center',
});

const Message = styled('div', {
  fontSize: '$3',
  lineHeight: 1.7,
  color: '$mutedText',
  textAlign: 'center',
});

const ActionRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '$3',
});

const ActionLink = styled(Link, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '42px',
  padding: '$2 $4',
  borderRadius: '$pill',
  backgroundColor: '$panel',
  border: '1px solid $borderSoft',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  boxShadow: '$soft',
});

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/auth/confirmed';
    const authError = searchParams.get('error');
    const authErrorDescription = searchParams.get('error_description');

    if (authError) {
      setError(authErrorDescription || '인증 링크가 만료되었거나 유효하지 않습니다.');
      return;
    }

    async function handleAuthCallback() {
      if (!supabase) {
        window.setTimeout(() => {
          if (!cancelled) {
            navigate(next, { replace: true });
          }
        }, 700);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) {
          return;
        }

        if (exchangeError) {
          setError('인증 링크가 만료되었거나 유효하지 않습니다.');
          return;
        }

        navigate(next, { replace: true });
        return;
      }

      window.setTimeout(() => {
        if (!cancelled) {
          navigate(next, { replace: true });
        }
      }, 700);
    }

    void handleAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  if (error) {
    return (
      <Layout title="이메일 인증">
        <Card css={{ maxWidth: 560, margin: '0 auto' }}>
          <Stack>
            <Message css={{ color: '$danger', fontWeight: 700 }}>{error}</Message>
            <ActionRow>
              <ActionLink to="/login">로그인</ActionLink>
              <ActionLink to="/signup">회원가입</ActionLink>
            </ActionRow>
          </Stack>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="이메일 인증">
      <Card css={{ maxWidth: 560, margin: '0 auto' }}>
        <Stack>
          <Message>이메일 인증을 확인하고 있어요…</Message>
        </Stack>
      </Card>
    </Layout>
  );
}
