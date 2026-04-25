import { styled } from '../styles/stitches.config';

const Shell = styled('main', {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '$6 $4',
  backgroundColor: '$background',
});

const SplashCard = styled('div', {
  width: '100%',
  maxWidth: '460px',
  display: 'grid',
  justifyItems: 'center',
  gap: '$5',
  padding: '$8 $6',
});

const LogoHalo = styled('div', {
  position: 'relative',
  width: '148px',
  height: '148px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  backgroundColor: 'transparent',
});

const LogoFrame = styled('div', {
  width: '112px',
  height: '112px',
  borderRadius: '32px',
  display: 'grid',
  placeItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.9)',
  boxShadow: '0 20px 50px rgba(23, 61, 122, 0.16)',
  border: '1px solid rgba(255,255,255,0.84)',
});

const LogoImage = styled('img', {
  width: '72px',
  height: '72px',
});

const Header = styled('div', {
  display: 'grid',
  justifyItems: 'center',
  gap: '$3',
  textAlign: 'center',
});

const Title = styled('h1', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: 'clamp(3rem, 9vw, 4.5rem)',
  lineHeight: 1,
  color: '$primary',
  fontWeight: 700,
  letterSpacing: '-0.04em',
});

const Subtitle = styled('div', {
  fontFamily: '$heading',
  fontSize: 'clamp(1.15rem, 3vw, 1.4rem)',
  lineHeight: 1.2,
  color: '$accent',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
});

const Description = styled('p', {
  margin: 0,
  maxWidth: '32ch',
  color: '$mutedText',
  lineHeight: 1.7,
});

export function AuthSplash({ title = '감사노트', description = '' }: { title?: string; description?: string }) {
  return (
    <Shell>
      <SplashCard>
        <LogoHalo>
          <LogoFrame>
            <LogoImage src="/favicon.svg" alt="" />
          </LogoFrame>
        </LogoHalo>
        <Header>
          <Title>{title}</Title>
          <Subtitle>AuditNote</Subtitle>
          {description ? <Description>{description}</Description> : null}
        </Header>
      </SplashCard>
    </Shell>
  );
}
