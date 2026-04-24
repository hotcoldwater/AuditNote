import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabaseDisabledMessage } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { styled } from '../styles/stitches.config';

const Shell = styled('main', {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '$4',
});

const Field = styled('label', {
  display: 'grid',
  gap: '$2',
  fontSize: '$2',
  color: '$mutedText',
});

const Input = styled('input', {
  width: '100%',
  minHeight: '50px',
  padding: '0 $4',
  borderRadius: '$md',
  border: '1px solid $border',
  backgroundColor: '$surface',
  fontSize: '$3',
});

export function LoginPage() {
  const { user, signIn, supabaseEnabled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  if (user) {
    return <Navigate to={nextPath} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate(nextPath, { replace: true });
  }

  return (
    <Shell>
      <Card css={{ width: '100%', maxWidth: '460px', display: 'grid', gap: '$5' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>GamsaNote</h1>
          <p style={{ margin: 0, color: '#777777', lineHeight: 1.6 }}>
            기준서 제목만 보고 직접 쓰는 회계감사 기준서 암기 앱
          </p>
        </div>

        {!supabaseEnabled ? (
          <div style={{ color: '#B7791F', fontSize: 14, lineHeight: 1.6 }}>{supabaseDisabledMessage}</div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <Field>
            이메일
            <Input
              type="email"
              placeholder={supabaseEnabled ? 'you@example.com' : 'demo@gamsanote.local'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field>
            비밀번호
            <Input
              type="password"
              placeholder={supabaseEnabled ? '비밀번호' : '샘플 모드에서는 아무 값이나 입력 가능'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? <div style={{ color: '#C0392B', fontSize: 14 }}>{error}</div> : null}
          <Button type="submit" disabled={submitting}>
            {supabaseEnabled ? '로그인' : '샘플 모드 시작'}
          </Button>
        </form>

        <div style={{ fontSize: 14, color: '#777777' }}>
          계정이 없으면 <Link to="/signup">회원가입</Link>
        </div>
      </Card>
    </Shell>
  );
}
