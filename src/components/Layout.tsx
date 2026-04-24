import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { styled } from '../styles/stitches.config';
import { Badge } from './Badge';
import { useAuth } from '../lib/auth';

const Shell = styled('div', {
  minHeight: '100vh',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.66) 0px, rgba(255,255,255,0) 220px)',
});

const TopBar = styled('header', {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  width: '100%',
  borderBottom: '1px solid $borderSoft',
  backgroundColor: 'rgba(250, 249, 247, 0.9)',
  backdropFilter: 'blur(18px)',
});

const TopBarInner = styled('div', {
  width: '100%',
  maxWidth: '960px',
  margin: '0 auto',
  padding: '$4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$4',
  '@sm': {
    padding: '$4 $6',
  },
});

const Brand = styled('div', {
  display: 'grid',
  gap: '$1',
});

const BrandName = styled('div', {
  fontFamily: '$heading',
  fontSize: '$4',
  fontStyle: 'italic',
  fontWeight: 600,
  color: '$primary',
});

const ProfileLink = styled(Link, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$pill',
  '&:focus-visible': {
    boxShadow: '$focus',
  },
});

const Inner = styled('div', {
  width: '100%',
  maxWidth: '960px',
  margin: '0 auto',
  padding: '$7 $4 $9',
  display: 'grid',
  gap: '$6',
  '@sm': {
    padding: '$8 $6 $9',
  },
});

const Header = styled('section', {
  display: 'grid',
  gap: '$3',
});

const Title = styled('h1', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$6',
  fontWeight: 600,
  color: '$primary',
  lineHeight: 1.1,
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
  minHeight: '34px',
  padding: '$1 $3',
  borderRadius: '$pill',
  backgroundColor: '$panel',
  border: '1px solid $borderSoft',
  color: '$subtleText',
  fontSize: '$2',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  boxShadow: '$soft',
  '&.active': {
    backgroundColor: '$primarySoft',
    color: '$primary',
    borderColor: '$primarySoft',
    fontWeight: 700,
  },
});

const NavGroup = styled('div', {
  display: 'none',
  '@sm': {
    display: 'flex',
    alignItems: 'center',
    gap: '$3',
  },
});

const MobileNav = styled('nav', {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 40,
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  gap: '$2',
  padding: '$2 $4 $6',
  borderTop: '1px solid $borderSoft',
  backgroundColor: 'rgba(250, 249, 247, 0.96)',
  backdropFilter: 'blur(18px)',
  '@sm': {
    display: 'none',
  },
});

const MobileNavLink = styled(Link, {
  display: 'grid',
  justifyItems: 'center',
  gap: '$1',
  flex: 1,
  paddingTop: '$2',
  color: '$subtleText',
  fontSize: '11px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  '&.active': {
    color: '$primary',
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
      <TopBar>
        <TopBarInner>
          <Brand>
            <BrandName>AuditNote</BrandName>
          </Brand>
          <NavGroup>
            <NavLink to="/" className={location.pathname === '/' ? 'active' : ''}>
              학습노트
            </NavLink>
            <NavLink
              to="/wrong-notes"
              className={location.pathname.startsWith('/wrong') ? 'active' : ''}
            >
              오답노트
            </NavLink>
            <NavLink to="/records" className={location.pathname === '/records' ? 'active' : ''}>
              기록노트
            </NavLink>
          </NavGroup>
          <ProfileLink to="/settings" aria-label="개인정보설정">
            <Badge tone={usingDemo ? 'warning' : 'primary'}>
              {usingDemo ? user?.nickname ?? '샘플 모드' : user?.nickname ?? '로그인'}
            </Badge>
          </ProfileLink>
        </TopBarInner>
      </TopBar>
      <Inner>
        <Header>
          <Title>{title}</Title>
        </Header>
        {children}
      </Inner>
      <MobileNav>
        <MobileNavLink to="/" className={location.pathname === '/' ? 'active' : ''}>
          <span className="material-symbols-outlined">home</span>
          <span>학습노트</span>
        </MobileNavLink>
        <MobileNavLink to="/wrong-notes" className={location.pathname.startsWith('/wrong') ? 'active' : ''}>
          <span className="material-symbols-outlined">note_stack</span>
          <span>오답노트</span>
        </MobileNavLink>
        <MobileNavLink to="/records" className={location.pathname === '/records' ? 'active' : ''}>
          <span className="material-symbols-outlined">menu_book</span>
          <span>기록노트</span>
        </MobileNavLink>
      </MobileNav>
    </Shell>
  );
}
