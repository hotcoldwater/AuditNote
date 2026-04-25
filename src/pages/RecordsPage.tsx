import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { DashboardStats, RecentStudyItem, Standard } from '../types';
import { styled } from '../styles/stitches.config';

const ControlsCard = styled(Card, {
  display: 'grid',
  gap: '$4',
});

const SearchInput = styled('input', {
  width: '100%',
  minHeight: '52px',
  padding: '0 $5',
  border: '1px solid $border',
  backgroundColor: '$panel',
  color: '$text',
  fontSize: '$3',
  outline: 'none',
  '&:focus': {
    borderColor: '$secondary',
    boxShadow: '$focus',
  },
});

const FilterRow = styled('div', {
  display: 'flex',
  gap: '$2',
  flexWrap: 'wrap',
});

const StatsGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
  '@sm': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
});

const SectionCard = styled(Card, {
  display: 'grid',
  gap: '$4',
});

const SectionHeader = styled('div', {
  display: 'grid',
  gap: '$1',
});

const SectionTitle = styled('h3', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  color: '$primary',
  lineHeight: 1.15,
});

const SectionDescription = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.7,
});

const RecordList = styled('div', {
  display: 'grid',
  gap: '$3',
});

const RecordRow = styled('div', {
  display: 'grid',
  gap: '$3',
  padding: '$4',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  '@sm': {
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
  },
});

const RecordMeta = styled('div', {
  display: 'grid',
  gap: '$2',
});

const RecordTitle = styled('strong', {
  color: '$primary',
  fontSize: '$3',
  lineHeight: 1.5,
});

const RecordSub = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
  alignItems: 'center',
  color: '$mutedText',
  fontSize: '$2',
});

const RecordDate = styled('div', {
  color: '$subtleText',
  fontSize: '$2',
});

const Actions = styled('div', {
  display: 'flex',
  gap: '$2',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
});

const AnalysisSummary = styled('div', {
  display: 'grid',
  gap: '$1',
  padding: '$4',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
});

const AnalysisGrid = styled('div', {
  display: 'grid',
  gap: '$4',
});

const DangerCard = styled(Card, {
  display: 'grid',
  gap: '$4',
  borderColor: 'rgba(185, 58, 58, 0.18)',
  backgroundColor: 'rgba(255, 250, 250, 0.92)',
});

const EmptyState = styled('div', {
  color: '$mutedText',
  lineHeight: 1.8,
});

const FILTERS = ['ALL', 'EXCELLENT', 'CORRECT', 'REVIEW', 'WRONG'] as const;
type StatusFilter = (typeof FILTERS)[number];

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
  if (mode === 'SELECT') {
    return '선택';
  }
  return '학습';
}

function formatStamp(value: string) {
  return value.slice(0, 16).replace('T', ' ').replace(/-/g, '.');
}

export function RecordsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [standardsMap, setStandardsMap] = useState<Map<string, Standard>>(new Map());
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [busyAttemptId, setBusyAttemptId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [unresolvedWrongCount, setUnresolvedWrongCount] = useState(0);

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
      setStandardsMap(new Map(standardsPayload.standards.map((item) => [item.id, item])));
      setUnresolvedWrongCount(wrongNotes.filter((item) => !item.is_resolved).length);
    } catch {
      setNotice('학습 기록을 불러오는 중 오류가 발생했습니다.');
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

    const confirmed = window.confirm('전체 기록을 삭제할까요?\n\n삭제한 기록은 복구할 수 없습니다.');
    if (!confirmed) {
      return;
    }

    setClearing(true);
    const result = await clearStudyHistory(user.id);
    setNotice(result.notice);
    await loadDashboard();
    setClearing(false);
  }

  function goToReplay(standardId: string) {
    const standard = standardsMap.get(standardId);
    if (!standard) {
      navigate(`/wrong/play?standardId=${standardId}&scope=all`);
      return;
    }

    const partNo = standard.part_no ?? '';
    const chapterNo = standard.chapter_no ?? '';
    navigate(`/study/play?mode=select&partNo=${partNo}&chapterNo=${chapterNo}&standardId=${standardId}`);
  }

  const recent7DaysTotal = useMemo(
    () => (stats ? stats.recent7Days.reduce((sum, item) => sum + item.count, 0) : 0),
    [stats],
  );

  const filteredRecentAttempts = useMemo(() => {
    if (!stats) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    return stats.recentAttempts.filter((item) => {
      const matchesQuery = !query || item.standardTitle.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || item.resultStatus === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [searchQuery, stats, statusFilter]);

  const filteredWrongStandards = useMemo(() => {
    if (!stats) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    return stats.frequentWrongStandards.filter((item) => !query || item.standardTitle.toLowerCase().includes(query));
  }, [searchQuery, stats]);

  if (loading || !stats) {
    return <Layout title="기록 노트">불러오는 중...</Layout>;
  }

  return (
    <Layout title="기록 노트" description="학습 기록과 오답 흐름을 확인합니다.">
      <ControlsCard>
        <SearchInput
          placeholder="기준서 검색"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <FilterRow>
          {FILTERS.map((item) => (
            <Button
              key={item}
              tone={statusFilter === item ? 'primary' : 'secondary'}
              css={{ width: 'auto', minHeight: '44px', padding: '0 18px' }}
              onClick={() => setStatusFilter(item)}
            >
              {item}
            </Button>
          ))}
        </FilterRow>
      </ControlsCard>

      {notice ? (
        <Card css={{ color: '$warning', backgroundColor: '$warningSoft', borderColor: 'rgba(123, 90, 25, 0.18)' }}>
          {notice}
        </Card>
      ) : null}

      <StatsGrid>
        <StatCard title="오늘" value={`${stats.todayAttemptCount}문제`} />
        <StatCard title="최근 7일" value={`${recent7DaysTotal}문제`} />
        <StatCard title="미해결 오답" value={`${unresolvedWrongCount}개`} />
      </StatsGrid>

      <SectionCard>
        <SectionHeader>
          <SectionTitle>최근 기록</SectionTitle>
          <SectionDescription>최근 풀이 내역</SectionDescription>
        </SectionHeader>
        <RecordList>
          {filteredRecentAttempts.length === 0 ? (
            <EmptyState>조건에 맞는 최근 기록이 없습니다.</EmptyState>
          ) : (
            filteredRecentAttempts.map((item: RecentStudyItem) => (
              <RecordRow key={item.id}>
                <RecordMeta>
                  <RecordTitle>{item.standardTitle}</RecordTitle>
                  <RecordSub>
                    <Badge tone={toneForStatus(item.resultStatus)}>{item.resultStatus}</Badge>
                    <span>{`${item.score}점`}</span>
                    <span>{modeLabel(item.mode)}</span>
                  </RecordSub>
                  <RecordDate>{formatStamp(item.createdAt)}</RecordDate>
                </RecordMeta>
                <Actions>
                  <Button tone="secondary" css={{ width: 'auto', minHeight: '42px' }} onClick={() => goToReplay(item.standardId)}>
                    다시 풀기
                  </Button>
                  <Button
                    tone="ghost"
                    css={{ width: 'auto', minHeight: '42px' }}
                    disabled={busyAttemptId === item.id}
                    onClick={() => void handleDeleteAttempt(item.id)}
                  >
                    {busyAttemptId === item.id ? '삭제 중...' : '삭제'}
                  </Button>
                </Actions>
              </RecordRow>
            ))
          )}
        </RecordList>
      </SectionCard>

      <SectionCard>
        <SectionHeader>
          <SectionTitle>다시 볼 기준서</SectionTitle>
          <SectionDescription>미해결 오답 기준</SectionDescription>
        </SectionHeader>
        <RecordList>
          {filteredWrongStandards.length === 0 ? (
            <EmptyState>현재 다시 볼 기준서가 없습니다.</EmptyState>
          ) : (
            filteredWrongStandards.map((item) => (
              <RecordRow key={item.standardId}>
                <RecordMeta>
                  <RecordTitle>{item.standardTitle}</RecordTitle>
                  <RecordSub>
                    <span>{`${item.wrongCount}회 틀림`}</span>
                    <span>{`최근 ${item.lastAttemptedAt ? item.lastAttemptedAt.slice(0, 10).replace(/-/g, '.') : '-'}`}</span>
                  </RecordSub>
                </RecordMeta>
                <Actions>
                  <Button tone="ghost" css={{ width: 'auto', minHeight: '42px' }} onClick={() => navigate('/wrong-notes')}>
                    오답 보기
                  </Button>
                  <Button tone="secondary" css={{ width: 'auto', minHeight: '42px' }} onClick={() => navigate(`/wrong/play?standardId=${item.standardId}&scope=all`)}>
                    다시 풀기
                  </Button>
                </Actions>
              </RecordRow>
            ))
          )}
        </RecordList>
      </SectionCard>

      <SectionCard>
        <SectionHeader>
          <SectionTitle>학습 분석</SectionTitle>
          <SectionDescription>최근 흐름과 약점을 확인합니다.</SectionDescription>
        </SectionHeader>
        {!analysisOpen ? (
          <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => setAnalysisOpen(true)}>
            분석 보기
          </Button>
        ) : (
          <AnalysisGrid>
            <AnalysisSummary>
              <strong style={{ color: '#173d7a' }}>{`최근 7일 평균 ${Math.round(stats.recent7Days.reduce((sum, item) => sum + item.averageScore, 0) / Math.max(stats.recent7Days.length, 1))}점`}</strong>
              <span style={{ color: '#6c7280' }}>
                {stats.partProgress.some((item) => item.wrongRate >= 50)
                  ? '오답률이 높은 편을 먼저 복습하세요.'
                  : '최근 흐름은 안정적입니다.'}
              </span>
            </AnalysisSummary>

            <SectionCard css={{ backgroundColor: '$surface' }}>
              <SectionHeader>
                <SectionTitle>최근 7일</SectionTitle>
              </SectionHeader>
              <LineChart
                data={stats.recent7Days.map((item) => ({
                  label: item.date.slice(5).replace('-', '.'),
                  value: item.count,
                  caption: `${item.count}회`,
                }))}
              />
            </SectionCard>

            <SectionCard css={{ backgroundColor: '$surface' }}>
              <SectionHeader>
                <SectionTitle>점수 분포</SectionTitle>
              </SectionHeader>
              <BarChart
                data={stats.scoreDistribution.map((item) => ({
                  label: item.label,
                  value: item.count,
                  displayValue: `${item.count}회`,
                }))}
              />
            </SectionCard>

            <SectionCard css={{ backgroundColor: '$surface' }}>
              <SectionHeader>
                <SectionTitle>편별 현황</SectionTitle>
              </SectionHeader>
              <div style={{ display: 'grid', gap: 16 }}>
                {stats.partProgress.map((item) => (
                  <div key={item.partNo} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <strong style={{ color: '#173d7a', fontSize: 18 }}>{`${item.partNo}편`}</strong>
                      <Badge tone={item.wrongRate >= 50 ? 'danger' : item.wrongRate >= 25 ? 'warning' : 'success'}>
                        {`오답률 ${item.wrongRate}%`}
                      </Badge>
                    </div>
                    <ProgressBar label={`${item.solvedCount}/${item.totalCount}개 풀이`} value={item.progressRate} />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard css={{ backgroundColor: '$surface' }}>
              <SectionHeader>
                <SectionTitle>LV별 정답률</SectionTitle>
              </SectionHeader>
              <BarChart
                data={stats.levelAccuracy.map((item) => ({
                  label: item.label,
                  value: item.accuracyRate,
                  displayValue: `${item.accuracyRate}%`,
                }))}
              />
            </SectionCard>

            <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => setAnalysisOpen(false)}>
              분석 닫기
            </Button>
          </AnalysisGrid>
        )}
      </SectionCard>

      <DangerCard>
        <SectionHeader>
          <SectionTitle>기록 관리</SectionTitle>
          <SectionDescription>전체 기록을 삭제할 수 있습니다.</SectionDescription>
        </SectionHeader>
        <Button tone="danger" css={{ width: 'auto', minHeight: '44px' }} disabled={clearing} onClick={() => void handleClearHistory()}>
          {clearing ? '삭제 중...' : '전체 기록 삭제'}
        </Button>
      </DangerCard>
    </Layout>
  );
}
