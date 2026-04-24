import type {
  DashboardStats,
  ResultStatus,
  Standard,
  StudyAttempt,
  UserStandardStats,
  WrongNote,
} from '../types';

function percent(part: number, whole: number) {
  if (!whole) {
    return 0;
  }
  return Number(((part / whole) * 100).toFixed(1));
}

function isoDay(dateString: string) {
  return dateString.slice(0, 10);
}

function isSuccess(status: ResultStatus) {
  return status === 'CORRECT' || status === 'EXCELLENT';
}

export function buildDashboardStats(
  standards: Standard[],
  attempts: StudyAttempt[],
  userStats: UserStandardStats[],
  wrongNotes: WrongNote[],
): DashboardStats {
  const activeStandards = standards.filter((item) => item.is_active);
  const attemptedIds = new Set(userStats.filter((item) => item.attempt_count > 0).map((item) => item.standard_id));
  const today = new Date().toISOString().slice(0, 10);
  const standardsMap = new Map(activeStandards.map((item) => [item.id, item]));
  const wrongAttempts = attempts.filter(
    (item) => item.result_status === 'WRONG' || item.result_status === 'SKIPPED',
  );

  const recent7Days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const iso = date.toISOString().slice(0, 10);
    const dayAttempts = attempts.filter((item) => isoDay(item.created_at) === iso);
    return {
      date: iso,
      count: dayAttempts.length,
      averageScore: dayAttempts.length
        ? Number((dayAttempts.reduce((sum, item) => sum + item.score, 0) / dayAttempts.length).toFixed(1))
        : 0,
    };
  });

  const partNumbers = [...new Set(activeStandards.map((item) => item.part_no).filter((item): item is number => !!item))].sort(
    (a, b) => a - b,
  );

  const partProgress = partNumbers.map((partNo) => {
    const partStandards = activeStandards.filter((item) => item.part_no === partNo);
    const partAttempts = attempts.filter((item) => standardsMap.get(item.standard_id)?.part_no === partNo);
    const partAttemptedIds = new Set(partAttempts.map((item) => item.standard_id));
    const partWrongAttempts = partAttempts.filter(
      (item) => item.result_status === 'WRONG' || item.result_status === 'SKIPPED',
    );

    return {
      partNo,
      solvedCount: partAttemptedIds.size,
      totalCount: partStandards.length,
      progressRate: percent(partAttemptedIds.size, partStandards.length),
      wrongRate: percent(partWrongAttempts.length, partAttempts.length),
    };
  });

  const levelGroups = [
    { label: 'Lv1-3 기본', levels: [1, 2, 3] },
    { label: 'Lv4 심화', levels: [4] },
    { label: 'Lv5 지엽', levels: [5] },
  ];

  const levelAccuracy = levelGroups.map((group) => {
    const groupAttempts = attempts.filter((item) => group.levels.includes(standardsMap.get(item.standard_id)?.level ?? 0));
    const correct = groupAttempts.filter((item) => isSuccess(item.result_status)).length;
    return {
      label: group.label,
      total: groupAttempts.length,
      correct,
      accuracyRate: percent(correct, groupAttempts.length),
    };
  });

  const frequentWrongStandards = [...wrongNotes]
    .filter((item) => !item.is_resolved)
    .sort((a, b) => b.wrong_count - a.wrong_count)
    .slice(0, 5)
    .map((item) => ({
      standardId: item.standard_id,
      standardTitle: standardsMap.get(item.standard_id)?.title ?? item.standard_id,
      wrongCount: item.wrong_count,
      lastAttemptedAt: item.last_attempted_at,
    }));

  const recentAttempts = attempts.slice(0, 8).map((item) => ({
    id: item.id,
    standardId: item.standard_id,
    standardTitle: standardsMap.get(item.standard_id)?.title ?? item.standard_id,
    resultStatus: item.result_status,
    score: item.score,
    mode: item.mode,
    createdAt: item.created_at,
  }));

  const averageScore =
    attempts.length > 0
      ? Number((attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length).toFixed(1))
      : 0;

  const statusBreakdown = [
    {
      label: '정답',
      count: attempts.filter((item) => item.result_status === 'CORRECT' || item.result_status === 'EXCELLENT').length,
      tone: 'success' as const,
    },
    {
      label: '복습',
      count: attempts.filter((item) => item.result_status === 'REVIEW').length,
      tone: 'warning' as const,
    },
    {
      label: '오답',
      count: attempts.filter((item) => item.result_status === 'WRONG' || item.result_status === 'SKIPPED').length,
      tone: 'danger' as const,
    },
    {
      label: '전체',
      count: attempts.length,
      tone: 'primary' as const,
    },
  ];

  const scoreDistribution = [
    { label: '0-59', count: attempts.filter((item) => item.score < 60).length },
    { label: '60-74', count: attempts.filter((item) => item.score >= 60 && item.score < 75).length },
    { label: '75-89', count: attempts.filter((item) => item.score >= 75 && item.score < 90).length },
    { label: '90-100', count: attempts.filter((item) => item.score >= 90).length },
  ];

  return {
    overallProgress: percent(attemptedIds.size, activeStandards.length),
    todayAttemptCount: attempts.filter((item) => isoDay(item.created_at) === today).length,
    totalAttempts: attempts.length,
    averageScore,
    overallWrongRate: percent(wrongAttempts.length, attempts.length),
    recent7Days,
    statusBreakdown,
    scoreDistribution,
    partProgress,
    levelAccuracy,
    frequentWrongStandards,
    recentAttempts,
  };
}
