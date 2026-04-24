import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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

export function SignupPage() {
  const { user, signUp, supabaseEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signUp(email, password, nickname);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate('/', { replace: true });
  }

  return (
    <Shell>
      <Card css={{ width: '100%', maxWidth: '460px', display: 'grid', gap: '$5' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>회원가입</h1>
          <p style={{ margin: 0, color: '#777777', lineHeight: 1.6 }}>
            닉네임을 만들고 바로 학습을 시작할 수 있습니다.
          </p>
        </div>

        {!supabaseEnabled ? (
          <div style={{ color: '#B7791F', fontSize: 14, lineHeight: 1.6 }}>{supabaseDisabledMessage}</div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <Field>
            이메일
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field>
            비밀번호
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field>
            닉네임
            <Input value={nickname} onChange={(event) => setNickname(event.target.value)} />
          </Field>
          {error ? <div style={{ color: '#C0392B', fontSize: 14 }}>{error}</div> : null}
          <Button type="submit" disabled={submitting}>
            {supabaseEnabled ? '회원가입' : '샘플 계정 만들기'}
          </Button>
        </form>

        <div style={{ fontSize: 14, color: '#777777' }}>
          이미 계정이 있으면 <Link to="/login">로그인</Link>
        </div>
      </Card>
    </Shell>
  );
}
