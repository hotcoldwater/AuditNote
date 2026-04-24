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
  padding: '$6 $4',
  background:
    'radial-gradient(circle at top, rgba(200, 220, 255, 0.68), transparent 22%), linear-gradient(180deg, #ffffff 0%, $background 42%, #eef4fd 100%)',
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

export function SignupPage() {
  const { user, signUp, supabaseEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const result = await signUp(email, password, nickname);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setNotice(result.message ?? '이메일 인증이 필요합니다. 메일함을 확인해 주세요.');
      return;
    }

    navigate('/', { replace: true });
  }

  return (
    <Shell>
      <AuthCard>
        <div style={{ display: 'grid', gap: 8 }}>
          <Eyebrow>Join The Notebook</Eyebrow>
          <HeroTitle>학습용 공간 만들기</HeroTitle>
          <HeroText>닉네임을 정하고 바로 학습을 시작할 수 있습니다. 회독 기록과 오답노트는 이 계정에 저장됩니다.</HeroText>
        </div>

        {!supabaseEnabled ? (
          <div style={{ color: '#7b5a19', fontSize: 14, lineHeight: 1.7 }}>{supabaseDisabledMessage}</div>
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
          {notice ? <div style={{ color: '#2F5D50', fontSize: 14, lineHeight: 1.7 }}>{notice}</div> : null}
          {error ? <div style={{ color: '$danger', fontSize: 14 }}>{error}</div> : null}
          <Button type="submit" disabled={submitting}>
            {supabaseEnabled ? '회원가입' : '샘플 계정 만들기'}
          </Button>
        </form>

        <FooterText>
          이미 계정이 있으면 <Link to="/login">로그인</Link>
        </FooterText>
      </AuthCard>
    </Shell>
  );
}
