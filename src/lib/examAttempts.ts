import type { ExamAttempt, ExamQuestion, GradingMetadata, ScoringResult } from '../types';
import { isGuestUserId } from './localStore';
import { isSupabaseConfigured, supabase } from './supabase';

const EXAM_ATTEMPTS_KEY = 'auditnote.exam_attempts.v1';
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
  return globalThis.crypto?.randomUUID?.() ?? `exam-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLocalAttempts(userId: string) {
  try {
    const payload = window.localStorage.getItem(EXAM_ATTEMPTS_KEY);
    if (!payload) {
      return [] as ExamAttempt[];
    }

    const parsed = JSON.parse(payload) as Record<string, ExamAttempt[]>;
    return Array.isArray(parsed?.[userId]) ? parsed[userId] : [];
  } catch {
    return [] as ExamAttempt[];
  }
}

function setLocalAttempts(userId: string, attempts: ExamAttempt[]) {
  try {
    const payload = window.localStorage.getItem(EXAM_ATTEMPTS_KEY);
    const parsed = payload ? (JSON.parse(payload) as Record<string, ExamAttempt[]>) : {};
    parsed[userId] = attempts;
    window.localStorage.setItem(EXAM_ATTEMPTS_KEY, JSON.stringify(parsed));
  } catch {
    return;
  }
}

function buildAttempt(
  userId: string,
  question: ExamQuestion,
  userAnswer: string,
  scoring: ScoringResult,
  gradingMetadata: GradingMetadata,
): ExamAttempt {
  return {
    id: createId(),
    user_id: userId,
    question_id: question.id,
    user_answer: userAnswer,
    score: scoring.score,
    result_status: scoring.resultStatus,
    grading_method: gradingMetadata.gradingMethod,
    grading_model: gradingMetadata.gradingModel,
    ai_summary: scoring.reason,
    raw_grading_result: gradingMetadata.rawGradingResult,
    created_at: new Date().toISOString(),
  };
}

function sortAttempts(attempts: ExamAttempt[]) {
  return [...attempts].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listExamAttempts(userId: string): Promise<ExamAttempt[]> {
  if (isGuestUserId(userId)) {
    return [];
  }

  if (!isSupabaseConfigured || !supabase) {
    return sortAttempts(getLocalAttempts(userId));
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from('exam_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      SUPABASE_TIMEOUT_MS,
    );

    if (error) {
      throw error;
    }

    return (data ?? []) as ExamAttempt[];
  } catch {
    return sortAttempts(getLocalAttempts(userId));
  }
}

export async function loadLatestExamAttemptMap(userId: string) {
  const attempts = await listExamAttempts(userId);
  const latestMap = new Map<string, ExamAttempt>();

  for (const attempt of attempts) {
    if (!latestMap.has(attempt.question_id)) {
      latestMap.set(attempt.question_id, attempt);
    }
  }

  return latestMap;
}

export async function listLatestExamWrongAttempts(
  userId: string,
  statuses?: Array<'WRONG' | 'REVIEW'>,
) {
  const attempts = await listExamAttempts(userId);
  const latestMap = new Map<string, ExamAttempt>();
  const wrongCountMap = new Map<string, number>();

  for (const attempt of attempts) {
    if (!latestMap.has(attempt.question_id)) {
      latestMap.set(attempt.question_id, attempt);
    }

    if (attempt.result_status === 'WRONG' || attempt.result_status === 'REVIEW') {
      wrongCountMap.set(attempt.question_id, (wrongCountMap.get(attempt.question_id) ?? 0) + 1);
    }
  }

  return [...latestMap.values()]
    .filter((attempt) => attempt.result_status === 'WRONG' || attempt.result_status === 'REVIEW')
    .filter((attempt) => !statuses || statuses.includes(attempt.result_status as 'WRONG' | 'REVIEW'))
    .map((attempt) => ({
      latestAttempt: attempt,
      wrongCount: wrongCountMap.get(attempt.question_id) ?? 0,
    }))
    .sort((a, b) => b.latestAttempt.created_at.localeCompare(a.latestAttempt.created_at));
}

export async function recordExamAttempt(
  userId: string,
  question: ExamQuestion,
  userAnswer: string,
  scoring: ScoringResult,
  gradingMetadata: GradingMetadata,
) {
  if (scoring.resultStatus === 'SKIPPED') {
    return { attempt: null, notice: 'SKIP은 저장되지 않습니다.' };
  }

  const attempt = buildAttempt(userId, question, userAnswer, scoring, gradingMetadata);

  if (isGuestUserId(userId)) {
    return { attempt, notice: '게스트 모드에서는 기출 기록이 저장되지 않습니다.' };
  }

  const persistLocal = (message: string) => {
    setLocalAttempts(userId, sortAttempts([...getLocalAttempts(userId), attempt]));
    return { attempt, notice: message };
  };

  if (!isSupabaseConfigured || !supabase) {
    return persistLocal('Supabase 환경변수가 없어 브라우저 로컬에만 저장했습니다.');
  }

  try {
    const { error } = await withTimeout(
      supabase.from('exam_attempts').insert({
        user_id: attempt.user_id,
        question_id: attempt.question_id,
        user_answer: attempt.user_answer,
        score: attempt.score,
        result_status: attempt.result_status,
        grading_method: attempt.grading_method,
        grading_model: attempt.grading_model,
        ai_summary: attempt.ai_summary,
        raw_grading_result: attempt.raw_grading_result,
      }),
      SUPABASE_TIMEOUT_MS,
    );

    if (error) {
      throw error;
    }

    return { attempt, notice: undefined };
  } catch {
    return persistLocal('Supabase 저장에 실패하여 브라우저 로컬에 임시 저장했습니다.');
  }
}
