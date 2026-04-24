import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { styled } from '../styles/stitches.config';

const Shell = styled('div', {
  display: 'grid',
  placeItems: 'center',
  minHeight: 'calc(100vh - 220px)',
});

const ConfirmCard = styled(Card, {
  width: '100%',
  maxWidth: '560px',
  display: 'grid',
  gap: '$5',
  padding: '$8',
  justifyItems: 'center',
  textAlign: 'center',
  backgroundColor: 'rgba(255,255,255,0.94)',
  '&::before': {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0) 34%)',
  },
});

const Title = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  color: '$primary',
  lineHeight: 1.15,
});

const Description = styled('p', {
  margin: 0,
  fontSize: '$3',
  lineHeight: 1.7,
  color: '$mutedText',
});

const ActionRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '$3',
});

const PrimaryLink = styled(Link, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '48px',
  minWidth: '140px',
  padding: '$2 $5',
  borderRadius: '$pill',
  backgroundColor: '$primaryPanel',
  color: '$panel',
  fontSize: '$2',
  fontWeight: 700,
  boxShadow: '0 10px 24px rgba(26, 60, 52, 0.12)',
});

const SecondaryLink = styled(Link, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '48px',
  minWidth: '140px',
  padding: '$2 $5',
  borderRadius: '$pill',
  backgroundColor: '$panel',
  border: '1px solid $border',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  boxShadow: '$soft',
});

export function AuthConfirmedPage() {
  return (
    <Layout title="이메일 인증 완료">
      <Shell>
        <ConfirmCard>
          <Title>이메일 인증이 완료되었습니다</Title>
          <Description>이제 AuditNote를 사용할 수 있어요.</Description>
          <ActionRow>
            <PrimaryLink to="/login">로그인하기</PrimaryLink>
            <SecondaryLink to="/">홈으로 이동</SecondaryLink>
          </ActionRow>
        </ConfirmCard>
      </Shell>
    </Layout>
  );
}
