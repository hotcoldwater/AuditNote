import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { fetchActiveStandards, getAvailableParts } from '../lib/standards';
import { styled } from '../styles/stitches.config';

const Grid = styled('div', {
  display: 'grid',
  gap: '$4',
});

const PartGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '$3',
  '@sm': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
});

export function StudySetupPage() {
  const navigate = useNavigate();
  const [parts, setParts] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [notice, setNotice] = useState<string | undefined>();

  useEffect(() => {
    fetchActiveStandards().then((payload) => {
      setParts(getAvailableParts(payload.standards).length > 0 ? getAvailableParts(payload.standards) : [1, 2, 3, 4, 5, 6]);
      setNotice(payload.notice);
    });
  }, []);

  return (
    <Layout title="학습 설정" description="문제 수를 정하지 않고 한 문제씩 계속 이어서 풉니다.">
      {notice ? <Card css={{ color: '$warning' }}>{notice}</Card> : null}

      <Grid>
        <Card css={{ display: 'grid', gap: '$4' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0' }}>전체 랜덤</h2>
            <p style={{ margin: 0, color: '#777777', lineHeight: 1.7 }}>
              전체 기준서에서 가중치 기반으로 한 문제씩 출제합니다.
            </p>
          </div>
          <Button onClick={() => navigate('/study/play?mode=random')}>전체 랜덤 시작</Button>
        </Card>

        <Card css={{ display: 'grid', gap: '$4' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0' }}>주제별</h2>
            <p style={{ margin: 0, color: '#777777', lineHeight: 1.7 }}>
              편 단위까지만 선택해서 집중 학습합니다.
            </p>
          </div>
          <PartGrid>
            {parts.map((partNo) => (
              <Button
                key={partNo}
                tone="secondary"
                onClick={() => navigate(`/study/play?mode=part&partNo=${partNo}`)}
              >
                {partNo}편
              </Button>
            ))}
          </PartGrid>
        </Card>
      </Grid>
    </Layout>
  );
}
