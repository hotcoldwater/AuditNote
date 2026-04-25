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
  backgroundColor: '$background',
});

const AuthCard = styled(Card, {
  width: '100%',
  maxWidth: '436px',
  display: 'grid',
  gap: '$7',
  padding: '$8 $7',
  backgroundColor: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(20px)',
});

const BrandMark = styled('div', {
  width: '80px',
  height: '80px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: '$xl',
  backgroundColor: '$panel',
  border: '1px solid rgba(194, 212, 241, 0.78)',
  boxShadow: '0 18px 45px rgba(23, 61, 122, 0.12)',
  justifySelf: 'center',
});

const BrandIcon = styled('img', {
  width: '42px',
  height: '42px',
});

const Hero = styled('div', {
  display: 'grid',
  justifyItems: 'center',
  gap: '$4',
  textAlign: 'center',
});

const BrandHeader = styled('div', {
  display: 'grid',
  gap: '$2',
  justifyItems: 'center',
});

const HeroTitle = styled('h1', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: 'clamp(3rem, 8vw, 4.4rem)',
  lineHeight: 0.92,
  color: '$primary',
  fontWeight: 700,
  letterSpacing: '-0.05em',
});

const HeroSubtitle = styled('div', {
  fontFamily: '$heading',
  fontSize: '$3',
  lineHeight: 1.1,
  color: '$accent',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
});

const Field = styled('label', {
  display: 'grid',
  gap: '$2',
  fontSize: '11px',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 700,
});

const Input = styled('input', {
  width: '100%',
  minHeight: '58px',
  padding: '0 $5',
  borderRadius: '$lg',
  border: '1px solid $border',
  backgroundColor: 'rgba(255,255,255,0.88)',
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
  color: '$subtleText',
  lineHeight: 1.6,
  textAlign: 'center',
});

const Form = styled('form', {
  display: 'grid',
  gap: '$4',
});

const Notice = styled('div', {
  color: '$warning',
  fontSize: '$2',
  lineHeight: 1.7,
  textAlign: 'center',
});

const ErrorText = styled('div', {
  color: '$danger',
  fontSize: '$2',
  lineHeight: 1.6,
  textAlign: 'center',
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
          <BrandMark>
            <BrandIcon src="/favicon.svg" alt="" />
          </BrandMark>
          <BrandHeader>
            <HeroTitle>감사노트</HeroTitle>
            <HeroSubtitle>AuditNote</HeroSubtitle>
          </BrandHeader>
        </Hero>

        {!supabaseEnabled ? (
          <Notice>{supabaseDisabledMessage}</Notice>
        ) : null}

        <Form onSubmit={handleSubmit}>
          <Field>
            이메일
            <Input
              type="email"
              placeholder={supabaseEnabled ? 'you@example.com' : 'demo@auditnote.local'}
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
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button type="submit" disabled={submitting}>
            {supabaseEnabled ? '로그인' : '샘플 모드 시작'}
          </Button>
        </Form>

        <FooterText>
          <Link to="/signup">회원가입</Link>
        </FooterText>
      </AuthCard>
    </Shell>
  );
}
