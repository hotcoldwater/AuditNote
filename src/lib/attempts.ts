import type { ScoringResult, Standard, StudyAttempt, StudyMode, UserStandardStats } from '../types';
import { getLocalAttempts, getLocalStats, localStoreKeys, mergeLocalByUser } from './localStore';
import { isSupabaseConfigured, supabase } from './supabase';
import { upsertWrongNote } from './wrongNotes';

function withTimeout(promise: PromiseLike<any>, timeoutMs: number): Promise<any> {
  return Promise.race<any>([
    Promise.resolve(promise),
    new Promise<any>((_, reject) => {
      window.setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), timeoutMs);
    }),
  ]);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `at-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildAttempt(
  userId: string,
  standardId: string,
  mode: StudyMode,
  userAnswer: string,
  scoring: ScoringResult,
): StudyAttempt {
  return {
    id: createId(),
    user_id: userId,
    standard_id: standardId,
    mode,
    user_answer: userAnswer,
    score: scoring.score,
    result_status: scoring.resultStatus,
    included_required_keywords: scoring.includedRequiredKeywords,
    missing_required_keywords: scoring.missingRequiredKeywords,
    included_optional_keywords: scoring.includedOptionalKeywords,
    answer_length_ratio: Number(scoring.answerLengthRatio.toFixed(2)),
    similarity_score: scoring.similarityScore,
    created_at: new Date().toISOString(),
  };
}

function buildNextStats(userId: string, standardId: string, current: UserStandardStats | undefined, scoring: ScoringResult) {
  const now = new Date().toISOString();
  const isCorrect = scoring.resultStatus === 'CORRECT' || scoring.resultStatus === 'EXCELLENT';
  const isWrong = scoring.resultStatus === 'WRONG';
  const isReview = scoring.resultStatus === 'REVIEW';
  const isSkipped = scoring.resultStatus === 'SKIPPED';

  return {
    user_id: userId,
    standard_id: standardId,
    attempt_count: (current?.attempt_count ?? 0) + 1,
    correct_count: (current?.correct_count ?? 0) + (isCorrect ? 1 : 0),
    wrong_count: (current?.wrong_count ?? 0) + (isWrong ? 1 : 0),
    review_count: (current?.review_count ?? 0) + (isReview ? 1 : 0),
    skipped_count: (current?.skipped_count ?? 0) + (isSkipped ? 1 : 0),
    last_score: scoring.score,
    last_result_status: scoring.resultStatus,
    consecutive_correct_count: isCorrect ? (current?.consecutive_correct_count ?? 0) + 1 : 0,
    consecutive_wrong_count:
      scoring.resultStatus === 'WRONG' || scoring.resultStatus === 'SKIPPED'
        ? (current?.consecutive_wrong_count ?? 0) + 1
        : 0,
    last_attempted_at: now,
    updated_at: now,
  } satisfies UserStandardStats;
}

function persistLocalAttempt(userId: string, attempt: StudyAttempt) {
  const attempts = [...getLocalAttempts(userId), attempt].sort((a, b) => b.created_at.localeCompare(a.created_at));
  mergeLocalByUser(localStoreKeys.ATTEMPTS_KEY, userId, attempts);
}

function persistLocalStats(userId: string, nextStat: UserStandardStats) {
  const stats = getLocalStats(userId);
  mergeLocalByUser(
    localStoreKeys.STATS_KEY,
    userId,
    [...stats.filter((item) => item.standard_id !== nextStat.standard_id), nextStat],
  );
}

export async function listStudyAttempts(userId: string): Promise<StudyAttempt[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalAttempts(userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from('study_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      8000,
    );

    if (error) {
      throw error;
    }

    return (data ?? []) as StudyAttempt[];
  } catch {
    return getLocalAttempts(userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export async function listUserStandardStats(userId: string): Promise<UserStandardStats[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalStats(userId);
  }

  try {
    const { data, error } = await withTimeout(supabase.from('user_standard_stats').select('*').eq('user_id', userId), 8000);
    if (error) {
      throw error;
    }
    return (data ?? []) as UserStandardStats[];
  } catch {
    return getLocalStats(userId);
  }
}

export async function loadUserStandardStatsMap(userId: string) {
  const stats = await listUserStandardStats(userId);
  return new Map(stats.map((item) => [item.standard_id, item]));
}

export async function recordStudyOutcome(
  userId: string,
  standard: Standard,
  userAnswer: string,
  scoring: ScoringResult,
  mode: StudyMode,
) {
  const attempt = buildAttempt(userId, standard.id, mode, userAnswer, scoring);
  let notice: string | undefined;

  const localPersist = async (message: string) => {
    const currentStats = getLocalStats(userId).find((item) => item.standard_id === standard.id);
    const nextStat = buildNextStats(userId, standard.id, currentStats, scoring);
    persistLocalAttempt(userId, attempt);
    persistLocalStats(userId, nextStat);
    if (scoring.score < 60) {
      await upsertWrongNote(userId, standard.id, 'AUTO', '60점 미만 자동 등록');
    }
    notice = message;
    return { attempt, stats: nextStat, notice };
  };

  if (!isSupabaseConfigured || !supabase) {
    return localPersist('Supabase 환경변수가 없어 브라우저 로컬에만 저장했습니다.');
  }

  try {
    const { data: currentStatsRow } = await withTimeout(
      supabase
        .from('user_standard_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('standard_id', standard.id)
        .maybeSingle(),
      8000,
    );

    const nextStat = buildNextStats(userId, standard.id, currentStatsRow as UserStandardStats | undefined, scoring);

    const { error: attemptError } = await withTimeout(
      supabase.from('study_attempts').insert({
        user_id: attempt.user_id,
        standard_id: attempt.standard_id,
        mode: attempt.mode,
        user_answer: attempt.user_answer,
        score: attempt.score,
        result_status: attempt.result_status,
        included_required_keywords: attempt.included_required_keywords,
        missing_required_keywords: attempt.missing_required_keywords,
        included_optional_keywords: attempt.included_optional_keywords,
        answer_length_ratio: attempt.answer_length_ratio,
        similarity_score: attempt.similarity_score,
      }),
      8000,
    );

    if (attemptError) {
      throw attemptError;
    }

    const { error: statsError } = await withTimeout(
      supabase.from('user_standard_stats').upsert(nextStat, { onConflict: 'user_id,standard_id' }),
      8000,
    );

    if (statsError) {
      throw statsError;
    }

    if (scoring.score < 60) {
      await upsertWrongNote(userId, standard.id, 'AUTO', '60점 미만 자동 등록');
    }

    return { attempt, stats: nextStat, notice };
  } catch {
    return localPersist('Supabase 저장에 실패하여 브라우저 로컬에 임시 저장했습니다.');
  }
}
