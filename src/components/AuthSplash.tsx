import { Card } from './Card';
import { styled } from '../styles/stitches.config';

const Shell = styled('main', {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '$6 $4',
  background:
    'radial-gradient(circle at 20% 12%, rgba(188, 237, 221, 0.8), transparent 22%), radial-gradient(circle at 82% 18%, rgba(255, 218, 211, 0.48), transparent 18%), linear-gradient(180deg, #fdfcf8 0%, $background 42%, #f4f4f2 100%)',
});

const SplashCard = styled(Card, {
  width: '100%',
  maxWidth: '560px',
  display: 'grid',
  gap: '$6',
  padding: '$7',
  backgroundColor: 'rgba(255,255,255,0.84)',
  backdropFilter: 'blur(18px)',
});

const Header = styled('div', {
  display: 'grid',
  gap: '$3',
});

const Eyebrow = styled('div', {
  fontSize: '$2',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '$subtleText',
  fontWeight: 700,
});

const Title = styled('h1', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$6',
  lineHeight: 1.04,
  color: '$primary',
  fontWeight: 600,
});

const Description = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.8,
});

const Meter = styled('div', {
  display: 'grid',
  gap: '$3',
  padding: '$5',
  borderRadius: '$xl',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(244,244,242,0.94) 100%)',
  border: '1px solid $borderSoft',
});

const MeterLabel = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
  fontSize: '$2',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '$subtleText',
  fontWeight: 700,
});

const Track = styled('div', {
  width: '100%',
  height: '8px',
  borderRadius: '$pill',
  backgroundColor: '$surfaceStrong',
  overflow: 'hidden',
});

const Fill = styled('div', {
  width: '68%',
  height: '100%',
  borderRadius: '$pill',
  background: 'linear-gradient(90deg, $secondarySoft 0%, $primaryPanel 100%)',
});

const Footer = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
});

const Pill = styled('div', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '32px',
  padding: '$1 $3',
  borderRadius: '$pill',
  backgroundColor: '$surface',
  border: '1px solid $borderSoft',
  color: '$mutedText',
  fontSize: '$2',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontWeight: 700,
});

export function AuthSplash({
  eyebrow = 'Focused Memorization',
  title = '감사노트',
  description = '로그인 상태와 학습 공간을 확인하는 중입니다.',
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <Shell>
      <SplashCard>
        <Header>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Title>{title}</Title>
          <Description>{description}</Description>
        </Header>

        <Meter>
          <MeterLabel>
            <span>Session Check</span>
            <span>Almost Ready</span>
          </MeterLabel>
          <Track>
            <Fill />
          </Track>
        </Meter>

        <Footer>
          <Pill>세션 복구</Pill>
          <Pill>프로필 동기화</Pill>
          <Pill>학습 공간 준비</Pill>
        </Footer>
      </SplashCard>
    </Shell>
  );
}
