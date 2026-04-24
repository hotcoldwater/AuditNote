import type {
  GradingMetadata,
  ScoringResult,
  Standard,
  StudyAttempt,
  StudyMode,
  UserStandardStats,
  WrongNote,
} from '../types';
import {
  getLocalAttempts,
  getLocalStats,
  getLocalWrongNotes,
  localStoreKeys,
  mergeLocalByUser,
} from './localStore';
import { isSupabaseConfigured, supabase } from './supabase';
import { upsertWrongNote } from './wrongNotes';

const SUPABASE_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
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
  gradingMetadata: GradingMetadata,
): StudyAttempt {
  return {
    id: createId(),
    user_id: userId,
    standard_id: standardId,
    mode,
    user_answer: userAnswer,
    score: scoring.score,
    result_status: scoring.resultStatus,
    grading_method: gradingMetadata.gradingMethod,
    grading_model: gradingMetadata.gradingModel,
    ai_reason: scoring.reason,
    should_add_wrong_note: scoring.shouldAddWrongNote,
    raw_grading_result: gradingMetadata.rawGradingResult,
    created_at: new Date().toISOString(),
  };
}

function sortAttempts(attempts: StudyAttempt[]) {
  return [...attempts].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function zeroStat(userId: string, standardId: string): UserStandardStats {
  return {
    user_id: userId,
    standard_id: standardId,
    attempt_count: 0,
    correct_count: 0,
    wrong_count: 0,
    review_count: 0,
    skipped_count: 0,
    last_score: null,
    last_result_status: null,
    consecutive_correct_count: 0,
    consecutive_wrong_count: 0,
    last_user_answer: null,
    last_attempted_at: null,
    updated_at: new Date().toISOString(),
  };
}

function buildNextStats(
  userId: string,
  standardId: string,
  current: UserStandardStats | undefined,
  scoring: ScoringResult,
  userAnswer: string,
) {
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
    last_user_answer: userAnswer.trim() || null,
    last_attempted_at: now,
    updated_at: now,
  } satisfies UserStandardStats;
}

function buildDerivedStats(userId: string, standardId: string, attempts: StudyAttempt[]): UserStandardStats {
  const sorted = sortAttempts(attempts);
  if (sorted.length === 0) {
    return zeroStat(userId, standardId);
  }

  const latest = sorted[0];
  const statuses = sorted.map((item) => item.result_status);
  let consecutiveCorrectCount = 0;
  for (const status of statuses) {
    if (status === 'CORRECT' || status === 'EXCELLENT') {
      consecutiveCorrectCount += 1;
      continue;
    }
    break;
  }

  let consecutiveWrongCount = 0;
  for (const status of statuses) {
    if (status === 'WRONG' || status === 'SKIPPED') {
      consecutiveWrongCount += 1;
      continue;
    }
    break;
  }

  return {
    user_id: userId,
    standard_id: standardId,
    attempt_count: sorted.length,
    correct_count: sorted.filter((item) => item.result_status === 'CORRECT' || item.result_status === 'EXCELLENT').length,
    wrong_count: sorted.filter((item) => item.result_status === 'WRONG').length,
    review_count: sorted.filter((item) => item.result_status === 'REVIEW').length,
    skipped_count: sorted.filter((item) => item.result_status === 'SKIPPED').length,
    last_score: latest.score,
    last_result_status: latest.result_status,
    consecutive_correct_count: consecutiveCorrectCount,
    consecutive_wrong_count: consecutiveWrongCount,
    last_user_answer: latest.user_answer?.trim() || null,
    last_attempted_at: latest.created_at,
    updated_at: new Date().toISOString(),
  };
}

function buildDerivedWrongNote(existing: WrongNote | undefined, attempts: StudyAttempt[]) {
  if (!existing) {
    return null;
  }

  const wrongAttempts = sortAttempts(
    attempts.filter((item) => item.result_status === 'WRONG' || item.result_status === 'SKIPPED'),
  );
  const wrongCount = wrongAttempts.length;
  const lastWrongAttemptedAt = wrongAttempts[0]?.created_at ?? existing.last_attempted_at ?? null;
  const now = new Date().toISOString();

  if (existing.source === 'MANUAL') {
    return {
      ...existing,
      wrong_count: wrongCount,
      last_attempted_at: lastWrongAttemptedAt,
      is_resolved: wrongCount > 0 ? false : existing.is_resolved,
      updated_at: now,
    } satisfies WrongNote;
  }

  return {
    ...existing,
    wrong_count: wrongCount,
    last_attempted_at: lastWrongAttemptedAt,
    is_resolved: wrongCount === 0,
    updated_at: now,
  } satisfies WrongNote;
}

function persistLocalAttempt(userId: string, attempt: StudyAttempt) {
  const attempts = sortAttempts([...getLocalAttempts(userId), attempt]);
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

function persistLocalWrongNote(userId: string, nextNote: WrongNote) {
  const notes = getLocalWrongNotes(userId);
  mergeLocalByUser(
    localStoreKeys.WRONG_NOTES_KEY,
    userId,
    [...notes.filter((item) => item.standard_id !== nextNote.standard_id), nextNote].sort((a, b) =>
      (b.updated_at ?? '').localeCompare(a.updated_at ?? ''),
    ),
  );
}

async function insertStudyAttemptWithFallback(attempt: StudyAttempt) {
  if (!supabase) {
    return { error: null };
  }

  const nextPayload = {
    user_id: attempt.user_id,
    standard_id: attempt.standard_id,
    mode: attempt.mode,
    user_answer: attempt.user_answer,
    score: attempt.score,
    result_status: attempt.result_status,
    grading_method: attempt.grading_method,
    grading_model: attempt.grading_model,
    ai_reason: attempt.ai_reason,
    should_add_wrong_note: attempt.should_add_wrong_note,
    raw_grading_result: attempt.raw_grading_result,
  };

  const nextInsert = await withTimeout(
    supabase.from('study_attempts').insert(nextPayload),
    SUPABASE_TIMEOUT_MS,
  );

  if (!nextInsert.error) {
    return nextInsert;
  }

  return withTimeout(
    supabase.from('study_attempts').insert({
      user_id: attempt.user_id,
      standard_id: attempt.standard_id,
      mode: attempt.mode,
      user_answer: attempt.user_answer,
      score: attempt.score,
      result_status: attempt.result_status,
    }),
    SUPABASE_TIMEOUT_MS,
  );
}

async function syncDerivedDataForStandard(
  userId: string,
  standardId: string,
  attemptsForStandard: StudyAttempt[],
  existingWrongNote?: WrongNote,
) {
  const nextStat = buildDerivedStats(userId, standardId, attemptsForStandard);
  const nextWrongNote = buildDerivedWrongNote(existingWrongNote, attemptsForStandard);

  if (!isSupabaseConfigured || !supabase) {
    persistLocalStats(userId, nextStat);
    if (nextWrongNote) {
      persistLocalWrongNote(userId, nextWrongNote);
    }
    return;
  }

  await withTimeout(
    supabase.from('user_standard_stats').upsert(nextStat, { onConflict: 'user_id,standard_id' }),
    SUPABASE_TIMEOUT_MS,
  );

  if (nextWrongNote) {
    await withTimeout(
      supabase.from('wrong_notes').upsert(nextWrongNote, { onConflict: 'user_id,standard_id' }),
      SUPABASE_TIMEOUT_MS,
    );
  }
}

export async function listStudyAttempts(userId: string): Promise<StudyAttempt[]> {
  if (!isSupabaseConfigured || !supabase) {
    return sortAttempts(getLocalAttempts(userId));
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from('study_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      SUPABASE_TIMEOUT_MS,
    );

    if (error) {
      throw error;
    }

    return (data ?? []) as StudyAttempt[];
  } catch {
    return sortAttempts(getLocalAttempts(userId));
  }
}

export async function listUserStandardStats(userId: string): Promise<UserStandardStats[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalStats(userId);
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from('user_standard_stats').select('*').eq('user_id', userId),
      SUPABASE_TIMEOUT_MS,
    );
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
  gradingMetadata: GradingMetadata,
) {
  const attempt = buildAttempt(userId, standard.id, mode, userAnswer, scoring, gradingMetadata);
  let notice: string | undefined;

  const localPersist = async (message: string) => {
    const currentStats = getLocalStats(userId).find((item) => item.standard_id === standard.id);
    const nextStat = buildNextStats(userId, standard.id, currentStats, scoring, userAnswer);
    persistLocalAttempt(userId, attempt);
    persistLocalStats(userId, nextStat);
    if (scoring.shouldAddWrongNote) {
      await upsertWrongNote(userId, standard.id, 'AUTO', 'AI 채점 결과에 따른 자동 등록');
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
      SUPABASE_TIMEOUT_MS,
    );

    const nextStat = buildNextStats(
      userId,
      standard.id,
      currentStatsRow as UserStandardStats | undefined,
      scoring,
      userAnswer,
    );

    const { error: attemptError } = await insertStudyAttemptWithFallback(attempt);

    if (attemptError) {
      throw attemptError;
    }

    const { error: statsError } = await withTimeout(
      supabase.from('user_standard_stats').upsert(nextStat, { onConflict: 'user_id,standard_id' }),
      SUPABASE_TIMEOUT_MS,
    );

    if (statsError) {
      throw statsError;
    }

    if (scoring.shouldAddWrongNote) {
      await upsertWrongNote(userId, standard.id, 'AUTO', 'AI 채점 결과에 따른 자동 등록');
    }

    return { attempt, stats: nextStat, notice };
  } catch {
    return localPersist('Supabase 저장에 실패하여 브라우저 로컬에 임시 저장했습니다.');
  }
}

export async function deleteStudyAttempt(userId: string, attemptId: string) {
  const localDelete = async (message: string) => {
    const attempts = getLocalAttempts(userId);
    const target = attempts.find((item) => item.id === attemptId);
    if (!target) {
      return { success: false as const, notice: '삭제할 기록을 찾지 못했습니다.' };
    }

    const remainingAttempts = sortAttempts(attempts.filter((item) => item.id !== attemptId));
    mergeLocalByUser(localStoreKeys.ATTEMPTS_KEY, userId, remainingAttempts);

    const nextStat = buildDerivedStats(
      userId,
      target.standard_id,
      remainingAttempts.filter((item) => item.standard_id === target.standard_id),
    );
    persistLocalStats(userId, nextStat);

    const existingWrongNote = getLocalWrongNotes(userId).find((item) => item.standard_id === target.standard_id);
    const nextWrongNote = buildDerivedWrongNote(
      existingWrongNote,
      remainingAttempts.filter((item) => item.standard_id === target.standard_id),
    );
    if (nextWrongNote) {
      persistLocalWrongNote(userId, nextWrongNote);
    }

    return { success: true as const, notice: message };
  };

  if (!isSupabaseConfigured || !supabase) {
    return localDelete('브라우저 로컬 기록을 삭제했습니다.');
  }

  try {
    const { data: targetRow, error: targetError } = await withTimeout(
      supabase
        .from('study_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('id', attemptId)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS,
    );

    if (targetError) {
      throw targetError;
    }

    const target = targetRow as StudyAttempt | null;
    if (!target) {
      return { success: false as const, notice: '삭제할 기록을 찾지 못했습니다.' };
    }

    const { error: deleteError } = await withTimeout(
      supabase.from('study_attempts').delete().eq('user_id', userId).eq('id', attemptId),
      SUPABASE_TIMEOUT_MS,
    );

    if (deleteError) {
      throw deleteError;
    }

    const [{ data: remainingRows, error: remainingError }, { data: wrongNoteRow, error: wrongNoteError }] =
      await Promise.all([
        withTimeout(
          supabase
            .from('study_attempts')
            .select('*')
            .eq('user_id', userId)
            .eq('standard_id', target.standard_id)
            .order('created_at', { ascending: false }),
          SUPABASE_TIMEOUT_MS,
        ),
        withTimeout(
          supabase
            .from('wrong_notes')
            .select('*')
            .eq('user_id', userId)
            .eq('standard_id', target.standard_id)
            .maybeSingle(),
          SUPABASE_TIMEOUT_MS,
        ),
      ]);

    if (remainingError) {
      throw remainingError;
    }
    if (wrongNoteError) {
      throw wrongNoteError;
    }

    await syncDerivedDataForStandard(
      userId,
      target.standard_id,
      (remainingRows ?? []) as StudyAttempt[],
      (wrongNoteRow as WrongNote | null) ?? undefined,
    );

    return { success: true as const, notice: '학습기록 1건을 삭제했습니다.' };
  } catch {
    return localDelete(
      'Supabase 삭제에 실패해 브라우저 로컬 기록만 정리했습니다. schema.sql의 delete policy도 다시 적용해 주세요.',
    );
  }
}

export async function clearStudyHistory(userId: string) {
  const resetStats = (stats: UserStandardStats[]) =>
    stats.map((item) => ({
      ...zeroStat(item.user_id, item.standard_id),
      updated_at: new Date().toISOString(),
    }));

  const resetWrongNotes = (notes: WrongNote[]) =>
    notes.map((item) => ({
      ...item,
      wrong_count: 0,
      last_attempted_at: null,
      is_resolved: item.source === 'AUTO' ? true : item.is_resolved,
      updated_at: new Date().toISOString(),
    }));

  const localReset = (message: string) => {
    mergeLocalByUser(localStoreKeys.ATTEMPTS_KEY, userId, []);
    mergeLocalByUser(localStoreKeys.STATS_KEY, userId, resetStats(getLocalStats(userId)));
    mergeLocalByUser(localStoreKeys.WRONG_NOTES_KEY, userId, resetWrongNotes(getLocalWrongNotes(userId)));
    return { success: true as const, notice: message };
  };

  if (!isSupabaseConfigured || !supabase) {
    return localReset('브라우저 로컬 학습기록을 초기화했습니다.');
  }

  try {
    const [{ data: statsRows, error: statsError }, { data: wrongNoteRows, error: wrongNoteError }, { error: deleteError }] =
      await Promise.all([
        withTimeout(supabase.from('user_standard_stats').select('*').eq('user_id', userId), SUPABASE_TIMEOUT_MS),
        withTimeout(supabase.from('wrong_notes').select('*').eq('user_id', userId), SUPABASE_TIMEOUT_MS),
        withTimeout(supabase.from('study_attempts').delete().eq('user_id', userId), SUPABASE_TIMEOUT_MS),
      ]);

    if (statsError) {
      throw statsError;
    }
    if (wrongNoteError) {
      throw wrongNoteError;
    }
    if (deleteError) {
      throw deleteError;
    }

    const nextStats = resetStats((statsRows ?? []) as UserStandardStats[]);
    const nextWrongNotes = resetWrongNotes((wrongNoteRows ?? []) as WrongNote[]);

    if (nextStats.length > 0) {
      const { error } = await withTimeout(
        supabase.from('user_standard_stats').upsert(nextStats, { onConflict: 'user_id,standard_id' }),
        SUPABASE_TIMEOUT_MS,
      );
      if (error) {
        throw error;
      }
    }

    if (nextWrongNotes.length > 0) {
      const { error } = await withTimeout(
        supabase.from('wrong_notes').upsert(nextWrongNotes, { onConflict: 'user_id,standard_id' }),
        SUPABASE_TIMEOUT_MS,
      );
      if (error) {
        throw error;
      }
    }

    return { success: true as const, notice: '학습기록을 초기화했습니다.' };
  } catch {
    return localReset(
      'Supabase 초기화에 실패해 브라우저 로컬 기록만 정리했습니다. schema.sql의 delete policy도 다시 적용해 주세요.',
    );
  }
}
