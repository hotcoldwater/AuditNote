import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { ProgressBar } from '../components/ProgressBar';
import { StatCard } from '../components/StatCard';
import { listStudyAttempts, listUserStandardStats } from '../lib/attempts';
import { useAuth } from '../lib/auth';
import { buildDashboardStats } from '../lib/stats';
import { fetchActiveStandards } from '../lib/standards';
import { listWrongNotes } from '../lib/wrongNotes';
import type { DashboardStats } from '../types';
import { Badge } from '../components/Badge';

export function RecordsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notice, setNotice] = useState<string | undefined>();

  useEffect(() => {
    if (!user) {
      return;
    }

    Promise.all([
      fetchActiveStandards(),
      listStudyAttempts(user.id),
      listUserStandardStats(user.id),
      listWrongNotes(user.id, true),
    ]).then(([standardsPayload, attempts, userStats, wrongNotes]) => {
      setNotice(standardsPayload.notice);
      setStats(buildDashboardStats(standardsPayload.standards, attempts, userStats, wrongNotes));
    });
  }, [user?.id]);

  if (!stats) {
    return <Layout title="학습기록">불러오는 중...</Layout>;
  }

  return (
    <Layout title="학습기록" description="클라이언트에서 계산한 MVP 대시보드입니다.">
      {notice ? <Card css={{ color: '$warning' }}>{notice}</Card> : null}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard title="전체 진행률" value={`${stats.overallProgress}%`} />
        <StatCard title="오늘 푼 문제 수" value={`${stats.todayAttemptCount}개`} />
        <StatCard title="누적 풀이 수" value={`${stats.totalAttempts}회`} />
        <StatCard title="평균 점수" value={`${stats.averageScore}점`} />
        <StatCard title="전체 오답률" value={`${stats.overallWrongRate}%`} />
      </div>

      <Card css={{ display: 'grid', gap: '$4' }}>
        <h2 style={{ margin: 0 }}>최근 7일 학습량</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {stats.recent7Days.map((item) => (
            <ProgressBar
              key={item.date}
              label={item.date.slice(5).replace('-', '.')}
              value={Math.min(item.count * 20, 100)}
            />
          ))}
        </div>
      </Card>

      <Card css={{ display: 'grid', gap: '$4' }}>
        <h2 style={{ margin: 0 }}>편별 진행률 / 오답률</h2>
        <div style={{ display: 'grid', gap: 16 }}>
          {stats.partProgress.map((item) => (
            <div key={item.partNo} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>{item.partNo}편</strong>
                <span style={{ color: '#777777', fontSize: 14 }}>
                  {item.solvedCount}/{item.totalCount} · 오답률 {item.wrongRate}%
                </span>
              </div>
              <ProgressBar label={`${item.partNo}편 진행률`} value={item.progressRate} />
            </div>
          ))}
        </div>
      </Card>

      <Card css={{ display: 'grid', gap: '$4' }}>
        <h2 style={{ margin: 0 }}>LV별 정답률</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {stats.levelAccuracy.map((item) => (
            <ProgressBar key={item.label} label={item.label} value={item.accuracyRate} />
          ))}
        </div>
      </Card>

      <Card css={{ display: 'grid', gap: '$4' }}>
        <h2 style={{ margin: 0 }}>자주 틀린 기준서</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {stats.frequentWrongStandards.length === 0 ? (
            <div style={{ color: '#777777' }}>아직 오답노트가 없습니다.</div>
          ) : (
            stats.frequentWrongStandards.map((item) => (
              <div
                key={item.standardId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>{item.standardTitle}</div>
                <Badge tone="danger">{item.wrongCount}회</Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card css={{ display: 'grid', gap: '$4' }}>
        <h2 style={{ margin: 0 }}>최근 풀이 기록</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {stats.recentAttempts.length === 0 ? (
            <div style={{ color: '#777777' }}>아직 풀이 기록이 없습니다.</div>
          ) : (
            stats.recentAttempts.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong>{item.standardTitle}</strong>
                  <span style={{ color: '#777777', fontSize: 14 }}>{item.createdAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <Badge
                  tone={
                    item.resultStatus === 'EXCELLENT' || item.resultStatus === 'CORRECT'
                      ? 'success'
                      : item.resultStatus === 'REVIEW'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {item.score}점
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </Layout>
  );
}
