import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { styled } from '../styles/stitches.config';
import { Badge } from './Badge';
import { useAuth } from '../lib/auth';

const Shell = styled('div', {
  minHeight: '100vh',
  padding: '$4',
  '@sm': {
    padding: '$6',
  },
});

const Inner = styled('div', {
  width: '100%',
  maxWidth: '920px',
  margin: '0 auto',
  display: 'grid',
  gap: '$5',
});

const Header = styled('header', {
  display: 'grid',
  gap: '$3',
});

const Title = styled('h1', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$6',
});

const Description = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.6,
});

const Nav = styled('nav', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
});

const NavLink = styled(Link, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '38px',
  padding: '$2 $4',
  borderRadius: '$pill',
  backgroundColor: '$panel',
  border: '1px solid $border',
  color: '$mutedText',
  fontSize: '$2',
  '&.active': {
    backgroundColor: '$primarySoft',
    color: '$primary',
    borderColor: '$primarySoft',
    fontWeight: 700,
  },
});

export function Layout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const { user, usingDemo } = useAuth();

  return (
    <Shell>
      <Inner>
        <Header>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <Title>{title}</Title>
              {description ? <Description>{description}</Description> : null}
            </div>
            <Badge tone={usingDemo ? 'warning' : 'primary'}>
              {usingDemo ? '샘플 모드' : user?.nickname ?? '로그인'}
            </Badge>
          </div>
          <Nav>
            <NavLink to="/" className={location.pathname === '/' ? 'active' : ''}>
              홈
            </NavLink>
            <NavLink to="/study/setup" className={location.pathname.startsWith('/study') ? 'active' : ''}>
              학습
            </NavLink>
            <NavLink
              to="/wrong-notes"
              className={location.pathname.startsWith('/wrong') && !location.pathname.includes('/play') ? 'active' : ''}
            >
              오답노트
            </NavLink>
            <NavLink to="/records" className={location.pathname === '/records' ? 'active' : ''}>
              학습기록
            </NavLink>
            <NavLink to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
              설정
            </NavLink>
          </Nav>
        </Header>
        {children}
      </Inner>
    </Shell>
  );
}
