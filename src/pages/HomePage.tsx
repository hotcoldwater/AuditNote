import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { ProgressBar } from '../components/ProgressBar';
import { StatCard } from '../components/StatCard';
import { listStudyAttempts, listUserStandardStats } from '../lib/attempts';
import { useAuth } from '../lib/auth';
import { fetchActiveStandards } from '../lib/standards';
import { buildDashboardStats } from '../lib/stats';
import { listWrongNotes } from '../lib/wrongNotes';
import { styled } from '../styles/stitches.config';
import type { DashboardStats, ResultStatus } from '../types';

const HeroCard = styled(Card, {
  display: 'grid',
  gap: '$6',
  background:
    'radial-gradient(circle at top right, rgba(188, 237, 221, 0.92), rgba(188, 237, 221, 0) 36%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(244,244,242,0.94) 100%)',
});

const HeroTop = styled('div', {
  display: 'grid',
  gap: '$5',
  '@sm': {
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.85fr)',
    alignItems: 'stretch',
  },
});

const HeroCopy = styled('div', {
  display: 'grid',
  gap: '$4',
});

const Eyebrow = styled('div', {
  fontSize: '$2',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 700,
  color: '$subtleText',
});

const HeroTitle = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$6',
  lineHeight: 1.04,
  color: '$primary',
  maxWidth: '14ch',
});

const HeroText = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.85,
  maxWidth: '46rem',
});

const BadgeRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
});

const ActionGrid = styled('div', {
  display: 'grid',
  gap: '$3',
  '@sm': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
});

const PulseCard = styled('div', {
  display: 'grid',
  gap: '$4',
  padding: '$5',
  borderRadius: '$xl',
  border: '1px solid rgba(1, 38, 31, 0.08)',
  backgroundColor: 'rgba(255,255,255,0.86)',
  boxShadow: '$soft',
});

const PulseKicker = styled('div', {
  fontSize: '$2',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: 700,
});

const PulseValue = styled('div', {
  fontFamily: '$heading',
  fontSize: '$6',
  lineHeight: 1,
  color: '$primaryPanel',
});

const PulseText = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.75,
});

const StatsGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  '@sm': {
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  },
});

const ContentGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  '@sm': {
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
  },
});

const SectionCard = styled(Card, {
  display: 'grid',
  gap: '$5',
});

const SectionHeader = styled('div', {
  display: 'grid',
  gap: '$2',
});

const SectionTitle = styled('h3', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  color: '$primary',
  lineHeight: 1.12,
});

const SectionText = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.75,
});

const ProgressStack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const PartList = styled('div', {
  display: 'grid',
  gap: '$3',
});

const PartRow = styled('div', {
  display: 'grid',
  gap: '$2',
  padding: '$4',
  borderRadius: '$lg',
  backgroundColor: '$surface',
  border: '1px solid $borderSoft',
});

const PartRowTop = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
});

const PartTitle = styled('strong', {
  color: '$primary',
  fontSize: '$3',
});

const PartMeta = styled('span', {
  color: '$mutedText',
  fontSize: '$2',
});

const FocusList = styled('div', {
  display: 'grid',
  gap: '$3',
});

const FocusRow = styled('div', {
  display: 'grid',
  gap: '$2',
  padding: '$4',
  borderRadius: '$lg',
  backgroundColor: '$surface',
  border: '1px solid $borderSoft',
});

const FocusTitle = styled('strong', {
  color: '$primary',
  fontSize: '$3',
  lineHeight: 1.45,
});

const FocusMeta = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
  alignItems: 'center',
  color: '$mutedText',
  fontSize: '$2',
});

const RecentList = styled('div', {
  display: 'grid',
  gap: '$3',
});

const RecentRow = styled('div', {
  display: 'grid',
  gap: '$3',
  padding: '$4',
  borderRadius: '$lg',
  backgroundColor: '$surface',
  border: '1px solid $borderSoft',
  '@sm': {
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
  },
});

const RecentCopy = styled('div', {
  display: 'grid',
  gap: '$2',
});

const RecentTitle = styled('strong', {
  color: '$primary',
  fontSize: '$3',
  lineHeight: 1.45,
});

const RecentMeta = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
  alignItems: 'center',
  color: '$mutedText',
  fontSize: '$2',
});

const EmptyState = styled('div', {
  padding: '$4',
  borderRadius: '$lg',
  backgroundColor: '$surface',
  border: '1px dashed $border',
  color: '$mutedText',
  lineHeight: 1.8,
});

function statusTone(status: ResultStatus) {
  if (status === 'EXCELLENT' || status === 'CORRECT') {
    return 'success';
  }
  if (status === 'REVIEW') {
    return 'warning';
  }
  return 'danger';
}

function statusLabel(status: ResultStatus) {
  if (status === 'EXCELLENT') {
    return '매우 좋음';
  }
  if (status === 'CORRECT') {
    return '정답';
  }
  if (status === 'REVIEW') {
    return '복습';
  }
  if (status === 'SKIPPED') {
    return '건너뜀';
  }
  return '오답';
}

function modeLabel(mode: string) {
  if (mode === 'WRONG_NOTE') {
    return '오답 세션';
  }
  if (mode === 'PART') {
    return '편별 세션';
  }
  return '랜덤 세션';
}

function formatStamp(value: string | null) {
  if (!value) {
    return '기록 없음';
  }
  return value.slice(5, 16).replace('T', ' ');
}

function pulseCopy(stats: DashboardStats | null, pendingWrongCount: number) {
  if (!stats || stats.totalAttempts === 0) {
    return '첫 회독을 시작하면 오늘 풀이 수, 평균 점수, 오답 흐름이 이 화면에 바로 쌓입니다.';
  }
  if (pendingWrongCount > 0) {
    return `지금 해결되지 않은 오답이 ${pendingWrongCount}개 있습니다. 오답 세션으로 바로 이어가면 복습 리듬을 유지하기 좋습니다.`;
  }
  if (stats.todayAttemptCount > 0) {
    return `오늘 ${stats.todayAttemptCount}문제를 풀었습니다. 지금 흐름이면 주간 회독을 안정적으로 이어갈 수 있습니다.`;
  }
  return '오늘 기록은 아직 없습니다. 짧게 3문제만 풀어도 주간 리듬이 다시 살아납니다.';
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const [pendingWrongCount, setPendingWrongCount] = useState(0);
  const [activeStandardCount, setActiveStandardCount] = useState(0);
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
        const [standardsPayload, attempts, userStats, wrongNotes] = await Promise.all([
          fetchActiveStandards(),
          listStudyAttempts(currentUserId),
          listUserStandardStats(currentUserId),
          listWrongNotes(currentUserId, true),
        ]);

        if (!active) {
          return;
        }

        const activeStandards = standardsPayload.standards.filter((item) => item.is_active);
        setNotice(standardsPayload.notice);
        setActiveStandardCount(activeStandards.length);
        setPendingWrongCount(wrongNotes.filter((item) => !item.is_resolved).length);
        setStats(buildDashboardStats(standardsPayload.standards, attempts, userStats, wrongNotes));
      } catch {
        if (!active) {
          return;
        }
        setNotice('홈 대시보드를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        setStats(null);
        setPendingWrongCount(0);
        setActiveStandardCount(0);
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

  const topParts = stats?.partProgress
    .filter((item) => item.totalCount > 0)
    .sort((a, b) => b.progressRate - a.progressRate)
    .slice(0, 3);
  const recentAttempts = stats?.recentAttempts.slice(0, 4) ?? [];
  const focusStandards = stats?.frequentWrongStandards.slice(0, 4) ?? [];
  const progressValue = stats?.overallProgress ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const wrongRate = stats?.overallWrongRate ?? 0;
  const successRate = stats ? Math.max(0, 100 - stats.overallWrongRate) : 0;
  const pulseNumber = loading ? '...' : `${stats?.todayAttemptCount ?? 0}`;

  return (
    <Layout
      title="GamsaNote"
      description="기준서 제목을 보고 직접 써보고, 오답만 다시 묶어 회독하는 학습 대시보드"
    >
      <HeroCard>
        <HeroTop>
          <HeroCopy>
            <Eyebrow>Study Hub</Eyebrow>
            <HeroTitle>
              {loading ? '학습 흐름을 정리하는 중입니다.' : `${user?.nickname ?? '학습자'}님의 오늘 회독 흐름`}
            </HeroTitle>
            <HeroText>{pulseCopy(stats, pendingWrongCount)}</HeroText>
            <BadgeRow>
              <Badge tone="primary">{loading ? '데이터 확인 중' : `활성 기준서 ${activeStandardCount}개`}</Badge>
              <Badge tone={pendingWrongCount > 0 ? 'warning' : 'success'}>
                {loading ? '오답 상태 확인 중' : `미해결 오답 ${pendingWrongCount}개`}
              </Badge>
              {notice ? <Badge tone="warning">{notice}</Badge> : null}
            </BadgeRow>
          </HeroCopy>

          <PulseCard>
            <div style={{ display: 'grid', gap: 8 }}>
              <PulseKicker>Today Pulse</PulseKicker>
              <PulseValue>{pulseNumber}</PulseValue>
            </div>
            <PulseText>
              {loading
                ? '학습 요약을 불러오는 중입니다.'
                : stats?.todayAttemptCount
                  ? `오늘 푼 ${stats.todayAttemptCount}문제가 누적 기록과 함께 반영됐습니다.`
                  : '아직 오늘 시작한 학습이 없습니다. 짧은 세션으로 바로 흐름을 다시 만들 수 있습니다.'}
            </PulseText>
            <ProgressBar label="전체 기준서 진도" value={progressValue} />
          </PulseCard>
        </HeroTop>

        <ActionGrid>
          <Button onClick={() => navigate('/study/setup')}>학습 시작</Button>
          <Button tone="secondary" onClick={() => navigate('/wrong/play')}>
            오답 시작
          </Button>
          <Button tone="secondary" onClick={() => navigate('/records')}>
            학습기록 보기
          </Button>
        </ActionGrid>
      </HeroCard>

      <StatsGrid>
        <StatCard
          title="오늘 푼 문제"
          value={loading ? '-' : `${stats?.todayAttemptCount ?? 0}개`}
          description="당일 기준 누적 풀이 수"
        />
        <StatCard
          title="전체 진도"
          value={loading ? '-' : `${progressValue.toFixed(1)}%`}
          description="한 번 이상 건드린 기준서 비율"
        />
        <StatCard
          title="평균 점수"
          value={loading ? '-' : `${averageScore.toFixed(1)}점`}
          description="누적 학습 세션 평균"
        />
        <StatCard
          title="정답 흐름"
          value={loading ? '-' : `${successRate.toFixed(1)}%`}
          description={loading ? '기록을 불러오는 중' : `오답률 ${wrongRate.toFixed(1)}% 반영`}
        />
      </StatsGrid>

      <ContentGrid>
        <SectionCard>
          <SectionHeader>
            <SectionTitle>이번 주에 밀어야 할 구간</SectionTitle>
            <SectionText>편별 진도와 최근 평균 점수를 함께 보고 다음 회독 순서를 바로 정할 수 있게 구성했습니다.</SectionText>
          </SectionHeader>

          {loading ? (
            <EmptyState>학습 데이터를 읽는 중입니다.</EmptyState>
          ) : (
            <ProgressStack>
              <ProgressBar label="전체 기준서 진도" value={progressValue} />
              <ProgressBar label="평균 점수" value={averageScore} />
              <ProgressBar label="누적 정답 흐름" value={successRate} />
            </ProgressStack>
          )}

          {!loading && topParts && topParts.length > 0 ? (
            <PartList>
              {topParts.map((item) => (
                <PartRow key={item.partNo}>
                  <PartRowTop>
                    <PartTitle>{item.partNo}편</PartTitle>
                    <PartMeta>
                      {item.solvedCount}/{item.totalCount} 문제
                    </PartMeta>
                  </PartRowTop>
                  <ProgressBar label="편별 진도" value={item.progressRate} />
                </PartRow>
              ))}
            </PartList>
          ) : null}

          {!loading && stats && stats.totalAttempts === 0 ? (
            <EmptyState>아직 누적 풀이가 없습니다. 첫 세션을 시작하면 편별 진도와 오답 흐름이 여기서 바로 보입니다.</EmptyState>
          ) : null}
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>복습 포커스</SectionTitle>
            <SectionText>오답노트와 최근 틀린 흐름을 홈에서 바로 확인하고 바로 다시 풀 수 있게 묶었습니다.</SectionText>
          </SectionHeader>

          {loading ? (
            <EmptyState>복습 포인트를 정리하는 중입니다.</EmptyState>
          ) : focusStandards.length > 0 ? (
            <FocusList>
              {focusStandards.map((item) => (
                <FocusRow key={item.standardId}>
                  <FocusTitle>{item.standardTitle}</FocusTitle>
                  <FocusMeta>
                    <Badge tone="warning">오답 {item.wrongCount}회</Badge>
                    <span>최근 시도 {formatStamp(item.lastAttemptedAt)}</span>
                  </FocusMeta>
                </FocusRow>
              ))}
            </FocusList>
          ) : (
            <EmptyState>지금 열린 오답노트가 없습니다. 오답 세션을 돌리거나 수동으로 오답노트를 추가하면 여기에 모입니다.</EmptyState>
          )}

          <Button tone="secondary" onClick={() => navigate('/wrong-notes')}>
            오답노트 보기
          </Button>
        </SectionCard>
      </ContentGrid>

      <SectionCard>
        <SectionHeader>
          <SectionTitle>최근 학습 흐름</SectionTitle>
          <SectionText>가장 최근 풀이 결과를 홈에서 바로 확인하고, 기록 화면으로 넘어가기 전에 흐름을 빠르게 점검할 수 있습니다.</SectionText>
        </SectionHeader>

        {loading ? (
          <EmptyState>최근 세션을 불러오는 중입니다.</EmptyState>
        ) : recentAttempts.length > 0 ? (
          <RecentList>
            {recentAttempts.map((item) => (
              <RecentRow key={item.id}>
                <RecentCopy>
                  <RecentTitle>{item.standardTitle}</RecentTitle>
                  <RecentMeta>
                    <Badge tone={statusTone(item.resultStatus)}>{statusLabel(item.resultStatus)}</Badge>
                    <span>{modeLabel(item.mode)}</span>
                    <span>{formatStamp(item.createdAt)}</span>
                  </RecentMeta>
                </RecentCopy>
                <Badge tone={item.score >= 75 ? 'success' : item.score >= 60 ? 'warning' : 'danger'}>
                  {item.score}점
                </Badge>
              </RecentRow>
            ))}
          </RecentList>
        ) : (
          <EmptyState>최근 학습 기록이 없습니다. 첫 문제를 풀면 결과가 바로 이곳에 반영됩니다.</EmptyState>
        )}
      </SectionCard>
    </Layout>
  );
}
