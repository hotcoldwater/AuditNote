import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { styled } from '../styles/stitches.config';

const Hero = styled('section', {
  display: 'grid',
  gap: '$5',
});

const Quote = styled('p', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$4',
  color: '$accent',
  fontStyle: 'italic',
  lineHeight: 1.6,
});

const Grid = styled('div', {
  display: 'grid',
  gap: '$4',
  '@sm': {
    gridTemplateColumns: '1.25fr 1fr 1fr',
  },
});

const MenuCardShell = styled(Card, {
  display: 'grid',
  gap: '$4',
  alignContent: 'space-between',
  minHeight: '220px',
});

const CardKicker = styled('div', {
  fontSize: '$2',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 700,
});

const CardTitle = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  lineHeight: 1.2,
  color: '$primary',
});

const CardText = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.8,
});

const ProgressCard = styled(Card, {
  display: 'grid',
  gap: '$4',
});

function MenuCard({
  title,
  description,
  label,
  onClick,
}: {
  title: string;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <MenuCardShell>
      <div style={{ display: 'grid', gap: 10 }}>
        <CardKicker>{label}</CardKicker>
        <CardTitle>{title}</CardTitle>
        <CardText>{description}</CardText>
      </div>
      <Button onClick={onClick}>{title}</Button>
    </MenuCardShell>
  );
}

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Layout
      title="GamsaNote"
      description="기준서 제목을 보고 직접 문구를 떠올리고, 틀린 문제만 다시 반복하는 1문제 연속 학습 앱"
    >
      <Hero>
        <Quote>“The beautiful thing about learning is nobody can take it away from you.”</Quote>
      </Hero>

      <Grid>
        <MenuCard
          label="Main Session"
          title="학습 시작"
          description="전체 랜덤 또는 편별 학습을 시작합니다."
          onClick={() => navigate('/study/setup')}
        />
        <MenuCard
          label="Practice"
          title="오답 시작"
          description="틀린 문제만 다시 풀어보고 오답노트를 직접 정리합니다."
          onClick={() => navigate('/wrong/play')}
        />
        <MenuCard
          label="Archive"
          title="학습기록"
          description="진행률, 오답률, 평균 점수 등 학습 흐름을 한눈에 확인합니다."
          onClick={() => navigate('/records')}
        />
      </Grid>

      <ProgressCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end' }}>
          <div>
            <CardTitle css={{ fontSize: '$4' }}>오늘의 흐름</CardTitle>
            <CardText>회독 리듬을 유지하면서 오답을 줄여 나가는 학습 허브</CardText>
          </div>
          <CardKicker>Quick Access</CardKicker>
        </div>
        <div style={{ width: '100%', height: 6, background: '#e8e8e6', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', borderRadius: 9999, background: '#3a675a' }} />
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Button tone="secondary" onClick={() => navigate('/wrong-notes')}>
            오답노트 보기
          </Button>
          <Button tone="secondary" onClick={() => navigate('/settings')}>
            설정
          </Button>
        </div>
      </ProgressCard>
    </Layout>
  );
}
