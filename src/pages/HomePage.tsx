import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { styled } from '../styles/stitches.config';

const Grid = styled('div', {
  display: 'grid',
  gap: '$4',
  '@sm': {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
});

function MenuCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Card css={{ display: 'grid', gap: '$4', minHeight: '220px', alignContent: 'space-between' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p style={{ margin: 0, color: '#777777', lineHeight: 1.7 }}>{description}</p>
      </div>
      <Button onClick={onClick}>{title}</Button>
    </Card>
  );
}

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Layout
      title="GamsaNote"
      description="기준서 제목을 보고 직접 문구를 떠올리고, 틀린 문제만 다시 반복하는 1문제 연속 학습 앱"
    >
      <Grid>
        <MenuCard
          title="학습 시작"
          description="전체 랜덤 또는 편별 학습을 시작합니다."
          onClick={() => navigate('/study/setup')}
        />
        <MenuCard
          title="오답 시작"
          description="틀린 문제만 다시 풀어보고 오답노트를 직접 정리합니다."
          onClick={() => navigate('/wrong/play')}
        />
        <MenuCard
          title="학습기록"
          description="진행률, 오답률, 평균 점수 등 학습 흐름을 한눈에 확인합니다."
          onClick={() => navigate('/records')}
        />
      </Grid>

      <Card css={{ display: 'grid', gap: '$3' }}>
        <strong>바로가기</strong>
        <div style={{ display: 'grid', gap: 12 }}>
          <Button tone="secondary" onClick={() => navigate('/wrong-notes')}>
            오답노트 보기
          </Button>
          <Button tone="secondary" onClick={() => navigate('/settings')}>
            설정
          </Button>
        </div>
      </Card>
    </Layout>
  );
}
