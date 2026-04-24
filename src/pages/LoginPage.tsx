import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthSplash } from '../components/AuthSplash';
import { useAuth } from '../lib/auth';
import { supabaseDisabledMessage } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { styled } from '../styles/stitches.config';

const Shell = styled('main', {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '$6 $4',
  background:
    'radial-gradient(circle at top, rgba(197, 234, 223, 0.55), transparent 26%), linear-gradient(180deg, #fdfcf8 0%, $background 40%, #f4f4f2 100%)',
});

const AuthCard = styled(Card, {
  width: '100%',
  maxWidth: '520px',
  display: 'grid',
  gap: '$6',
  padding: '$7',
  backgroundColor: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(18px)',
});

const Eyebrow = styled('div', {
  fontSize: '$2',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '$subtleText',
  fontWeight: 700,
});

const Hero = styled('div', {
  display: 'grid',
  gap: '$2',
});

const HeroTitle = styled('h1', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$6',
  lineHeight: 1.05,
  color: '$primary',
  fontWeight: 600,
});

const HeroText = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.8,
});

const Field = styled('label', {
  display: 'grid',
  gap: '$2',
  fontSize: '$2',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 700,
});

const Input = styled('input', {
  width: '100%',
  minHeight: '56px',
  padding: '0 $5',
  borderRadius: '$md',
  border: '1px solid $border',
  backgroundColor: '$panel',
  fontSize: '$3',
  color: '$text',
  boxShadow: '$soft',
  outline: 'none',
  '&:focus': {
    borderColor: '$secondary',
    boxShadow: '$focus',
  },
});

const FooterText = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.7,
});

const Quote = styled('div', {
  fontFamily: '$heading',
  fontSize: '$4',
  color: '$accent',
  fontStyle: 'italic',
  lineHeight: 1.55,
});

export function LoginPage() {
  const { user, loading, signIn, supabaseEnabled } = useAuth();
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

  if (loading) {
    return <AuthSplash description="로그인 상태와 저장된 세션을 확인하는 중입니다." />;
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
      <AuthCard>
        <Hero>
          <Eyebrow>Focused Memorization</Eyebrow>
          <HeroTitle>GamsaNote</HeroTitle>
          <HeroText>기준서 제목만 보고 직접 쓰며, 반복 회독과 오답 복습으로 문구를 몸에 익히는 학습 노트 앱</HeroText>
        </Hero>

        <Quote>"The beautiful thing about learning is nobody can take it away from you."</Quote>

        {!supabaseEnabled ? (
          <div style={{ color: '#7b5a19', fontSize: 14, lineHeight: 1.7 }}>{supabaseDisabledMessage}</div>
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
          {error ? <div style={{ color: '$danger', fontSize: 14 }}>{error}</div> : null}
          <Button type="submit" disabled={submitting}>
            {supabaseEnabled ? '로그인' : '샘플 모드 시작'}
          </Button>
        </form>

        <FooterText>
          계정이 없으면 <Link to="/signup">회원가입</Link>
        </FooterText>
      </AuthCard>
    </Shell>
  );
}
