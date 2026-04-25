import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { listUserStandardStats } from '../lib/attempts';
import { useAuth } from '../lib/auth';
import { getOrderedStudyParts, getStudyPartTitle } from '../lib/partMeta';
import { fetchActiveStandards } from '../lib/standards';
import { styled } from '../styles/stitches.config';
import type { ResultStatus, Standard, UserStandardStats } from '../types';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const HeroCard = styled(Card, {
  display: 'grid',
  gap: '$2',
  backgroundColor: '$panel',
});

const HeroTitle = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$6',
  lineHeight: 1.04,
  color: '$primary',
});

const Notice = styled('div', {
  fontSize: '$2',
  color: '$warning',
  lineHeight: 1.7,
});

const ProgressCard = styled(Card, {
  display: 'grid',
  gap: '$5',
  '&::before': {
    display: 'none',
  },
});

const ProgressList = styled('div', {
  display: 'grid',
  gap: '$4',
});

const ProgressRow = styled('div', {
  display: 'grid',
  gap: '$2',
});

const ProgressTop = styled('div', {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '$3',
});

const ProgressName = styled('div', {
  display: 'grid',
  gap: '$1',
});

const ProgressLabel = styled('strong', {
  fontSize: '$3',
  color: '$primary',
  fontWeight: 700,
  lineHeight: 1.45,
});

const ProgressMeta = styled('span', {
  fontSize: '$2',
  color: '$mutedText',
});

const ProgressValue = styled('span', {
  fontSize: '$2',
  color: '$subtleText',
  fontWeight: 700,
});

const Track = styled('div', {
  display: 'flex',
  width: '100%',
  height: '8px',
  borderRadius: '$pill',
  overflow: 'hidden',
  backgroundColor: '$surfaceStrong',
});

const Segment = styled('div', {
  height: '100%',
});

type ProgressItem = {
  key: string;
  label: string;
  title?: string;
  correctRate: number;
  wrongRate: number;
  totalRate: number;
};

function isSuccess(status: ResultStatus | null) {
  return status === 'EXCELLENT' || status === 'CORRECT';
}

function percent(part: number, whole: number) {
  if (!whole) {
    return 0;
  }
  return Number(((part / whole) * 100).toFixed(1));
}

function buildProgressItems(standards: Standard[], userStats: UserStandardStats[]) {
  const activeStandards = standards.filter((item) => item.is_active);
  const statsMap = new Map(userStats.filter((item) => item.attempt_count > 0).map((item) => [item.standard_id, item]));

  return getOrderedStudyParts().map((partNo) => {
    const partStandards = activeStandards.filter((item) => item.part_no === partNo);
    const total = partStandards.length;
    let correctCount = 0;
    let wrongCount = 0;

    for (const standard of partStandards) {
      const stat = statsMap.get(standard.id);
      if (!stat) {
        continue;
      }

      if (isSuccess(stat.last_result_status)) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    return {
      key: `part-${partNo}`,
      label: `${partNo}편`,
      title: getStudyPartTitle(partNo),
      correctRate: percent(correctCount, total),
      wrongRate: percent(wrongCount, total),
      totalRate: percent(correctCount + wrongCount, total),
    } satisfies ProgressItem;
  });
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notice, setNotice] = useState<string | undefined>();
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUserId = user.id;
    let active = true;

    async function loadHome() {
      setLoading(true);
      try {
        const [standardsPayload, userStats] = await Promise.all([
          fetchActiveStandards(),
          listUserStandardStats(currentUserId),
        ]);

        if (!active) {
          return;
        }

        setNotice(standardsPayload.notice);
        setProgressItems(buildProgressItems(standardsPayload.standards, userStats));
      } catch {
        if (!active) {
          return;
        }
        setNotice('학습노트를 불러오는 중 오류가 발생했습니다.');
        setProgressItems(buildProgressItems([], []));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHome();

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <Layout title="학습노트">
      <Stack>
        <HeroCard>
          <HeroTitle>{loading ? '...' : user?.nickname ?? '사용자'}</HeroTitle>
          {notice ? <Notice>{notice}</Notice> : null}
        </HeroCard>

        <ProgressCard>
          <ProgressList>
            {progressItems.map((item) => (
              <ProgressRow key={item.key}>
                <ProgressTop>
                  <ProgressName>
                    <ProgressLabel>{item.title ? `${item.label}: ${item.title}` : item.label}</ProgressLabel>
                    <ProgressMeta>{loading ? '' : `${item.correctRate.toFixed(1)}% / ${item.wrongRate.toFixed(1)}%`}</ProgressMeta>
                  </ProgressName>
                  <ProgressValue>{loading ? '-' : `${item.totalRate.toFixed(1)}%`}</ProgressValue>
                </ProgressTop>
                <Track>
                  <Segment css={{ width: `${item.correctRate}%`, backgroundColor: '$success' }} />
                  <Segment css={{ width: `${item.wrongRate}%`, backgroundColor: '$danger' }} />
                </Track>
              </ProgressRow>
            ))}
          </ProgressList>

          <Button onClick={() => navigate('/study/setup')}>학습 시작</Button>
        </ProgressCard>
      </Stack>
    </Layout>
  );
}
