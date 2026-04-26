import type { AnswerImage, ExamGradingPayload, GradingMetadata, ScoringResult } from '../types';
import { deriveResultStatus, isSkippedAnswer } from './scoring';
import { isSupabaseConfigured, supabase } from './supabase';

const GRADING_VERSION = '2026-04-26-exam-v1';
const GRADE_EXAM_API_PATH = '/api/grade-exam';

interface GradeExamInput {
  questionText: string;
  correctAnswer: string;
  explanationText?: string | null;
  userAnswer: string;
  answerImages?: AnswerImage[];
}

interface GradeExamApiResponse {
  result?: Partial<ScoringResult>;
  details?: Partial<ExamGradingPayload>;
  metadata?: Partial<GradingMetadata>;
  error?: string;
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSkippedResponse(correctAnswer: string) {
  const details: ExamGradingPayload = {
    score: 0,
    maxScore: 100,
    grade: 'SKIPPED',
    confidence: 'HIGH',
    summary: '답안이 작성되지 않았습니다.',
    correctPoints: [],
    missingPoints: ['핵심 결론과 필수 논점을 직접 작성해 보아야 채점이 가능합니다.'],
    wrongPoints: [],
    advice: '모범답안을 보기 전에 결론 한 줄과 핵심 논점부터 직접 써 보세요.',
    modelAnswer: correctAnswer,
  };

  return {
    result: {
      score: 0,
      resultStatus: 'SKIPPED' as const,
      reason: details.summary,
      shouldRecommendReview: false,
      shouldAddWrongNote: true,
    },
    details,
    metadata: {
      gradingMethod: 'rule' as const,
      gradingModel: null,
      gradingVersion: GRADING_VERSION,
      rawGradingResult: { gradingVersion: GRADING_VERSION, details },
    } satisfies GradingMetadata,
  };
}

function normalizeDetails(details: Partial<ExamGradingPayload> | undefined, correctAnswer: string): ExamGradingPayload {
  return {
    score: clampScore(typeof details?.score === 'number' ? details.score : 0),
    maxScore: 100,
    grade: typeof details?.grade === 'string' ? details.grade : 'PARTIAL',
    confidence: typeof details?.confidence === 'string' ? details.confidence : 'MEDIUM',
    summary:
      typeof details?.summary === 'string' && details.summary.trim()
        ? details.summary.trim().split(/\r?\n/)[0]
        : '채점 요약이 제공되지 않았습니다.',
    correctPoints: Array.isArray(details?.correctPoints)
      ? details.correctPoints.map((item) => String(item).trim()).filter(Boolean)
      : [],
    missingPoints: Array.isArray(details?.missingPoints)
      ? details.missingPoints.map((item) => String(item).trim()).filter(Boolean)
      : [],
    wrongPoints: Array.isArray(details?.wrongPoints)
      ? details.wrongPoints.map((item) => String(item).trim()).filter(Boolean)
      : [],
    advice:
      typeof details?.advice === 'string' && details.advice.trim()
        ? details.advice.trim()
        : '결론을 먼저 쓰고 필수 논점을 빠뜨리지 않도록 정리해 보세요.',
    modelAnswer: correctAnswer,
  };
}

function normalizeResult(result: Partial<ScoringResult> | undefined, details: ExamGradingPayload): ScoringResult {
  const score = clampScore(typeof result?.score === 'number' ? result.score : details.score);
  const resultStatus = deriveResultStatus(score);

  return {
    score,
    resultStatus,
    reason:
      typeof result?.reason === 'string' && result.reason.trim()
        ? result.reason.trim().split(/\r?\n/)[0]
        : details.summary,
    shouldRecommendReview: resultStatus === 'REVIEW',
    shouldAddWrongNote: resultStatus === 'WRONG' || resultStatus === 'SKIPPED',
  };
}

async function invokeSupabaseExamGrade(input: GradeExamInput) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke('grade-exam', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'Supabase Edge Function 호출에 실패했습니다.');
  }

  return data as GradeExamApiResponse;
}

async function invokePagesExamGrade(input: GradeExamInput) {
  const response = await fetch(GRADE_EXAM_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  let data: GradeExamApiResponse | null = null;
  try {
    data = (await response.json()) as GradeExamApiResponse;
  } catch {
    data = null;
  }

  return { response, data };
}

function buildLocalFallback(correctAnswer: string) {
  const details = normalizeDetails(undefined, correctAnswer);
  details.summary = '현재 AI 채점이 불안정하여 규칙 기반 채점으로 대체되었습니다.';
  details.advice = '잠시 후 다시 시도하거나 답안을 더 구조적으로 정리해 보세요.';
  const result = normalizeResult(undefined, details);
  return {
    result,
    details,
    metadata: {
      gradingMethod: 'rule-fallback' as const,
      gradingModel: null,
      gradingVersion: GRADING_VERSION,
      fallbackNotice: '현재 AI 채점이 불안정하여 규칙 기반 채점으로 대체되었습니다.',
      rawGradingResult: { gradingVersion: GRADING_VERSION, details },
    } satisfies GradingMetadata,
  };
}

export async function gradeExamAnswer(input: GradeExamInput): Promise<{
  result: ScoringResult;
  details: ExamGradingPayload;
  metadata: GradingMetadata;
}> {
  if (isSkippedAnswer(input.userAnswer) && (!input.answerImages || input.answerImages.length === 0)) {
    return buildSkippedResponse(input.correctAnswer);
  }

  try {
    let data: GradeExamApiResponse | null = null;

    try {
      data = await invokeSupabaseExamGrade(input);
    } catch {
      data = null;
    }

    if (!data?.details) {
      try {
        const pagesResult = await invokePagesExamGrade(input);
        if (!pagesResult.response.ok || !pagesResult.data?.details) {
          return buildLocalFallback(input.correctAnswer);
        }
        data = pagesResult.data;
      } catch {
        return buildLocalFallback(input.correctAnswer);
      }
    }

    const details = normalizeDetails(data.details, input.correctAnswer);
    const result = normalizeResult(data.result, details);

    return {
      result,
      details,
      metadata: {
        gradingMethod: data.metadata?.gradingMethod ?? 'ai',
        gradingModel: data.metadata?.gradingModel ?? null,
        gradingVersion: data.metadata?.gradingVersion ?? GRADING_VERSION,
        fallbackNotice: data.metadata?.fallbackNotice ?? null,
        rawGradingResult: data.metadata?.rawGradingResult ?? { gradingVersion: GRADING_VERSION, details },
      },
    };
  } catch {
    return buildLocalFallback(input.correctAnswer);
  }
}
