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
  borderRadius: '24px',
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
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
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

    if (!fullName.trim() || !birthDate.trim() || !gender.trim()) {
      setSubmitting(false);
      setError('이름, 생년월일, 성별을 모두 입력해 주세요.');
      return;
    }

    const result = await signUp(email, password, nickname, fullName, birthDate, gender);
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
        <Hero>
          <BrandMark>
            <BrandIcon src="/favicon.svg" alt="" />
          </BrandMark>
          <BrandHeader>
            <HeroTitle>회원가입</HeroTitle>
            <HeroSubtitle>AuditNote</HeroSubtitle>
          </BrandHeader>
        </Hero>

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
          <Field>
            이름
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </Field>
          <Field>
            생년월일
            <Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </Field>
          <Field>
            성별
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              style={{
                width: '100%',
                minHeight: 56,
                padding: '0 20px',
                borderRadius: 0,
                border: '1px solid #c7cfdd',
                backgroundColor: '#ffffff',
                fontSize: 18,
                boxShadow: '0 12px 28px rgba(17, 35, 68, 0.08)',
                outline: 'none',
              }}
            >
              <option value="">선택</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
            </select>
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
