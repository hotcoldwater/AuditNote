import { useEffect, useState } from 'react';
import { BarChart } from '../components/BarChart';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { LineChart } from '../components/LineChart';
import { ProgressBar } from '../components/ProgressBar';
import { StatCard } from '../components/StatCard';
import { clearStudyHistory, deleteStudyAttempt, listStudyAttempts, listUserStandardStats } from '../lib/attempts';
import { useAuth } from '../lib/auth';
import { buildDashboardStats } from '../lib/stats';
import { fetchActiveStandards } from '../lib/standards';
import { listWrongNotes } from '../lib/wrongNotes';
import type { DashboardStats } from '../types';
import { styled } from '../styles/stitches.config';

const StatsGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  '@sm': {
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  },
});

const Hero = styled(Card, {
  display: 'grid',
  gap: '$6',
  background:
    'radial-gradient(circle at top right, rgba(200, 220, 255, 0.72), rgba(200, 220, 255, 0) 28%), $panel',
});

const HeroTop = styled('div', {
  display: 'grid',
  gap: '$3',
  '@sm': {
    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.9fr)',
    alignItems: 'start',
  },
});

const HeroCopy = styled('div', {
  display: 'grid',
  gap: '$3',
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
  lineHeight: 1.08,
  color: '$primary',
});

const HeroDescription = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.8,
  maxWidth: '46rem',
});

const HeroAside = styled('div', {
  display: 'grid',
  gap: '$3',
  padding: '$5',
  borderRadius: '$lg',
  border: '1px solid $borderSoft',
  backgroundColor: 'rgba(255,255,255,0.72)',
});

const AsideValue = styled('div', {
  fontFamily: '$heading',
  fontSize: '$5',
  lineHeight: 1,
  color: '$primaryPanel',
});

const SplitGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  '@sm': {
    gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.9fr)',
  },
});

const SectionCard = styled(Card, {
  display: 'grid',
  gap: '$5',
});

const SectionHeader = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '$3',
  flexWrap: 'wrap',
});

const SectionTitle = styled('h3', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  color: '$primary',
  lineHeight: 1.15,
});

const SectionDescription = styled('p', {
  margin: 0,
  color: '$mutedText',
  lineHeight: 1.7,
});

const MetricStrip = styled('div', {
  display: 'grid',
  gap: '$3',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
});

const MetricTile = styled('div', {
  display: 'grid',
  gap: '$2',
  padding: '$4',
  borderRadius: '$lg',
  backgroundColor: '$surface',
  border: '1px solid $borderSoft',
});

const MetricLabel = styled('div', {
  fontSize: '$2',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 700,
});

const MetricValue = styled('div', {
  fontSize: '$5',
  lineHeight: 1.1,
  fontFamily: '$heading',
  color: '$primary',
});

const AnalyticsGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  '@sm': {
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.9fr)',
  },
});

const CompactGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  '@sm': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
});

const Panel = styled('div', {
  display: 'grid',
  gap: '$4',
  padding: '$5',
  borderRadius: '$lg',
  backgroundColor: '$surface',
  border: '1px solid $borderSoft',
});

const StatusRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
});

const AttemptList = styled('div', {
  display: 'grid',
  gap: '$3',
});

const AttemptRow = styled('div', {
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

const AttemptMeta = styled('div', {
  display: 'grid',
  gap: '$2',
});

const AttemptTitle = styled('strong', {
  color: '$primary',
  fontSize: '$3',
});

const AttemptSub = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
  alignItems: 'center',
  color: '$mutedText',
  fontSize: '$2',
});

const Actions = styled('div', {
  display: 'flex',
  gap: '$2',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
});

const EmptyState = styled('div', {
  color: '$mutedText',
  lineHeight: 1.8,
});

function toneForStatus(status: string) {
  if (status === 'EXCELLENT' || status === 'CORRECT') {
    return 'success';
  }
  if (status === 'REVIEW') {
    return 'warning';
  }
  return 'danger';
}

function modeLabel(mode: string) {
  if (mode === 'WRONG_NOTE') {
    return '오답';
  }
  if (mode === 'PART') {
    return '편별';
  }
  return '랜덤';
}

function formatStamp(value: string) {
  return value.slice(0, 16).replace('T', ' ');
}

export function RecordsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [busyAttemptId, setBusyAttemptId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  async function loadDashboard() {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const [standardsPayload, attempts, userStats, wrongNotes] = await Promise.all([
        fetchActiveStandards(),
        listStudyAttempts(user.id),
        listUserStandardStats(user.id),
        listWrongNotes(user.id, true),
      ]);
      setNotice(standardsPayload.notice);
      setStats(buildDashboardStats(standardsPayload.standards, attempts, userStats, wrongNotes));
    } catch {
      setNotice('학습기록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [user?.id]);

  async function handleDeleteAttempt(attemptId: string) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm('이 학습기록 1건을 삭제할까요? 점수 통계와 오답 횟수도 함께 다시 계산됩니다.');
    if (!confirmed) {
      return;
    }

    setBusyAttemptId(attemptId);
    const result = await deleteStudyAttempt(user.id, attemptId);
    setNotice(result.notice);
    await loadDashboard();
    setBusyAttemptId(null);
  }

  async function handleClearHistory() {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      '전체 학습기록을 초기화할까요? 최근 풀이, 평균 점수, 진도 통계가 모두 다시 계산됩니다.',
    );
    if (!confirmed) {
      return;
    }

    setClearing(true);
    const result = await clearStudyHistory(user.id);
    setNotice(result.notice);
    await loadDashboard();
    setClearing(false);
  }

  if (loading || !stats) {
    return <Layout title="기록노트">불러오는 중...</Layout>;
  }

  return (
    <Layout title="기록노트" description="학습 흐름과 약점 분포를 한 화면에서 확인할 수 있도록 정리했습니다.">
      <Hero>
        <HeroTop>
          <HeroCopy>
            <Eyebrow>Study Ledger</Eyebrow>
            <HeroTitle>풀이 기록을 지표와 흐름으로 다시 읽습니다.</HeroTitle>
            <HeroDescription>
              최근 학습량, 점수 분포, 자주 틀리는 기준서, 편별 진도를 한 번에 보면서 다음 학습 우선순위를 정리할 수 있습니다.
            </HeroDescription>
          </HeroCopy>
          <HeroAside>
            <MetricLabel>이번 흐름</MetricLabel>
            <AsideValue>{stats.todayAttemptCount}문제</AsideValue>
            <SectionDescription>
              오늘 누적 평균은 {stats.averageScore}점이고, 전체 오답률은 {stats.overallWrongRate}%입니다.
            </SectionDescription>
            <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => void loadDashboard()}>
              새로고침
            </Button>
          </HeroAside>
        </HeroTop>

        <MetricStrip>
          <MetricTile>
            <MetricLabel>누적 풀이</MetricLabel>
            <MetricValue>{stats.totalAttempts}회</MetricValue>
          </MetricTile>
          <MetricTile>
            <MetricLabel>전체 진도</MetricLabel>
            <MetricValue>{stats.overallProgress}%</MetricValue>
          </MetricTile>
          <MetricTile>
            <MetricLabel>평균 점수</MetricLabel>
            <MetricValue>{stats.averageScore}점</MetricValue>
          </MetricTile>
          <MetricTile>
            <MetricLabel>오답률</MetricLabel>
            <MetricValue>{stats.overallWrongRate}%</MetricValue>
          </MetricTile>
        </MetricStrip>
      </Hero>

      {notice ? (
        <Card css={{ color: '$warning', backgroundColor: '$warningSoft', borderColor: 'rgba(123, 90, 25, 0.18)' }}>
          {notice}
        </Card>
      ) : null}

      <StatsGrid>
        <StatCard title="오늘 푼 문제 수" value={`${stats.todayAttemptCount}개`} description="오늘 학습량 기준" />
        <StatCard title="누적 풀이 수" value={`${stats.totalAttempts}회`} description="삭제 전까지의 총 기록" />
        <StatCard title="평균 점수" value={`${stats.averageScore}점`} description="전체 풀이 평균" />
        <StatCard title="전체 진행률" value={`${stats.overallProgress}%`} description="활성 기준서 대비" />
      </StatsGrid>

      <AnalyticsGrid>
        <SectionCard>
          <SectionHeader>
            <div style={{ display: 'grid', gap: 6 }}>
              <SectionTitle>최근 7일 학습 흐름</SectionTitle>
              <SectionDescription>날짜별 풀이 수와 평균 점수를 함께 봅니다.</SectionDescription>
            </div>
            <Badge tone="primary">{stats.totalAttempts}회 누적</Badge>
          </SectionHeader>
          <LineChart
            data={stats.recent7Days.map((item) => ({
              label: item.date.slice(5).replace('-', '.'),
              value: item.count,
              caption: `${item.count}회`,
            }))}
          />
          <StatusRow>
            {stats.statusBreakdown.map((item) => (
              <Badge key={item.label} tone={item.tone}>
                {item.label} {item.count}
              </Badge>
            ))}
          </StatusRow>
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <div style={{ display: 'grid', gap: 6 }}>
              <SectionTitle>점수 분포</SectionTitle>
              <SectionDescription>현재 기록이 어느 점수대에 몰려 있는지 빠르게 확인합니다.</SectionDescription>
            </div>
          </SectionHeader>
          <BarChart
            data={stats.scoreDistribution.map((item) => ({
              label: item.label,
              value: item.count,
              displayValue: `${item.count}회`,
            }))}
          />
          <Panel>
            <MetricLabel>최근 7일 평균</MetricLabel>
            <MetricValue>
              {stats.recent7Days.reduce((sum, item) => sum + item.averageScore, 0) / Math.max(stats.recent7Days.length, 1) || 0}
              점
            </MetricValue>
          </Panel>
        </SectionCard>
      </AnalyticsGrid>

      <SplitGrid>
        <SectionCard>
          <SectionHeader>
            <div style={{ display: 'grid', gap: 6 }}>
              <SectionTitle>편별 진행률 / 오답률</SectionTitle>
              <SectionDescription>어느 편에서 막히는지 비율로 확인합니다.</SectionDescription>
            </div>
          </SectionHeader>
          <div style={{ display: 'grid', gap: 16 }}>
            {stats.partProgress.map((item) => (
              <Panel key={item.partNo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <strong
                    style={{
                      color: '#173d7a',
                      fontFamily: '"SUIT Variable", "SUIT", "Pretendard Variable", sans-serif',
                      fontSize: 20,
                    }}
                  >
                    {item.partNo}편
                  </strong>
                  <Badge tone={item.wrongRate >= 50 ? 'danger' : item.wrongRate >= 25 ? 'warning' : 'success'}>
                    오답률 {item.wrongRate}%
                  </Badge>
                </div>
                <ProgressBar label={`${item.solvedCount}/${item.totalCount}개 풀이`} value={item.progressRate} />
              </Panel>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <div style={{ display: 'grid', gap: 6 }}>
              <SectionTitle>LV별 정답률</SectionTitle>
              <SectionDescription>난이도 그룹별 정답률 흐름입니다.</SectionDescription>
            </div>
          </SectionHeader>
          <BarChart
            data={stats.levelAccuracy.map((item) => ({
              label: item.label,
              value: item.accuracyRate,
              displayValue: `${item.accuracyRate}%`,
            }))}
          />
        </SectionCard>
      </SplitGrid>

      <CompactGrid>
        <SectionCard>
          <SectionHeader>
            <div style={{ display: 'grid', gap: 6 }}>
              <SectionTitle>자주 틀린 기준서</SectionTitle>
              <SectionDescription>오답노트 unresolved 기준 상위 항목입니다.</SectionDescription>
            </div>
          </SectionHeader>
          <AttemptList>
            {stats.frequentWrongStandards.length === 0 ? (
              <EmptyState>아직 오답노트가 없습니다.</EmptyState>
            ) : (
              stats.frequentWrongStandards.map((item) => (
                <AttemptRow key={item.standardId}>
                  <AttemptMeta>
                    <AttemptTitle>{item.standardTitle}</AttemptTitle>
                    <AttemptSub>
                      <span>{item.lastAttemptedAt ? formatStamp(item.lastAttemptedAt) : '기록 없음'}</span>
                    </AttemptSub>
                  </AttemptMeta>
                  <Actions>
                    <Badge tone="danger">{item.wrongCount}회</Badge>
                  </Actions>
                </AttemptRow>
              ))
            )}
          </AttemptList>
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <div style={{ display: 'grid', gap: 6 }}>
              <SectionTitle>기록 관리</SectionTitle>
              <SectionDescription>최근 기록을 개별 삭제하거나 전체 학습기록을 초기화할 수 있습니다.</SectionDescription>
            </div>
            <Button
              tone="danger"
              css={{ width: 'auto', minHeight: '44px', padding: '$2 $4' }}
              onClick={() => void handleClearHistory()}
              disabled={clearing || stats.totalAttempts === 0}
            >
              {clearing ? '초기화 중...' : '전체 기록 초기화'}
            </Button>
          </SectionHeader>
          <AttemptList>
            {stats.recentAttempts.length === 0 ? (
              <EmptyState>아직 풀이 기록이 없습니다.</EmptyState>
            ) : (
              stats.recentAttempts.map((item) => (
                <AttemptRow key={item.id}>
                  <AttemptMeta>
                    <AttemptTitle>{item.standardTitle}</AttemptTitle>
                    <AttemptSub>
                      <Badge tone="neutral">{modeLabel(item.mode)}</Badge>
                      <span>{formatStamp(item.createdAt)}</span>
                    </AttemptSub>
                  </AttemptMeta>
                  <Actions>
                    <Badge tone={toneForStatus(item.resultStatus)}>{item.score}점</Badge>
                    <Button
                      tone="secondary"
                      css={{ width: 'auto', minHeight: '40px', padding: '$2 $3', fontSize: '$1' }}
                      onClick={() => void handleDeleteAttempt(item.id)}
                      disabled={busyAttemptId === item.id}
                    >
                      {busyAttemptId === item.id ? '삭제 중...' : '기록 삭제'}
                    </Button>
                  </Actions>
                </AttemptRow>
              ))
            )}
          </AttemptList>
        </SectionCard>
      </CompactGrid>
    </Layout>
  );
}
